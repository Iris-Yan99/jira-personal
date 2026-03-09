const PRIORITY_RANK = { P1: 4, P2: 3, P3: 2, P4: 1 }

/** Remaining hours for a task = estimated_hours × (1 - progress_percent / 100) */
function remainingHours(task) {
  const est = parseFloat(task.estimated_hours) || 1
  const pct = parseFloat(task.progress_percent) || 0
  return +(est * (1 - pct / 100)).toFixed(1)
}

/**
 * Detect scheduling conflicts for a task against existing tasks.
 * @param {object} task - the task being created/edited (needs deadline, estimated_hours, priority_level)
 * @param {array} allTasks - all existing tasks (should include progress_percent from API)
 * @param {number|null} currentId - id of the task being edited (excluded from check)
 * @returns {string[]} array of human-readable conflict messages
 */
export function detectConflicts(task, allTasks, currentId = null) {
  const { deadline, priority_level } = task
  if (!deadline) return []

  const others = allTasks.filter(
    (t) => t.deadline === deadline && t.status !== 'done' && t.id !== currentId
  )

  const conflicts = []

  // Hours overload check: sum remaining hours of existing tasks + new task hours (always full, no progress yet)
  const existingRemaining = +others.reduce((s, t) => s + remainingHours(t), 0).toFixed(1)
  const newHours = parseFloat(task.estimated_hours) || 1
  const total = +(existingRemaining + newHours).toFixed(1)
  if (total > 10) {
    const over = +(total - 10).toFixed(1)
    conflicts.push(
      `${deadline} 剩余工时 ${existingRemaining}h，加上本任务共 ${total}h，超出 ${over}h`
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
    conflicts.push(`${deadline} 已有同级别或更高优先级任务：${names}`)
  }

  return conflicts
}
