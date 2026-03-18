---
id: CARD-DEPS-001
title: Migration v3 — create task_dependencies table
description: Add task_dependencies junction table to SQLite via runMigrations()
parent_story: US-DEPS-001
parent_prd: PRD-TASK-DEPS
status: backlog
priority: high
estimate: 0.5h
implementation_checklist:
  - In db.js runMigrations(), add `if (version < 3)` block
  - CREATE TABLE task_dependencies (task_id, depends_on_id, PRIMARY KEY, FK ON DELETE CASCADE both sides)
  - db.pragma('user_version = 3')
files_to_modify:
  - db.js
---
