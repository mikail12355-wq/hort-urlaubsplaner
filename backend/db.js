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

  CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN vacation_allowance INTEGER NOT NULL DEFAULT 30'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN vacation_carryover INTEGER NOT NULL DEFAULT 0'); } catch {}

// One-time migration: approve all users that existed before the approval feature.
// Uses a migrations table so this never runs again after the first time.
const alreadyApproved = db.prepare("SELECT 1 FROM migrations WHERE name = 'approve_existing_users'").get();
if (!alreadyApproved) {
  db.exec('UPDATE users SET is_approved = 1');
  db.exec("INSERT INTO migrations (name) VALUES ('approve_existing_users')");
}

export default db;
