# Task Create Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 AI 任務創建從多輪對話改為單次提取，並在看板新增行內快速創建表單

**Architecture:** 修改 `/api/ai/chat` 的 system prompt 移除逐一追問邏輯；新增 `/api/ai/extract-task` 輕量 endpoint 供快速創建使用；在 `KanbanBoard.jsx` 頂部新增行內展開表單，支持手填和 AI 解析兩種路徑。

**Tech Stack:** Node.js/Express (backend), React 18 + Tailwind CSS (frontend), Ollama local LLM

---

## Chunk 1: 後端 AI 改動

### Task 1: 修改 /api/ai/chat — 改為單次提取模式

**Files:**
- Modify: `routes/ai.js`（`/chat` endpoint 的 systemPrompt，約第 35-56 行）

- [ ] **Step 1: 打開 `routes/ai.js`，定位 `/chat` 的 systemPrompt**

  找到這段並完整替換：
  ```js
  const systemPrompt = `你是一个专业的任务管理助手，帮助用户记录和管理工作任务。
  // ... 現有多輪追問邏輯
  ```

- [ ] **Step 2: 替換為單次提取 prompt**

  ```js
  const systemPrompt = `你是一个专业的任务管理助手，帮助用户记录和管理工作任务。

  你的职责：从用户描述中一次性提取所有任务字段，立即输出 TASK_READY，不要逐一追问。

  字段提取规则：
  - title（必填）：提取任务标题，不超过 30 字
  - deadline（必填）：
    - 若描述含明确日期 → 转为 YYYY-MM-DD
    - 若含相对时间（"明天" → +1天，"下周" → +7天，"本周五" → 本周五日期，"月底" → 本月最后一天）→ 转为 YYYY-MM-DD
    - 若完全无时间信息 → 输出 null
  - estimated_hours（选填）：从描述提取小时数，如"半天"→4，"一小时"→1；无则默认 2
  - importance（选填）：
    - 含"重要/紧急/关键/优先/必须" → high
    - 含"随便/不急/低优/无所谓" → low
    - 其他 → mid
  - description（选填）：用户原话补充，可为空字符串
  - tags（选填）：数组，默认 []

  今天日期：${today}

  输出规则：
  - 直接输出一句简短确认（不超过 20 字），然后输出 TASK_READY
  - TASK_READY 格式（末尾单独一行）：
  TASK_READY:{"title":"...","description":"...","deadline":"YYYY-MM-DD或null","estimated_hours":数字,"importance":"high/mid/low","tags":[]}
  - deadline 为 null 时也必须输出，不要省略该字段
  - 始终用中文回复`;
  ```

- [ ] **Step 3: 手動測試**

  啟動 backend：`node server.js`

  用 curl 測試（或直接在前端 ChatPanel 輸入）：
  ```bash
  curl -X POST http://localhost:3001/api/ai/chat \
    -H 'Content-Type: application/json' \
    -d '{"messages":[{"role":"user","content":"明天前完成季度報告，很重要，大概需要3小時"}]}'
  ```
  預期：response 含 `TASK_READY:{"title":"完成季度报告","deadline":"2026-03-19","estimated_hours":3,"importance":"high",...}`

- [ ] **Step 4: 測試缺少截止日期的情況**

  ```bash
  curl -X POST http://localhost:3001/api/ai/chat \
    -H 'Content-Type: application/json' \
    -d '{"messages":[{"role":"user","content":"整理一下桌面文件"}]}'
  ```
  預期：`deadline` 為 `null`

- [ ] **Step 5: Commit**

  ```bash
  git add routes/ai.js
  git commit -m "feat: change /ai/chat to single-shot task extraction"
  ```

---

### Task 2: 新增 POST /api/ai/extract-task endpoint

**Files:**
- Modify: `routes/ai.js`（在 `/chat` endpoint 之後新增）

- [ ] **Step 1: 在 `routes/ai.js` 的 `/chat` endpoint 之後加入新 endpoint**

  ```js
  // Single-shot task extraction for quick create
  router.post('/extract-task', async (req, res) => {
    const { description } = req.body;
    if (!description?.trim()) {
      return res.status(400).json({ error: '描述不能为空' });
    }
    const today = new Date().toISOString().split('T')[0];

    const prompt = `从以下描述中提取任务字段，今天日期：${today}

  描述：${description}

  提取规则：
  - title：任务标题，不超过 30 字
  - deadline：含日期/相对时间→转 YYYY-MM-DD；"明天"→+1天，"下周"→+7天；无时间信息→null
  - estimated_hours：提取小时数，无则默认 2
  - importance：含"重要/紧急/关键"→high；含"随便/不急/低优"→low；其他→mid
  - description：补充说明，可为空字符串
  - tags：数组，默认 []

  只输出 JSON，不要其他任何内容：
  {"title":"...","description":"...","deadline":"YYYY-MM-DD或null","estimated_hours":数字,"importance":"high/mid/low","tags":[]}`;

    try {
      const content = await callOllama([{ role: 'user', content: prompt }]);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 返回格式错误');
      const task = JSON.parse(jsonMatch[0]);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  ```

- [ ] **Step 2: 手動測試**

  ```bash
  curl -X POST http://localhost:3001/api/ai/extract-task \
    -H 'Content-Type: application/json' \
    -d '{"description":"下週五前做好簡報，很重要，大概4小時"}'
  ```
  預期：`{"title":"做好简报","deadline":"2026-03-27","estimated_hours":4,"importance":"high","description":"","tags":[]}`

- [ ] **Step 3: 測試無截止日期**

  ```bash
  curl -X POST http://localhost:3001/api/ai/extract-task \
    -H 'Content-Type: application/json' \
    -d '{"description":"隨便整理一下文件"}'
  ```
  預期：`{"deadline":null,"importance":"low",...}`

- [ ] **Step 4: Commit**

  ```bash
  git add routes/ai.js
  git commit -m "feat: add /api/ai/extract-task endpoint for quick create"
  ```

---

## Chunk 2: 前端改動

### Task 3: 新增 api.extractTask() 方法

**Files:**
- Modify: `client/src/utils/api.js`（在 `// AI` 區塊末尾新增一行）

- [ ] **Step 1: 在 `api.js` 的 AI 區塊末尾新增**

  找到：
  ```js
  conflictSuggest: (task, conflicts, allTasks) => request('/ai/conflict-suggest', json({ task, conflicts, allTasks })),
  ```
  在其後加入（在 `};` 之前）：
  ```js
  extractTask: (description) => request('/ai/extract-task', json({ description })),
  ```

- [ ] **Step 2: 確認 `api.js` 的 AI 區塊現在有 8 個方法**（chat, prioritize, morning, dailyReport, weeklyReport, monthlyReport, conflictSuggest, extractTask）

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/utils/api.js
  git commit -m "feat: add extractTask() to api client"
  ```

---

### Task 4: KanbanBoard 新增行內快速創建表單

**Files:**
- Modify: `client/src/components/KanbanBoard.jsx`

這是最複雜的一步。分為三個小步驟。

#### 4a: 新增 state 和 handler

- [ ] **Step 1: 在 `KanbanBoard` 組件頂部新增 state**

  在現有 `const [editTask, setEditTask] = useState(null)` 之後加入：

  ```js
  // Quick create state
  const [qcOpen, setQcOpen] = useState(false)
  const [qcDesc, setQcDesc] = useState('')
  const [qcTitle, setQcTitle] = useState('')
  const [qcDeadline, setQcDeadline] = useState('')
  const [qcHours, setQcHours] = useState(2)
  const [qcImportance, setQcImportance] = useState('mid')
  const [qcExtracting, setQcExtracting] = useState(false)
  const [qcCreating, setQcCreating] = useState(false)
  const [qcDeadlineError, setQcDeadlineError] = useState(false)
  ```

- [ ] **Step 2: 新增 `resetQc`、`handleExtract`、`handleQuickCreate` 三個函數**

  在 `handleDrop` 函數之後加入：

  ```js
  const resetQc = () => {
    setQcOpen(false)
    setQcDesc('')
    setQcTitle('')
    setQcDeadline('')
    setQcHours(2)
    setQcImportance('mid')
    setQcExtracting(false)
    setQcCreating(false)
    setQcDeadlineError(false)
  }

  const handleExtract = async () => {
    if (!qcDesc.trim()) return
    setQcExtracting(true)
    try {
      const result = await api.extractTask(qcDesc)
      if (result.title) setQcTitle(result.title)
      if (result.deadline) {
        setQcDeadline(result.deadline)
        setQcDeadlineError(false)
      } else {
        setQcDeadline('')
        setQcDeadlineError(true)
      }
      if (result.estimated_hours) setQcHours(result.estimated_hours)
      if (result.importance) setQcImportance(result.importance)
    } catch (err) {
      console.error(err)
    } finally {
      setQcExtracting(false)
    }
  }

  const handleQuickCreate = async () => {
    if (!qcTitle.trim() || !qcDeadline) {
      setQcDeadlineError(!qcDeadline)
      return
    }
    setQcCreating(true)
    try {
      await api.createTask({
        title: qcTitle.trim(),
        deadline: qcDeadline,
        estimated_hours: qcHours,
        importance: qcImportance,
        description: '',
        tags: [],
        status: 'todo',
      })
      onTasksChange()
      resetQc()
    } catch (err) {
      console.error(err)
    } finally {
      setQcCreating(false)
    }
  }
  ```

- [ ] **Step 3: 新增 Escape 鍵監聽**

  在其他 `useEffect` 之後（或組件頂部 import 後）加入：
  ```js
  // 注意：需要在文件頂部加入：import { useState, useEffect } from 'react'
  ```
  將現有的 `import { useState } from 'react'` 改為：
  ```js
  import { useState, useEffect } from 'react'
  ```

  然後在 `resetQc` 函數之後加入：
  ```js
  useEffect(() => {
    if (!qcOpen) return
    const handler = (e) => { if (e.key === 'Escape') resetQc() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [qcOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  ```

#### 4b: 新增快速創建 UI

- [ ] **Step 4: 在看板 header 新增「⚡ 快速創建」按鈕**

  找到：
  ```jsx
  <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
    <h2 className="font-semibold text-gray-700">任务看板</h2>
    <span className="text-sm text-gray-400">{tasks.length} 个任务</span>
  </div>
  ```
  替換為：
  ```jsx
  <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
    <h2 className="font-semibold text-gray-700">任务看板</h2>
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400">{tasks.length} 个任务</span>
      <button
        onClick={() => setQcOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        ⚡ 快速创建
      </button>
    </div>
  </div>
  ```

- [ ] **Step 5: 在 header 之後、看板列之前插入行內表單**

  在 `<div className="flex-1 overflow-hidden p-5">` 之前插入：

  ```jsx
  {qcOpen && (
    <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex-shrink-0">
      {/* 自然語言輸入行 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={qcDesc}
          onChange={(e) => setQcDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
          placeholder="描述任务（可选）：「下周五前完成报告，很重要，约3小时」"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          disabled={qcExtracting}
        />
        <button
          onClick={handleExtract}
          disabled={!qcDesc.trim() || qcExtracting}
          className="px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {qcExtracting ? '解析中...' : '✨ AI 解析'}
        </button>
      </div>

      {/* 表單欄位行 */}
      <div className="flex gap-2 items-start flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            value={qcTitle}
            onChange={(e) => setQcTitle(e.target.value)}
            placeholder="任务标题 *"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <div>
          <input
            type="date"
            value={qcDeadline}
            onChange={(e) => { setQcDeadline(e.target.value); setQcDeadlineError(false) }}
            className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
              qcDeadlineError ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
            }`}
          />
          {qcDeadlineError && (
            <p className="text-xs text-red-500 mt-1">截止日期必填</p>
          )}
        </div>

        {/* 工時 Tag */}
        <button
          onClick={() => {
            const opts = [1, 2, 4, 8]
            setQcHours(opts[(opts.indexOf(qcHours) + 1) % opts.length])
          }}
          className="px-3 py-2 bg-white border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          title="點擊切換工時"
        >
          ⏱ {qcHours}h
        </button>

        {/* 重要度 Tag */}
        <button
          onClick={() => {
            const opts = ['low', 'mid', 'high']
            setQcImportance(opts[(opts.indexOf(qcImportance) + 1) % opts.length])
          }}
          className={`px-3 py-2 border text-xs font-medium rounded-lg hover:opacity-80 transition-colors whitespace-nowrap ${
            qcImportance === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
            qcImportance === 'mid'  ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                      'bg-green-50 border-green-200 text-green-700'
          }`}
          title="點擊切換重要程度"
        >
          {{ high: '🔴 高', mid: '🟡 中', low: '🟢 低' }[qcImportance]}
        </button>

        <button
          onClick={handleQuickCreate}
          disabled={!qcTitle.trim() || !qcDeadline || qcCreating}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {qcCreating ? '创建中...' : '创建'}
        </button>
        <button
          onClick={resetQc}
          className="px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )}
  ```

#### 4c: 驗收測試

- [ ] **Step 6: 啟動前端開發服務器**

  ```bash
  npm run dev
  ```
  開啟 `http://localhost:5173`，切換到「看板」Tab

- [ ] **Step 7: 測試快速創建（純手填路徑）**
  - 點擊「⚡ 快速創建」，表單展開
  - 直接填入標題和截止日期，點「創建」
  - 預期：任務出現在「待辦」欄，表單收起

- [ ] **Step 8: 測試快速創建（AI 解析路徑）**
  - 輸入「下週五完成季度報告，很重要，大概3小時」
  - 點「✨ AI 解析」
  - 預期：各欄位自動填入，截止日期為下週五，重要度標紅「高」

- [ ] **Step 9: 測試截止日期必填校驗**
  - 描述含「整理文件」（無時間信息）→ AI 解析後截止欄標紅
  - 手動不填截止日期，點「創建」→ 按鈕 disabled 或提示

- [ ] **Step 10: 測試 Escape 關閉**
  - 展開表單後按 Escape → 表單收起

- [ ] **Step 11: Commit**

  ```bash
  git add client/src/components/KanbanBoard.jsx
  git commit -m "feat: add inline quick-create form to KanbanBoard"
  ```

---

## 最終驗收

- [ ] ChatPanel 現有對話流程正常（改了 prompt 後仍能正確提取任務）
- [ ] 快速創建：手填路徑可用
- [ ] 快速創建：AI 解析路徑可用（Ollama 需在運行）
- [ ] 截止日期必填校驗正常
- [ ] Escape 關閉表單正常
- [ ] 任務創建後看板刷新正常
