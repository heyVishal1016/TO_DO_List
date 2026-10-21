import express from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createTodoSchema, updateTodoSchema } from '../schemas/index.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/todos/stats - Dashboard analytics
router.get('/stats', (req, res) => {
  try {
    const userId = req.userId;
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN due_date IS NOT NULL AND due_date < date('now') AND completed = 0 THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN due_date = date('now') THEN 1 ELSE 0 END) AS due_today
      FROM todos
      WHERE user_id = ?
    `).get(userId);

    const total = stats.total || 0;
    const completed = stats.completed || 0;
    const pending = stats.pending || 0;
    const overdue = stats.overdue || 0;
    const dueToday = stats.due_today || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.json({
      data: {
        total,
        completed,
        pending,
        overdue,
        dueToday,
        todayCount: dueToday,
        completionRate
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve task statistics' });
  }
});

// DELETE /api/todos/completed - Bulk delete completed tasks
router.delete('/completed', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM todos WHERE user_id = ? AND completed = 1').run(req.userId);
    return res.json({
      data: {
        deleted: result.changes,
        deletedCount: result.changes
      }
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    return res.status(500).json({ error: 'Failed to clear completed tasks' });
  }
});

// GET /api/todos - List tasks with parameterized dynamic filters
router.get('/', (req, res) => {
  try {
    const userId = req.userId;
    const { filter, priority, range, search } = req.query;

    const conditions = ['user_id = ?'];
    const params = [userId];

    // Status filter: active | completed
    if (filter === 'active') {
      conditions.push('completed = 0');
    } else if (filter === 'completed') {
      conditions.push('completed = 1');
    }

    // Priority filter: low | medium | high
    if (priority && ['low', 'medium', 'high', 'med'].includes(priority)) {
      const normalizedPriority = priority === 'med' ? 'medium' : priority;
      conditions.push('priority = ?');
      params.push(normalizedPriority);
    }

    // Range filter: today | week | overdue
    if (range === 'today') {
      conditions.push("due_date = date('now')");
    } else if (range === 'week') {
      conditions.push("due_date >= date('now') AND due_date <= date('now', '+7 days')");
    } else if (range === 'overdue') {
      conditions.push("due_date IS NOT NULL AND due_date < date('now') AND completed = 0");
    }

    // Search query across title and description
    if (search && search.trim()) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const wildcard = `%${search.trim()}%`;
      params.push(wildcard, wildcard);
    }

    const sql = `
      SELECT id, user_id, title, description, due_date, priority, completed, created_at, updated_at
      FROM todos
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const todos = db.prepare(sql).all(...params);
    return res.json({
      data: todos,
      todos
    });
  } catch (err) {
    console.error('Fetch todos error:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/todos - Create new task
router.post('/', validateBody(createTodoSchema), (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, dueDate, priority, completed } = req.body;

    const result = db.prepare(`
      INSERT INTO todos (user_id, title, description, due_date, priority, completed)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      title,
      description || null,
      dueDate || null,
      priority || 'medium',
      completed ? 1 : 0
    );

    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({
      data: newTodo
    });
  } catch (err) {
    console.error('Create todo error:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/todos/:id - Update task details
router.patch('/:id', validateBody(updateTodoSchema), (req, res) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.userId;

    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this task' });
    }

    const { title, description, dueDate, priority, completed } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (completed !== undefined) {
      updates.push('completed = ?');
      params.push(completed ? 1 : 0);
    }

    updates.push("updated_at = datetime('now')");
    params.push(todoId, userId);

    db.prepare(`
      UPDATE todos
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...params);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    return res.json({
      data: updatedTodo
    });
  } catch (err) {
    console.error('Update todo error:', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/todos/:id - Delete task
router.delete('/:id', (req, res) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.userId;

    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this task' });
    }

    db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(todoId, userId);
    return res.json({
      data: {
        deleted: true,
        id: todoId
      }
    });
  } catch (err) {
    console.error('Delete todo error:', err);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
