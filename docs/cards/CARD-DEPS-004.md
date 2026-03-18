---
id: CARD-DEPS-004
title: api.js — addDependency and removeDependency methods
description: Frontend API helpers for POST/DELETE /api/dependencies
parent_story: US-DEPS-001
parent_prd: PRD-TASK-DEPS
status: backlog
priority: medium
estimate: 0.5h
implementation_checklist:
  - Add addDependency(taskId, dependsOnId) — POST /api/dependencies
  - Add removeDependency(taskId, dependsOnId) — DELETE /api/dependencies
files_to_modify:
  - client/src/utils/api.js
---
