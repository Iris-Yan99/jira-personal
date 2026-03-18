---
id: CARD-TTB-004
title: Add notes tab to TaskEditModal and inline summary in TaskTreeNode
description: Modal 新增「備注」Tab，TaskTreeNode 展開後顯示備注摘要（需協調事項紅色高亮）
parent_story: US-TTB-002
parent_prd: PRD-TASK-TREE-B
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - TaskEditModal.jsx 新增第三個 Tab「備注」：
    - 進度備注 textarea（placeholder: '記錄此任務的進度說明...'）
    - 需協調事項 textarea（placeholder: '記錄需要協調的資源或事項...'，紅色邊框）
    - 儲存按鈕 PUT /tasks/:id { progress_note, coordination_note }
  - routes/tasks.js PUT /:id：COALESCE 更新 progress_note、coordination_note
  - TaskTreeNode 展開區底部顯示備注摘要：
    - progress_note 不為空 → 顯示「📝 進度備注：[前60字]」（藍色背景）
    - coordination_note 不為空 → 顯示「🔗 需協調：[前60字]」（紅色背景 bg-red-50 border-red-200）
    - 兩者均為空 → 不渲染備注區塊
files_to_modify:
  - client/src/components/TaskEditModal.jsx
  - client/src/components/KanbanBoard.jsx  (TaskTreeNode 部分)
  - routes/tasks.js
---
