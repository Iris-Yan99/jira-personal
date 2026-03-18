---
id: CARD-TCO-002
title: Add POST /api/ai/extract-task endpoint
description: 新增輕量 endpoint，接收自然語言描述，一次返回結構化任務 JSON
parent_story: US-TCO-003
parent_prd: PRD-TASK-CREATE-OPT
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 在 routes/ai.js 新增 router.post('/extract-task', ...)
  - System prompt 精簡版：只做單次提取，無對話上下文
  - 接收 { description } 返回 { title, deadline, estimated_hours, importance }
  - deadline 無法推算時返回 null（不報錯）
  - importance 語義判斷邏輯與 /chat 一致
  - 複用現有 callOllama() 函數
files_to_modify:
  - routes/ai.js
---
