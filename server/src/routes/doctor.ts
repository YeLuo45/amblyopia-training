import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// All routes require doctor or admin role
function doctorOnly(req: AuthRequest, res: Response, next: Function) {
  if (req.userRole !== 'doctor' && req.userRole !== 'admin') {
    return res.status(403).json({ error: '需要医生或管理员权限' });
  }
  next();
}

// Register as doctor
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, nickname, hospital, specialty, license_number } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, nickname, role) VALUES (?, ?, ?, ?, ?)`,
      [id, email, password_hash, nickname || null, 'doctor']
    );

    // Create doctor profile
    await pool.query(
      `INSERT INTO doctor_profiles (id, user_id, hospital, specialty, license_number)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), id, hospital || null, specialty || null, license_number || null]
    );

    const token = generateToken(id, 'doctor');
    res.status(201).json({
      token,
      user: { id, email, nickname, role: 'doctor' },
    });
  } catch (error: any) {
    console.error('Doctor register error:', error);
    res.status(500).json({ error: '注册失败: ' + error.message });
  }
});

// Doctor login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [email, 'doctor']
    );
    const users = rows as any[];
    if (users.length === 0) {
      return res.status(401).json({ error: '账号不存在或非医生账号' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '密码错误' });
    }

    // Get doctor profile
    const [profiles] = await pool.query(
      'SELECT * FROM doctor_profiles WHERE user_id = ?',
      [user.id]
    );
    const profile = (profiles as any[])[0] || {};

    const token = generateToken(user.id, 'doctor');
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
      profile: {
        hospital: profile.hospital,
        specialty: profile.specialty,
        license_number: profile.license_number,
      },
    });
  } catch (error: any) {
    console.error('Doctor login error:', error);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// Get my doctor profile
router.get('/profile', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const usersArr = users as any[];
    if (usersArr.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const user = usersArr[0];

    const [profiles] = await pool.query('SELECT * FROM doctor_profiles WHERE user_id = ?', [req.userId]);
    const profile = (profiles as any[])[0] || {};

    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      hospital: profile.hospital,
      specialty: profile.specialty,
      license_number: profile.license_number,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update doctor profile
router.put('/profile', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname, hospital, specialty, license_number } = req.body;
    await pool.query(
      'UPDATE users SET nickname = COALESCE(?, nickname) WHERE id = ?',
      [nickname, req.userId]
    );
    await pool.query(
      `INSERT INTO doctor_profiles (id, user_id, hospital, specialty, license_number)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       hospital = COALESCE(?, hospital),
       specialty = COALESCE(?, specialty),
       license_number = COALESCE(?, license_number)`,
      [uuidv4(), req.userId, hospital, specialty, license_number, hospital, specialty, license_number]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patients assigned to this doctor
router.get('/patients', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, dp.name as doctor_name, dp.id as prescription_id,
              tp.phase, tp.daily_duration, tp.weekly_frequency, tp.spatial_frequency_level,
              tp.training_mode, tp.is_active as plan_active,
              (SELECT COUNT(*) FROM training_sessions WHERE child_id = c.id) as total_sessions,
              (SELECT MAX(started_at) FROM training_sessions WHERE child_id = c.id) as last_session
       FROM doctor_patients dp
       JOIN children c ON c.id = dp.child_id
       LEFT JOIN training_plans tp ON tp.child_id = c.id AND tp.is_active = TRUE
       WHERE dp.doctor_id = ?
       ORDER BY dp.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (error: any) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add patient (assign child to doctor)
router.post('/patients', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { child_id } = req.body;
    if (!child_id) {
      return res.status(400).json({ error: '儿童ID必填' });
    }

    // Check if already assigned
    const [existing] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, child_id]
    );
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ error: '该患者已分配给您' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO doctor_patients (id, doctor_id, child_id) VALUES (?, ?, ?)',
      [id, req.userId, child_id]
    );

    res.status(201).json({ id, message: '患者添加成功' });
  } catch (error: any) {
    console.error('Add patient error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove patient
router.delete('/patients/:childId', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'DELETE FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient's training details
router.get('/patients/:childId/sessions', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    // Verify patient belongs to this doctor
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const { limit = 50, offset = 0 } = req.query;
    const [rows] = await pool.query(
      `SELECT ts.*, g.name as game_name, g.name_cn as game_name_cn
       FROM training_sessions ts
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
       WHERE ts.child_id = ?
       ORDER BY ts.started_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.childId, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient's progress data
router.get('/patients/:childId/progress', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

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
       FROM training_sessions
       WHERE child_id = ?
       GROUP BY ${groupBy}
       ORDER BY period DESC
       LIMIT 30`,
      [req.params.childId]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient's weekly report
router.get('/patients/:childId/report', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    // Child info
    const [children] = await pool.query('SELECT * FROM children WHERE id = ?', [req.params.childId]);
    const child = (children as any[])[0] || {};

    // Summary stats
    const [summary] = await pool.query(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(duration) as total_minutes,
         AVG(score) as avg_score,
         AVG(accuracy) as avg_accuracy,
         COUNT(DISTINCT DATE(started_at)) as training_days,
         MAX(started_at) as last_session
       FROM training_sessions
       WHERE child_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [req.params.childId]
    ) as any[];

    // Per-game breakdown (30 days)
    const [gameBreakdown] = await pool.query(
      `SELECT 
         game_id,
         COUNT(*) as sessions,
         AVG(score) as avg_score,
         SUM(duration) as total_minutes,
         AVG(accuracy) as avg_accuracy
       FROM training_sessions
       WHERE child_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY game_id`,
      [req.params.childId]
    ) as any[];

    // Weekly trend (last 4 weeks)
    const [weeklyTrend] = await pool.query(
      `SELECT 
         YEARWEEK(started_at, 1) as week,
         COUNT(*) as sessions,
         AVG(score) as avg_score,
         SUM(duration) as total_minutes
       FROM training_sessions
       WHERE child_id = ? AND started_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
       GROUP BY YEARWEEK(started_at, 1)
       ORDER BY week`,
      [req.params.childId]
    ) as any[];

    // Compliance (days trained vs prescribed)
    const [plan] = await pool.query(
      'SELECT * FROM training_plans WHERE child_id = ? AND is_active = TRUE LIMIT 1',
      [req.params.childId]
    ) as any[];
    const activePlan = plan[0] || {};

    res.json({
      child,
      summary: summary[0] || null,
      game_breakdown: gameBreakdown,
      weekly_trend: weeklyTrend,
      active_plan: activePlan,
    });
  } catch (error: any) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient's training plan
router.put('/patients/:childId/plan', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const {
      plan_name, phase, daily_duration, weekly_frequency,
      spatial_frequency_level, training_mode, dominant_eye,
      allowed_games, start_date, end_date,
    } = req.body;

    // Deactivate existing plans
    await pool.query(
      'UPDATE training_plans SET is_active = FALSE WHERE child_id = ?',
      [req.params.childId]
    );

    const planId = uuidv4();
    await pool.query(
      `INSERT INTO training_plans 
       (id, child_id, plan_name, phase, daily_duration, weekly_frequency, spatial_frequency_level,
        training_mode, dominant_eye, allowed_games, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        req.params.childId,
        plan_name || '医生处方',
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

// Send reminder to patient/family
router.post('/patients/:childId/remind', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const { message } = req.body;

    // Store reminder in DB
    const reminderId = uuidv4();
    await pool.query(
      `INSERT INTO doctor_reminders (id, doctor_id, child_id, message, is_read)
       VALUES (?, ?, ?, ?, FALSE)`,
      [reminderId, req.userId, req.params.childId, message || '请坚持每日训练']
    );

    res.status(201).json({ id: reminderId, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FHIR R4 Export - Patient resource
router.get('/fhir/Patient/:childId', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const [children] = await pool.query('SELECT * FROM children WHERE id = ?', [req.params.childId]);
    const child = (children as any[])[0];
    if (!child) return res.status(404).json({ error: '患者不存在' });

    // FHIR Patient resource
    const fhirPatient = {
      resourceType: 'Patient',
      id: child.id,
      name: [{ text: child.name, use: 'official' }],
      gender: child.gender === 'male' ? 'male' : child.gender === 'female' ? 'female' : 'unknown',
      birthDate: child.birth_date ? new Date(child.birth_date).toISOString().split('T')[0] : undefined,
      extension: [
        { url: 'http://amblyopia-training.local/eye-condition', valueString: child.eye_condition },
        { url: 'http://amblyopia-training.local/treatment-phase', valueString: child.treatment_phase },
      ],
    };

    res.json(fhirPatient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FHIR R4 Export - all observations for a patient
router.get('/fhir/Observation', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { childId, dateFrom, dateTo, _count = 100 } = req.query;

    let query = `
      SELECT ts.*, c.name as child_name 
      FROM training_sessions ts 
      JOIN children c ON c.id = ts.child_id
      JOIN doctor_patients dp ON dp.child_id = ts.child_id
      WHERE dp.doctor_id = ?
    `;
    const params: any[] = [req.userId];

    if (childId) {
      query += ' AND ts.child_id = ?';
      params.push(childId);
    }
    if (dateFrom) {
      query += ' AND ts.started_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND ts.started_at <= ?';
      params.push(dateTo);
    }
    query += ' ORDER BY ts.started_at DESC LIMIT ?';
    params.push(Number(_count));

    const [rows] = await pool.query(query, params);

    const observations = (rows as any[]).map(s => ({
      resourceType: 'Observation',
      id: s.id,
      status: s.ended_at ? 'final' : 'preliminary',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity', display: 'Activity' }] }],
      code: {
        coding: [{ system: 'http://amblyopia-training.local/game', code: s.game_id, display: s.game_id }],
        text: s.game_id,
      },
      subject: { reference: `Patient/${s.child_id}`, display: s.child_name },
      effectiveDateTime: s.started_at,
      issued: s.created_at,
      valueQuantity: { value: s.score, unit: 'score' },
      component: [
        { code: { text: 'duration' }, valueQuantity: { value: s.duration, unit: 'seconds' } },
        { code: { text: 'accuracy' }, valueQuantity: { value: Number(s.accuracy), unit: '%' } },
        { code: { text: 'combo_max' }, valueQuantity: { value: s.combo_max, unit: 'count' } },
        { code: { text: 'level_completed' }, valueQuantity: { value: s.level_completed, unit: 'level' } },
      ],
    }));

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map(o => ({ resource: o })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FHIR R4 Export - CarePlan for training prescription
router.get('/fhir/CarePlan/:childId', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const [plans] = await pool.query(
      'SELECT * FROM training_plans WHERE child_id = ? AND is_active = TRUE LIMIT 1',
      [req.params.childId]
    );
    const plan = (plans as any[])[0];
    if (!plan) return res.json({ resourceType: 'CarePlan', id: req.params.childId + '-no-plan', status: 'unknown' });

    const carePlan = {
      resourceType: 'CarePlan',
      id: plan.id,
      status: plan.is_active ? 'active' : 'completed',
      intent: 'plan',
      title: plan.plan_name,
      description: `每日${plan.daily_duration}分钟，每周${plan.weekly_frequency}次，空间频率${plan.spatial_frequency_level}，训练模式${plan.training_mode}`,
      subject: { reference: `Patient/${req.params.childId}` },
      period: {
        start: plan.start_date,
        end: plan.end_date,
      },
      activity: plan.allowed_games ? JSON.parse(plan.allowed_games).map((g: string) => ({
        detail: { description: g, status: 'scheduled' },
      })) : [],
    };

    res.json(carePlan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient list from family code (for assigning new patients)
router.get('/search-patients', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || String(q).length < 2) {
      return res.json([]);
    }

    const search = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT c.*, f.name as family_name
       FROM children c
       JOIN families f ON f.id = c.family_id
       WHERE c.name LIKE ? OR f.name LIKE ?
       LIMIT 20`,
      [search, search]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRESCRIPTIONS ==========

// Create prescription
router.post('/prescriptions', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      child_id, plan_name, daily_duration, spatial_frequency_level,
      training_mode, dominant_eye, allowed_games, instructions,
      start_date, end_date,
    } = req.body;

    if (!child_id) {
      return res.status(400).json({ error: '儿童ID必填' });
    }

    // Verify patient belongs to this doctor
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, child_id]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO prescriptions 
       (id, doctor_id, child_id, plan_name, daily_duration, spatial_frequency_level,
        training_mode, dominant_eye, allowed_games, instructions, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        id, req.userId, child_id, plan_name || '医生处方', daily_duration || 20,
        spatial_frequency_level || 'medium', training_mode || 'monocular',
        dominant_eye || 'both', JSON.stringify(allowed_games || []),
        instructions || null, start_date || null, end_date || null,
      ]
    );

    res.status(201).json({ id, success: true });
  } catch (error: any) {
    console.error('Create prescription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get prescription by ID
router.get('/prescriptions/:id', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as child_name
       FROM prescriptions p
       JOIN children c ON c.id = p.child_id
       WHERE p.id = ? AND p.doctor_id = ?`,
      [req.params.id, req.userId]
    );
    const prescriptions = rows as any[];
    if (prescriptions.length === 0) {
      return res.status(404).json({ error: '处方不存在' });
    }
    const prescription = prescriptions[0];
    prescription.allowed_games = prescription.allowed_games ? JSON.parse(prescription.allowed_games) : [];
    res.json(prescription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update prescription
router.put('/prescriptions/:id', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      plan_name, daily_duration, spatial_frequency_level,
      training_mode, dominant_eye, allowed_games, instructions,
      status, start_date, end_date,
    } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM prescriptions WHERE id = ? AND doctor_id = ?',
      [req.params.id, req.userId]
    );
    if ((existing as any[]).length === 0) {
      return res.status(404).json({ error: '处方不存在' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (plan_name !== undefined) { updates.push('plan_name = ?'); params.push(plan_name); }
    if (daily_duration !== undefined) { updates.push('daily_duration = ?'); params.push(daily_duration); }
    if (spatial_frequency_level !== undefined) { updates.push('spatial_frequency_level = ?'); params.push(spatial_frequency_level); }
    if (training_mode !== undefined) { updates.push('training_mode = ?'); params.push(training_mode); }
    if (dominant_eye !== undefined) { updates.push('dominant_eye = ?'); params.push(dominant_eye); }
    if (allowed_games !== undefined) { updates.push('allowed_games = ?'); params.push(JSON.stringify(allowed_games)); }
    if (instructions !== undefined) { updates.push('instructions = ?'); params.push(instructions); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await pool.query(
        `UPDATE prescriptions SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get prescriptions for a patient
router.get('/patients/:childId/prescriptions', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM prescriptions WHERE child_id = ? ORDER BY created_at DESC`,
      [req.params.childId]
    );
    const prescriptions = (rows as any[]).map((p: any) => ({
      ...p,
      allowed_games: p.allowed_games ? JSON.parse(p.allowed_games) : [],
    }));
    res.json(prescriptions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FHIR Export for a patient (combined bundle)
router.get('/patients/:childId/fhir-export', authMiddleware, doctorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [assigned] = await pool.query(
      'SELECT id FROM doctor_patients WHERE doctor_id = ? AND child_id = ?',
      [req.userId, req.params.childId]
    );
    if ((assigned as any[]).length === 0) {
      return res.status(403).json({ error: '该患者不属于您' });
    }

    // Get child info
    const [children] = await pool.query('SELECT * FROM children WHERE id = ?', [req.params.childId]);
    const child = (children as any[])[0];
    if (!child) return res.status(404).json({ error: '患者不存在' });

    // FHIR Patient
    const fhirPatient = {
      resourceType: 'Patient',
      id: child.id,
      name: [{ text: child.name, use: 'official' }],
      gender: child.gender === 'male' ? 'male' : child.gender === 'female' ? 'female' : 'unknown',
      birthDate: child.birth_date ? new Date(child.birth_date).toISOString().split('T')[0] : undefined,
      extension: [
        { url: 'http://amblyopia-training.local/eye-condition', valueString: child.eye_condition },
        { url: 'http://amblyopia-training.local/treatment-phase', valueString: child.treatment_phase },
      ],
    };

    // Get training sessions
    const [sessions] = await pool.query(
      `SELECT * FROM training_sessions WHERE child_id = ? ORDER BY started_at DESC LIMIT 100`,
      [req.params.childId]
    );

    const observations = (sessions as any[]).map(s => ({
      resourceType: 'Observation',
      id: s.id,
      status: s.ended_at ? 'final' : 'preliminary',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity', display: 'Activity' }] }],
      code: { coding: [{ system: 'http://amblyopia-training.local/game', code: s.game_id, display: s.game_id }], text: s.game_id },
      subject: { reference: `Patient/${s.child_id}`, display: child.name },
      effectiveDateTime: s.started_at,
      valueQuantity: { value: s.score, unit: 'score' },
      component: [
        { code: { text: 'duration' }, valueQuantity: { value: s.duration, unit: 'seconds' } },
        { code: { text: 'accuracy' }, valueQuantity: { value: Number(s.accuracy), unit: '%' } },
      ],
    }));

    // Get active prescription
    const [plans] = await pool.query(
      'SELECT * FROM prescriptions WHERE child_id = ? AND status = "active" LIMIT 1',
      [req.params.childId]
    );
    const activePlan = (plans as any[])[0];

    let carePlan: any = null;
    if (activePlan) {
      carePlan = {
        resourceType: 'CarePlan',
        id: activePlan.id,
        status: activePlan.status === 'active' ? 'active' : 'completed',
        intent: 'plan',
        title: activePlan.plan_name,
        description: `每日${activePlan.daily_duration}分钟，空间频率${activePlan.spatial_frequency_level}，训练模式${activePlan.training_mode}`,
        subject: { reference: `Patient/${req.params.childId}` },
        period: { start: activePlan.start_date, end: activePlan.end_date },
        activity: activePlan.allowed_games ? JSON.parse(activePlan.allowed_games).map((g: string) => ({
          detail: { description: g, status: 'scheduled' },
        })) : [],
      };
    }

    // Build FHIR Bundle
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        { resource: fhirPatient },
        ...observations.map(o => ({ resource: o })),
        ...(carePlan ? [{ resource: carePlan }] : []),
      ],
    };

    res.json(bundle);
  } catch (error: any) {
    console.error('FHIR export error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
