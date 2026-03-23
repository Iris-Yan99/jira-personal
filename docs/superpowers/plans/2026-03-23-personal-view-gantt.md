# Personal View + Gantt Chart Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-based task filtering (members see only their own tasks) and a Gantt chart view showing task timelines.

**Architecture:** `App.jsx` computes `visibleTasks` once (filtered by role) and passes it to all views. A new `GanttView.jsx` renders a pure-CSS horizontal bar chart with auto time-scaling. Header gets a new "甘特圖" tab.

**Tech Stack:** React 18, Tailwind CSS, no external chart library.

---

## Task 1: visibleTasks in App.jsx + wire to existing views

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Add visibleTasks computation**

In `App.jsx`, just before the `return (`, add:

```js
const visibleTasks = currentUser?.role === 'member'
  ? tasks.filter((t) => t.assignee === currentUser.display_name)
  : tasks
```

- [ ] **Step 2: Replace tasks with visibleTasks in KanbanBoard and ScheduleView**

Find these two lines in the JSX:
```jsx
<KanbanBoard tasks={tasks} onTasksChange={loadTasks} />
```
```jsx
{activeTab === 'schedule' && <ScheduleView tasks={tasks} />}
```

Change both to use `visibleTasks`:
```jsx
<KanbanBoard tasks={visibleTasks} onTasksChange={loadTasks} />
```
```jsx
{activeTab === 'schedule' && <ScheduleView tasks={visibleTasks} />}
```

- [ ] **Step 3: Verify manually**

```bash
# Start dev server
npm run dev
```

1. Log in as a member account
2. Confirm kanban only shows tasks assigned to that member
3. Log in as PM → confirm all tasks visible

- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: members only see their own tasks (visibleTasks filter)"
```

---

## Task 2: GanttView.jsx component

**Files:**
- Create: `client/src/components/GanttView.jsx`

- [ ] **Step 1: Create the file with time-range helpers**

```jsx
// client/src/components/GanttView.jsx
import { useMemo } from 'react'

const TASK_COL_W = 220   // px, left fixed column
const MIN_DAY_W = 24     // px per day minimum

function parseDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00')
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Calculate time range from tasks.
 * Start: min(today, earliest created_at)
 * End:   max(latest deadline) + 7 days buffer
 */
function calcRange(tasks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let minDate = new Date(today)
  let maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 30) // fallback: 30 days ahead

  tasks.forEach((t) => {
    if (t.created_at) {
      const d = parseDate(t.created_at.slice(0, 10))
      if (d && d < minDate) minDate = d
    }
    if (t.deadline) {
      const d = parseDate(t.deadline)
      if (d && d > maxDate) maxDate = d
    }
  })

  // Add 7-day buffer at end
  maxDate.setDate(maxDate.getDate() + 7)

  return { start: minDate, end: maxDate, totalDays: daysBetween(minDate, maxDate) }
}

/**
 * Choose time unit based on total span.
 * < 45 days  → day
 * 45-120     → week
 * > 120      → month
 */
function chooseUnit(totalDays) {
  if (totalDays < 45) return 'day'
  if (totalDays <= 120) return 'week'
  return 'month'
}

/**
 * Generate header tick marks for the timeline.
 * Returns array of { label, offset (days from start) }
 */
function buildTicks(start, end, unit) {
  const ticks = []
  const cur = new Date(start)

  if (unit === 'day') {
    while (cur <= end) {
      ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, offset: daysBetween(start, cur) })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (unit === 'week') {
    // Snap to Monday
    const dow = cur.getDay()
    if (dow !== 1) cur.setDate(cur.getDate() + ((8 - dow) % 7))
    while (cur <= end) {
      ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, offset: daysBetween(start, cur) })
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    // month: first of each month
    cur.setDate(1)
    while (cur <= end) {
      ticks.push({ label: `${cur.getFullYear()}/${cur.getMonth() + 1}`, offset: daysBetween(start, cur) })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return ticks
}

const STATUS_COLORS = {
  done:        { bg: '#22c55e', text: '#15803d' },
  in_progress: { bg: '#3b82f6', text: '#1d4ed8' },
  todo:        { bg: '#94a3b8', text: '#475569' },
}

export default function GanttView({ tasks, currentUser }) {
  // Only tasks with a deadline
  const filtered = useMemo(
    () => tasks.filter((t) => t.deadline),
    [tasks]
  )

  const { start, end, totalDays } = useMemo(() => calcRange(filtered), [filtered])
  const unit = chooseUnit(totalDays)
  const ticks = useMemo(() => buildTicks(start, end, unit), [start, end, unit])

  // dayWidth: try to fit in ~800px minimum, but at least MIN_DAY_W
  const dayW = Math.max(MIN_DAY_W, unit === 'week' ? 28 : unit === 'month' ? 14 : 40)
  const totalW = totalDays * dayW

  // Today offset
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayOff = daysBetween(start, todayDate)

  // Group tasks by assignee for PM; flat list for member
  const groups = useMemo(() => {
    if (currentUser?.role !== 'pm') {
      return [{ assignee: null, tasks: filtered }]
    }
    const map = {}
    filtered.forEach((t) => {
      const key = t.assignee || '未指派'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return Object.entries(map).map(([assignee, tasks]) => ({ assignee, tasks }))
  }, [filtered, currentUser])

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        沒有設定 deadline 的任務
      </div>
    )
  }

  const ROW_H = 40
  const SEP_H = 36

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-4 text-sm flex-shrink-0">
        <span className="font-semibold text-gray-800">專案時程</span>
        <div className="flex gap-3">
          {[['done','已完成','#22c55e'],['in_progress','進行中','#3b82f6'],['todo','待辦','#94a3b8']].map(([,label,color]) => (
            <span key={label} className="flex items-center gap-1.5 text-gray-500 text-xs">
              <span style={{width:10,height:10,borderRadius:2,background:color,display:'inline-block'}}/>
              {label}
            </span>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {formatDate(start)} – {formatDate(end)} · {unit === 'day' ? '日' : unit === 'week' ? '週' : '月'}視圖
        </span>
      </div>

      {/* Body: task col + timeline */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: task names */}
        <div
          className="flex-shrink-0 border-r border-gray-200 overflow-y-auto"
          style={{ width: TASK_COL_W }}
          id="gantt-task-col"
        >
          {/* Header */}
          <div className="h-10 flex items-center px-3 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white sticky top-0">
            任務名稱
          </div>

          {groups.map(({ assignee, tasks: groupTasks }) => (
            <div key={assignee ?? 'all'}>
              {assignee !== null && (
                <div className="h-9 flex items-center px-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ background: '#6366f1' }}
                  >
                    {assignee[0]?.toUpperCase()}
                  </span>
                  {assignee}
                </div>
              )}
              {groupTasks.map((t) => (
                <div
                  key={t.id}
                  className="border-b border-gray-50 flex items-center px-3 gap-2 hover:bg-gray-50"
                  style={{ height: ROW_H }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[t.status]?.bg ?? '#94a3b8' }}
                  />
                  <span className="text-sm text-gray-700 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right: timeline */}
        <div className="flex-1 overflow-auto" id="gantt-timeline">
          <div style={{ width: totalW, position: 'relative' }}>
            {/* Header row with ticks */}
            <div
              className="sticky top-0 z-10 bg-white border-b border-gray-200"
              style={{ height: ROW_H, position: 'relative' }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute top-0 bottom-0 flex items-center text-xs text-gray-400 pl-1 border-l border-gray-100"
                  style={{ left: tick.offset * dayW }}
                >
                  {tick.label}
                </div>
              ))}
            </div>

            {/* Grid + bars */}
            <div style={{ position: 'relative' }}>
              {/* Grid lines */}
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute top-0 bottom-0 border-l border-gray-100"
                  style={{ left: tick.offset * dayW }}
                />
              ))}

              {/* Today line */}
              {todayOff >= 0 && todayOff <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{ left: todayOff * dayW, width: 2, background: '#ef4444' }}
                >
                  <span
                    className="absolute text-xs text-red-500 font-bold whitespace-nowrap"
                    style={{ top: 4, left: 4 }}
                  >
                    今天
                  </span>
                </div>
              )}

              {/* Rows */}
              {groups.map(({ assignee, tasks: groupTasks }) => (
                <div key={assignee ?? 'all'}>
                  {assignee !== null && (
                    <div className="bg-gray-50 border-b border-gray-200" style={{ height: SEP_H }} />
                  )}
                  {groupTasks.map((t) => {
                    const taskStart = parseDate(t.created_at?.slice(0, 10)) ?? start
                    const taskEnd   = parseDate(t.deadline) ?? end
                    const barLeft   = Math.max(0, daysBetween(start, taskStart)) * dayW
                    const barWidth  = Math.max(dayW, daysBetween(taskStart, taskEnd) * dayW)
                    const progress  = t.progress_percent ?? 0
                    const color     = STATUS_COLORS[t.status]?.bg ?? '#94a3b8'

                    return (
                      <div
                        key={t.id}
                        className="relative border-b border-gray-50 hover:bg-gray-50/50"
                        style={{ height: ROW_H }}
                      >
                        {/* Bar background */}
                        <div
                          className="absolute rounded"
                          style={{
                            left: barLeft,
                            width: barWidth,
                            top: 10,
                            height: 20,
                            background: color,
                            opacity: 0.2,
                          }}
                        />
                        {/* Bar progress fill */}
                        <div
                          className="absolute rounded"
                          style={{
                            left: barLeft,
                            width: barWidth * (progress / 100),
                            top: 10,
                            height: 20,
                            background: color,
                            opacity: 0.85,
                          }}
                        />
                        {/* Progress label if wide enough */}
                        {barWidth > 40 && (
                          <span
                            className="absolute text-xs font-medium select-none pointer-events-none"
                            style={{
                              left: barLeft + 6,
                              top: 13,
                              color: progress > 30 ? 'white' : color,
                              fontSize: 10,
                            }}
                          >
                            {progress}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Sync scroll between task col and timeline**

Add a useEffect at the top of the component (after the useMemo calls) to sync vertical scroll:

```jsx
import { useMemo, useEffect, useRef } from 'react'

// Inside GanttView, after the useMemo hooks:
useEffect(() => {
  const timeline = document.getElementById('gantt-timeline')
  const taskCol  = document.getElementById('gantt-task-col')
  if (!timeline || !taskCol) return
  const onScroll = () => { taskCol.scrollTop = timeline.scrollTop }
  timeline.addEventListener('scroll', onScroll)
  return () => timeline.removeEventListener('scroll', onScroll)
}, [groups])
```

- [ ] **Step 3: Verify the file builds**

```bash
cd /Users/iris/Desktop/jira-personal/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...ms` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/GanttView.jsx
git commit -m "feat: add GanttView component with auto time-scaling and role-aware grouping"
```

---

## Task 3: Wire GanttView into App.jsx + Header

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/Header.jsx`

- [ ] **Step 1: Add gantt tab to Header.jsx**

Find in `client/src/components/Header.jsx`:
```js
const TABS = [
  { id: 'board', label: '看板' },
  { id: 'schedule', label: '日程' },
  { id: 'reports', label: '报告' },
  { id: 'settings', label: '设置' },
]
```

Replace with:
```js
const TABS = [
  { id: 'board', label: '看板' },
  { id: 'schedule', label: '日程' },
  { id: 'gantt', label: '甘特圖' },
  { id: 'reports', label: '报告' },
  { id: 'settings', label: '设置' },
]
```

- [ ] **Step 2: Import GanttView in App.jsx**

Add to the imports at the top of `client/src/App.jsx`:
```js
import GanttView from './components/GanttView'
```

- [ ] **Step 3: Render GanttView in App.jsx**

Find:
```jsx
{activeTab === 'reports' && <ReportsView tasks={tasks} />}
```

Add before it:
```jsx
{activeTab === 'gantt' && <GanttView tasks={visibleTasks} currentUser={currentUser} />}
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/iris/Desktop/jira-personal/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...ms`

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

1. Log in as PM → click「甘特圖」tab → should see tasks grouped by assignee
2. Log in as member → click「甘特圖」→ should see only their own tasks, no grouping
3. Log in as member → click「看板」→ only their tasks shown
4. Tasks without deadline should not appear in Gantt

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/components/Header.jsx
git commit -m "feat: wire GanttView into app — gantt tab for PM (grouped) and member (personal)"
```

---

## Cleanup

- [ ] **Delete the mockup file**

```bash
rm /Users/iris/Desktop/jira-personal/gantt-mockup.html
git add -A && git commit -m "chore: remove gantt mockup file"
```
