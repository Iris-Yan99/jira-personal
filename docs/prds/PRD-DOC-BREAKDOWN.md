---
id: "PRD-DOC-BREAKDOWN"
title: "文件上傳 / 貼上文字 驅動的 AI 項目拆解"
description: "允許用戶上傳 PDF/DOCX/TXT/MD 或直接貼上文字，AI 自動提取項目元數據並生成里程碑+任務計劃"
status: "draft"
pattern: discovery-driven
keyLearning: "後端文字提取與 AI 元數據提取解耦，讓三種輸入模式（手動/上傳/貼上）共用同一個確認表單和拆解流程"
project: myjira
stories:
  - US-DOC-001
  - US-DOC-002
  - US-DOC-003
cards:
  - CARD-DOC-001
  - CARD-DOC-002
  - CARD-DOC-003
  - CARD-DOC-004
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PRD-DOC-BREAKDOWN：文件驅動的 AI 項目拆解

## 背景

現有 `ProjectBreakdownModal` 已支持手動填寫項目信息（標題、截止日期、描述、背景）後由 AI 生成里程碑和任務拆解。用戶希望能直接上傳已有的項目實施方案文件，或貼入文件文字，讓 AI 自動提取項目信息並驅動拆解流程。

## 目標

- 支持上傳 PDF / DOCX / TXT / MD 文件
- 支持直接貼入純文字
- AI 從文字中提取項目元數據（title、deadline、description、background）
- 提取結果可確認和修改，缺失必填欄位高亮提示
- 最終拆解流程複用現有 `breakdown-project` 邏輯

## 用戶故事

- US-DOC-001：用戶可上傳文件並讓 AI 提取項目信息
- US-DOC-002：用戶可貼入文字並讓 AI 提取項目信息
- US-DOC-003：用戶可在確認表單中補填缺失字段並生成計劃

## 架構設計

### 後端（新增）

**`POST /api/upload/parse`**
- 使用 `multer` 接收文件，限 PDF / DOCX / TXT / MD，最大 10MB
- PDF → `pdf-parse`；DOCX → `mammoth`；TXT/MD → 直接讀文字
- 回傳 `{ text: string }`，不存檔

**`POST /api/ai/extract-project-meta`**（加入 `routes/ai.js`）
- 接收 `{ text: string }`
- AI 提取 title / deadline / description / background
- 回傳 `{ title, deadline, description, background, missing: string[], confidence: Record<string, 'high'|'low'> }`

**現有 `POST /api/ai/breakdown-project`**：不動，作為第二步複用。

**新增 `routes/upload.js`**，在 `server.js` 掛載至 `/api/upload`。

### 前端（修改 ProjectBreakdownModal）

三種輸入 tab：`手動填寫` | `上傳文件` | `貼上文字`

步驟狀態機：
```
input → parsing → confirm → loading → result → done
```

- `parsing`：上傳/分析中 loading
- `confirm`：預填表單；missing 字段紅框；confidence=low 字段黃色 ⚠️
- 後續 `loading` / `result` 複用現有邏輯

## 依賴

- npm 套件：`multer`、`pdf-parse`、`mammoth`（後端新增）
- 現有端點：`/api/ai/breakdown-project`（不修改）
