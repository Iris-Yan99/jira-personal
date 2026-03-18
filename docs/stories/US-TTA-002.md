---
id: US-TTA-002
title: User can view and interact with task tree on the Kanban board
description: 看板只顯示頂層任務，可展開/收起子樹，遞迴渲染任意深度
parent_prd: PRD-TASK-TREE-A
cards:
  - CARD-TTA-003
  - CARD-TTA-004
status: backlog
acceptance_criteria:
  - 看板各欄只顯示 parent_id 為 null 的頂層任務
  - 有子任務的父任務顯示展開/收起按鈕及子任務數
  - 點擊展開後遞迴渲染子任務，每層縮排 + 不同顏色縱線
  - 每個節點（不論層級）顯示自己的進度條
  - 父任務進度條由子任務完成比例自動計算
  - 葉節點顯示手動進度條（來自 progress_percent 欄位）
  - 展開/收起狀態在頁面刷新後不保留（不持久化）
---
