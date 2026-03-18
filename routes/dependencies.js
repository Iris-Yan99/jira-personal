const express = require('express');
const router = express.Router();
const db = require('../db');

// BFS cycle check: would adding task_id -> depends_on_id create a cycle?
// A cycle exists if depends_on_id already transitively depends on task_id.
function wouldCreateCycle(taskId, dependsOnId) {
  const visited = new Set();
  const queue = [dependsOnId];
  while (queue.length) {
    const current = queue.shift();
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const rows = db.prepare(
      'SELECT depends_on_id FROM task_dependencies WHERE task_id = ?'
    ).all(current);
    rows.forEach(r => queue.push(r.depends_on_id));
  }
  return false;
}

// POST /api/dependencies  { task_id, depends_on_id }
router.post('/', (req, res) => {
  const { task_id, depends_on_id } = req.body;
  if (!task_id || !depends_on_id) {
    return res.status(400).json({ error: 'task_id and depends_on_id required' });
  }
  if (task_id === depends_on_id) {
    return res.status(400).json({ error: 'A task cannot depend on itself' });
  }
  if (wouldCreateCycle(task_id, depends_on_id)) {
    return res.status(409).json({ error: 'Circular dependency detected' });
  }
  try {
    db.prepare(
      'INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)'
    ).run(task_id, depends_on_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/dependencies  { task_id, depends_on_id }
router.delete('/', (req, res) => {
  const { task_id, depends_on_id } = req.body;
  db.prepare(
    'DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?'
  ).run(task_id, depends_on_id);
  res.json({ success: true });
});

module.exports = router;
