---
id: "PRD-TASK-DEPS"
title: "Task Dependencies (Blocked By)"
description: "Allow tasks to declare predecessor dependencies; blocked tasks show visual indicator and estimated unlock date on the kanban board"
status: "draft"
pattern: discovery-driven
keyLearning: "Dependencies are soft (scheduling aid), not hard locks — derived at render time from blocker status, no stored blocked_status column needed"
project: jira-personal
stories:
  - US-DEPS-001
  - US-DEPS-002
  - US-DEPS-003
cards:
  - CARD-DEPS-001
  - CARD-DEPS-002
  - CARD-DEPS-003
  - CARD-DEPS-004
  - CARD-DEPS-005
  - CARD-DEPS-006
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

## Overview

Users need to model task sequencing: some tasks cannot meaningfully start until others finish. This feature adds a "blocked by" dependency graph so the kanban surface can surface scheduling risk at a glance.

Dependencies are **informational, not enforced** — a user can still drag a blocked task or edit it freely. The blocked indicator is a scheduling aid, not a workflow gate.

## Data Model

New table `task_dependencies` (migration v3):

```sql
CREATE TABLE task_dependencies (
  task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id)
);
```

- Cascade delete on both sides: removing a task cleans up all its dependency rows automatically
- No separate `blocked_status` column — blocked state is derived at query/render time

## API

`GET /api/tasks` — each task gains a `blockers` field:
```json
[{ "id": 3, "title": "...", "status": "in_progress", "deadline": "2026-03-25" }]
```
Returned via a GROUP_CONCAT subquery joined on `task_dependencies`.

`POST /api/dependencies` `{ task_id, depends_on_id }` — adds dependency; BFS cycle check prevents circular chains.

`DELETE /api/dependencies` `{ task_id, depends_on_id }` — removes a single dependency edge.

## Frontend Logic

`isBlocked(task)` = `task.blockers.some(b => b.status !== 'done')`

`unlockDate(task)` = `max(blocker.deadline for incomplete blockers)` — null if any blocker has no deadline.

Both are pure functions; no extra API call needed when task list refreshes.

## Kanban Card (TaskTreeNode)

When `isBlocked`:
- Border: `border-yellow-400` (2px)
- Top badge: `⛔ BLOCKED`
- Beside badge: `解鎖於 {unlockDate}` or `等待 {n} 個前置任務` if no deadline

Normal tasks unchanged.

## Modal (TaskEditModal)

New "前置任務" field in Info Tab:
- Multi-select from existing tasks (excludes self + descendants to prevent cycles)
- Selected blockers shown as removable tags
- Saves via POST/DELETE `/api/dependencies` on modal save
