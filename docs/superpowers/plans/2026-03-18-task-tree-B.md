# Task Tree B — PM Workflow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每個任務節點支持責任人、進度備注、需協調事項；SettingsView 管理成員列表

**Architecture:** Migration v2 新增 3 個 tasks 欄位 + members 表；新增 routes/members.js；TaskEditModal 加「備注」Tab；TaskTreeNode 展開後顯示備注摘要（需協調紅色高亮）。

**Tech Stack:** Node.js/Express + better-sqlite3（backend）、React 18 + Tailwind CSS（frontend）

---

## Chunk 1：資料庫 + 後端

### Task 1：Migration v2 + members 表

**Files:**
- Modify: `db.js`

- [ ] **Step 1：在 db.js 的 runMigrations() 加入 v2**

找到 `if (version < 1)` 區塊之後，加入：

```js
  if (version < 2) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT '';
      ALTER TABLE tasks ADD COLUMN progress_note TEXT DEFAULT '';
      ALTER TABLE tasks ADD COLUMN coordination_note TEXT DEFAULT '';
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);
    db.pragma('user_version = 2');
    console.log('[DB] Migration v2 applied: assignee, progress_note, coordination_note, members table');
  }
```

- [ ] **Step 2：重啟 server 確認 migration 執行**

```bash
node server.js
```
預期：`[DB] Migration v2 applied: assignee, progress_note, coordination_note, members table`

再次重啟 → 不再輸出（冪等）。

- [ ] **Step 3：確認 schema**

```bash
sqlite3 data/tasks.db ".schema tasks" | grep -E "assignee|progress_note|coordination_note"
sqlite3 data/tasks.db ".schema members"
```

- [ ] **Step 4：Commit**

```bash
git add db.js
git commit -m "feat: migration v2 (assignee, notes, members table)"
```

---

### Task 2：routes/members.js + server.js

**Files:**
- Create: `routes/members.js`
- Modify: `server.js`

- [ ] **Step 1：新增 routes/members.js**

```js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM members ORDER BY created_at ASC').all();
  res.json(members);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '名字不能為空' });
  try {
    const result = db.prepare('INSERT INTO members (name) VALUES (?)').run(name.trim());
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.json(member);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: '成員已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
```

- [ ] **Step 2：server.js 掛載 /api/members**

在 `app.use('/api/ai', ...)` 之後加入：
```js
app.use('/api/members', require('./routes/members'));
```

- [ ] **Step 3：測試 members API**

```bash
# 新增成員
curl -s -X POST http://localhost:3001/api/members \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice"}' | python3 -m json.tool

# 列出成員
curl -s http://localhost:3001/api/members | python3 -m json.tool

# 刪除（用上面返回的 id）
curl -s -X DELETE http://localhost:3001/api/members/1
```

- [ ] **Step 4：Commit**

```bash
git add routes/members.js server.js
git commit -m "feat: add members CRUD API"
```

---

### Task 3：routes/tasks.js 支持 assignee、notes 欄位

**Files:**
- Modify: `routes/tasks.js`

- [ ] **Step 1：POST / 加入三個新欄位**

找到 `const { ..., parent_id, progress_percent } = req.body`，加入：
```js
const { title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent, assignee, progress_note, coordination_note } = req.body;
```

INSERT 加入三個欄位：
```js
db.prepare(`
  INSERT INTO tasks (title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent, assignee, progress_note, coordination_note)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  title, description || '', deadline || null,
  estimated_hours || 1, importance || 'mid', status || 'todo',
  JSON.stringify(tags || []),
  parent_id || null, progress_percent || 0,
  assignee || '', progress_note || '', coordination_note || ''
);
```

- [ ] **Step 2：PUT /:id COALESCE 更新三個新欄位**

找到現有 UPDATE，在 `progress_percent = COALESCE(?, progress_percent),` 後加入：
```sql
assignee = COALESCE(?, assignee),
progress_note = COALESCE(?, progress_note),
coordination_note = COALESCE(?, coordination_note),
```

對應 `.run(...)` 中對應位置加入三個參數：
```js
assignee ?? null,
progress_note ?? null,
coordination_note ?? null,
```

- [ ] **Step 3：測試新欄位**

```bash
curl -s http://localhost:3001/api/tasks | python3 -c "
import sys,json
t = json.load(sys.stdin)[0]
print('assignee:', 'assignee' in t)
print('progress_note:', 'progress_note' in t)
print('coordination_note:', 'coordination_note' in t)
"
```
預期：三個 `True`

- [ ] **Step 4：Commit**

```bash
git add routes/tasks.js
git commit -m "feat: tasks CRUD supports assignee, progress_note, coordination_note"
```

---

## Chunk 2：前端 API + SettingsView

### Task 4：api.js 加入 members 方法

**Files:**
- Modify: `client/src/utils/api.js`

- [ ] **Step 1：在 api 物件末尾加入 members 方法**

找到 `extractTask: (description) => ...` 後加入：
```js
  // Members
  getMembers: () => request('/members'),
  createMember: (name) => request('/members', json({ name })),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 2：Commit**

```bash
git add client/src/utils/api.js
git commit -m "feat: add members API methods to api client"
```

---

### Task 5：SettingsView 成員管理 UI

**Files:**
- Modify: `client/src/components/SettingsView.jsx`

- [ ] **Step 1：改寫 SettingsView.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from '../utils/api'

export default function SettingsView() {
  const [members, setMembers] = useState([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    try {
      const data = await api.getMembers()
      setMembers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      await api.createMember(newName.trim())
      setNewName('')
      await loadMembers()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    await api.deleteMember(id)
    await loadMembers()
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">

        {/* System info card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚙️ 系统设置</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Ollama 地址', 'http://localhost:11434'],
              ['AI 模型', 'qwen3-vl:8b-instruct'],
              ['工作时间', '9:00 - 18:00'],
              ['后端端口', '3001'],
              ['前端端口', '5173'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800 font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">数据库保存于 /data/tasks.db</p>
        </div>

        {/* Members card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">👥 團隊成員</h2>

          {/* Add member */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="輸入成員名字..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {adding ? '新增中...' : '+ 新增'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          {/* Member list */}
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">尚無成員，新增第一位吧</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {m.name[0]}
                    </div>
                    <span className="text-sm text-gray-700">{m.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2：手動測試 SettingsView**
  1. 切換到「設定」Tab
  2. 新增成員「Alice」「Bob」
  3. 成員列表顯示頭像縮寫 + 名字
  4. 點「移除」→ 成員消失

- [ ] **Step 3：Commit**

```bash
git add client/src/components/SettingsView.jsx
git commit -m "feat: SettingsView member management UI"
```

---

## Chunk 3：TaskEditModal 備注 Tab + 責任人

### Task 6：TaskEditModal 加責任人 combobox + 備注 Tab

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`

- [ ] **Step 1：載入成員列表**

在 TaskEditModal 組件內加入：
```js
const [members, setMembers] = useState([])
useEffect(() => {
  api.getMembers().then(setMembers).catch(() => {})
}, [])
```

form state 加入：
```js
assignee: task.assignee || '',
progress_note: task.progress_note || '',
coordination_note: task.coordination_note || '',
```

doSave 傳出 assignee、progress_note、coordination_note（已在 `...form` 中涵蓋）。

- [ ] **Step 2：Tab 列表加入「備注」**

找到：
```jsx
{[{ id: 'info', label: '基本信息' }, { id: 'logs', label: '日志' }].map(...)
```
改為：
```jsx
{[{ id: 'info', label: '基本信息' }, { id: 'notes', label: '備注' }, { id: 'logs', label: '日志' }].map(...)
```

- [ ] **Step 3：Info Tab 加入責任人 combobox**

在「父任務」Field 之後加入：
```jsx
<Field label="責任人">
  <input
    list="members-datalist"
    value={form.assignee}
    onChange={(e) => set('assignee', e.target.value)}
    placeholder="選擇或輸入責任人名字..."
    className={inputCls}
  />
  <datalist id="members-datalist">
    {members.map((m) => <option key={m.id} value={m.name} />)}
  </datalist>
</Field>
```

- [ ] **Step 4：加入「備注」Tab 內容**

在 `{activeTab === 'info' && (...)}` 之後加入：
```jsx
{activeTab === 'notes' && (
  <>
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          📝 進度備注
        </label>
        <textarea
          value={form.progress_note}
          onChange={(e) => set('progress_note', e.target.value)}
          rows={5}
          placeholder="記錄此任務的進度說明、完成情況..."
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5">
          🔗 需協調事項
        </label>
        <textarea
          value={form.coordination_note}
          onChange={(e) => set('coordination_note', e.target.value)}
          rows={5}
          placeholder="記錄需要協調的資源、人員或依賴事項..."
          className={`${inputCls} resize-none border-red-200 focus:ring-red-400`}
        />
      </div>
    </div>
    <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
      <button
        onClick={doSave}
        disabled={saving}
        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? '保存中...' : '保存備注'}
      </button>
    </div>
  </>
)}
```

- [ ] **Step 5：手動測試**
  1. 打開任務 Modal → 看到「基本信息」「備注」「日志」三個 Tab
  2. 責任人 combobox：輸入「Al」→ 自動補全「Alice」
  3. 切換「備注」Tab → 填入進度備注和需協調事項
  4. 點「保存備注」→ 重新打開 Modal 確認資料保留

- [ ] **Step 6：Commit**

```bash
git add client/src/components/TaskEditModal.jsx
git commit -m "feat: add notes tab and assignee combobox to TaskEditModal"
```

---

## Chunk 4：TaskTreeNode 備注摘要顯示

### Task 7：TaskTreeNode 展開後顯示備注摘要

**Files:**
- Modify: `client/src/components/KanbanBoard.jsx`（TaskTreeNode 部分）

- [ ] **Step 1：在 TaskTreeNode 的進度條之後加入備注摘要**

找到進度條的 JSX（`{/* Progress bar */}` 區塊），在其後、`</div>（node card 的關閉）` 前加入：

```jsx
{/* Notes summary — 只在展開或葉節點時顯示 */}
{(isExpanded || !hasChildren) && (task.assignee || task.progress_note || task.coordination_note) && (
  <div className="mt-2 space-y-1.5">
    {task.assignee && (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {task.assignee[0]}
        </span>
        <span>{task.assignee}</span>
      </div>
    )}
    {task.progress_note && (
      <div className="text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1.5 leading-relaxed">
        📝 {task.progress_note.length > 60 ? task.progress_note.slice(0, 60) + '...' : task.progress_note}
      </div>
    )}
    {task.coordination_note && (
      <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 leading-relaxed font-medium">
        🔗 {task.coordination_note.length > 60 ? task.coordination_note.slice(0, 60) + '...' : task.coordination_note}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2：手動測試**
  1. 在任務 Modal 填入責任人「Alice」+ 進度備注 + 需協調事項 → 保存
  2. 看板卡片上應顯示 Alice 頭像縮寫 + 備注摘要
  3. 需協調事項顯示紅色背景高亮
  4. 無備注的任務不顯示備注區塊

- [ ] **Step 3：Commit**

```bash
git add client/src/components/KanbanBoard.jsx
git commit -m "feat: show assignee, notes summary in TaskTreeNode"
```

---

## 最終驗收

- [ ] `npm run build` 無錯誤
- [ ] Migration v2 冪等執行
- [ ] members API：GET/POST/DELETE 正常
- [ ] SettingsView 成員新增/移除正常
- [ ] 責任人 combobox：從成員列表選 + 手動輸入均可
- [ ] 備注 Tab 儲存後資料保留
- [ ] TaskTreeNode：責任人頭像、進度備注（藍）、需協調（紅）顯示
- [ ] 無備注節點不顯示備注區塊
