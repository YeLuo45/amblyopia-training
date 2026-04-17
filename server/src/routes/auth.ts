import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Register
router.post('/register', async (req, res: Response) => {
  try {
    const { phone, email, password, nickname } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ error: '手机号或邮箱必填' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE phone = ? OR email = ?',
      [phone || null, email || null]
    );
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ error: '账号已存在' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (id, phone, email, password_hash, nickname, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, phone || null, email || null, password_hash, nickname || null, 'parent']
    );

    // Create default family for this user
    const familyId = uuidv4();
    await pool.query('INSERT INTO families (id, name, owner_id) VALUES (?, ?, ?)', [
      familyId,
      `${nickname || '我的'}家庭`,
      id,
    ]);
    await pool.query(
      'INSERT INTO family_members (id, family_id, user_id, role) VALUES (?, ?, ?, ?)',
      [uuidv4(), familyId, id, 'owner']
    );

    // Create default notification settings
    await pool.query(
      'INSERT INTO notification_settings (id, family_id, reminder_times) VALUES (?, ?, ?)',
      [uuidv4(), familyId, JSON.stringify(['09:00', '19:00'])]
    );

    const token = generateToken(id, 'parent');
    res.status(201).json({
      token,
      user: { id, phone, email, nickname, role: 'parent' },
      familyId,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败: ' + error.message });
  }
});

// Login
router.post('/login', async (req, res: Response) => {
  try {
    const { phone, email, password } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ error: '手机号或邮箱必填' });
    }
    if (!password) {
      return res.status(400).json({ error: '密码必填' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone = ? OR email = ?',
      [phone || null, email || null]
    );
    const users = rows as any[];
    if (users.length === 0) {
      return res.status(401).json({ error: '账号不存在' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '密码错误' });
    }

    // Get family
    const [familyRows] = await pool.query(
      `SELECT f.* FROM families f 
       JOIN family_members fm ON fm.family_id = f.id 
       WHERE fm.user_id = ? AND fm.role = 'owner' LIMIT 1`,
      [user.id]
    );
    const families = familyRows as any[];

    const token = generateToken(user.id, user.role);
    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
      familyId: families.length > 0 ? families[0].id : null,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// Get current user info
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const users = rows as any[];
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const user = users[0];
    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname, avatar } = req.body;
    await pool.query(
      'UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar) WHERE id = ?',
      [nickname, avatar, req.userId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
