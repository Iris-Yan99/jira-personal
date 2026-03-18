---
id: CARD-DEPS-003
title: GET /api/tasks — attach blockers array to each task
description: Enrich task list response with blocker info (id, title, status, deadline) via SQL subquery
parent_story: US-DEPS-001
parent_prd: PRD-TASK-DEPS
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - In routes/tasks.js GET /, add LEFT JOIN on task_dependencies + GROUP_CONCAT to collect blocker ids
  - Run a second query (or subquery) to get blocker details: id, title, status, deadline
  - Parse and attach as blockers array on each task object
  - Ensure tasks with no blockers get blockers = []
files_to_modify:
  - routes/tasks.js
---
