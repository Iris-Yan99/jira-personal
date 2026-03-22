const PRIORITY_RANK = { P1: 4, P2: 3, P3: 2, P4: 1 }

/**
 * Daily rate for a task = remaining_hours / max(1, days_until_deadline)
 * This models parallel project work: a 8h task due in 30 days only needs ~0.27h/day.
 */
function dailyRate(task) {
  const est = parseFloat(task.estimated_hours) || 1
  const pct = parseFloat(task.progress_percent) || 0
  const remaining = est * (1 - pct / 100)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(task.deadline + 'T00:00:00')
  const days = Math.max(1, Math.round((d - today) / 86400000))
  return +(remaining / days).toFixed(2)
}

/**
 * Detect scheduling conflicts for a task against existing tasks.
 * Uses daily rate model to support parallel projects:
 * overload = sum of daily rates for same-deadline tasks > 8h/day
 * @param {object} task - the task being created/edited (needs deadline, estimated_hours, priority_level)
 * @param {array} allTasks - all existing tasks (should include progress_percent from API)
 * @param {number|null} currentId - id of the task being edited (excluded from check)
 * @returns {string[]} array of human-readable conflict messages
 */
export function detectConflicts(task, allTasks, currentId = null) {
  const { deadline, priority_level } = task
  if (!deadline) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline + 'T00:00:00')
  const daysUntil = Math.max(1, Math.round((deadlineDate - today) / 86400000))

  const others = allTasks.filter(
    (t) => t.deadline === deadline && t.status !== 'done' && t.id !== currentId
  )

  const conflicts = []

  // Daily rate overload check
  const existingRate = +others.reduce((s, t) => s + dailyRate(t), 0).toFixed(2)
  const newRate = +((parseFloat(task.estimated_hours) || 1) / daysUntil).toFixed(2)
  const totalRate = +(existingRate + newRate).toFixed(2)
  if (totalRate > 8) {
    const over = +(totalRate - 8).toFixed(2)
    conflicts.push(
      `${deadline} 截止任務每日需投入約 ${totalRate}h，超出正常工作量 ${over}h/天`
    )
  }

  // Same-deadline priority clash
  const rank = PRIORITY_RANK[priority_level] || 1
  const clashing = others.filter((t) => (PRIORITY_RANK[t.priority_level] || 1) >= rank)
  if (clashing.length > 0) {
    const names = clashing
      .slice(0, 3)
      .map((t) => `「${t.title}」(${t.priority_level})`)
      .join('、')
    conflicts.push(`${deadline} 已有同级别或更高优先级任務：${names}`)
  }

  return conflicts
}
