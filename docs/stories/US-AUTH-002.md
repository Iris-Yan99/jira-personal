---
id: US-AUTH-002
title: PM can create and manage user accounts
description: PM 可在用戶管理界面建立組員帳號，設定角色；系統首次啟動自動建 admin 帳號
parent_prd: PRD-USER-AUTH
cards:
  - CARD-AUTH-003
  - CARD-AUTH-004
status: backlog
acceptance_criteria:
  - 首次啟動若 users 表為空，自動建 admin/admin123/pm 帳號並 console.log 提示
  - PM 可打開用戶管理 Modal，建立新帳號（username/display_name/password/role）
  - 非 PM 不能存取 POST /api/auth/users（返回 403）
  - 用戶管理 Modal 列出所有現有帳號（顯示 display_name 和 role）
---
