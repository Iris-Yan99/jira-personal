---
id: CARD-TTA-005
title: Prompt user to complete parent task when all siblings are done
description: 葉節點勾選完成後，檢查兄弟全完成則提示確認父任務完成，遞迴向上觸發
parent_story: US-TTA-003
parent_prd: PRD-TASK-TREE-A
status: backlog
priority: medium
estimate: 1.5h
implementation_checklist:
  - TaskTreeNode 葉節點 checkbox onChange 呼叫 handleLeafDone(taskId, parentId)
  - handleLeafDone：PUT /tasks/:id { status: 'done' } → 刷新 tasks
  - 刷新後檢查 childrenMap[parentId].every(c => c.status === 'done')
  - 若全完成 → window.confirm('所有子任務已完成，是否完成父任務？')
  - 確認 → PUT /tasks/:parentId { status: 'done' } → 再次刷新
  - 刷新後遞迴：若 parent 的 parent 也全完成 → 再次提示（最多遞迴到根節點）
  - 取消 → 不操作，父任務留在原欄
files_to_modify:
  - client/src/components/KanbanBoard.jsx
---
