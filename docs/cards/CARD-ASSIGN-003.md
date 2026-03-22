---
id: CARD-ASSIGN-003
title: 後端 assignee 權限校驗
description: PUT /api/tasks/:id 加權限檢查，組員只能設自己或清空
parent_story: US-ASSIGN-002
parent_prd: PRD-TASK-ASSIGN
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 在 routes/tasks.js 的 PUT /:id 路由中，取得 req.session.userRole 和 req.session.userId
  - 若 req.body.assignee 有值且 userRole === 'member'：
    - 查 users 表取得當前用戶的 display_name
    - 若 assignee !== display_name，返回 403 { error: '只能指派給自己' }
  - PM 不受限制，直接 pass
files_to_modify:
  - routes/tasks.js
---
