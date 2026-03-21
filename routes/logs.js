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
  const { task_id, date, progress_percent, note, hours_logged } = req.body;
  const result = db.prepare(`
    INSERT INTO daily_logs (task_id, date, progress_percent, note, hours_logged)
    VALUES (?, ?, ?, ?, ?)
  `).run(task_id, date, progress_percent || 0, note || '', hours_logged || 0);
  res.json(db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid));
});

router.post('/quick', (req, res) => {
  const { task_id, hours, note, date: dateOverride } = req.body;
  if (!task_id || !hours || hours <= 0) {
    return res.status(400).json({ error: 'task_id and hours (> 0) are required' });
  }
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const date = (dateOverride && /^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) ? dateOverride : todayStr;
  const result = db.prepare(`
    INSERT INTO daily_logs (task_id, date, progress_percent, note, hours_logged)
    VALUES (?, ?, 0, ?, ?)
  `).run(task_id, date, note || '', hours);
  res.json(db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { progress_percent, note, hours_logged } = req.body;
  db.prepare('UPDATE daily_logs SET progress_percent = COALESCE(?, progress_percent), note = COALESCE(?, note), hours_logged = COALESCE(?, hours_logged) WHERE id = ?')
    .run(progress_percent ?? null, note ?? null, hours_logged ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM daily_logs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
