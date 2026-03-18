---
id: US-TTB-001
title: User can assign a responsible person to any task and manage the member list
description: 每個任務可指定責任人（combobox），SettingsView 可新增/刪除成員
parent_prd: PRD-TASK-TREE-B
cards:
  - CARD-TTB-001
  - CARD-TTB-002
status: backlog
acceptance_criteria:
  - tasks 表有 assignee TEXT 欄位（migration v2）
  - members 表存在，有 CRUD API（GET/POST/DELETE）
  - TaskEditModal Info Tab 有責任人 combobox：下拉列出成員，可手動輸入
  - 責任人顯示在 TaskTreeNode 節點上（名字或頭像縮寫）
  - SettingsView 有「團隊成員」區塊：顯示成員列表，可新增（輸入名字+Enter）和刪除
---
