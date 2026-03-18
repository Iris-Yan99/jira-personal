const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*,
      COALESCE(
        (SELECT l.progress_percent FROM daily_logs l
         WHERE l.task_id = t.id ORDER BY l.created_at DESC LIMIT 1),
        0
      ) AS progress_percent
    FROM tasks t
    ORDER BY t.priority_score DESC, t.created_at DESC
  `).all();
  res.json(tasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })));
});

router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ ...task, tags: JSON.parse(task.tags || '[]') });
});

router.post('/', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent } = req.body;
  const result = db.prepare(`
    INSERT INTO tasks (title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || '',
    deadline || null,
    estimated_hours || 1,
    importance || 'mid',
    status || 'todo',
    JSON.stringify(tags || []),
    parent_id || null,
    progress_percent || 0
  );
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...task, tags: JSON.parse(task.tags || '[]') });
});

router.put('/:id', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, priority_score, priority_level, tags, parent_id, progress_percent, clear_parent } = req.body;
  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      deadline = COALESCE(?, deadline),
      estimated_hours = COALESCE(?, estimated_hours),
      importance = COALESCE(?, importance),
      status = COALESCE(?, status),
      priority_score = COALESCE(?, priority_score),
      priority_level = COALESCE(?, priority_level),
      tags = COALESCE(?, tags),
      parent_id = CASE WHEN ? = 1 THEN NULL ELSE COALESCE(?, parent_id) END,
      progress_percent = COALESCE(?, progress_percent),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(
    title ?? null,
    description ?? null,
    deadline ?? null,
    estimated_hours ?? null,
    importance ?? null,
    status ?? null,
    priority_score ?? null,
    priority_level ?? null,
    tags !== undefined ? JSON.stringify(tags) : null,
    clear_parent === true ? 1 : 0,
    parent_id ?? null,
    progress_percent ?? null,
    req.params.id
  );
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ...task, tags: JSON.parse(task.tags || '[]') });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
