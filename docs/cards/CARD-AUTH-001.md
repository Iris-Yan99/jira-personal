---
id: CARD-AUTH-001
title: Add users table migration + auto admin seed
description: db.js 新增 version<6 migration，建 users 表；首次啟動自動建 admin 帳號
parent_story: US-AUTH-001
parent_prd: PRD-USER-AUTH
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 安裝 bcrypt：npm install bcrypt
  - db.js version<6：CREATE TABLE users (id, username UNIQUE, display_name, password_hash, role CHECK('pm','member'), created_at)
  - runMigrations() 後加 seed：若 SELECT COUNT(*) FROM users = 0，INSERT admin/bcrypt.hashSync('admin123',10)/pm
  - console.log('[DB] Default admin account created: admin / admin123')
files_to_modify:
  - db.js
  - package.json
---
