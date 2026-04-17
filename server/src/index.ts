import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './db';
import { initSocketIO } from './socket';
import authRoutes from './routes/auth';
import familyRoutes from './routes/family';
import trainingRoutes from './routes/training';
import doctorRoutes from './routes/doctor';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000').split(',');

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/doctor', doctorRoutes);

// HL7/FHIR compatible endpoints
app.get('/fhir/Patient/:id', async (req, res) => {
  // HL7 FHIR Patient resource
  try {
    const { pool } = await import('./db');
    const [rows] = await pool.query('SELECT * FROM children WHERE id = ?', [req.params.id]);
    const children = rows as any[];
    if (children.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    const child = children[0];
    res.json({
      resourceType: 'Patient',
      id: child.id,
      name: [{ text: child.name }],
      gender: child.gender === 'male' ? 'male' : child.gender === 'female' ? 'female' : 'unknown',
      birthDate: child.birth_date,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/fhir/Observation', async (req, res) => {
  // HL7 FHIR Observation resource for training records
  try {
    const { pool } = await import('./db');
    const { patientId, date } = req.query;
    let query = `
      SELECT ts.*, c.name as child_name 
      FROM training_sessions ts 
      JOIN children c ON c.id = ts.child_id 
      WHERE 1=1
    `;
    const params: any[] = [];
    if (patientId) {
      query += ' AND ts.child_id = ?';
      params.push(patientId);
    }
    if (date) {
      query += ' AND DATE(ts.started_at) = ?';
      params.push(date);
    }
    query += ' ORDER BY ts.started_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    const observations = (rows as any[]).map(s => ({
      resourceType: 'Observation',
      id: s.id,
      status: s.ended_at ? 'final' : 'preliminary',
      code: {
        coding: [{
          system: 'http://amblyopia-training.local/game',
          code: s.game_id,
          display: s.game_id,
        }],
      },
      subject: {
        reference: `Patient/${s.child_id}`,
        display: s.child_name,
      },
      effectiveDateTime: s.started_at,
      valueQuantity: {
        value: s.score,
        unit: 'score',
      },
      component: [
        {
          code: { text: 'duration' },
          valueQuantity: { value: s.duration, unit: 'seconds' },
        },
        {
          code: { text: 'accuracy' },
          valueQuantity: { value: s.accuracy, unit: '%' },
        },
      ],
    }));
    res.json({ resourceType: 'Bundle', entry: observations.map(o => ({ resource: o })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    initSocketIO(io);
    console.log('Socket.IO initialized');

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`FHIR: http://localhost:${PORT}/fhir`);
      console.log(`WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
