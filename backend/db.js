import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'hort.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(first_name, last_name)
  );

  CREATE TABLE IF NOT EXISTS vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN vacation_allowance INTEGER NOT NULL DEFAULT 30'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN vacation_carryover INTEGER NOT NULL DEFAULT 0'); } catch {}

export default db;
