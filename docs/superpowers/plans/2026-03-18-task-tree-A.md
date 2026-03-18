# Task Tree A — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 任務支持無限層級父子關係，看板遞迴展開子樹，進度自動計算

**Architecture:** Flat API（`parent_id` 欄位）+ 前端 `taskTree.js` 建樹；`TaskTreeNode` 遞迴組件取代原 `TaskCard` 在看板中渲染；`db.js` 以 migration v1 新增欄位。

**Tech Stack:** Node.js/Express + better-sqlite3（backend）、React 18 + Tailwind CSS（frontend）

---

## Chunk 1：資料庫 Migration

### Task 1：db.js 加入 runMigrations()

**Files:**
- Modify: `db.js`

- [ ] **Step 1：在 `db.js` 末尾（`module.exports = db` 之前）加入 runMigrations**

```js
function runMigrations() {
  const version = db.pragma('user_version', { simple: true });

  if (version < 1) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
      ALTER TABLE tasks ADD COLUMN progress_percent INTEGER DEFAULT 0;
    `);
    db.pragma('user_version = 1');
    console.log('[DB] Migration v1 applied: parent_id, progress_percent');
  }
}

runMigrations();
```

- [ ] **Step 2：重啟 server 確認 migration 執行**

```bash
node server.js
```
預期輸出：`[DB] Migration v1 applied: parent_id, progress_percent`

再次重啟，預期**不再輸出** migration 訊息（幂等）。

- [ ] **Step 3：用 sqlite3 CLI 確認欄位存在**

```bash
sqlite3 data/tasks.db ".schema tasks" | grep -E "parent_id|progress_percent"
```
預期：出現兩個欄位定義。

- [ ] **Step 4：Commit**

```bash
git add db.js
git commit -m "feat: add migration v1 for parent_id and progress_percent"
```

---

## Chunk 2：後端 CRUD 更新

### Task 2：routes/tasks.js 支持新欄位

**Files:**
- Modify: `routes/tasks.js`

- [ ] **Step 1：GET / 加入新欄位**

找到 `SELECT t.*` 查詢，確認 `t.*` 已涵蓋新欄位（因為是 ALTER TABLE 加的，`*` 會自動包含）。無需修改 SELECT，但需確認 response 有這些欄位。

用 curl 測試：
```bash
curl -s http://localhost:3001/api/tasks | python3 -c "
import sys,json
tasks = json.load(sys.stdin)
if tasks:
    t = tasks[0]
    print('parent_id' in t, 'progress_percent' in t)
"
```
預期：`True True`

- [ ] **Step 2：POST / 接受 parent_id 和 progress_percent**

找到 `router.post('/', ...)` 的解構賦值：
```js
const { title, description, deadline, estimated_hours, importance, status, tags } = req.body;
```
改為：
```js
const { title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent } = req.body;
```

找到 INSERT 語句，加入新欄位：
```js
db.prepare(`
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
```

- [ ] **Step 3：PUT /:id 接受 parent_id 和 progress_percent**

找到 `router.put('/:id', ...)` 的解構賦值，加入：
```js
const { title, description, deadline, estimated_hours, importance, status, priority_score, priority_level, tags, parent_id, progress_percent } = req.body;
```

在 UPDATE SET 中加入（COALESCE 模式，`null` 保留原值，要更新為 null 需特殊處理 parent_id）：

```js
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
  req.body.clear_parent === true ? 1 : 0,   // clear_parent: true → set parent_id = NULL
  parent_id ?? null,
  progress_percent ?? null,
  req.params.id
);
```

> 說明：`clear_parent: true` 是為了支持「移除父任務（設回頂層）」，因為 COALESCE 無法區分「不傳」和「傳 null」。

- [ ] **Step 4：測試 POST 帶 parent_id**

```bash
# 先建立一個父任務
PARENT=$(curl -s -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"父任務","deadline":"2026-04-01","estimated_hours":8,"importance":"high"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Parent ID: $PARENT"

# 建立子任務
curl -s -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"子任務\",\"deadline\":\"2026-03-25\",\"estimated_hours\":2,\"parent_id\":$PARENT}" | python3 -m json.tool | grep parent_id
```
預期：`"parent_id": <PARENT_ID>`

- [ ] **Step 5：測試 PUT clear_parent**

```bash
curl -s -X PUT http://localhost:3001/api/tasks/$CHILD_ID \
  -H 'Content-Type: application/json' \
  -d '{"clear_parent": true}' | python3 -m json.tool | grep parent_id
```
預期：`"parent_id": null`

- [ ] **Step 6：Commit**

```bash
git add routes/tasks.js
git commit -m "feat: tasks CRUD supports parent_id and progress_percent"
```

---

## Chunk 3：前端樹工具

### Task 3：新增 client/src/utils/taskTree.js

**Files:**
- Create: `client/src/utils/taskTree.js`

- [ ] **Step 1：建立 taskTree.js**

```js
/**
 * Build a tree structure from a flat task array.
 * @param {Task[]} tasks
 * @returns {{ roots: Task[], childrenMap: Record<number, Task[]>, tasksById: Record<number, Task> }}
 */
export function buildTree(tasks) {
  const tasksById = {};
  const childrenMap = {};

  tasks.forEach((t) => {
    tasksById[t.id] = t;
    childrenMap[t.id] = [];
  });

  tasks.forEach((t) => {
    if (t.parent_id && childrenMap[t.parent_id]) {
      childrenMap[t.parent_id].push(t);
    }
  });

  const roots = tasks.filter((t) => !t.parent_id);
  return { roots, childrenMap, tasksById };
}

/**
 * Calculate progress for a task node.
 * - Leaf node (no children): returns task.progress_percent
 * - Parent node: returns % of direct children with status === 'done'
 * @param {number} taskId
 * @param {Record<number, Task[]>} childrenMap
 * @param {Record<number, Task>} tasksById
 * @returns {number} 0-100
 */
export function calcProgress(taskId, childrenMap, tasksById) {
  const children = childrenMap[taskId];
  if (!children || children.length === 0) {
    return tasksById[taskId]?.progress_percent ?? 0;
  }
  const doneCount = children.filter((c) => c.status === 'done').length;
  return Math.round((doneCount / children.length) * 100);
}

/**
 * Get all descendant IDs of a task (BFS).
 * Used to prevent circular re-parenting.
 * @param {number} taskId
 * @param {Record<number, Task[]>} childrenMap
 * @returns {Set<number>}
 */
export function getDescendantIds(taskId, childrenMap) {
  const result = new Set();
  const queue = [...(childrenMap[taskId] || [])];
  while (queue.length > 0) {
    const node = queue.shift();
    result.add(node.id);
    (childrenMap[node.id] || []).forEach((c) => queue.push(c));
  }
  return result;
}
```

- [ ] **Step 2：在瀏覽器 console 快速驗證（或直接進下一步）**

建立測試數據後在 App.jsx 暫時加 console.log：
```js
import { buildTree, calcProgress, getDescendantIds } from './utils/taskTree'
// 在 loadTasks 後 console.log(buildTree(data))
```
確認 roots / childrenMap 結構正確後移除 console.log。

- [ ] **Step 3：Commit**

```bash
git add client/src/utils/taskTree.js
git commit -m "feat: add taskTree utility (buildTree, calcProgress, getDescendantIds)"
```

---

## Chunk 4：KanbanBoard 樹形渲染

### Task 4：KanbanBoard 遞迴渲染 TaskTreeNode

**Files:**
- Modify: `client/src/components/KanbanBoard.jsx`

這是最複雜的一步，分為三個小步驟。

#### 4a：引入工具 + 基礎 state

- [ ] **Step 1：更新 imports 和 state**

在 KanbanBoard.jsx 頂部加入：
```js
import { useMemo, useState, useEffect } from 'react'
import { buildTree, calcProgress } from '../utils/taskTree'
```
（原本是 `import { useState, useEffect } from 'react'`）

在組件內現有 state 之後加入：
```js
const [expandedIds, setExpandedIds] = useState(new Set())
const toggleExpand = (id) =>
  setExpandedIds((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

const { roots, childrenMap, tasksById } = useMemo(
  () => buildTree(tasks),
  [tasks]
)
```

#### 4b：TaskTreeNode 組件

- [ ] **Step 2：在 KanbanBoard.jsx 的組件定義之前（或內部）加入 TaskTreeNode**

```jsx
const DEPTH_COLORS = ['border-blue-300', 'border-yellow-300', 'border-green-300', 'border-purple-300', 'border-pink-300']

function TaskTreeNode({ task, childrenMap, tasksById, depth, expandedIds, onToggle, onLeafDone, onOpenEdit }) {
  const children = childrenMap[task.id] || []
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(task.id)
  const progress = calcProgress(task.id, childrenMap, tasksById)
  const depthColor = DEPTH_COLORS[depth % DEPTH_COLORS.length]

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = task.deadline
    ? (() => { const [y, m, d] = task.deadline.split('-').map(Number); return new Date(y, m - 1, d) })()
    : null
  const daysLeft = deadline ? Math.round((deadline - today) / 86400000) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done'

  const PRIORITY_STYLE = {
    P1: 'bg-red-500 text-white', P2: 'bg-orange-400 text-white',
    P3: 'bg-yellow-400 text-gray-800', P4: 'bg-gray-300 text-gray-700',
  }

  return (
    <div className={depth > 0 ? `ml-3 pl-3 border-l-2 ${depthColor}` : ''}>
      {/* Node card */}
      <div
        className={`bg-white rounded-xl border border-gray-100 p-3 mb-2 ${depth === 0 ? 'shadow-sm' : ''} ${!hasChildren ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
        onClick={!hasChildren ? () => onOpenEdit(task) : undefined}
      >
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          {/* Leaf checkbox */}
          {!hasChildren && (
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => onLeafDone(task)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 cursor-pointer accent-blue-600"
            />
          )}
          <h3
            className={`flex-1 text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}
            onClick={hasChildren ? () => onOpenEdit(task) : undefined}
            style={hasChildren ? { cursor: 'pointer' } : {}}
          >
            {task.title}
          </h3>
          <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${PRIORITY_STYLE[task.priority_level] || PRIORITY_STYLE.P4}`}>
            {task.priority_level || 'P4'}
          </span>
          {/* Expand/collapse toggle */}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(task.id) }}
              className="text-xs text-gray-400 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
            >
              {isExpanded ? '▲ 收起' : `▼ ${children.length}子任務`}
            </button>
          )}
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className={`flex items-center gap-1 text-xs mb-1.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            <span>📅</span><span>{task.deadline}</span>
            {isOverdue && <span>(已逾期)</span>}
            {!isOverdue && daysLeft !== null && daysLeft <= 7 && (
              <span className="text-orange-500">({daysLeft === 0 ? '今天' : `${daysLeft}天後`})</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{progress}%</span>
        </div>
      </div>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <div className="mb-2">
          {children.map((child) => (
            <TaskTreeNode
              key={child.id}
              task={child}
              childrenMap={childrenMap}
              tasksById={tasksById}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onLeafDone={onLeafDone}
              onOpenEdit={onOpenEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 4c：看板欄改用 TaskTreeNode

- [ ] **Step 3：看板欄改為渲染頂層任務的 TaskTreeNode**

找到現有的 `{byStatus[col.id].map((task) => (<TaskCard .../>))}` 部分，改為：

```jsx
{roots
  .filter((t) => t.status === col.id)
  .map((task) => (
    <TaskTreeNode
      key={task.id}
      task={task}
      childrenMap={childrenMap}
      tasksById={tasksById}
      depth={0}
      expandedIds={expandedIds}
      onToggle={toggleExpand}
      onLeafDone={handleLeafDone}
      onOpenEdit={setEditTask}
    />
  ))
}
```

也更新空狀態判斷（原本是 `byStatus[col.id].length === 0`）：
```jsx
{roots.filter((t) => t.status === col.id).length === 0 && (
  <div className="text-center text-sm py-10 text-gray-300">
    {dragOver === col.id ? '放置到此处' : '暂无任务'}
  </div>
)}
```

- [ ] **Step 4：更新 totalHours 和欄位任務計數**

```js
// 改為只計算頂層任務（或全部任務）
const totalHours = (colId) =>
  tasks.filter((t) => t.status === colId).reduce((s, t) => s + (t.estimated_hours || 0), 0)
```

欄位 header 的 count badge 改為：
```jsx
{tasks.filter((t) => t.status === col.id).length}
```

- [ ] **Step 5：移除不再使用的 TaskCard import**

若 TaskCard 只在 KanbanBoard 使用，可移除 import（保留文件，PRD-B 以外場景可能還需要）：
```js
// 移除：import TaskCard from './TaskCard'
```

- [ ] **Step 6：手動測試 — 樹形展開**

```bash
npm run dev
```

1. 確認看板只顯示頂層任務
2. 有子任務的任務顯示「▼ N子任務」按鈕
3. 點擊展開，子任務縮排顯示
4. 多層展開正常（遞迴）
5. 葉節點有 checkbox，點擊 checkbox 狀態改變

- [ ] **Step 7：Commit**

```bash
git add client/src/components/KanbanBoard.jsx
git commit -m "feat: recursive TaskTreeNode replaces TaskCard in kanban"
```

---

## Chunk 5：葉節點完成提示 + 父任務選擇

### Task 5：handleLeafDone 和全完成提示

**Files:**
- Modify: `client/src/components/KanbanBoard.jsx`

- [ ] **Step 1：在 KanbanBoard 組件內加入 handleLeafDone**

（放在 `resetQc` 之後）

```js
const handleLeafDone = async (task) => {
  const newStatus = task.status === 'done' ? 'todo' : 'done'
  await api.updateTask(task.id, { status: newStatus })
  onTasksChange()

  // Only check for parent completion when marking done
  if (newStatus !== 'done' || !task.parent_id) return

  // Re-fetch to get updated states, then check siblings
  // We rely on onTasksChange to re-render; use updated tasks from next render
  // Instead, compute from current tasks + the change
  const updatedTasks = tasks.map((t) =>
    t.id === task.id ? { ...t, status: 'done' } : t
  )
  checkParentCompletion(task.parent_id, updatedTasks)
}

const checkParentCompletion = (parentId, currentTasks) => {
  if (!parentId) return
  const siblings = currentTasks.filter((t) => t.parent_id === parentId)
  const allDone = siblings.length > 0 && siblings.every((t) => t.status === 'done')
  if (!allDone) return

  const parent = currentTasks.find((t) => t.id === parentId)
  if (!parent || parent.status === 'done') return

  const confirmed = window.confirm(`所有子任務已完成，是否完成「${parent.title}」？`)
  if (confirmed) {
    api.updateTask(parentId, { status: 'done' }).then(() => {
      onTasksChange()
      // Recursively check grandparent
      const updatedTasks2 = currentTasks.map((t) =>
        t.id === parentId ? { ...t, status: 'done' } : t
      )
      checkParentCompletion(parent.parent_id, updatedTasks2)
    })
  }
}
```

- [ ] **Step 2：測試 — 葉節點全完成提示**

1. 建立父任務 + 2 個子任務
2. 勾選第一個子任務 → 不彈提示
3. 勾選第二個子任務 → 彈出確認框
4. 確認 → 父任務移至「已完成」欄
5. 取消 → 父任務留在原欄

- [ ] **Step 3：Commit**

```bash
git add client/src/components/KanbanBoard.jsx
git commit -m "feat: prompt user to complete parent when all subtasks done"
```

### Task 6：TaskEditModal 父任務選擇 + 快速創建父任務選項

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`
- Modify: `client/src/components/KanbanBoard.jsx`（快速創建表單）

- [ ] **Step 1：TaskEditModal 加入父任務 select**

TaskEditModal 需要接收 `tasks` prop（已有）和 `task.id`（已有）。

在 Info Tab 的「標題」欄位之後加入：

```jsx
{/* Parent task selector */}
<div>
  <label className="block text-xs text-gray-500 mb-1">父任務（可選）</label>
  <select
    value={form.parent_id || ''}
    onChange={(e) => setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
  >
    <option value="">— 無（頂層任務）—</option>
    {tasks
      .filter((t) => {
        if (t.id === task.id) return false           // 不能是自身
        // 過濾子孫（需要 getDescendantIds）
        return !descendantIds.has(t.id)
      })
      .map((t) => (
        <option key={t.id} value={t.id}>{t.title}</option>
      ))
    }
  </select>
</div>
```

在 TaskEditModal 頂部加入：
```js
import { useMemo } from 'react'
import { buildTree, getDescendantIds } from '../utils/taskTree'
```

在組件內加入：
```js
const { childrenMap } = useMemo(() => buildTree(tasks), [tasks])
const descendantIds = useMemo(
  () => getDescendantIds(task.id, childrenMap),
  [task.id, childrenMap]
)
const [form, setForm] = useState({
  ...existing fields...,
  parent_id: task.parent_id || null,
})
```

儲存時加入 `parent_id` 和 `clear_parent`：
```js
await onSave({
  ...formData,
  parent_id: form.parent_id || null,
  clear_parent: form.parent_id === null,
})
```

- [ ] **Step 2：快速創建表單加父任務選項**

在 KanbanBoard 快速創建表單的工時 tag 之前加入：

State：
```js
const [qcParentId, setQcParentId] = useState(null)
```

在 `resetQc` 中加入：
```js
setQcParentId(null)
```

在 `handleQuickCreate` 的 `api.createTask` 中加入：
```js
parent_id: qcParentId || null,
```

UI（在自然語言輸入行之後、標題輸入之前）：
```jsx
<select
  value={qcParentId || ''}
  onChange={(e) => setQcParentId(e.target.value ? Number(e.target.value) : null)}
  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
>
  <option value="">頂層任務</option>
  {tasks.map((t) => (
    <option key={t.id} value={t.id}>{t.title}</option>
  ))}
</select>
```

- [ ] **Step 3：手動測試 — 父任務選擇**

1. 打開任務編輯 Modal → 父任務下拉不含自身和子孫
2. 選擇父任務後儲存 → 任務移至子節點
3. 選「無（頂層任務）」→ 任務回到頂層
4. 快速創建時選擇父任務 → 新任務出現在指定父任務下

- [ ] **Step 4：Commit**

```bash
git add client/src/components/TaskEditModal.jsx client/src/components/KanbanBoard.jsx
git commit -m "feat: parent task selector in quick create and edit modal"
```

---

## 最終驗收

- [ ] 重啟 server，舊任務正常載入，schema 有 parent_id / progress_percent
- [ ] 看板只顯示頂層任務，不含子任務
- [ ] 展開/收起正常，多層遞迴渲染
- [ ] 每個節點有進度條（父節點自動計算，葉節點顯示 progress_percent）
- [ ] 葉節點 checkbox 勾選，全兄弟完成後彈提示
- [ ] 確認父完成 → 父任務移欄 → 遞迴向上觸發
- [ ] 快速創建可選父任務
- [ ] TaskEditModal 可修改父任務（re-parent），下拉過濾子孫
- [ ] `npm run build` 無錯誤
