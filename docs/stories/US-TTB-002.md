---
id: US-TTB-002
title: User can add progress notes and coordination items to any task node
description: 每個任務節點有進度備注和需協調事項，看板就地顯示摘要，需協調事項紅色高亮
parent_prd: PRD-TASK-TREE-B
cards:
  - CARD-TTB-003
  - CARD-TTB-004
status: backlog
acceptance_criteria:
  - tasks 表有 progress_note、coordination_note TEXT 欄位（migration v2）
  - TaskEditModal 有「備注」Tab，含進度備注 textarea 和需協調事項 textarea
  - 儲存後 PUT /tasks/:id 更新兩個欄位
  - TaskTreeNode 展開後顯示備注摘要（前 60 字）
  - coordination_note 不為空時，顯示紅色背景高亮摘要
  - 無備注的節點不顯示備注區塊（不佔空間）
---
