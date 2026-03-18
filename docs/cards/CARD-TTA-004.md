---
id: CARD-TTA-004
title: Implement recursive TaskTreeNode and kanban tree rendering in KanbanBoard
description: 看板只顯示頂層任務，遞迴渲染子樹，每節點有進度條和展開/收起
parent_story: US-TTA-002
parent_prd: PRD-TASK-TREE-A
status: backlog
priority: high
estimate: 4h
implementation_checklist:
  - KanbanBoard.jsx import buildTree、calcProgress from taskTree.js
  - 用 useMemo 從 tasks 計算 { roots, childrenMap }
  - 新增 expandedIds state（Set<number>），控制哪些節點展開
  - 新增 toggleExpand(id) 函數
  - 新增 TaskTreeNode({ task, childrenMap, tasksById, depth, expandedIds, onToggle, onCheckDone }) 組件
    - depth 控制縮排：paddingLeft = depth * 16px
    - 縱線顏色依 depth 輪換：[blue, yellow, green, purple, ...]
    - 有子節點：顯示展開/收起按鈕、子任務數 badge、進度條（calcProgress）
    - 葉節點：顯示勾選框（checkbox）、progress_percent 進度條
    - 展開時遞迴渲染 childrenMap[task.id]，depth+1
  - 看板各欄改為渲染 roots.filter(t => t.status === col.id)
  - 每欄內渲染 <TaskTreeNode> 而非 <TaskCard>（TaskCard 保留給非樹場景）
  - TaskEditModal 父任務下拉：用 getDescendantIds 過濾不合法選項
files_to_modify:
  - client/src/components/KanbanBoard.jsx
  - client/src/components/TaskEditModal.jsx
---
