import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { validateBody } from '../middleware/validate.js';
import { verifyToken } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../schemas/index.js';

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Auto-promote first registered user to admin
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const makeAdmin = isAdmin || totalUsers === 0 ? 1 : 0;

    // Hash password with 12 salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (email, password, is_admin)
      VALUES (?, ?, ?)
    `).run(normalizedEmail, hashedPassword, makeAdmin);

    const newUser = {
      id: Number(result.lastInsertRowid),
      email: normalizedEmail,
      is_admin: makeAdmin,
      created_at: new Date().toISOString()
    };

    const token = createToken(newUser);
    return res.status(201).json({
      token,
      user: newUser,
      data: {
        token,
        user: newUser
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register account' });
  }
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = db.prepare('SELECT id, email, password, is_admin, created_at FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      created_at: user.created_at
    };

    const token = createToken(safeUser);
    return res.json({
      token,
      user: safeUser,
      data: {
        token,
        user: safeUser
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, is_admin, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      data: user,
      user
    });
  } catch (err) {
    console.error('Auth /me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;
