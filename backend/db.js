import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'todos.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

try {
  const { default: BetterSqlite3 } = await import('better-sqlite3');
  db = new BetterSqlite3(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
} catch (nativeErr) {
  const { DatabaseSync } = await import('node:sqlite');
  const rawDb = new DatabaseSync(dbPath);

  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec('PRAGMA journal_mode = WAL;');
  rawDb.exec('PRAGMA synchronous = NORMAL;');

  db = {
    exec(sql) {
      return rawDb.exec(sql);
    },
    pragma(pragmaStr) {
      const res = rawDb.prepare(`PRAGMA ${pragmaStr};`).all();
      return res;
    },
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        run(...params) {
          return stmt.run(...params);
        },
        get(...params) {
          return stmt.get(...params);
        },
        all(...params) {
          return stmt.all(...params);
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        rawDb.exec('BEGIN');
        try {
          const res = fn(...args);
          rawDb.exec('COMMIT');
          return res;
        } catch (err) {
          rawDb.exec('ROLLBACK');
          throw err;
        }
      };
    },
    async backup(destPath) {
      const normalized = destPath.replace(/'/g, "''");
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      rawDb.exec(`VACUUM INTO '${normalized}'`);
    }
  };
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      type TEXT CHECK(type IN ('auto','manual','weekly')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_date);
  `);

  try {
    const check = db.pragma('integrity_check');
    console.log('[DB] PRAGMA integrity_check result:', check);
  } catch (err) {
    console.error('[DB] Integrity check error on init:', err);
  }
}

export default db;
