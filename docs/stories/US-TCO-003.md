---
id: US-TCO-003
title: User can auto-fill the quick-create form by typing a natural language description
description: 快速創建表單支持輸入自然語言，點「解析」後 AI 一次填入各欄位
parent_prd: PRD-TASK-CREATE-OPT
cards:
  - CARD-TCO-002
  - CARD-TCO-003
status: backlog
acceptance_criteria:
  - 快速創建表單有可選的自然語言輸入框
  - 用戶輸入描述後點「✨ 解析」，調用 /api/ai/extract-task
  - AI 返回結果自動填入標題、截止日期、工時、重要程度欄位
  - deadline 為 null 時截止日期欄位留空並標紅，等待用戶手填
  - 解析期間按鈕顯示 loading 狀態
  - 用戶可在解析後手動修改任何欄位
---
