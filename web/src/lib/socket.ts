import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token') || '';
    socket = io({
      auth: { token },
      query: { token },
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }
  return socket;
}

export function joinChildRoom(childId: string) {
  getSocket().emit('child:join', childId);
}

export function leaveChildRoom(childId: string) {
  getSocket().emit('child:leave', childId);
}

export function emitGameStart(data: {
  sessionId: string;
  childId: string;
  gameId: string;
  spatialFrequency: string;
  trainingMode: string;
}) {
  getSocket().emit('game:start', data);
}

export function emitGameScore(data: {
  sessionId: string;
  score: number;
  accuracy: number;
  combo: number;
  eventType?: string;
}) {
  getSocket().emit('game:score', data);
}

export function emitGameProgress(data: {
  sessionId: string;
  level: number;
  progress: number;
}) {
  getSocket().emit('game:progress', data);
}

export function emitGameEvent(data: {
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestampMs: number;
}) {
  getSocket().emit('game:event', data);
}

export function emitGameComplete(data: {
  sessionId: string;
  score: number;
  duration: number;
  accuracy: number;
  comboMax: number;
  levelCompleted: number;
}) {
  getSocket().emit('game:complete', data);
}

export function emitGameAbort(data: { sessionId: string }) {
  getSocket().emit('game:abort', data);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
