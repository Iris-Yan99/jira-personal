---
id: US-TTA-001
title: User can create tasks with parent-child relationships
description: 創建任務時可選擇父任務，任務表支持無限層級自引用
parent_prd: PRD-TASK-TREE-A
cards:
  - CARD-TTA-001
  - CARD-TTA-002
status: backlog
acceptance_criteria:
  - tasks 表有 parent_id 欄位（nullable，FK 指向自身，CASCADE DELETE）
  - tasks 表有 progress_percent 欄位（整數 0-100，葉節點用）
  - GET /tasks 返回 parent_id、progress_percent 欄位
  - POST /tasks 接受 parent_id（nullable）
  - PUT /tasks/:id 接受 parent_id 更新（re-parent）
  - 快速創建表單有「父任務（可選）」下拉，列出所有現有任務
  - TaskEditModal Info Tab 有「父任務」下拉，過濾自身及其子孫
---
