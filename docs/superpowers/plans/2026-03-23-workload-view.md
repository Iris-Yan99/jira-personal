# Workload View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PM-only "👥 工作量" tab showing member workload bars + task columns, with click-to-assign dropdown on each task card.

**Architecture:** Pure frontend, no new backend endpoints. `WorkloadView.jsx` consumes existing `api.getTasks()`, `api.getMembers()`, and `api.updateTask()`. Header.jsx gains a `pmOnly` flag on the new tab. App.jsx wires the new view like all other tab views.

**Tech Stack:** React 18, Tailwind CSS, existing `api.js` utility

**Spec:** `docs/prds/PRD-WORKLOAD.md`, cards `CARD-WORKLOAD-001`, `CARD-WORKLOAD-002`

---

## Chunk 1: WorkloadView component

### Task 1: Create WorkloadView.jsx

**Files:**
- Create: `client/src/components/WorkloadView.jsx`

- [ ] **Step 1: Create the file with all imports and constants**

```jsx
// @card CARD-WORKLOAD-001
import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../utils/api'

const PRIORITY_BADGE = {
  P1: 'bg-red-500 text-white',
  P2: 'bg-orange-400 text-white',
  P3: 'bg-yellow-400 text-gray-800',
  P4: 'bg-gray-300 text-gray-700',
}

const WEEK_HOURS = 40  // 100% workload threshold
const WARN_HOURS = 35  // warning threshold
```

- [ ] **Step 2: Add helper function `calcWorkload` and `WorkloadBar` component**

```jsx
function calcWorkload(tasks, memberName) {
  return tasks
    .filter(t => t.assignee === memberName && t.status !== 'done')
    .reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
}

function WorkloadBar({ hours }) {
  const pct = Math.min((hours / WEEK_HOURS) * 100, 100)
  const color =
    hours >= WEEK_HOURS ? 'bg-red-500' :
    hours >= WARN_HOURS ? 'bg-orange-400' :
    'bg-blue-500'
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
```

- [ ] **Step 3: Add `AssignDropdown` component**

```jsx
function AssignDropdown({ tasks, members, onAssign, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-44 py-1"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
        指派給
      </div>
      {members.map(m => {
        const hours = calcWorkload(tasks, m.name)
        const isOver = hours >= WARN_HOURS
        return (
          <button
            key={m.id}
            onClick={() => onAssign(m.name)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors"
          >
            <span className="text-gray-700">👤 {m.name}</span>
            <span className={`text-xs ${isOver ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
              {hours}h{isOver ? ' ⚠️' : ''}
            </span>
          </button>
        )
      })}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          onClick={() => onAssign('')}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
        >
          — 清除指派
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add `TaskCard` component**

```jsx
function TaskCard({ task, tasks, members, onAssign }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative bg-white border border-gray-100 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer select-none"
      onClick={() => setOpen(true)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-gray-800 leading-snug">{task.title}</span>
        <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[task.priority_level] || PRIORITY_BADGE.P4}`}>
          {task.priority_level || 'P4'}
        </span>
      </div>
      {task.deadline && (
        <div className="text-xs text-gray-400">📅 {task.deadline}</div>
      )}
      {task.estimated_hours > 0 && (
        <div className="text-xs text-gray-400 mt-0.5">⏱ {task.estimated_hours}h</div>
      )}
      {task.assignee && (
        <div className="text-xs text-blue-500 mt-0.5">👤 {task.assignee}</div>
      )}
      {open && (
        <AssignDropdown
          tasks={tasks}
          members={members}
          onAssign={(name) => { onAssign(task.id, name); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add main `WorkloadView` export**

```jsx
export default function WorkloadView({ tasks, currentUser, onTasksChange }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {})
  }, [])

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])

  const unassigned = useMemo(
    () => activeTasks.filter(t => !t.assignee),
    [activeTasks]
  )

  const memberWorkloads = useMemo(() => {
    return members.map(m => ({
      ...m,
      hours: calcWorkload(activeTasks, m.name),
      tasks: activeTasks.filter(t => t.assignee === m.name),
    }))
  }, [members, activeTasks])

  const handleAssign = async (taskId, assignee) => {
    await api.updateTask(taskId, { assignee: assignee || '' })
    onTasksChange()
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left: member workload panel */}
      <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">組員工作量</div>
        {memberWorkloads.map(m => (
          <div key={m.id} className="mb-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">👤 {m.name}</span>
              {m.hours >= WARN_HOURS && <span className="text-xs text-orange-500 font-bold">⚠️</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {m.tasks.length} 個任務 · {m.hours}h
            </div>
            <WorkloadBar hours={m.hours} />
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">暫無成員</div>
        )}
      </div>

      {/* Right: task columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full" style={{ minWidth: `${(memberWorkloads.length + 1) * 224}px` }}>

          {/* Unassigned column */}
          <div className="w-52 flex-shrink-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-600">未指派</span>
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                {unassigned.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {unassigned.map(t => (
                <TaskCard key={t.id} task={t} tasks={activeTasks} members={members} onAssign={handleAssign} />
              ))}
              {unassigned.length === 0 && (
                <div className="text-xs text-gray-300 text-center py-8">全部已指派 ✓</div>
              )}
            </div>
          </div>

          {/* Per-member columns */}
          {memberWorkloads.map(m => (
            <div key={m.id} className="w-52 flex-shrink-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
                <span className="text-sm font-semibold text-gray-600">{m.name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                  {m.tasks.length}
                </span>
                {m.hours >= WARN_HOURS && (
                  <span className="text-xs text-orange-500">⚠️ {m.hours}h</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {m.tasks.map(t => (
                  <TaskCard key={t.id} task={t} tasks={activeTasks} members={members} onAssign={handleAssign} />
                ))}
                {m.tasks.length === 0 && (
                  <div className="text-xs text-gray-300 text-center py-8">無任務</div>
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify file is complete — no syntax errors**

Open the file and confirm all function components are closed properly.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/WorkloadView.jsx
git commit -m "feat: add WorkloadView component with member workload bars and click-to-assign"
```

---

## Chunk 2: Header + App wiring

### Task 2: Wire tab into Header.jsx and App.jsx

**Files:**
- Modify: `client/src/components/Header.jsx`
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Open Header.jsx and locate the TABS array (line 1–7)**

Current:
```js
const TABS = [
  { id: 'board', label: '看板' },
  { id: 'schedule', label: '日程' },
  { id: 'gantt', label: '甘特圖' },
  { id: 'reports', label: '报告' },
  { id: 'settings', label: '设置' },
]
```

- [ ] **Step 2: Add `pmOnly` flag to the workload tab entry**

Replace the TABS array with:
```js
const TABS = [
  { id: 'board', label: '看板' },
  { id: 'schedule', label: '日程' },
  { id: 'gantt', label: '甘特圖' },
  { id: 'workload', label: '👥 工作量', pmOnly: true },
  { id: 'reports', label: '报告' },
  { id: 'settings', label: '设置' },
]
```

- [ ] **Step 3: Filter TABS in the nav render to hide pmOnly tabs from members**

Locate the `{TABS.map((tab) => (` in the nav render (around line 21) and add a filter:

```jsx
{TABS.filter(tab => !tab.pmOnly || currentUser?.role === 'pm').map((tab) => (
  <button
    key={tab.id}
    onClick={() => setActiveTab(tab.id)}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      activeTab === tab.id
        ? 'bg-blue-50 text-blue-600'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {tab.label}
  </button>
))}
```

- [ ] **Step 4: Open App.jsx — add WorkloadView import at top**

After the existing imports (around line 10), add:
```js
import WorkloadView from './components/WorkloadView'
```

- [ ] **Step 5: Add WorkloadView render in the main section**

Find the `<main>` block (around line 157). After the GanttView line:
```jsx
{activeTab === 'gantt' && <GanttView tasks={visibleTasks} currentUser={currentUser} />}
```

Add:
```jsx
{activeTab === 'workload' && <WorkloadView tasks={tasks} currentUser={currentUser} onTasksChange={loadTasks} />}
```

Note: `WorkloadView` receives `tasks` (unfiltered by search), not `visibleTasks`. PM needs to see all tasks for assignment, regardless of current search query.

Note on data consistency: `members.name` must match auth `user.display_name` exactly for workload calculation and assignment to work correctly. This is guaranteed by `routes/auth.js` which auto-syncs `display_name` → `members` table on user creation. Do not manually insert members table rows — always create via UserManageModal.

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

1. Login as PM → Header shows「👥 工作量」tab between 甘特圖 and 报告
2. Click「👥 工作量」→ left panel shows members with workload bars
3. Right panel shows「未指派」column + one column per member
4. Click any task card → dropdown appears with member list + hours
5. Select a member → task moves to their column, workload bar updates
6. Select「清除指派」→ task moves back to 未指派 column
7. Login as member → 工作量 tab is NOT visible in header

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Header.jsx client/src/App.jsx
git commit -m "feat: wire WorkloadView into Header tab (pm-only) and App.jsx"
```

---

## Done

Both commits on `feature/workload-view`. Merge to main when verified:

```bash
git checkout main
git merge feature/workload-view
git push origin main
```
