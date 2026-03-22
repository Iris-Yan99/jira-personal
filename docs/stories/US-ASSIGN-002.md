---
id: US-ASSIGN-002
title: 組員可以認領任務給自己
description: 組員在 TaskEditModal 的 assignee 下拉只看到「無」和自己，不能指派給別人
parent_prd: PRD-TASK-ASSIGN
cards:
  - CARD-ASSIGN-003
  - CARD-ASSIGN-004
status: backlog
acceptance_criteria:
  - 組員的 assignee 下拉只顯示「無人」和自己的 display_name
  - 後端拒絕組員把 assignee 設成別人（403）
  - 組員可以把 assignee 清空（放棄認領）
---
