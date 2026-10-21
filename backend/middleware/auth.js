import jwt from 'jsonwebtoken';
import db from '../db.js';

export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = db.prepare('SELECT id, email, is_admin, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User account no longer exists' });
    }

    req.userId = user.id;
    req.userIsAdmin = Boolean(user.is_admin);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token is invalid or expired' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.userIsAdmin && (!req.user || !req.user.is_admin)) {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required' });
  }
  next();
}
