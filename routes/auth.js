const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

function requirePM(req, res, next) {
  if (req.session.userRole !== 'pm') {
    return res.status(403).json({ error: 'Forbidden: PM only' });
  }
  next();
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '請填寫帳號和密碼' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  req.session.userId = user.id;
  req.session.userRole = user.role;
  res.json({ id: user.id, username: user.username, display_name: user.display_name, role: user.role });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(user);
});

// POST /api/auth/users — PM only
router.post('/users', requireAuth, requirePM, (req, res) => {
  const { username, display_name, password, role } = req.body;
  if (!username || !display_name || !password) {
    return res.status(400).json({ error: 'username、display_name、password 為必填' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, display_name, hash, role === 'pm' ? 'pm' : 'member');
    const created = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    // Sync to members table so assignee dropdown picks this user up
    db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)').run(display_name);
    res.json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: '帳號已存在' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users — PM only
router.get('/users', requireAuth, requirePM, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at').all();
  res.json(users);
});

module.exports = router;
