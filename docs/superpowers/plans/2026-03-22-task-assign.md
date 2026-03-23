# Task Assignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PM 可指派任務給任意成員；組員只能認領給自己；assignee 下拉按角色 filter。

**Architecture:** 復用現有 `tasks.assignee` text 欄位和 `members` 表。建立 user 帳號時自動 sync 一筆 member 記錄。後端 PUT /tasks/:id 加 assignee 權限校驗。前端 TaskEditModal assignee 欄位依角色 render 不同 UI。

**Note:** KanbanBoard 已經顯示 `task.assignee`（KanbanBoard.jsx:183–188），不需要改動。

**Tech Stack:** Express.js, better-sqlite3, React 18, AuthContext (useAuth hook)

---

## Task 1: Sync member record when user is created

**Files:**
- Modify: `db.js` (after admin seed block)
- Modify: `routes/auth.js` (POST /users route, lines 44–62)

### Context

`members` 表結構：`id INTEGER PK, name TEXT UNIQUE, created_at TEXT`。

TaskEditModal 透過 `api.getMembers()` 拿 `members` 列表顯示在 assignee datalist。當 PM 用 UserManageModal 建立帳號後，新用戶應自動出現在 assignee 下拉中。

**Admin backfill:** `db.js` 在沒有 users 時自動 seed 一個 `admin` (display_name: `'Admin'`)，但不會 sync members。Backfill 放在 `db.js` 的 admin seed 區塊之後（自然位置，與 seed 邏輯在一起，不存在 require 順序問題）。

### Steps

- [ ] **Step 1: Add member backfill in db.js after admin seed**

在 `db.js` 的 admin seed 區塊之後（`console.log('[DB] Default admin account created...')` 之後，`module.exports = db` 之前），加入：

```js
// Sync all users to members table (idempotent — ensures admin and any pre-existing users appear in assignee dropdown)
db.prepare('SELECT display_name FROM users').all().forEach(({ display_name }) => {
  db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)').run(display_name);
});
```

- [ ] **Step 2: Add member sync in routes/auth.js POST /users**

在 `routes/auth.js` 的 `POST /users` 路由，找到這段成功後返回的位置：

```js
    const created = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
```

在 `res.json(created)` 之前插入：

```js
    // Sync to members table so assignee dropdown picks this user up
    db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)').run(display_name);
```

完整修改後的 `POST /users` handler（從 try 塊到 res.json）：

```js
  try {
    const result = db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, display_name, hash, role === 'pm' ? 'pm' : 'member');
    const created = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)').run(display_name);
    res.json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: '帳號已存在' });
    }
    res.status(500).json({ error: err.message });
  }
```

- [ ] **Step 3: Verify manually**

```bash
node server.js &
sleep 1

# Login as admin
curl -s -c /tmp/c.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Check members — admin should already be there from db.js backfill
curl -s -b /tmp/c.txt http://localhost:3001/api/members
# Expected: array containing { "name": "Admin", ... }

# Create a test user
curl -s -b /tmp/c.txt -X POST http://localhost:3001/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","display_name":"Alice","password":"pass123","role":"member"}'

# Check members again — Alice should appear
curl -s -b /tmp/c.txt http://localhost:3001/api/members
# Expected: both Admin and Alice

kill %1
```

- [ ] **Step 4: Commit**

```bash
git add db.js routes/auth.js
git commit -m "feat: sync member record when user is created"
```

---

## Task 2: Assignee permission check in POST and PUT /tasks

**Files:**
- Modify: `routes/tasks.js` (POST / route line 58, PUT /:id route line 85)

### Context

`req.session.userId` 和 `req.session.userRole` 在 session 中可取得（由 auth login 設置）。**`requireAuth` middleware 已在 `server.js` 掛在所有 `/api/tasks` 路由前**（`app.use('/api/tasks', requireAuth, require('./routes/tasks'))`），所以 `req.session` 一定存在，無需在 tasks.js 內再 import requireAuth。

Permission rule — 三種 assignee 值的處理：
- `assignee === undefined`（body 中沒有此欄位）→ 跳過校驗，COALESCE 保持舊值
- `assignee === ''` 或 `null`（清空）→ 任何 role 都允許
- `assignee = "some name"`（非空字串）→ member 只能設成自己的 `display_name`，否則 403

### Helper function

抽取一個共用的 permission check helper，在 POST 和 PUT 兩個 handler 中都調用：

```js
function checkAssigneePermission(req, res, assignee) {
  if (assignee === undefined || assignee === '' || assignee === null) return true; // skip
  if (req.session.userRole !== 'member') return true; // PM: always ok
  const me = db.prepare('SELECT display_name FROM users WHERE id = ?').get(req.session.userId);
  if (!me || assignee !== me.display_name) {
    res.status(403).json({ error: '只能指派給自己' });
    return false;
  }
  return true;
}
```

### Steps

- [ ] **Step 1: Add checkAssigneePermission helper + apply to POST / and PUT /:id**

**1a. Add helper** — 在 `routes/tasks.js` 頂部（`const router = ...` 之後）加入上面的 `checkAssigneePermission` function。

**1b. Apply to POST /** — 在 `router.post('/', (req, res) => {` 的欄位解構之後、`db.prepare(...)` 之前加入：

```js
  if (!checkAssigneePermission(req, res, assignee)) return;
```

完整 POST handler 開頭：

```js
router.post('/', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, tags, parent_id, progress_percent, assignee, progress_note, coordination_note, task_type, unplanned } = req.body;
  if (!checkAssigneePermission(req, res, assignee)) return;
  const resolvedStatus = status || 'todo';
  const result = db.prepare(`...
```

**1c. Apply to PUT /:id** — 在 `router.put('/:id', (req, res) => {` 的欄位解構之後、`db.prepare('UPDATE tasks SET...')` 之前加入：

```js
  if (!checkAssigneePermission(req, res, assignee)) return;
```

完整 PUT handler 開頭：

```js
router.put('/:id', (req, res) => {
  const { title, description, deadline, estimated_hours, importance, status, priority_score, priority_level, tags, parent_id, progress_percent, clear_parent, assignee, progress_note, coordination_note, task_type, unplanned, completed_at } = req.body;

  if (!checkAssigneePermission(req, res, assignee)) return;

  db.prepare(`
    UPDATE tasks SET
    ...
```

- [ ] **Step 2: Verify**

```bash
node server.js &
sleep 1

# Login as admin (PM)
curl -s -c /tmp/pm.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Create alice (member) if not exists
curl -s -b /tmp/pm.txt -X POST http://localhost:3001/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","display_name":"Alice","password":"pass123","role":"member"}' > /dev/null

# Login as alice
curl -s -c /tmp/member.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123"}'

# Alice tries to PUT assign to someone else — should get 403
curl -s -b /tmp/member.txt -X PUT http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"assignee":"Bob"}'
# Expected: {"error":"只能指派給自己"}

# Alice tries to POST create task assigned to someone else — should get 403
curl -s -b /tmp/member.txt -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"test","assignee":"Bob"}'
# Expected: {"error":"只能指派給自己"}

# Alice assigns PUT to herself — should succeed
curl -s -b /tmp/member.txt -X PUT http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"assignee":"Alice"}'
# Expected: task JSON with assignee="Alice"

kill %1
```

- [ ] **Step 3: Commit**

```bash
git add routes/tasks.js
git commit -m "feat: assignee permission check on POST and PUT — members can only self-assign"
```

---

## Task 3: Filter assignee field in TaskEditModal by role

**Files:**
- Modify: `client/src/components/TaskEditModal.jsx`

### Context

TaskEditModal 目前使用 `<input type="text" list="members-list">` + `<datalist>` 顯示所有 members。

對於 PM：保持現有 datalist（顯示所有 members，可自由輸入）。

對於 Member：改用 `<select>`，只有兩個選項：
- `""` — 無人負責
- `currentUser.display_name` — 自己

**Edge case：** 如果 member 打開的任務 `form.assignee` 是別人的名字（PM 指派的），select 沒有這個 option，value 不匹配會 render 空白。處理方式：在 member 角色下開啟 Modal 時，若 `task.assignee !== '' && task.assignee !== currentUser.display_name`，把初始值 reset 為 `''`，並在 Field 上方顯示一行灰字「目前由 {task.assignee} 負責」讓 member 知情。

**`currentUser` 可能為 `undefined`（auth check 中）：** 所有對 `currentUser` 的存取都使用可選鏈（`?.`）。

### Steps

- [ ] **Step 1: Import useAuth in TaskEditModal.jsx**

在 `client/src/components/TaskEditModal.jsx` 第 1 行的 imports 中加入：

```js
import { useAuth } from '../context/AuthContext'
```

- [ ] **Step 2: Destructure currentUser inside the component**

在 `TaskEditModal` 函式最開頭（其他 useState 宣告附近），加入：

```js
  const { currentUser } = useAuth()
```

- [ ] **Step 3: Derive correct initial assignee value for member role**

不用 useEffect（會有 stale dep 問題）。改用派生值：在 select 的 `value` prop 直接計算：「如果 form.assignee 等於自己 → 顯示自己的名字，否則 → 顯示空（無人負責）」。

這樣不管 modal 何時開啟，select 的 value 永遠是合法 option 之一：

```jsx
value={form.assignee === currentUser?.display_name ? currentUser.display_name : ''}
```

onChange 仍然正常 set form.assignee，所以用戶選擇後會正確更新。

- [ ] **Step 4: Replace the assignee Field JSX**

找到這段（大約在 TaskEditModal.jsx line 554）：

```jsx
              <Field label="负责人">
                <input
                  type="text"
                  list="members-list"
                  value={form.assignee}
                  onChange={(e) => set('assignee', e.target.value)}
                  placeholder="输入或选择成员"
                  className={inputCls}
                />
                <datalist id="members-list">
                  {members.map((m) => <option key={m.id} value={m.name} />)}
                </datalist>
              </Field>
```

替換為：

```jsx
              <Field label="负责人">
                {currentUser?.role === 'member' ? (
                  <>
                    {task.assignee && task.assignee !== currentUser?.display_name && (
                      <p className="text-xs text-gray-400 mb-1">目前由 {task.assignee} 負責</p>
                    )}
                    <select
                      value={form.assignee === currentUser?.display_name ? currentUser.display_name : ''}
                      onChange={(e) => set('assignee', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">無人負責</option>
                      <option value={currentUser.display_name}>{currentUser.display_name}（我）</option>
                    </select>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      list="members-list"
                      value={form.assignee}
                      onChange={(e) => set('assignee', e.target.value)}
                      placeholder="输入或选择成员"
                      className={inputCls}
                    />
                    <datalist id="members-list">
                      {members.map((m) => <option key={m.id} value={m.name} />)}
                    </datalist>
                  </>
                )}
              </Field>
```

- [ ] **Step 5: Verify — build passes**

```bash
cd /Users/iris/Desktop/jira-personal/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in Xs` 無 error。

- [ ] **Step 6: Manual verify**

啟動 `npm run dev`，用 member 帳號登入，開啟一個由 PM 指派給別人的任務 TaskEditModal：
- 應看到灰色提示「目前由 XXX 負責」
- assignee select 顯示「無人負責」和「自己（我）」

用 PM 登入，確認「負責人」欄位是 text input + datalist，可看到所有成員。

- [ ] **Step 7: Commit**

```bash
git add client/src/components/TaskEditModal.jsx
git commit -m "feat: assignee field — members see select with only self, PM sees full datalist"
```
