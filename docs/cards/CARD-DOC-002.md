---
id: CARD-DOC-002
title: 實作 AI 元數據提取端點 POST /api/ai/extract-project-meta
description: 在 routes/ai.js 新增端點，接收文字後讓 AI 提取 title/deadline/description/background，標記 missing 和 confidence
parent_story: US-DOC-001
parent_prd: PRD-DOC-BREAKDOWN
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 在 routes/ai.js 新增 router.post('/extract-project-meta', ...)
  - 設計 prompt：要求 AI 只輸出 JSON，包含 title/deadline/description/background/missing/confidence
  - 截止日期格式統一轉 YYYY-MM-DD（「Q3結束前」「2026年6月30日」等自然語言）
  - missing 陣列列出 AI 未能提取的必填字段
  - confidence 物件標記每個字段的可信度（high/low）
  - 解析 AI 回傳 JSON，異常時回傳 422
  - 在 api.js 新增 extractProjectMeta(text) 方法
files_to_modify:
  - routes/ai.js
  - client/src/utils/api.js
---
