---
id: US-DEPS-003
title: Blocked status auto-resolves when all predecessors complete
description: When the last blocking task is marked done, the dependent task's blocked badge disappears automatically
parent_prd: PRD-TASK-DEPS
cards:
  - CARD-DEPS-006
status: backlog
acceptance_criteria:
  - Marking a blocker task as done triggers task list refresh
  - If all blockers of a dependent task are now done, blocked badge disappears
  - No manual action required from user to unblock
  - Applies whether blocker is completed via checkbox, drag-to-done, or modal save
---
