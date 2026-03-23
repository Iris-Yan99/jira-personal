# Task Dependencies (Blocked By) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blocked-by dependency graph to Plano so tasks can declare predecessors; blocked tasks show a yellow-bordered card with estimated unlock date on the kanban.

**Architecture:** Junction table `task_dependencies` stores directed dependency edges. Blocked state is derived at render time (`task.blockers.some(b => b.status !== 'done')`) — no stored status column. GET /tasks enriches each task with a `blockers` array. Frontend syncs dependency changes on modal save via POST/DELETE `/api/dependencies`.

**Tech Stack:** Node.js + better-sqlite3 + Express (backend); React 18 + Tailwind CSS (frontend)

---

## Chunk 1: Backend

### Task 1: Migration v3 — task_dependencies table

**Files:**
- Modify: `db.js`

- [ ] **Step 1: Add migration v3 block to `runMigrations()`**

In `db.js`, after the existing `if (version < 2)` block, add:

```js
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
```

- [ ] **Step 2: Verify migration runs**

```bash
node -e "require('./db'); console.log('OK')"
```

Expected output:
```
[DB] Migration v3 applied: task_dependencies table
OK
```

(If already run once, just `OK` with no migration line — that's fine.)

- [ ] **Step 3: Verify table exists**

```bash
node -e "const db=require('./db'); console.log(db.pragma('table_info(task_dependencies)'))"
```

Expected: array with `task_id` and `depends_on_id` columns.

- [ ] **Step 4: Commit**

```bash
git add db.js
git commit -m "feat: migration v3 - task_dependencies table"
```

---

### Task 2: New route `routes/dependencies.js`

**Files:**
- Create: `routes/dependencies.js`
- Modify: `server.js`

- [ ] **Step 1: Create `routes/dependencies.js`**

```js
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
```

- [ ] **Step 2: Mount route in `server.js`**

Add after the members route line:

```js
app.use('/api/dependencies', require('./routes/dependencies'));
```

- [ ] **Step 3: Verify routes load**

```bash
node -e "require('./server')" &
sleep 1
# Add a test dependency (tasks must exist — skip if no data)
curl -s -X POST http://localhost:3001/api/dependencies \
  -H 'Content-Type: application/json' \
  -d '{"task_id":999,"depends_on_id":998}' | cat
kill %1 2>/dev/null
```

Expected: `{"error":"..."}` (FK violation since tasks 998/999 don't exist) or `{"success":true}` if they do. Either way, no crash = route works.

- [ ] **Step 4: Commit**

```bash
git add routes/dependencies.js server.js
git commit -m "feat: add /api/dependencies route with BFS cycle detection"
```

---

### Task 3: Enrich GET /api/tasks with blockers array

**Files:**
- Modify: `routes/tasks.js`

- [ ] **Step 1: Update the GET `/` handler**

Replace the existing `router.get('/', ...)` handler with:

```js
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

  // Fetch all dependency edges with blocker details in one query
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

  // Group blocker details by task_id
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
```

- [ ] **Step 2: Restart server and verify response**

```bash
curl -s http://localhost:3001/api/tasks | node -e "
  const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('first task blockers:', d[0]?.blockers);
"
```

Expected: `first task blockers: []` (or a blocker array if you manually inserted a row).

- [ ] **Step 3: Commit**

```bash
git add routes/tasks.js
git commit -m "feat: enrich GET /tasks with blockers array per task"
```

---

## Chunk 2: Frontend — API helpers + TaskEditModal

### Task 4: api.js — addDependency / removeDependency

**Files:**
- Modify: `client/src/utils/api.js`

- [ ] **Step 1: Add dependency helpers to the `api` object**

After the `deleteMember` line, add:

```js
  // Dependencies
  addDependency: (taskId, dependsOnId) =>
    request('/dependencies', json({ task_id: taskId, depends_on_id: dependsOnId })),
  removeDependency: (taskId, dependsOnId) =>
    request('/dependencies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, depends_on_id: dependsOnId }),
    }),
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd client && node --input-type=module <<'EOF'
import { api } from './src/utils/api.js'
console.log(typeof api.addDependency, typeof api.removeDependency)
EOF
```

Expected: `function function`

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/api.js
git commit -m "feat: add addDependency/removeDependency to api.js"
```

---

### Task 5: TaskEditModal — 前置任務 selector

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`

- [ ] **Step 1: Add `localBlockers` state and pending-change sets**

Inside `TaskEditModal`, after the `members` state, add:

```js
// ── Dependency state ─────────────────────────────────────────
const [localBlockers, setLocalBlockers] = useState(task.blockers || [])
const pendingAdd = useRef(new Set())
const pendingRemove = useRef(new Set())
```

Add `useRef` to the import line:
```js
import { useState, useEffect, useMemo, useRef } from 'react'
```

- [ ] **Step 2: Add helper functions for adding/removing blockers locally**

```js
const addBlocker = (blockerId) => {
  const blocker = tasks.find(t => t.id === blockerId)
  if (!blocker || localBlockers.find(b => b.id === blockerId)) return
  setLocalBlockers(prev => [...prev, {
    id: blocker.id, title: blocker.title, status: blocker.status, deadline: blocker.deadline
  }])
  pendingAdd.current.add(blockerId)
  pendingRemove.current.delete(blockerId)
}

const removeBlocker = (blockerId) => {
  setLocalBlockers(prev => prev.filter(b => b.id !== blockerId))
  pendingRemove.current.add(blockerId)
  pendingAdd.current.delete(blockerId)
}
```

- [ ] **Step 3: Sync dependencies inside `doSave`**

In `doSave`, before `await onSave(...)`, add:

```js
// Sync pending dependency changes
const addPromises = [...pendingAdd.current].map(id =>
  api.addDependency(task.id, id).catch(e => {
    if (e.message.includes('Circular')) {
      alert(`無法添加前置任務：存在循環依賴`)
    }
  })
)
const removePromises = [...pendingRemove.current].map(id =>
  api.removeDependency(task.id, id)
)
await Promise.all([...addPromises, ...removePromises])
pendingAdd.current.clear()
pendingRemove.current.clear()
```

- [ ] **Step 4: Render the "前置任務" Field in the Info Tab**

In the Info Tab JSX, after the `progress_percent` range slider Field and before the conflict warning block, add:

```jsx
<Field label="前置任務（Blocked By）">
  <div className="space-y-2">
    {/* Existing blocker tags */}
    {localBlockers.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {localBlockers.map(b => (
          <span
            key={b.id}
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
              b.status === 'done'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-yellow-50 border-yellow-300 text-yellow-800'
            }`}
          >
            {b.status === 'done' ? '✓' : '⏳'} {b.title}
            <button
              type="button"
              onClick={() => removeBlocker(b.id)}
              className="ml-0.5 text-gray-400 hover:text-red-500 font-bold"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    )}
    {/* Dropdown to add a new blocker */}
    <select
      value=""
      onChange={e => { if (e.target.value) addBlocker(Number(e.target.value)) }}
      className={inputCls}
    >
      <option value="">＋ 添加前置任務...</option>
      {tasks
        .filter(t =>
          t.id !== task.id &&
          !descendantIds.has(t.id) &&
          !localBlockers.find(b => b.id === t.id)
        )
        .map(t => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))
      }
    </select>
  </div>
</Field>
```

- [ ] **Step 5: Verify in browser**

1. Restart backend, open frontend
2. Open any task in edit modal
3. "前置任務" field should appear below progress slider
4. Select a task from dropdown → it appears as a yellow tag
5. Click × on the tag → it disappears
6. Save → re-open modal → blocker should still be there (fetched from backend)

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TaskEditModal.jsx
git commit -m "feat: add blocked-by dependency selector in TaskEditModal"
```

---

## Chunk 3: KanbanBoard — Blocked Visual Indicator

### Task 6: TaskTreeNode — yellow border + BLOCKED badge

**Files:**
- Modify: `client/src/components/KanbanBoard.jsx`

- [ ] **Step 1: Add `isBlocked` and `unlockDate` helpers at module level**

At the top of `KanbanBoard.jsx`, after the `PRIORITY_BADGE` constant, add:

```js
function isBlocked(task) {
  return (task.blockers || []).some(b => b.status !== 'done')
}

function unlockDate(task) {
  const incomplete = (task.blockers || []).filter(b => b.status !== 'done')
  const dates = incomplete.map(b => b.deadline).filter(Boolean)
  if (dates.length === 0) return null
  return dates.sort().at(-1) // latest deadline
}
```

- [ ] **Step 2: Update card container div to apply yellow border when blocked**

In `TaskTreeNode`, find the card `<div>`:

```jsx
<div
  className={`bg-white rounded-xl border border-gray-100 p-3 mb-2 ...`}
```

Replace with:

```jsx
const blocked = isBlocked(task)
// (put this before the return, alongside the existing const declarations)
```

Then update the card div className:

```jsx
<div
  className={`bg-white rounded-xl border p-3 mb-2 ${
    blocked ? 'border-2 border-yellow-400' : 'border-gray-100'
  } ${depth === 0 ? 'shadow-sm' : ''} ${!hasChildren ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
  onClick={!hasChildren ? () => onOpenEdit(task) : undefined}
>
```

- [ ] **Step 3: Render the BLOCKED badge above the header row**

Inside the card div, before the `{/* Header row */}` comment, add:

```jsx
{/* Blocked badge */}
{blocked && (
  <div className="flex items-center gap-2 mb-2">
    <span className="text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-full">
      ⛔ BLOCKED
    </span>
    {unlockDate(task) ? (
      <span className="text-xs text-yellow-700">
        解鎖於 {unlockDate(task)}
      </span>
    ) : (
      <span className="text-xs text-yellow-600">
        等待 {(task.blockers || []).filter(b => b.status !== 'done').length} 個前置任務
      </span>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify in browser**

1. In the edit modal, add a dependency (Task B blocked by Task A where A is not done)
2. On kanban, Task B card should show yellow border + `⛔ BLOCKED · 解鎖於 {A's deadline}`
3. Mark Task A as done → refresh → Task B badge disappears, border returns to gray

- [ ] **Step 5: Commit**

```bash
git add client/src/components/KanbanBoard.jsx
git commit -m "feat: show blocked badge and unlock date on kanban cards"
```

---

## Final Verification

- [ ] Create two tasks: "設計稿" (deadline: next week) and "前端開發"
- [ ] Set "前端開發" blocked by "設計稿"
- [ ] Kanban shows "前端開發" with yellow border + `⛔ BLOCKED · 解鎖於 {date}`
- [ ] Mark "設計稿" as done → kanban refreshes → "前端開發" badge gone
- [ ] Try setting A blocked by B and B blocked by A → second save should show cycle error alert
- [ ] Delete a blocker task → its dependency rows auto-cascade-delete (verify in SQLite)

```bash
# Quick SQLite check after deleting a task
node -e "const db=require('./db'); console.log(db.prepare('SELECT * FROM task_dependencies').all())"
```
