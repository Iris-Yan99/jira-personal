# Scheduling Smart Constraints Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce parent-child deadline hard constraint in TaskEditModal, and make conflict suggestion return the nearest deterministic free slot instead of AI-guessed date.

**Architecture:** Two independent changes — (1) pure frontend state/UI in `TaskEditModal.jsx` for deadline constraint; (2) backend `routes/ai.js` algorithm to compute nearest free date and inject it into the AI prompt, returning it directly instead of parsing from AI output.

**Tech Stack:** React 18, Express 4, no new dependencies.

---

## Task 1: Parent-child deadline constraint — state + UI (CARD-SCHED-001)

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`

### Context

`TaskEditModal` receives `task` (the task being edited) and `tasks` (all tasks). Parent relationship is `form.parent_id`. Children are `tasks.filter(t => t.parent_id === task.id)`.

State variables live near line 90. The `set(key, val)` helper (line 201) updates `form` and handles side effects. The deadline `<input>` is at line 414 inside a `<Field label="截止日期">` block.

### Steps

- [ ] **Step 1: Add three new state variables**

After line 95 (`const [saveError, setSaveError] = useState(null)`), add:

```jsx
const [deadlineError, setDeadlineError] = useState(null)
const [childDeadlineWarning, setChildDeadlineWarning] = useState([])
const [syncParentDeadline, setSyncParentDeadline] = useState(false)
```

- [ ] **Step 2: Extend `set()` to validate deadline against parent and children**

The current `set` function (line 201–214) has:
```js
if (key === 'deadline' || key === 'estimated_hours' || key === 'priority_level') {
  setConflict(null)
}
```

Add deadline-specific logic immediately after that block:

```js
if (key === 'deadline') {
  // Check child warning: any direct children with deadline > new value
  if (val) {
    const over = tasks.filter(t => t.parent_id === task.id && t.deadline && t.deadline > val)
    setChildDeadlineWarning(over.map(t => t.title))
  } else {
    setChildDeadlineWarning([])
  }
  // Check parent constraint: new deadline must not exceed parent's deadline
  const parentId = form.parent_id
  if (parentId && val) {
    const parent = tasks.find(t => t.id === Number(parentId))
    if (parent?.deadline && val > parent.deadline) {
      setDeadlineError(`超出父任務截止日期（${parent.deadline}）`)
    } else {
      setDeadlineError(null)
      setSyncParentDeadline(false)
    }
  } else {
    setDeadlineError(null)
    setSyncParentDeadline(false)
  }
}
```

- [ ] **Step 3: Add inline error + checkbox UI below the deadline input**

Find the deadline `<Field>` block (line 413–415):
```jsx
<Field label="截止日期">
  <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputCls} />
</Field>
```

Replace with:
```jsx
<Field label="截止日期">
  <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputCls} />
  {deadlineError && (
    <div className="mt-1 space-y-1">
      <p className="text-xs text-red-500">{deadlineError}</p>
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={syncParentDeadline}
          onChange={e => setSyncParentDeadline(e.target.checked)}
          className="rounded"
        />
        同步將父任務截止日更新為 {form.deadline}
      </label>
    </div>
  )}
  {childDeadlineWarning.length > 0 && (
    <p className="mt-1 text-xs text-orange-500">
      ⚠️ 以下子任務截止日將超出此日期：{childDeadlineWarning.join('、')}
    </p>
  )}
</Field>
```

- [ ] **Step 4: Verify UI renders correctly**

Start dev server: `npm run dev`

Open a task that has a parent. Set the deadline to a date AFTER the parent's deadline. Confirm:
- Red error text appears below the date input
- Checkbox "同步將父任務截止日更新為 YYYY-MM-DD" appears
- No crash

Open a parent task that has children with deadlines. Set deadline to earlier than a child. Confirm:
- Orange warning lists the child task names
- No red error (no blocking)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/TaskEditModal.jsx
git commit -m "feat: parent-child deadline constraint UI in TaskEditModal"
```

---

## Task 2: Enforce constraint in save logic (CARD-SCHED-002)

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`

### Steps

- [ ] **Step 1: Block `handleSave` when deadlineError is unresolved**

At the top of `handleSave` (line 259), after `if (!form.title.trim()) return`, add:

```js
// Block save if child deadline exceeds parent and user hasn't opted to sync
if (deadlineError && !syncParentDeadline) return
```

- [ ] **Step 2: Update parent deadline in `doSave` when syncParentDeadline is true**

In `doSave`, after the `await onSave({...})` call (before `setConflict(null)`), add:

```js
if (syncParentDeadline && form.parent_id) {
  await api.updateTask(Number(form.parent_id), { deadline: form.deadline })
}
```

Also reset the new state in the success path (after `setConflict(null)`):

```js
setDeadlineError(null)
setSyncParentDeadline(false)
setChildDeadlineWarning([])
```

- [ ] **Step 3: Verify save constraint works**

Test case A — blocked save:
1. Open a child task, set deadline beyond parent deadline
2. Click 保存 without checking the checkbox
3. Expected: nothing happens (modal stays open, no error toast needed)

Test case B — sync save:
1. Same setup, but check the "同步將父任務截止日更新為..." checkbox
2. Click 保存
3. Expected: modal closes, both child and parent tasks show updated deadline in kanban

Test case C — no parent:
1. Open a top-level task (no parent_id), set any deadline
2. Click 保存
3. Expected: saves normally, no constraint triggered

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TaskEditModal.jsx
git commit -m "feat: enforce parent deadline hard constraint on save, with sync-parent option"
```

---

## Task 3: Nearest free slot in conflict-suggest (CARD-SCHED-003)

**Files:**
- Modify: `routes/ai.js` (lines 362–398)

### Context

Current `/conflict-suggest` endpoint builds a `takenDates` string, passes to AI prompt, and parses `suggestedDate` from AI response via regex. We replace the date with an algorithm result and stop relying on AI parse.

The `PRIORITY_RANK` map already exists in `client/src/utils/conflicts.js` — we need a local copy in the backend route.

### Steps

- [ ] **Step 1: Replace the `/conflict-suggest` handler body**

Replace the entire content of `router.post('/conflict-suggest', ...)` with:

```js
router.post('/conflict-suggest', async (req, res) => {
  const { task, conflicts, allTasks } = req.body;
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const PRIORITY_RANK = { P1: 4, P2: 3, P3: 2, P4: 1 };
  const taskRank = PRIORITY_RANK[task.priority_level] || 1;

  // Compute remaining hours for a task
  function remainingHours(t) {
    const est = parseFloat(t.estimated_hours) || 1;
    const pct = parseFloat(t.progress_percent) || 0;
    return +(est * (1 - pct / 100)).toFixed(1);
  }

  // Build daily load map: { [dateStr]: { totalRemaining, maxRank } }
  const dailyLoad = {};
  (allTasks || [])
    .filter(t => t.deadline && t.status !== 'done' && t.id !== task.id)
    .forEach(t => {
      if (!dailyLoad[t.deadline]) dailyLoad[t.deadline] = { totalRemaining: 0, maxRank: 0 };
      dailyLoad[t.deadline].totalRemaining = +(dailyLoad[t.deadline].totalRemaining + remainingHours(t)).toFixed(1);
      dailyLoad[t.deadline].maxRank = Math.max(dailyLoad[t.deadline].maxRank, PRIORITY_RANK[t.priority_level] || 1);
    });

  // Find nearest free date starting from the day after task.deadline
  // Free = (existing totalRemaining + newTaskHours) < 10 AND no same/higher priority task
  let nearestFreeDate = null;
  const newTaskHours = parseFloat(task.estimated_hours) || 1;
  const scanStart = new Date(task.deadline);
  scanStart.setDate(scanStart.getDate() + 1);
  for (let i = 0; i < 60; i++) {
    const d = new Date(scanStart);
    d.setDate(scanStart.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const load = dailyLoad[dateStr] || { totalRemaining: 0, maxRank: 0 };
    if ((load.totalRemaining + newTaskHours) < 10 && load.maxRank < taskRank) {
      nearestFreeDate = dateStr;
      break;
    }
  }

  try {
    const takenDates = [
      ...new Set(
        (allTasks || [])
          .filter((t) => t.deadline && t.status !== 'done')
          .map((t) => t.deadline)
      ),
    ].sort().join('、') || '无';

    const freeDateHint = nearestFreeDate
      ? `经算法计算，最近空余日期为：${nearestFreeDate}（工时充裕且无同级冲突）`
      : '经算法计算，近期60天内无空余日期';

    const prompt = `任务：${task.title}，截止：${task.deadline}，预估：${task.estimated_hours}h，优先级：${task.priority_level || 'P4'}

冲突：
${(conflicts || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}

其他任务已占用的截止日期：${takenDates}
今天：${todayStr}
${freeDateHint}

请严格按以下格式输出两行（不要其他内容）：
建议日期：${nearestFreeDate || 'N/A'}
建议说明：[一句话说明原因，如无空余日期则说明建议用户手动调整]`;

    const content = await callOllama([{ role: 'user', content: prompt }]);
    res.json({ suggestion: content, suggestedDate: nearestFreeDate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Note: `suggestedDate` is now `nearestFreeDate` directly — no regex parse needed.

- [ ] **Step 2: Verify endpoint returns correct free date**

Start the backend: `node server.js`

Manual test with curl (substitute real task data):
```bash
curl -s -X POST http://localhost:3001/api/ai/conflict-suggest \
  -H "Content-Type: application/json" \
  -d '{
    "task": {"id": 999, "title": "Test", "deadline": "2026-03-22", "estimated_hours": 3, "priority_level": "P2"},
    "conflicts": ["2026-03-22 已有同级任务"],
    "allTasks": [
      {"id": 1, "deadline": "2026-03-23", "status": "in_progress", "estimated_hours": 8, "progress_percent": 0, "priority_level": "P2"},
      {"id": 2, "deadline": "2026-03-24", "status": "todo", "estimated_hours": 2, "progress_percent": 0, "priority_level": "P3"}
    ]
  }' | jq '{suggestedDate, suggestion}'
```

Expected: `suggestedDate` should be `2026-03-24` (2026-03-23 has 8h existing P2 same-rank; 2026-03-24 has only 2h P3 lower-rank and 2+3=5h < 10).

- [ ] **Step 3: Verify in the UI**

1. Open a task with a deadline that has conflicts
2. Click 保存 to trigger conflict detection
3. AI suggestion panel appears — verify "採用建議日期" button shows a deterministic date (the actual nearest free slot)
4. Click the button — deadline updates to that date

- [ ] **Step 4: Commit**

```bash
git add routes/ai.js
git commit -m "feat: deterministic nearest free slot in conflict-suggest, AI provides explanation only"
```
