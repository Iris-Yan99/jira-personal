---
id: CARD-TTB-001
title: Add members table and migration v2 (assignee, progress_note, coordination_note)
description: Migration v2 新增三個 tasks 欄位 + members 新表
parent_story: US-TTB-001
parent_prd: PRD-TASK-TREE-B
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - db.js runMigrations() 加入 v2 migration（user_version 2）
  - ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT ''
  - ALTER TABLE tasks ADD COLUMN progress_note TEXT DEFAULT ''
  - ALTER TABLE tasks ADD COLUMN coordination_note TEXT DEFAULT ''
  - CREATE TABLE IF NOT EXISTS members (id, name UNIQUE, created_at)
  - 重啟 server 確認 migration 執行且舊資料不受影響
files_to_modify:
  - db.js
---
