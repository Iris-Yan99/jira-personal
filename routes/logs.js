const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { date, task_id } = req.query;
  let query = 'SELECT l.*, t.title as task_title FROM daily_logs l JOIN tasks t ON l.task_id = t.id WHERE 1=1';
  const params = [];
  if (date) { query += ' AND l.date = ?'; params.push(date); }
  if (task_id) { query += ' AND l.task_id = ?'; params.push(task_id); }
  query += ' ORDER BY l.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { task_id, date, progress_percent, note } = req.body;
  const result = db.prepare(`
    INSERT INTO daily_logs (task_id, date, progress_percent, note)
    VALUES (?, ?, ?, ?)
  `).run(task_id, date, progress_percent || 0, note || '');
  res.json(db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { progress_percent, note } = req.body;
  db.prepare('UPDATE daily_logs SET progress_percent = ?, note = ? WHERE id = ?')
    .run(progress_percent, note, req.params.id);
  res.json(db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id));
});

module.exports = router;
