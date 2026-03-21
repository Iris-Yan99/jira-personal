---
id: CARD-SCHED-002
title: Enforce parent deadline constraint in doSave
description: doSave 保存前驗證 deadlineError，syncParentDeadline 時額外更新父任務
parent_story: US-SCHED-001
parent_prd: PRD-SCHED-SMART
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - handleSave 入口：若 deadlineError && !syncParentDeadline，直接 return（不進入衝突檢測流程）
  - doSave 末尾（onSave 成功後）：若 syncParentDeadline && form.parent_id，呼叫 api.updateTask(form.parent_id, { deadline: form.deadline })
  - 保存成功後 reset syncParentDeadline = false、deadlineError = null
files_to_modify:
  - client/src/components/TaskEditModal.jsx
---
