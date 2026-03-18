---
id: CARD-TTA-002
title: Update tasks CRUD to support parent_id and progress_percent
description: GET/POST/PUT 支持新欄位；快速創建和 TaskEditModal 加入父任務選擇
parent_story: US-TTA-001
parent_prd: PRD-TASK-TREE-A
status: backlog
priority: high
estimate: 1.5h
implementation_checklist:
  - routes/tasks.js GET /：SELECT 加入 parent_id、progress_percent 欄位
  - routes/tasks.js POST /：接受 parent_id（nullable）、progress_percent
  - routes/tasks.js PUT /:id：COALESCE 更新 parent_id、progress_percent
  - client/src/utils/api.js：createTask、updateTask 已支持任意欄位，無需修改
  - KanbanBoard.jsx 快速創建表單：加「父任務（可選）」select，選項為所有現有頂層任務
  - TaskEditModal.jsx Info Tab：加「父任務」select（選項過濾由 CARD-TTA-004 的 taskTree 工具提供）
files_to_modify:
  - routes/tasks.js
  - client/src/components/KanbanBoard.jsx
  - client/src/components/TaskEditModal.jsx
---
