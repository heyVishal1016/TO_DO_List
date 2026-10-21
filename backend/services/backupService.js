import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../backups');

// Ensure BACKUP_DIR exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getFormattedDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}-${HH}${mm}`;
}

export async function createBackup(type = 'manual') {
  const dateStr = getFormattedDate();
  const filename = `todos-${dateStr}-${type}.zip`;
  const zipDestPath = path.join(BACKUP_DIR, filename);
  const tempDbPath = path.join(BACKUP_DIR, `temp-snap-${Date.now()}.db`);

  try {
    // 1. Take a safe SQLite snapshot
    await db.backup(tempDbPath);

    // 2. Compress the database snapshot into a zip archive
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipDestPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(tempDbPath, { name: 'todos.db' });
      archive.finalize();
    });

    // 3. Remove temp snapshot file
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (_) {}
    }

    const stat = fs.statSync(zipDestPath);

    // 4. Record backup in database
    db.prepare(`
      INSERT INTO backups (filename, size_bytes, type)
      VALUES (?, ?, ?)
    `).run(filename, stat.size, type);

    console.log(`[BACKUP] Created ${type} backup archive: ${filename} (${stat.size} bytes)`);

    // 5. Run retention policy and disk checks
    pruneOldBackups();
    checkDiskCap();

    return {
      filename,
      sizeBytes: stat.size,
      type
    };
  } catch (err) {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (_) {}
    }
    console.error(`[BACKUP ERROR] Failed to create ${type} backup:`, err);
    throw err;
  }
}

export function pruneOldBackups() {
  try {
    const dailyRetention = parseInt(process.env.BACKUP_RETENTION_DAILY || '7', 10);
    const weeklyRetention = parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4', 10);

    const autoBackups = db.prepare(`
      SELECT id, filename, type, created_at
      FROM backups
      WHERE type IN ('auto', 'weekly')
      ORDER BY created_at DESC
    `).all();

    let autoCount = 0;
    let weeklyCount = 0;
    const keptIds = new Set();

    for (const b of autoBackups) {
      if (b.type === 'weekly') {
        if (weeklyCount < weeklyRetention) {
          keptIds.add(b.id);
          weeklyCount++;
        }
      } else {
        if (autoCount < dailyRetention) {
          keptIds.add(b.id);
          autoCount++;
        }
      }
    }

    // Prune entries and disk files not in kept set
    for (const b of autoBackups) {
      if (!keptIds.has(b.id)) {
        const filePath = path.join(BACKUP_DIR, path.basename(b.filename));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`[BACKUP RETENTION] Deleted pruned backup file: ${b.filename}`);
          } catch (e) {
            console.error(`[BACKUP RETENTION ERROR] Failed deleting file ${b.filename}:`, e);
          }
        }
        db.prepare('DELETE FROM backups WHERE id = ?').run(b.id);
      }
    }
  } catch (err) {
    console.error('[BACKUP RETENTION ERROR] Failed applying retention policy:', err);
  }
}

export function checkDiskCap() {
  try {
    const maxMb = parseInt(process.env.BACKUP_MAX_MB || '500', 10);
    const maxBytes = maxMb * 1024 * 1024;

    const files = fs.readdirSync(BACKUP_DIR);
    let totalBytes = 0;

    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(BACKUP_DIR, file));
        totalBytes += stat.size;
      } catch (_) {}
    }

    if (totalBytes > maxBytes) {
      console.warn(`[BACKUP WARNING] Total backups directory size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds configured cap of ${maxMb} MB!`);
    }

    return { totalBytes, capBytes: maxBytes, exceeded: totalBytes > maxBytes };
  } catch (err) {
    console.error('[BACKUP DISK CHECK ERROR]:', err);
    return { totalBytes: 0, capBytes: 500 * 1024 * 1024, exceeded: false };
  }
}

export function getLastBackup() {
  try {
    return db.prepare(`
      SELECT id, filename, size_bytes, type, created_at
      FROM backups
      ORDER BY created_at DESC
      LIMIT 1
    `).get();
  } catch (err) {
    return null;
  }
}

export function listBackups() {
  return db.prepare(`
    SELECT id, filename, size_bytes AS sizeBytes, type, created_at AS createdAt
    FROM backups
    ORDER BY created_at DESC
  `).all();
}

export function getBackupFilePath(filename) {
  const safeFilename = path.basename(filename);
  if (!/^[\w\-.]+\.zip$/.test(safeFilename)) {
    throw new Error('Invalid backup filename format');
  }

  const resolvedPath = path.resolve(BACKUP_DIR, safeFilename);
  if (!resolvedPath.startsWith(BACKUP_DIR)) {
    throw new Error('Access denied: Path traversal detected');
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('Backup file not found on disk');
  }
  return resolvedPath;
}

export function deleteBackupFile(filename) {
  const safeFilename = path.basename(filename);
  if (!/^[\w\-.]+\.zip$/.test(safeFilename)) {
    throw new Error('Invalid backup filename format');
  }

  const resolvedPath = path.resolve(BACKUP_DIR, safeFilename);
  if (!resolvedPath.startsWith(BACKUP_DIR)) {
    throw new Error('Access denied: Path traversal detected');
  }

  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
  db.prepare('DELETE FROM backups WHERE filename = ?').run(safeFilename);
  return { deleted: true, filename: safeFilename };
}

export function startBackupCron() {
  // Runs every day at 02:00 server time
  cron.schedule('0 2 * * *', async () => {
    const isSunday = new Date().getDay() === 0;
    const backupType = isSunday ? 'weekly' : 'auto';
    console.log(`[CRON] Scheduled backup trigger (${backupType}) at 02:00...`);
    try {
      await createBackup(backupType);
      pruneOldBackups();
    } catch (err) {
      console.error('[CRON ERROR] Scheduled backup failed:', err);
    }
  });

  console.log('[CRON] Automated backup schedule active (daily 02:00 / Sunday weekly)');
}

// Aliases for compatibility
export const createManualZipBackup = () => createBackup('manual');
export const initBackupCron = startBackupCron;
