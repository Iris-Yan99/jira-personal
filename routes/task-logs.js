const express = require('express');
const router = express.Router();
const db = require('../db');

// GET task logs — supports ?task_id=X and/or ?days=N
router.get('/', (req, res) => {
  const { task_id, days } = req.query;
  let query = 'SELECT * FROM task_logs WHERE 1=1';
  const params = [];

  if (task_id) {
    query += ' AND task_id = ?';
    params.push(parseInt(task_id));
  }

  if (days) {
    // Compute cutoff date in local time to avoid UTC shift
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const pad = (n) => String(n).padStart(2, '0');
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
    query += ' AND date >= ?';
    params.push(cutoffStr);
  }

  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST create task log
router.post('/', (req, res) => {
  const { task_id, date, type, content } = req.body;
  const result = db.prepare(`
    INSERT INTO task_logs (task_id, date, type, content)
    VALUES (?, ?, ?, ?)
  `).run(task_id, date, type || 'manual', content);
  res.json(db.prepare('SELECT * FROM task_logs WHERE id = ?').get(result.lastInsertRowid));
});

module.exports = router;
