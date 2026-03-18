const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*,
      COALESCE(
        (SELECT l.progress_percent FROM daily_logs l
         WHERE l.task_id = t.id ORDER BY l.created_at DESC LIMIT 1),
        t.progress_percent,
        0
      ) AS progress_percent,
      COALESCE(
        (SELECT SUM(l.hours_logged) FROM daily_logs l WHERE l.task_id = t.id),
        0
      ) AS actual_hours
    FROM tasks t
    ORDER BY t.priority_score DESC, t.created_at DESC
  `).all();

  // Enrich each task with its blockers (depends_on tasks)
  const depRows = db.prepare(`
    SELECT
      td.task_id,
      t.id        AS blocker_id,
      t.title     AS blocker_title,
      t.status    AS blocker_status,
      t.deadline  AS blocker_deadline
    FROM task_dependencies td
    JOIN tasks t ON t.id = td.depends_on_id
  `).all();

  const blockersByTask = {};
  depRows.forEach(row => {
    if (!blockersByTask[row.task_id]) blockersByTask[row.task_id] = [];
    blockersByTask[row.task_id].push({
      id: row.blocker_id,
      title: row.blocker_title,
      status: row.blocker_status,
      deadline: row.blocker_deadline,
    });
  });

  res.json(tasks.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    blockers: blockersByTask[t.id] || [],
  })));
});

router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ ...task, tags: JSON.parse(task.tags || '[]') });
});

router.post('/', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent, assignee, progress_note, coordination_note } = req.body;
  const result = db.prepare(`
    INSERT INTO tasks (title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent, assignee, progress_note, coordination_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || '',
    deadline || null,
    estimated_hours || 1,
    importance || 'mid',
    status || 'todo',
    JSON.stringify(tags || []),
    parent_id || null,
    progress_percent || 0,
    assignee || '',
    progress_note || '',
    coordination_note || ''
  );
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...task, tags: JSON.parse(task.tags || '[]') });
});

router.put('/:id', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, priority_score, priority_level, tags, parent_id, progress_percent, clear_parent, assignee, progress_note, coordination_note } = req.body;
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
      assignee = COALESCE(?, assignee),
      progress_note = COALESCE(?, progress_note),
      coordination_note = COALESCE(?, coordination_note),
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
    assignee ?? null,
    progress_note ?? null,
    coordination_note ?? null,
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
