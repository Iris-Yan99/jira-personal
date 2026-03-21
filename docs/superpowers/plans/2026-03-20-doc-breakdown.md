# 文件驅動 AI 項目拆解 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓用戶上傳 PDF/DOCX/TXT/MD 文件或直接貼入文字，AI 自動提取項目元數據並預填確認表單，最終觸發現有里程碑+任務拆解流程。

**Architecture:** 後端新增兩個端點：`/api/upload/parse`（文件 → 純文字）和 `/api/ai/extract-project-meta`（文字 → 元數據 JSON）。前端 `ProjectBreakdownModal` 新增三個輸入 tab（手動/上傳/貼上），共用 confirm step 和現有 breakdown 流程。兩個後端端點完全解耦，前端 tab 切換只影響取得文字的方式，其餘流程不變。

**Tech Stack:** Express + multer + pdf-parse + mammoth（後端）；React + Tailwind（前端，現有模式）

---

## Chunk 1：後端文件解析 + AI 元數據提取

### Task 1：安裝後端依賴

**Files:**
- Modify: `package.json`

- [ ] **Step 1：安裝套件**

```bash
cd /Users/iris/Desktop/jira-personal
npm install multer pdf-parse mammoth
```

Expected: 安裝成功，`package.json` dependencies 新增三個套件

- [ ] **Step 2：確認安裝**

```bash
node -e "require('multer'); require('pdf-parse'); require('mammoth'); console.log('OK')"
```

Expected: 輸出 `OK`

- [ ] **Step 3：Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add multer, pdf-parse, mammoth for document parsing"
```

---

### Task 2：新建 routes/upload.js — 文件解析端點

**Files:**
- Create: `routes/upload.js`
- Modify: `server.js`

- [ ] **Step 1：新建 routes/upload.js**

```js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|md)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，僅接受 PDF / DOCX / TXT / MD'));
    }
  },
});

router.post('/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });

  try {
    let text = '';
    const { mimetype, buffer, originalname } = req.file;

    if (mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // TXT / MD
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) return res.status(422).json({ error: '文件內容為空，無法解析' });
    res.json({ text: text.trim() });
  } catch (err) {
    res.status(422).json({ error: '文件解析失敗：' + err.message });
  }
});

// multer 錯誤處理（文件過大 / 格式不對）
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件超過 10MB 限制' });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;
```

- [ ] **Step 2：在 server.js 掛載路由**

在 `app.use('/api/ai', ...)` 這行之後加：

```js
app.use('/api/upload', require('./routes/upload'));
```

- [ ] **Step 3：手動測試**

```bash
# 啟動後端
node server.js &

# 用 curl 測試（需要有一個 txt 文件）
echo "測試項目方案" > /tmp/test.txt
curl -X POST http://localhost:3001/api/upload/parse \
  -F "file=@/tmp/test.txt" | python3 -m json.tool
```

Expected: `{"text": "測試項目方案"}`

- [ ] **Step 4：Commit**

```bash
git add routes/upload.js server.js
git commit -m "feat: add POST /api/upload/parse for PDF/DOCX/TXT/MD text extraction"
```

---

### Task 3：新增 AI 元數據提取端點 + api.js

**Files:**
- Modify: `routes/ai.js`
- Modify: `client/src/utils/api.js`

- [ ] **Step 1：在 routes/ai.js 新增端點**

在 `module.exports = router;` 之前加入：

```js
// Extract project metadata from document text
router.post('/extract-project-meta', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: '文字內容不能為空' });

  const todayStr = new Date().toISOString().slice(0, 10);
  const prompt = `你是一個項目管理顧問。從以下項目文件文字中提取項目基本信息。
今天日期：${todayStr}

文件內容：
${text.slice(0, 8000)}

嚴格按以下 JSON 格式輸出（只輸出 JSON，不要任何說明）：
{
  "title": "項目名稱，30字以內，提取不到則null",
  "deadline": "截止日期，轉為YYYY-MM-DD，提取不到則null",
  "description": "項目目標或描述，200字以內，提取不到則空字符串",
  "background": "背景信息、團隊、資源等，200字以內，提取不到則空字符串",
  "missing": ["title或deadline中提取不到的字段名"],
  "confidence": {
    "title": "high或low",
    "deadline": "high或low",
    "description": "high或low",
    "background": "high或low"
  }
}

規則：
- deadline 若文件有明確日期（如「2026年6月30日」「Q2末」「6月底」）→ 轉 YYYY-MM-DD，confidence=high
- deadline 若只有模糊描述（如「盡快」「近期」）→ 猜一個合理日期，confidence=low
- deadline 若完全沒有提及 → null，放入 missing
- title 若提取不到 → null，放入 missing`;

  try {
    const content = await callOllama([{ role: 'user', content: prompt }]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'AI 未返回有效 JSON，請重試', raw: content });
    const meta = JSON.parse(jsonMatch[0]);
    res.json(meta);
  } catch (err) {
    if (err instanceof SyntaxError) return res.status(422).json({ error: 'AI 返回格式無效，請重試' });
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 2：在 client/src/utils/api.js 新增方法**

在 `breakdownProject` 行之後加：

```js
extractProjectMeta: (text) => request('/ai/extract-project-meta', json({ text })),
```

也在 api.js 新增 upload 方法（multipart，不用 json helper）：

```js
parseDocument: (file) => {
  const form = new FormData();
  form.append('file', file);
  return fetch('/api/upload/parse', { method: 'POST', body: form })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    });
},
```

- [ ] **Step 3：手動測試 extract-project-meta**

```bash
curl -X POST http://localhost:3001/api/ai/extract-project-meta \
  -H "Content-Type: application/json" \
  -d '{"text":"Q2用戶增長計劃\n目標：新增10萬用戶\n截止日期：2026年6月30日\n背景：市場部主導"}' \
  | python3 -m json.tool
```

Expected: 回傳含 title/deadline/description/background/missing/confidence 的 JSON

- [ ] **Step 4：Commit**

```bash
git add routes/ai.js client/src/utils/api.js
git commit -m "feat: add POST /api/ai/extract-project-meta + api.js helpers"
```

---

## Chunk 2：前端 Modal 改造

### Task 4：ProjectBreakdownModal — 三 tab 架構 + 上傳/貼上輸入

**Files:**
- Modify: `client/src/components/ProjectBreakdownModal.jsx`

目標：把現有 Modal 的 `form` step 拆成三個 tab，並處理 `parsing` 中間狀態。

- [ ] **Step 1：在 Modal 頂部加 tab 狀態和常數**

在現有 `const [step, setStep] = useState('form')` 之後加：

```jsx
const [inputTab, setInputTab] = useState('manual') // manual | upload | paste
const [pasteText, setPasteText] = useState('')
const [dragOver, setDragOver] = useState(false)
```

- [ ] **Step 2：新增 handleParseAndExtract 函數**

在 `handleGenerate` 之前加：

```jsx
const handleParseAndExtract = async (text) => {
  setStep('parsing')
  setError('')
  try {
    const meta = await api.extractProjectMeta(text)
    setForm({
      title: meta.title || '',
      description: meta.description || '',
      deadline: meta.deadline || '',
      background: meta.background || '',
    })
    setExtracted(meta) // 儲存 missing + confidence
    setStep('confirm')
  } catch (err) {
    setError(err.message)
    setStep('form')
  }
}

const handleFileUpload = async (file) => {
  setStep('parsing')
  setError('')
  try {
    const { text } = await api.parseDocument(file)
    await handleParseAndExtract(text)
  } catch (err) {
    setError(err.message)
    setStep('form')
  }
}
```

- [ ] **Step 3：新增 extracted state**

在 `useState` 區域加：

```jsx
const [extracted, setExtracted] = useState(null) // { missing, confidence }
```

- [ ] **Step 4：渲染 tab 切換列**

在 `step === 'form'` 的 JSX 最外層加 tab UI：

```jsx
{step === 'form' && (
  <div className="space-y-4">
    {/* Tab 切換 */}
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {[
        { id: 'manual', label: '手動填寫' },
        { id: 'upload', label: '上傳文件' },
        { id: 'paste', label: '貼上文字' },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setInputTab(t.id)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            inputTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>

    {/* 手動填寫（現有表單） */}
    {inputTab === 'manual' && (
      <div className="space-y-4">
        {/* 現有 Field 表單內容，不變 */}
        ...
      </div>
    )}

    {/* 上傳文件 */}
    {inputTab === 'upload' && (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFileUpload(file)
        }}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById('doc-file-input').click()}
      >
        <p className="text-2xl mb-2">📄</p>
        <p className="text-sm font-medium text-gray-700">拖放文件到此，或點擊選擇</p>
        <p className="text-xs text-gray-400 mt-1">支持 PDF / DOCX / TXT / MD，最大 10MB</p>
        <input
          id="doc-file-input"
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleFileUpload(e.target.files[0]) }}
        />
      </div>
    )}

    {/* 貼上文字 */}
    {inputTab === 'paste' && (
      <div className="space-y-3">
        <textarea
          className={inputCls + ' resize-none'}
          rows={8}
          placeholder="將項目實施方案文字貼入此處..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <button
          onClick={() => handleParseAndExtract(pasteText)}
          disabled={!pasteText.trim()}
          className="w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🤖 AI 分析
        </button>
      </div>
    )}

    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
)}
```

- [ ] **Step 5：新增 parsing step 渲染**

在 `step === 'loading'` 的 JSX 之前加：

```jsx
{step === 'parsing' && (
  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
    <p className="text-sm font-medium">AI 正在分析文件內容...</p>
    <p className="text-xs text-gray-400 mt-1">提取項目標題、截止日期等信息</p>
  </div>
)}
```

- [ ] **Step 6：新增 confirm step 渲染**

`confirm` step 顯示預填表單，missing 紅框，confidence=low 黃色警告：

```jsx
{step === 'confirm' && (
  <div className="space-y-4">
    {extracted?.missing?.length > 0 && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
        ⚠️ 以下必填項未能從文件中提取，請手動補充：
        <strong> {extracted.missing.join('、')}</strong>
      </div>
    )}

    <Field label="項目名稱" required>
      <div className="relative">
        <input
          className={inputCls + (extracted?.missing?.includes('title') ? ' border-red-400 ring-red-200' : '')}
          value={form.title}
          onChange={set('title')}
          placeholder="項目名稱"
        />
        {extracted?.confidence?.title === 'low' && (
          <span className="absolute right-2 top-2 text-yellow-500 text-xs" title="AI 推斷，建議確認">⚠️</span>
        )}
      </div>
      {extracted?.missing?.includes('title') && (
        <p className="text-xs text-red-500 mt-1">必填，請補充</p>
      )}
    </Field>

    <Field label="截止日期" required>
      <div className="relative">
        <input
          type="date"
          className={inputCls + (extracted?.missing?.includes('deadline') ? ' border-red-400 ring-red-200' : '')}
          value={form.deadline}
          onChange={set('deadline')}
        />
        {extracted?.confidence?.deadline === 'low' && (
          <span className="absolute right-2 top-2 text-yellow-500 text-xs" title="AI 推斷，建議確認">⚠️</span>
        )}
      </div>
      {extracted?.missing?.includes('deadline') && (
        <p className="text-xs text-red-500 mt-1">必填，請補充</p>
      )}
    </Field>

    <Field label="項目目標">
      <textarea
        className={`${inputCls} resize-none ${extracted?.confidence?.description === 'low' ? 'bg-yellow-50' : ''}`}
        rows={3}
        value={form.description}
        onChange={set('description')}
      />
    </Field>

    <Field label="背景信息">
      <textarea
        className={`${inputCls} resize-none ${extracted?.confidence?.background === 'low' ? 'bg-yellow-50' : ''}`}
        rows={2}
        value={form.background}
        onChange={set('background')}
      />
    </Field>

    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
)}
```

- [ ] **Step 7：Footer 按鈕邏輯**

確保 Footer 的按鈕覆蓋所有 step：

```jsx
{/* 手動填寫 → 直接生成 */}
{step === 'form' && inputTab === 'manual' && (
  <button onClick={handleGenerate} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
    生成計劃
  </button>
)}

{/* confirm step → 左邊回退 + 右邊生成 */}
{step === 'confirm' && (
  <>
    <button
      onClick={() => { setStep('form'); setExtracted(null) }}
      className="mr-auto text-xs text-gray-400 hover:text-gray-600 underline"
    >
      ← 重新分析
    </button>
    <button
      onClick={handleGenerate}
      disabled={!form.title.trim() || !form.deadline}
      className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      生成計劃
    </button>
  </>
)}

{/* result step */}
{step === 'result' && (
  <button
    onClick={handleImport}
    disabled={importing || selectedCount === 0}
    className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
  >
    {importing ? '導入中...' : `確認導入 ${selectedCount} 個任務`}
  </button>
)}
```

- [ ] **Step 8：在瀏覽器測試三種輸入模式**

```bash
npm run dev
```

測試流程：
1. 點「🚀 AI 拆解項目」
2. 切換到「貼上文字」tab → 貼入「Q2用戶增長計劃，截止2026年6月30日」→ 點「AI 分析」→ 確認預填表單正確
3. 切換到「上傳文件」tab → 上傳一個 txt 文件 → 確認 parsing loading 出現並切換到 confirm
4. 手動填寫 tab → 直接填寫 → 點「生成計劃」→ 確認現有流程正常

- [ ] **Step 9：Commit**

```bash
git add client/src/components/ProjectBreakdownModal.jsx
git commit -m "feat: add upload/paste tabs to ProjectBreakdownModal with AI meta extraction and confirm step"
```

---

## 完成驗收清單

- [ ] PDF 上傳解析出純文字
- [ ] DOCX 上傳解析出純文字
- [ ] TXT / MD 上傳解析出純文字
- [ ] 文件超 10MB 顯示錯誤
- [ ] 不支持格式顯示錯誤
- [ ] 貼上文字 → AI 分析 → 確認表單預填
- [ ] missing 字段顯示紅框 + 提示文字
- [ ] confidence=low 字段顯示 ⚠️
- [ ] 缺少必填字段時「生成計劃」按鈕 disabled
- [ ] 確認後觸發現有拆解流程，正常生成里程碑和任務
- [ ] 手動填寫 tab 行為不受影響
