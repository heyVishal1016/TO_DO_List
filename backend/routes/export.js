import express from 'express';
import multer from 'multer';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { restoreSchema } from '../schemas/index.js';
import { restoreUserTodos } from '../services/restoreService.js';

const router = express.Router();
router.use(verifyToken);

// Configure multer memory storage with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only application/json files are accepted'), false);
    }
  }
});

// Middleware to handle Multer file upload errors gracefully (e.g. 413 on payload too large)
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Uploaded file exceeds the maximum 10MB size limit' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}

// GET /api/export/json - Export user profile and tasks
router.get('/export/json', (req, res) => {
  try {
    const userId = req.userId;
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(userId);
    const todos = db.prepare(`
      SELECT id, title, description, due_date, priority, completed, created_at, updated_at
      FROM todos
      WHERE user_id = ?
      ORDER BY id ASC
    `).all(userId);

    const payload = {
      user,
      todos,
      exportedAt: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="todos-export-${userId}.json"`);
    return res.json({
      data: payload,
      user,
      todos
    });
  } catch (err) {
    console.error('Export JSON error:', err);
    return res.status(500).json({ error: 'Failed to export tasks as JSON' });
  }
});

// GET /api/export/csv - Export tasks as CSV with proper quoting
router.get('/export/csv', (req, res) => {
  try {
    const userId = req.userId;
    const todos = db.prepare(`
      SELECT id, title, description, due_date, priority, completed, created_at, updated_at
      FROM todos
      WHERE user_id = ?
      ORDER BY id ASC
    `).all(userId);

    const headers = ['id', 'title', 'description', 'due_date', 'priority', 'completed', 'created_at', 'updated_at'];
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = todos.map((t) => [
      t.id,
      escapeCsv(t.title),
      escapeCsv(t.description),
      escapeCsv(t.due_date),
      escapeCsv(t.priority),
      t.completed ? 1 : 0,
      escapeCsv(t.created_at),
      escapeCsv(t.updated_at)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="todos-export-${userId}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export tasks as CSV' });
  }
});

// POST /api/restore/json - Restore tasks with transaction (mode=merge|replace)
router.post('/restore/json', uploadMiddleware, (req, res) => {
  try {
    const mode = req.query.mode === 'replace' ? 'replace' : 'merge';
    let rawData = req.body;

    if (req.file) {
      try {
        rawData = JSON.parse(req.file.buffer.toString('utf-8'));
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON file: syntax error during parse' });
      }
    }

    // Unwrap nested payload wrapper if present
    if (rawData.data && rawData.data.todos) {
      rawData = rawData.data;
    } else if (Array.isArray(rawData)) {
      rawData = { todos: rawData };
    }

    // Validate using Zod schema
    const validation = restoreSchema.safeParse(rawData);
    if (!validation.success) {
      const issues = validation.error.errors;
      const error = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ error, issues });
    }

    const { todos } = validation.data;
    const result = restoreUserTodos(req.userId, todos, mode);

    return res.json({
      data: {
        restored: result.restored,
        mode: result.mode
      }
    });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(400).json({ error: err.message || 'Failed to restore tasks' });
  }
});

export default router;
