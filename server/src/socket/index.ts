import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import pool from '../db';

interface GameState {
  sessionId: string;
  childId: string;
  gameId: string;
  score: number;
  accuracy: number;
  combo: number;
  level: number;
  startTime: number;
  isActive: boolean;
}

const gameStates = new Map<string, GameState>();

// Use any to bypass socket.io type conflicts between @types and built-in types

export function initSocketIO(io: any) {
  // Authentication middleware for Socket.IO
  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('未授权'));
    }
    const decoded = verifyToken(token as string);
    if (!decoded) {
      return next(new Error('Token无效'));
    }
    (socket as any).userId = decoded.userId;
    (socket as any).userRole = decoded.role;
    next();
  });

  io.on('connection', (socket: any) => {
    console.log(`Socket connected: ${socket.id}, user: ${(socket as any).userId}`);

    // Join child's room for real-time updates
    socket.on('child:join', async (childId: string) => {
      socket.join(`child:${childId}`);
      console.log(`User ${(socket as any).userId} joined child room: ${childId}`);
    });

    socket.on('child:leave', (childId: string) => {
      socket.leave(`child:${childId}`);
    });

    // Game events
    socket.on('game:start', async (data: {
      sessionId: string;
      childId: string;
      gameId: string;
      spatialFrequency: string;
      trainingMode: string;
    }) => {
      const state: GameState = {
        sessionId: data.sessionId,
        childId: data.childId,
        gameId: data.gameId,
        score: 0,
        accuracy: 0,
        combo: 0,
        level: 1,
        startTime: Date.now(),
        isActive: true,
      };
      gameStates.set(data.sessionId, state);

      // Notify parent dashboard
      io.to(`child:${data.childId}`).emit('game:state', {
        type: 'started',
        sessionId: data.sessionId,
        gameId: data.gameId,
        startTime: state.startTime,
      });
    });

    socket.on('game:score', async (data: {
      sessionId: string;
      score: number;
      accuracy: number;
      combo: number;
      eventType?: string;
    }) => {
      const state = gameStates.get(data.sessionId);
      if (!state) return;

      state.score = data.score;
      state.accuracy = data.accuracy;
      state.combo = data.combo;

      // Update DB (throttled in real app)
      try {
        await pool.query(
          `UPDATE training_sessions SET score = ?, accuracy = ?, combo_max = GREATEST(combo_max, ?) WHERE id = ?`,
          [data.score, data.accuracy, data.combo, data.sessionId]
        );
      } catch (err) {
        console.error('Score update error:', err);
      }

      // Real-time broadcast to parent dashboard
      io.to(`child:${state.childId}`).emit('game:state', {
        type: 'score_update',
        sessionId: data.sessionId,
        score: data.score,
        accuracy: data.accuracy,
        combo: data.combo,
        elapsed: Date.now() - state.startTime,
      });
    });

    socket.on('game:progress', async (data: {
      sessionId: string;
      level: number;
      progress: number;
    }) => {
      const state = gameStates.get(data.sessionId);
      if (!state) return;

      state.level = data.level;

      io.to(`child:${state.childId}`).emit('game:state', {
        type: 'progress',
        sessionId: data.sessionId,
        level: data.level,
        progress: data.progress,
      });
    });

    socket.on('game:event', async (data: {
      sessionId: string;
      eventType: string;
      eventData: Record<string, unknown>;
      timestampMs: number;
    }) => {
      const state = gameStates.get(data.sessionId);
      if (!state) return;

      // Log to DB
      try {
        await pool.query(
          'INSERT INTO game_records (id, session_id, event_type, event_data, timestamp_ms) VALUES (?, ?, ?, ?, ?)',
          [require('uuid').v4(), data.sessionId, data.eventType, JSON.stringify(data.eventData), data.timestampMs]
        );
      } catch (err) {
        console.error('Event log error:', err);
      }

      io.to(`child:${state.childId}`).emit('game:event', {
        sessionId: data.sessionId,
        eventType: data.eventType,
        eventData: data.eventData,
        timestampMs: data.timestampMs,
      });
    });

    socket.on('game:complete', async (data: {
      sessionId: string;
      score: number;
      duration: number;
      accuracy: number;
      comboMax: number;
      levelCompleted: number;
    }) => {
      const state = gameStates.get(data.sessionId);
      if (!state) return;

      state.isActive = false;
      state.score = data.score;

      // Final DB update
      try {
        await pool.query(
          `UPDATE training_sessions SET 
           score = ?, duration = ?, accuracy = ?, combo_max = ?, level_completed = ?, ended_at = NOW()
           WHERE id = ?`,
          [data.score, data.duration, data.accuracy, data.comboMax, data.levelCompleted, data.sessionId]
        );
      } catch (err) {
        console.error('Complete error:', err);
      }

      gameStates.delete(data.sessionId);

      io.to(`child:${state.childId}`).emit('game:state', {
        type: 'completed',
        sessionId: data.sessionId,
        score: data.score,
        duration: data.duration,
        accuracy: data.accuracy,
        totalTime: Date.now() - state.startTime,
      });
    });

    socket.on('game:abort', async (data: { sessionId: string }) => {
      const state = gameStates.get(data.sessionId);
      if (!state) return;

      state.isActive = false;

      try {
        await pool.query(
          `UPDATE training_sessions SET ended_at = NOW() WHERE id = ? AND ended_at IS NULL`,
          [data.sessionId]
        );
      } catch (err) {
        console.error('Abort error:', err);
      }

      gameStates.delete(data.sessionId);

      io.to(`child:${state.childId}`).emit('game:state', {
        type: 'aborted',
        sessionId: data.sessionId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Clean up any active games
      gameStates.forEach((state, sessionId) => {
        if (state.isActive) {
          // Mark as ended
          pool.query(
            `UPDATE training_sessions SET ended_at = NOW() WHERE id = ? AND ended_at IS NULL`,
            [sessionId]
          ).catch(() => {});
          state.isActive = false;
        }
      });
    });
  });
}
