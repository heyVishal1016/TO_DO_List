import db from '../db.js';

export function restoreUserTodos(userId, todosArray, mode = 'merge') {
  if (!Array.isArray(todosArray)) {
    throw new Error('Expected an array of todo items to restore');
  }

  const transaction = db.transaction(() => {
    let replaced = 0;
    if (mode === 'replace') {
      const del = db.prepare('DELETE FROM todos WHERE user_id = ?').run(userId);
      replaced = del.changes;
    }

    const insertStmt = db.prepare(`
      INSERT INTO todos (user_id, title, description, due_date, priority, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
    `);

    let restored = 0;
    for (const item of todosArray) {
      const dueDate = item.due_date || item.dueDate || null;
      const priority = item.priority === 'med' ? 'medium' : (item.priority || 'medium');
      insertStmt.run(
        userId,
        item.title,
        item.description || null,
        dueDate,
        priority,
        item.completed ? 1 : 0,
        item.created_at || null
      );
      restored++;
    }

    return { restored, mode, replaced };
  });

  return transaction();
}

export function restoreUserData(userId, rawPayload, mode = 'merge') {
  const todos = Array.isArray(rawPayload) ? rawPayload : (rawPayload.todos || []);
  return restoreUserTodos(userId, todos, mode);
}
