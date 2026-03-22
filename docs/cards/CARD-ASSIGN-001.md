---
id: CARD-ASSIGN-001
title: users 建立時 sync members 記錄
description: POST /api/auth/users 成功後自動插入對應 member 記錄
parent_story: US-ASSIGN-001
parent_prd: PRD-TASK-ASSIGN
status: backlog
priority: high
estimate: 0.5h
implementation_checklist:
  - 在 routes/auth.js 的 POST /users 路由，建立用戶成功後，檢查 members 表是否已有同名記錄
  - 若無，INSERT INTO members (name) VALUES (display_name)
  - 若 UNIQUE 衝突（display_name 已存在）則忽略（不報錯）
files_to_modify:
  - routes/auth.js
---
