---
id: CARD-DEPS-002
title: New route routes/dependencies.js with cycle detection
description: POST and DELETE endpoints for task_dependencies; POST includes BFS cycle check
parent_story: US-DEPS-001
parent_prd: PRD-TASK-DEPS
status: backlog
priority: high
estimate: 1.5h
implementation_checklist:
  - Create routes/dependencies.js
  - POST / — validate task_id != depends_on_id, run BFS from depends_on_id to detect if task_id is reachable, reject with 409 if cycle detected, otherwise INSERT
  - DELETE / — DELETE WHERE task_id=? AND depends_on_id=?
  - Mount app.use('/api/dependencies', require('./routes/dependencies')) in server.js
files_to_modify:
  - routes/dependencies.js (new)
  - server.js
---
