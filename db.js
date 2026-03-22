const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'tasks.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    deadline TEXT,
    estimated_hours REAL DEFAULT 1,
    importance TEXT CHECK(importance IN ('high', 'mid', 'low')) DEFAULT 'mid',
    status TEXT CHECK(status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    priority_score REAL DEFAULT 0,
    priority_level TEXT DEFAULT 'P4',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    progress_percent INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('daily', 'weekly', 'monthly')) NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT CHECK(type IN ('manual', 'evening_review', 'status_change')) DEFAULT 'manual',
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

function runMigrations() {
  const version = db.pragma('user_version', { simple: true });

  if (version < 1) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
      ALTER TABLE tasks ADD COLUMN progress_percent INTEGER DEFAULT 0;
    `);
    db.pragma('user_version = 1');
    console.log('[DB] Migration v1 applied: parent_id, progress_percent');
  }

  if (version < 2) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT '';
      ALTER TABLE tasks ADD COLUMN progress_note TEXT DEFAULT '';
      ALTER TABLE tasks ADD COLUMN coordination_note TEXT DEFAULT '';
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);
    db.pragma('user_version = 2');
    console.log('[DB] Migration v2 applied: assignee, progress_note, coordination_note, members table');
  }

  if (version < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, depends_on_id)
      );
    `);
    db.pragma('user_version = 3');
    console.log('[DB] Migration v3 applied: task_dependencies table');
  }

  if (version < 4) {
    db.exec(`
      ALTER TABLE daily_logs ADD COLUMN hours_logged REAL DEFAULT 0;
    `);
    db.pragma('user_version = 4');
    console.log('[DB] Migration v4 applied: hours_logged on daily_logs');
  }

  if (version < 5) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'task' CHECK(task_type IN ('task', 'milestone'));
      ALTER TABLE tasks ADD COLUMN completed_at TEXT;
      ALTER TABLE tasks ADD COLUMN unplanned INTEGER DEFAULT 0;
    `);
    db.pragma('user_version = 5');
    console.log('[DB] Migration v5 applied: task_type, completed_at, unplanned');
  }

  if (version < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role         TEXT CHECK(role IN ('pm','member')) DEFAULT 'member',
        created_at   TEXT DEFAULT (datetime('now','localtime'))
      );
    `);
    db.pragma('user_version = 6');
    console.log('[DB] Migration v6 applied: users table');
  }
}

runMigrations();

// Seed default admin account if no users exist
const bcrypt = require('bcrypt');
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (userCount.cnt === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)`).run('admin', 'Admin', hash, 'pm');
  console.log('[DB] Default admin account created — username: admin, password: admin123 (please change!)');
}

module.exports = db;
