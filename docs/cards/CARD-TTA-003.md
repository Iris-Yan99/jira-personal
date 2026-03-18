---
id: CARD-TTA-003
title: Create taskTree.js utility (buildTree, calcProgress, getDescendantIds)
description: 純函數工具，前端用來從扁平任務陣列建樹、計算進度、取子孫 ID
parent_story: US-TTA-002
parent_prd: PRD-TASK-TREE-A
status: backlog
priority: high
estimate: 1.5h
implementation_checklist:
  - 新增 client/src/utils/taskTree.js
  - buildTree(tasks)：返回 { roots: Task[], childrenMap: Record<id, Task[]> }
    - roots = tasks.filter(t => !t.parent_id)
    - childrenMap = tasks.reduce(...)，key 為 parent_id
  - calcProgress(taskId, childrenMap, tasksById)：
    - 無子節點 → 返回 tasksById[taskId].progress_percent
    - 有子節點 → Math.round(done子數 / 總子數 * 100)
  - getDescendantIds(taskId, childrenMap)：BFS/DFS 取所有子孫 id（用於循環引用過濾）
  - 所有函數為純函數，無 side effect，方便測試
files_to_modify:
  - client/src/utils/taskTree.js  (新增)
---
