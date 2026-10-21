import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  createBackup,
  listBackups,
  checkDiskCap
} from '../services/backupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../backups');

const router = express.Router();

// Strict security: All backup endpoints require authentication AND admin privileges
router.use(verifyToken, requireAdmin);

// POST /api/backup/create - Create a manual zip backup
router.post('/create', async (req, res) => {
  try {
    const backup = await createBackup('manual');
    return res.status(201).json({
      data: backup
    });
  } catch (err) {
    console.error('Backup creation error:', err);
    return res.status(500).json({ error: 'Failed to create backup archive' });
  }
});

// GET /api/backup/list - List all backups with storage metrics
router.get('/list', (req, res) => {
  try {
    const rows = listBackups();
    const diskInfo = checkDiskCap();

    return res.json({
      data: {
        backups: rows,
        totalSizeBytes: diskInfo.totalBytes,
        capBytes: diskInfo.capBytes
      }
    });
  } catch (err) {
    console.error('List backups error:', err);
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

// GET /api/backup/download/:filename - Secure download with traversal prevention
router.get('/download/:filename', (req, res) => {
  try {
    const rawFilename = req.params.filename;
    const safeFilename = path.basename(rawFilename);

    // Strict validation: must match ^[\w\-.]+\.zip$ and match basename exactly
    if (!/^[\w\-.]+\.zip$/.test(safeFilename) || rawFilename !== safeFilename) {
      return res.status(400).json({ error: 'Invalid or prohibited backup filename format' });
    }

    // Verify file exists in database records
    const record = db.prepare('SELECT id, filename FROM backups WHERE filename = ?').get(safeFilename);
    if (!record) {
      return res.status(404).json({ error: 'Backup not found in registry' });
    }

    const filePath = path.resolve(BACKUP_DIR, safeFilename);
    if (!filePath.startsWith(BACKUP_DIR)) {
      return res.status(400).json({ error: 'Access denied: Directory traversal detected' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup archive does not exist on disk' });
    }

    return res.download(filePath, safeFilename);
  } catch (err) {
    console.error('Download backup error:', err);
    return res.status(500).json({ error: 'Failed to stream backup archive' });
  }
});

// DELETE /api/backup/:filename - Delete backup file and record
router.delete('/:filename', (req, res) => {
  try {
    const rawFilename = req.params.filename;
    const safeFilename = path.basename(rawFilename);

    if (!/^[\w\-.]+\.zip$/.test(safeFilename) || rawFilename !== safeFilename) {
      return res.status(400).json({ error: 'Invalid or prohibited backup filename format' });
    }

    const filePath = path.resolve(BACKUP_DIR, safeFilename);
    if (!filePath.startsWith(BACKUP_DIR)) {
      return res.status(400).json({ error: 'Access denied: Directory traversal detected' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM backups WHERE filename = ?').run(safeFilename);

    return res.json({
      data: {
        deleted: true,
        filename: safeFilename
      }
    });
  } catch (err) {
    console.error('Delete backup error:', err);
    return res.status(500).json({ error: 'Failed to delete backup' });
  }
});

export default router;
