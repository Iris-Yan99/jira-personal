---
id: US-PVG-001
title: 組員登入後自動只看自己的任務
description: 角色為 member 的使用者，看板和所有視圖只顯示指派給自己的任務
parent_prd: PRD-PERSONAL-VIEW-GANTT
cards:
  - "CARD-PVG-001"
status: backlog
acceptance_criteria:
  - 組員登入後，看板只顯示 assignee === currentUser.display_name 的任務
  - PM 登入後，看板顯示所有任務（不受影響）
  - 組員看不到其他人的任務（Kanban、Schedule、Gantt 三個 tab 都適用）
  - 沒有 assignee 的任務，組員看不到
---
