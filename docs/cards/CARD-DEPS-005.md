---
id: CARD-DEPS-005
title: TaskEditModal — 前置任務 multi-selector
description: Add blocked-by selector in Info Tab; syncs to backend on save
parent_story: US-DEPS-001
parent_prd: PRD-TASK-DEPS
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - Add localBlockers state (initialised from task.blockers)
  - Add pendingAdd / pendingRemove sets to track unsaved changes
  - Render "前置任務" Field with a <select> dropdown (excludes self + descendants, excludes already-added blockers)
  - Render selected blockers as removable tags (×)
  - On modal save (doSave): call api.addDependency for each pending add, api.removeDependency for each pending remove, then proceed with task update
  - Show error message if backend rejects with 409 (cycle detected)
files_to_modify:
  - client/src/components/TaskEditModal.jsx
---
