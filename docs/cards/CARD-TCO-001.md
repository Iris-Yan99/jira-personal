---
id: CARD-TCO-001
title: Modify /api/ai/chat system prompt for single-shot extraction
description: 移除逐一追問指令，改為一次性提取所有欄位並直接輸出 TASK_READY
parent_story: US-TCO-001
parent_prd: PRD-TASK-CREATE-OPT
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 修改 routes/ai.js 中 /chat endpoint 的 systemPrompt
  - 移除「每次只追問一個字段」指令
  - 新增一次性提取規則：缺失欄位使用默認值而非追問
  - 新增 importance 語義判斷規則（高/中/低關鍵詞映射）
  - 新增 deadline 語義推算規則（明天/下週/etc.），無法推算輸出 null
  - 保持 TASK_READY JSON 格式不變（前端 extractTaskReady 無需改動）
files_to_modify:
  - routes/ai.js
---
