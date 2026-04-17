import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { GAMES } from '../types';

const router = Router();

// Get all available games
router.get('/games', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json(GAMES);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start a training session
router.post('/session/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { child_id, game_id, training_mode, dominant_eye, spatial_frequency, game_config } = req.body;
    if (!child_id || !game_id) {
      return res.status(400).json({ error: '儿童ID和游戏ID必填' });
    }

    // Get active plan
    const [planRows] = await pool.query(
      'SELECT * FROM training_plans WHERE child_id = ? AND is_active = TRUE LIMIT 1',
      [child_id]
    );
    const plans = planRows as any[];
    const planId = plans.length > 0 ? plans[0].id : null;

    const sessionId = uuidv4();
    await pool.query(
      `INSERT INTO training_sessions 
       (id, child_id, plan_id, game_id, training_mode, dominant_eye, spatial_frequency, score, game_config, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sessionId,
        child_id,
        planId,
        game_id,
        training_mode || 'monocular',
        dominant_eye || 'both',
        spatial_frequency || 'medium',
        0,
        JSON.stringify(game_config || {}),
      ]
    );

    res.status(201).json({ session_id: sessionId });
  } catch (error: any) {
    console.error('Start session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update session score (real-time)
router.post('/session/:sessionId/score', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { score, accuracy, combo_max, level_completed } = req.body;

    await pool.query(
      `UPDATE training_sessions SET 
       score = COALESCE(?, score),
       accuracy = COALESCE(?, accuracy),
       combo_max = COALESCE(?, combo_max),
       level_completed = COALESCE(?, level_completed)
       WHERE id = ?`,
      [score, accuracy, combo_max, level_completed, sessionId]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// End training session
router.post('/session/:sessionId/end', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { score, duration, accuracy, combo_max, level_completed } = req.body;

    await pool.query(
      `UPDATE training_sessions SET 
       score = COALESCE(?, score),
       duration = COALESCE(?, duration),
       accuracy = COALESCE(?, accuracy),
       combo_max = COALESCE(?, combo_max),
       level_completed = COALESCE(?, level_completed),
       ended_at = NOW()
       WHERE id = ?`,
      [score, duration, accuracy, combo_max, level_completed, sessionId]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record game event
router.post('/session/:sessionId/event', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { event_type, event_data, timestamp_ms } = req.body;

    await pool.query(
      'INSERT INTO game_records (id, session_id, event_type, event_data, timestamp_ms) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), sessionId, event_type, JSON.stringify(event_data || {}), timestamp_ms || 0]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get training history for child
router.get('/history/:childId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const [rows] = await pool.query(
      `SELECT ts.*, g.name as game_name, g.name_cn as game_name_cn
       FROM training_sessions ts
       LEFT JOIN training_plans tp ON tp.id = ts.plan_id
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       LEFT JOIN (
         VALUES ROW('stripe-chase','Stripe Chase','条纹追踪'),
                ROW('dot-pop','Dot Pop','光斑消消乐'),
                ROW('fusion-puzzle','Fusion Puzzle','融合小拼图'),
                ROW('memory-flip','Memory Flip','记忆翻翻卡'),
                ROW('draw-line','Draw the Line','眼手画线'),
                ROW('accommodation-lift','Accommodation Lift','调节升降台'),
                ROW('sf-matching','SF Matching','SF连连看'),
                ROW('depth-blocks','Depth Blocks','立体积木拼'),
                ROW('visual-search-maze','Visual Search Maze','视觉搜索迷宫'),
                ROW('quick-match','Quick Match','快速对对碰')
       ) AS g(game_id, name, name_cn) ON g.game_id = ts.game_id
       WHERE ts.child_id = ? AND fm.user_id = ?
       ORDER BY ts.started_at DESC
       LIMIT ? OFFSET ?`,
      [childId, req.userId, Number(limit), Number(offset)]
    );

    res.json(rows);
  } catch (error: any) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get progress data (daily aggregated scores)
router.get('/progress/:childId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const { period = 'week' } = req.query;

    let dateFormat = '%Y-%m-%d';
    let groupBy = 'DATE(started_at)';

    if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(started_at, "%Y-%m")';
    }

    const [rows] = await pool.query(
      `SELECT 
         ${groupBy} as period,
         COUNT(*) as session_count,
         SUM(duration) as total_duration,
         AVG(score) as avg_score,
         AVG(accuracy) as avg_accuracy,
         MAX(score) as max_score
       FROM training_sessions ts
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE ts.child_id = ? AND fm.user_id = ?
       GROUP BY ${groupBy}
       ORDER BY period DESC
       LIMIT 30`,
      [childId, req.userId]
    );

    res.json(rows);
  } catch (error: any) {
    console.error('Progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get daily summary
router.get('/summary/:childId/daily', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         DATE(started_at) as date,
         COUNT(*) as sessions,
         SUM(duration) as total_minutes,
         AVG(score) as avg_score,
         GROUP_CONCAT(DISTINCT game_id) as games_played
       FROM training_sessions ts
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE ts.child_id = ? AND fm.user_id = ?
         AND DATE(started_at) = CURDATE()
       GROUP BY DATE(started_at)`,
      [childId, req.userId]
    ) as any;

    res.json(rows.length > 0 ? rows[0] : null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly report
router.get('/report/:childId/weekly', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         YEARWEEK(started_at, 1) as year_week,
         COUNT(*) as total_sessions,
         SUM(duration) as total_minutes,
         AVG(score) as avg_score,
         AVG(accuracy) as avg_accuracy,
         COUNT(DISTINCT DATE(started_at)) as training_days
       FROM training_sessions ts
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE ts.child_id = ? AND fm.user_id = ?
         AND started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY YEARWEEK(started_at, 1)`,
      [childId, req.userId]
    ) as any;

    // Per-game breakdown
    const [gameBreakdown] = await pool.query(
      `SELECT 
         game_id,
         COUNT(*) as sessions,
         AVG(score) as avg_score,
         SUM(duration) as total_minutes
       FROM training_sessions ts
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE ts.child_id = ? AND fm.user_id = ?
         AND started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY game_id`,
      [childId, req.userId]
    ) as any;

    res.json({
      summary: rows.length > 0 ? rows[0] : null,
      game_breakdown: gameBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate consultation report (with share token)
router.post('/report/:childId/consultation', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;

    // Get recent sessions (last 30 days)
    const [sessions] = await pool.query(
      `SELECT * FROM training_sessions ts
       JOIN children c ON c.id = ts.child_id
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE ts.child_id = ? AND fm.user_id = ?
         AND started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       ORDER BY started_at DESC`,
      [childId, req.userId]
    );

    // Get child info
    const [children] = await pool.query(
      `SELECT c.* FROM children c
       JOIN family_members fm ON fm.family_id = c.family_id
       WHERE c.id = ? AND fm.user_id = ?`,
      [childId, req.userId]
    );
    const childInfo = (children as any[])[0] || {};

    // Calculate progress
    const reportData = {
      child: childInfo,
      sessions_count: (sessions as any[]).length,
      total_minutes: (sessions as any[]).reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / 60,
      avg_score: (sessions as any[]).length > 0
        ? (sessions as any[]).reduce((sum: number, s: any) => sum + (s.score || 0), 0) / (sessions as any[]).length
        : 0,
      sessions_by_game: (sessions as any[]).reduce((acc: Record<string, number>, s: any) => {
        acc[s.game_id] = (acc[s.game_id] || 0) + 1;
        return acc;
      }, {}),
      generated_at: new Date().toISOString(),
    };

    // Save report
    const reportId = uuidv4();
    await pool.query(
      `INSERT INTO reports (id, child_id, report_type, period_start, period_end, summary_data, progress_data)
       VALUES (?, ?, 'consultation', DATE_SUB(CURDATE(), INTERVAL 30 DAY), CURDATE(), ?, ?)`,
      [reportId, childId, JSON.stringify(reportData), JSON.stringify(sessions)]
    );

    // Generate share token (72h expiry)
    const token = uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO report_tokens (id, report_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), reportId, token, expiresAt]
    );

    res.json({
      report_id: reportId,
      share_token: token,
      expires_at: expiresAt,
    });
  } catch (error: any) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Access shared report
router.get('/report/shared/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;

    const [rows] = await pool.query(
      `SELECT r.* FROM report_tokens rt
       JOIN reports r ON r.id = rt.report_id
       WHERE rt.token = ? AND rt.expires_at > NOW()`,
      [token]
    );

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: '链接已失效或不存在' });
    }

    res.json((rows as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
