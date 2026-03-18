---
id: US-DEPS-001
title: User can set blocked-by dependencies on a task
description: In the task edit modal, user can select one or more tasks that must complete before this task, and remove them later
parent_prd: PRD-TASK-DEPS
cards:
  - CARD-DEPS-001
  - CARD-DEPS-002
  - CARD-DEPS-003
  - CARD-DEPS-004
  - CARD-DEPS-005
status: backlog
acceptance_criteria:
  - Info Tab shows a "前置任務" field listing current blockers as removable tags
  - Dropdown to add a blocker excludes the task itself and its descendants
  - Adding a blocker that would form a cycle is rejected (backend returns error, UI shows message)
  - Removing a blocker tag immediately updates the list
  - Changes are persisted on modal save
---
