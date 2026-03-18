---
id: CARD-TCO-004
title: Add inline quick-create form to KanbanBoard
description: 看板頂部新增行內展開的快速創建表單，支持手填和 AI 解析兩種路徑
parent_story: US-TCO-002
parent_prd: PRD-TASK-CREATE-OPT
status: backlog
priority: high
estimate: 3h
implementation_checklist:
  - 在 KanbanBoard.jsx 頂部新增「⚡ 快速創建」按鈕
  - 點擊按鈕展開行內表單（isQuickCreateOpen state）
  - 表單欄位：自然語言輸入框（可選）、標題（必填）、截止日期（必填）、工時 tag（默認 2）、重要度 tag（默認 mid）
  - 「✨ 解析」按鈕：調用 api.extractTask()，結果填入各欄位，loading 狀態
  - 截止日期為空時禁用「創建」按鈕，標紅提示文字
  - 「創建」按鈕調用 api.createTask()，成功後收起表單並調用 onTaskCreated()
  - Escape 鍵收起表單
  - 重要度 tag 點擊循環切換 low/mid/high，工時 tag 點擊彈出輸入
  - 衝突檢測沿用現有 detectConflicts()（可選，若時間允許）
files_to_modify:
  - client/src/components/KanbanBoard.jsx
---
