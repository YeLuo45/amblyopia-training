import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Get family info
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [familyRows] = await pool.query(
      `SELECT f.* FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? LIMIT 1`,
      [req.userId]
    );
    const families = familyRows as any[];
    if (families.length === 0) {
      return res.status(404).json({ error: '未找到家庭' });
    }
    res.json(families[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get children list
router.get('/children', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [familyRows] = await pool.query(
      `SELECT f.id FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? LIMIT 1`,
      [req.userId]
    );
    const families = familyRows as any[];
    if (families.length === 0) {
      return res.json([]);
    }

    const [children] = await pool.query(
      'SELECT * FROM children WHERE family_id = ? ORDER BY created_at DESC',
      [families[0].id]
    );
    res.json(children);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add child
router.post('/children', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, gender, birth_date, eye_condition, diagnosis_date, treatment_phase } = req.body;
    if (!name) {
      return res.status(400).json({ error: '儿童姓名必填' });
    }

    const [familyRows] = await pool.query(
      `SELECT f.id FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? LIMIT 1`,
      [req.userId]
    );
    const families = familyRows as any[];
    if (families.length === 0) {
      return res.status(404).json({ error: '未找到家庭' });
    }

    const childId = uuidv4();
    await pool.query(
      `INSERT INTO children (id, family_id, name, gender, birth_date, eye_condition, diagnosis_date, treatment_phase) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        childId,
        families[0].id,
        name,
        gender || 'other',
        birth_date || null,
        eye_condition || 'unknown',
        diagnosis_date || null,
        treatment_phase || 'initial',
      ]
    );

    // Create default training plan
    const planId = uuidv4();
    await pool.query(
      `INSERT INTO training_plans (id, child_id, plan_name, daily_duration, spatial_frequency_level, training_mode, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [planId, childId, '默认计划', 20, 'medium', 'monocular', true]
    );

    // Create default game configs for all games
    const gameIds = [
      'stripe-chase', 'dot-pop', 'fusion-puzzle', 'memory-flip', 'draw-line',
      'accommodation-lift', 'sf-matching', 'depth-blocks', 'visual-search-maze', 'quick-match',
    ];
    for (const gameId of gameIds) {
      await pool.query(
        `INSERT INTO game_configs (id, child_id, game_id, spatial_frequency, contrast, target_size, speed, is_enabled, background_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), childId, gameId, 'medium', 'medium', 'medium', 'medium', true, 'default-dark']
      );
    }

    res.status(201).json({ id: childId, name, message: '儿童档案创建成功' });
  } catch (error: any) {
    console.error('Add child error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update child
router.put('/children/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, gender, birth_date, eye_condition, diagnosis_date, treatment_phase, avatar } =
      req.body;

    await pool.query(
      `UPDATE children SET 
       name = COALESCE(?, name),
       gender = COALESCE(?, gender),
       birth_date = COALESCE(?, birth_date),
       eye_condition = COALESCE(?, eye_condition),
       diagnosis_date = COALESCE(?, diagnosis_date),
       treatment_phase = COALESCE(?, treatment_phase),
       avatar = COALESCE(?, avatar)
       WHERE id = ?`,
      [name, gender, birth_date, eye_condition, diagnosis_date, treatment_phase, avatar, id]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete child
router.delete('/children/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM children WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get training plan for child
router.get('/children/:childId/plan', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM training_plans WHERE child_id = ? AND is_active = TRUE LIMIT 1',
      [childId]
    );
    const plans = rows as any[];
    if (plans.length === 0) {
      return res.json(null);
    }
    res.json(plans[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update training plan
router.put('/children/:childId/plan', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const {
      plan_name,
      phase,
      daily_duration,
      weekly_frequency,
      spatial_frequency_level,
      training_mode,
      dominant_eye,
      allowed_games,
      start_date,
      end_date,
    } = req.body;

    // Deactivate existing active plans
    await pool.query('UPDATE training_plans SET is_active = FALSE WHERE child_id = ?', [childId]);

    // Create new plan
    const planId = uuidv4();
    await pool.query(
      `INSERT INTO training_plans 
       (id, child_id, plan_name, phase, daily_duration, weekly_frequency, spatial_frequency_level, 
        training_mode, dominant_eye, allowed_games, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        childId,
        plan_name || '默认计划',
        phase || 'initial',
        daily_duration || 20,
        weekly_frequency || 7,
        spatial_frequency_level || 'medium',
        training_mode || 'monocular',
        dominant_eye || 'both',
        JSON.stringify(allowed_games || []),
        start_date || null,
        end_date || null,
        true,
      ]
    );

    res.json({ id: planId, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get game configs for child
router.get('/children/:childId/game-configs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId } = req.params;
    const [rows] = await pool.query('SELECT * FROM game_configs WHERE child_id = ?', [childId]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update game config
router.put('/children/:childId/game-configs/:gameId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { childId, gameId } = req.params;
    const { spatial_frequency, contrast, target_size, speed, is_enabled, background_id } = req.body;

    await pool.query(
      `UPDATE game_configs SET 
       spatial_frequency = COALESCE(?, spatial_frequency),
       contrast = COALESCE(?, contrast),
       target_size = COALESCE(?, target_size),
       speed = COALESCE(?, speed),
       is_enabled = COALESCE(?, is_enabled),
       background_id = COALESCE(?, background_id)
       WHERE child_id = ? AND game_id = ?`,
      [spatial_frequency, contrast, target_size, speed, is_enabled, background_id, childId, gameId]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification settings
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [familyRows] = await pool.query(
      `SELECT f.id FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? LIMIT 1`,
      [req.userId]
    );
    const families = familyRows as any[];
    if (families.length === 0) return res.json(null);

    const [rows] = await pool.query(
      'SELECT * FROM notification_settings WHERE family_id = ? LIMIT 1',
      [families[0].id]
    );
    const settings = rows as any[];
    res.json(settings.length > 0 ? settings[0] : null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification settings
router.put('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { reminder_enabled, reminder_times } = req.body;

    const [familyRows] = await pool.query(
      `SELECT f.id FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? LIMIT 1`,
      [req.userId]
    );
    const families = familyRows as any[];
    if (families.length === 0) {
      return res.status(404).json({ error: '未找到家庭' });
    }

    await pool.query(
      `INSERT INTO notification_settings (id, family_id, reminder_enabled, reminder_times)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       reminder_enabled = COALESCE(?, reminder_enabled),
       reminder_times = COALESCE(?, reminder_times)`,
      [
        uuidv4(),
        families[0].id,
        reminder_enabled !== undefined ? reminder_enabled : true,
        JSON.stringify(reminder_times || ['09:00', '19:00']),
        reminder_enabled,
        reminder_times ? JSON.stringify(reminder_times) : null,
      ]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
