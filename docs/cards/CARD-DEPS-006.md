---
id: CARD-DEPS-006
title: TaskTreeNode — blocked visual indicator
description: Show yellow border, BLOCKED badge, and unlock date on kanban cards with unfinished blockers
parent_story: US-DEPS-002
parent_prd: PRD-TASK-DEPS
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - Add isBlocked helper: task.blockers?.some(b => b.status !== 'done')
  - Add unlockDate helper: max deadline among incomplete blockers (null if any missing)
  - In TaskTreeNode card div, conditionally apply border-yellow-400 border-2 when blocked
  - Render blocked badge above title row when isBlocked
  - Badge text: "⛔ BLOCKED · 解鎖於 {date}" or "⛔ BLOCKED · 等待 {n} 個前置任務"
  - Auto-resolves on next onTasksChange() refresh — no extra logic needed
files_to_modify:
  - client/src/components/KanbanBoard.jsx
---
