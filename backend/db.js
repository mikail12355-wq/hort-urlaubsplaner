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
    is_approved INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vacation_year_data (
    user_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    carryover INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pending_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    new_value INTEGER NOT NULL,
    year INTEGER,
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
try { db.exec('ALTER TABLE vacations ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0'); } catch {}

// Approve all existing vacations (added before approval workflow)
const vacMigDone = db.prepare("SELECT 1 FROM migrations WHERE name = 'approve_existing_vacations'").get();
if (!vacMigDone) {
  db.exec('UPDATE vacations SET is_approved = 1');
  db.exec("INSERT INTO migrations (name) VALUES ('approve_existing_vacations')");
}

// Approve all users that existed before account approval feature
const userMigDone = db.prepare("SELECT 1 FROM migrations WHERE name = 'approve_existing_users'").get();
if (!userMigDone) {
  db.exec('UPDATE users SET is_approved = 1');
  db.exec("INSERT INTO migrations (name) VALUES ('approve_existing_users')");
}

export default db;
