---
id: US-DEPS-002
title: User sees blocked status and unlock date on kanban cards
description: Tasks with unfinished predecessors display a yellow-bordered blocked badge with the estimated unlock date
parent_prd: PRD-TASK-DEPS
cards:
  - CARD-DEPS-006
status: backlog
acceptance_criteria:
  - Blocked tasks show yellow border and "⛔ BLOCKED" badge
  - Badge shows "解鎖於 YYYY-MM-DD" when the latest incomplete blocker has a deadline
  - Badge shows "等待 N 個前置任務" when no incomplete blocker has a deadline
  - Non-blocked tasks are visually unchanged
  - Badge is visible on both root-level and child task cards
---
