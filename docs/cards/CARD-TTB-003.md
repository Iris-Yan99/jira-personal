---
id: CARD-TTB-003
title: Add assignee combobox to TaskEditModal and display in TaskTreeNode
description: 責任人欄位：combobox（成員列表 + 自由輸入），顯示在節點上
parent_story: US-TTB-001
parent_prd: PRD-TASK-TREE-B
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - TaskEditModal.jsx Info Tab 新增「責任人」欄位：
    - datalist + input 實現 combobox（原生 HTML，無需額外套件）
    - <datalist id="members-list"> 由 api.getMembers() 填充
    - input value 綁定 form.assignee，onChange 更新
    - 儲存時 PUT /tasks/:id { assignee: form.assignee }
  - routes/tasks.js PUT /:id：COALESCE 更新 assignee
  - TaskTreeNode 節點顯示責任人：
    - 若 assignee 不為空，顯示頭像縮寫圓圈（取名字第一個字）+ 名字
    - 樣式：小圓圈 bg-blue-100 text-blue-700，放在節點標題右側
files_to_modify:
  - client/src/components/TaskEditModal.jsx
  - client/src/components/KanbanBoard.jsx  (TaskTreeNode 部分)
  - routes/tasks.js
---
