---
id: CARD-UX-001
title: 快速新增子任務 + 可搜尋父任務/前置任務選擇器
description: (1) 任務卡片 hover 顯示＋按鈕，快速在父任務下新增子任務；(2) 父任務 & 前置任務選擇器改為可搜尋輸入框，解決任務多時難找目標的問題
parent_story: null
parent_prd: null
status: in-progress
priority: high
estimate: 1.5h
implementation_checklist:
  - KanbanBoard: TaskTreeNode 加 onAddChild prop，header row 加＋按鈕，點擊時 setQcParentId + setQcOpen
  - TaskEditModal: 父任務 <select> 替換為 TaskSearchSelect（可搜尋 combobox）
  - TaskEditModal: 前置任務 <select> 替換為 TaskSearchSelect
files_to_modify:
  - client/src/components/KanbanBoard.jsx
  - client/src/components/TaskEditModal.jsx
---
