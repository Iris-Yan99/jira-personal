---
id: CARD-ASSIGN-002
title: Kanban 卡片顯示 assignee 名字
description: 有 assignee 時，Kanban 卡片右下角顯示灰色小標籤
parent_story: US-ASSIGN-001
parent_prd: PRD-TASK-ASSIGN
status: backlog
priority: high
estimate: 0.5h
implementation_checklist:
  - 在 KanbanBoard.jsx 的卡片 JSX 中，找到卡片底部區域
  - 加入：{task.assignee && <span className="text-xs text-gray-400">👤 {task.assignee}</span>}
files_to_modify:
  - client/src/components/KanbanBoard.jsx
---
