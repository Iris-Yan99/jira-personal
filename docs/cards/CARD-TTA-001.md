---
id: CARD-TTA-001
title: Add parent_id and progress_percent migration to db.js
description: 用 ALTER TABLE 新增欄位，runMigrations() 以 PRAGMA user_version 管控版本
parent_story: US-TTA-001
parent_prd: PRD-TASK-TREE-A
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 在 db.js 新增 runMigrations() 函數
  - migration v1：ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE
  - migration v1：ALTER TABLE tasks ADD COLUMN progress_percent INTEGER DEFAULT 0
  - 用 PRAGMA user_version 判斷是否已執行過（避免重複執行）
  - 在 db.exec() 之後呼叫 runMigrations()
  - 重啟 server 確認不報錯，舊資料正常載入
files_to_modify:
  - db.js
---
