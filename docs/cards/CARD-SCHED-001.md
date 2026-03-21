---
id: CARD-SCHED-001
title: Add deadline validation state and UI to TaskEditModal
description: 新增 deadlineError / childDeadlineWarning / syncParentDeadline state，在截止日期欄位下方顯示錯誤與警告
parent_story: US-SCHED-001
parent_prd: PRD-SCHED-SMART
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 新增 state：deadlineError (string|null)、childDeadlineWarning (string[])、syncParentDeadline (boolean)
  - 修改 set('deadline', v)：若有 parent_id，lookup parent task，v > parent.deadline 則設 deadlineError
  - 修改 set('deadline', v)（任何任務）：掃描 tasks 找直接子任務（t.parent_id === task.id），deadline > v 的放入 childDeadlineWarning
  - deadline 欄位下方渲染：deadlineError 時紅色錯誤文字 + checkbox「同步將父任務截止日更新為 {form.deadline}」
  - deadline 欄位下方渲染：childDeadlineWarning.length > 0 時橘色警告清單
  - deadline 或 parent_id 的 set() 若清空 deadline 也要 reset deadlineError
files_to_modify:
  - client/src/components/TaskEditModal.jsx
---
