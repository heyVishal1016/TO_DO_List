import dotenv from 'dotenv';
dotenv.config();

// Enforce JWT_SECRET of at least 32 characters
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable must be at least 32 characters long.');
  process.exit(1);
}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import db, { initDb } from './db.js';
import { startBackupCron, getLastBackup } from './services/backupService.js';
import authRoutes from './routes/auth.js';
import todosRoutes from './routes/todos.js';
import backupRoutes from './routes/backup.js';
import exportRoutes from './routes/export.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database schema and verify integrity
initDb();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// General API rate limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Auth rate limiter: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Database integrity check endpoint (Public)
app.get('/api/health/db', (req, res) => {
  try {
    const rows = db.pragma('integrity_check');
    const isOk = rows.length === 1 && rows[0].integrity_check === 'ok';
    const lastBackup = getLastBackup();

    return res.json({
      status: isOk ? 'ok' : 'corrupted',
      integrity: isOk ? 'ok' : 'failed',
      lastBackup: lastBackup ? lastBackup.created_at : null,
      details: rows
    });
  } catch (err) {
    return res.status(500).json({ status: 'corrupted', error: err.message });
  }
});

// General health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/export', exportRoutes);
app.use('/api', exportRoutes); // Mounts /api/restore/json

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

// Start backup scheduler
startBackupCron();

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 TaskFlow Pro Backend active on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛡️  Security: Helmet, Rate Limiting, CORS enabled`);
  console.log(`💾 DB: SQLite (WAL mode) with Automated Backups`);
  console.log(`===============================================`);
});

export { app, server };
