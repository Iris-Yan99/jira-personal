const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { type } = req.query;
  let query = 'SELECT * FROM reports';
  const params = [];
  if (type) { query += ' WHERE type = ?'; params.push(type); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { type, content, date } = req.body;
  const result = db.prepare('INSERT INTO reports (type, content, date) VALUES (?, ?, ?)').run(type, content, date);
  res.json(db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
