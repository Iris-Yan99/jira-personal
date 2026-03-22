---
id: CARD-AUTH-003
title: PM user management modal (create + list users)
description: UserManageModal.jsx — PM 建立帳號、列出所有用戶
parent_story: US-AUTH-002
parent_prd: PRD-USER-AUTH
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 新建 client/src/components/UserManageModal.jsx
  - 表單欄位：username（text）、display_name（text）、password（text）、role（select: pm/member）
  - 提交：POST /api/auth/users，成功後清空表單並重新載入列表
  - 列表：GET /api/auth/users（需新增此端點，PM only，返回 id/username/display_name/role 不含 password_hash）
  - 錯誤顯示：username 重複等
files_to_modify:
  - client/src/components/UserManageModal.jsx (新建)
  - routes/auth.js (加 GET /users 端點)
---
