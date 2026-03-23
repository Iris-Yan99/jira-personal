// @card CARD-GANTT-001
import { useMemo, useState, useEffect } from 'react'
import { buildTree } from '../utils/taskTree'

const TASK_COL_W = 240
const MIN_DAY_W = 24
const ROW_H = 40
const SEP_H = 36

function parseDate(str) {
  if (!str) return null
  return new Date(str.slice(0, 10) + 'T00:00:00')
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function calcRange(tasks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let minDate = new Date(today)
  let maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 30)

  tasks.forEach((t) => {
    if (t.created_at) {
      const d = parseDate(t.created_at)
      if (d && d < minDate) minDate = d
    }
    if (t.deadline) {
      const d = parseDate(t.deadline)
      if (d && d > maxDate) maxDate = d
    }
  })

  maxDate.setDate(maxDate.getDate() + 7)
  return { start: minDate, end: maxDate, totalDays: daysBetween(minDate, maxDate) }
}

function chooseUnit(totalDays) {
  if (totalDays < 45) return 'day'
  if (totalDays <= 120) return 'week'
  return 'month'
}

function buildTicks(start, end, unit) {
  const ticks = []
  const cur = new Date(start)

  if (unit === 'day') {
    while (cur <= end) {
      ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, offset: daysBetween(start, cur) })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (unit === 'week') {
    const dow = cur.getDay()
    if (dow !== 1) cur.setDate(cur.getDate() + ((8 - dow) % 7))
    while (cur <= end) {
      ticks.push({ label: `${cur.getMonth() + 1}/${cur.getDate()}`, offset: daysBetween(start, cur) })
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    cur.setDate(1)
    while (cur <= end) {
      ticks.push({ label: `${cur.getFullYear()}/${cur.getMonth() + 1}`, offset: daysBetween(start, cur) })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return ticks
}

const STATUS_COLORS = {
  done:        '#22c55e',
  in_progress: '#3b82f6',
  todo:        '#94a3b8',
}

// Build flat rows array — both left col and right timeline iterate this for pixel-perfect sync
// row: { type: 'group', assignee } | { type: 'task', task, depth, hasChildren, isExpanded }
function buildRows(tasks, childrenMap, expandedIds, role) {
  const rows = []
  const allIds = new Set(tasks.map(t => t.id))

  function addTaskRows(list, depth) {
    list.forEach(task => {
      const children = childrenMap[task.id] || []
      const hasChildren = children.length > 0
      const isExpanded = expandedIds.has(task.id)
      rows.push({ type: 'task', task, depth, hasChildren, isExpanded })
      if (hasChildren && isExpanded) {
        addTaskRows(children, depth + 1)
      }
    })
  }

  if (role === 'pm') {
    const groupMap = new Map()
    tasks.forEach(t => {
      const key = t.assignee || '未指派'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key).push(t)
    })
    groupMap.forEach((groupTasks, assignee) => {
      rows.push({ type: 'group', assignee })
      const groupIds = new Set(groupTasks.map(t => t.id))
      // Root within group: parent not in this group (or no parent)
      const groupRoots = groupTasks.filter(t => !t.parent_id || !groupIds.has(t.parent_id))
      addTaskRows(groupRoots, 0)
    })
  } else {
    // Roots: no parent, or parent not in displayed set
    const roots = tasks.filter(t => !t.parent_id || !allIds.has(t.parent_id))
    addTaskRows(roots, 0)
  }

  return rows
}

export default function GanttView({ tasks, currentUser }) {
  const [showAll, setShowAll] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const oneWeekLater = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return d
  }, [today])

  // Tasks with deadline
  const withDeadline = useMemo(() => tasks.filter(t => t.deadline), [tasks])

  // A2: hide todo tasks with deadline > 7 days away unless showAll
  const displayed = useMemo(() => {
    if (showAll) return withDeadline
    return withDeadline.filter(t => {
      if (t.status !== 'todo') return true
      const d = parseDate(t.deadline)
      return d && d <= oneWeekLater
    })
  }, [withDeadline, showAll, oneWeekLater])

  const hiddenCount = withDeadline.length - displayed.length

  // Build tree from displayed set
  const { childrenMap } = useMemo(() => buildTree(displayed), [displayed])

  // Initialize expandedIds: all parents expanded by default when displayed changes
  useEffect(() => {
    const parentIds = new Set()
    displayed.forEach(t => {
      if ((childrenMap[t.id] || []).length > 0) parentIds.add(t.id)
    })
    setExpandedIds(parentIds)
  }, [displayed, childrenMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const { start, end, totalDays } = useMemo(() => calcRange(displayed), [displayed])
  const unit = chooseUnit(totalDays)
  const ticks = useMemo(() => buildTicks(start, end, unit), [start, end, unit])

  const dayW = Math.max(MIN_DAY_W, unit === 'week' ? 28 : unit === 'month' ? 14 : 40)
  const totalW = totalDays * dayW
  const todayOff = daysBetween(start, today)

  const rows = useMemo(
    () => buildRows(displayed, childrenMap, expandedIds, currentUser?.role),
    [displayed, childrenMap, expandedIds, currentUser?.role]
  )

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Sync scroll between left col and right timeline
  useEffect(() => {
    const timeline = document.getElementById('gantt-timeline')
    const taskCol = document.getElementById('gantt-task-col')
    if (!timeline || !taskCol) return
    const onScroll = () => { taskCol.scrollTop = timeline.scrollTop }
    timeline.addEventListener('scroll', onScroll)
    return () => timeline.removeEventListener('scroll', onScroll)
  }, [rows])

  if (withDeadline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        沒有設定 deadline 的任務
      </div>
    )
  }

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 text-sm">
        <span>近期無緊急任務</span>
        <button
          onClick={() => setShowAll(true)}
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          顯示全部 {withDeadline.length} 個任務
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-4 text-sm flex-shrink-0 flex-wrap">
        <span className="font-semibold text-gray-800">專案時程</span>
        <div className="flex gap-3">
          {[['已完成','#22c55e'],['進行中','#3b82f6'],['待辦','#94a3b8']].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-gray-500 text-xs">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>

        <button
          onClick={() => setShowAll(v => !v)}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
            showAll
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {showAll
            ? '✓ 顯示全部'
            : hiddenCount > 0 ? `近期（已隱藏 ${hiddenCount} 個遠期）` : '近期'}
        </button>

        <span className="ml-auto text-xs text-gray-400">
          {formatDate(start)} – {formatDate(end)} · {unit === 'day' ? '日' : unit === 'week' ? '週' : '月'}視圖
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left task col */}
        <div
          id="gantt-task-col"
          className="flex-shrink-0 border-r border-gray-200 overflow-y-hidden"
          style={{ width: TASK_COL_W }}
        >
          <div className="h-10 flex items-center px-3 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white">
            任務名稱
          </div>

          {rows.map((row) => {
            if (row.type === 'group') {
              return (
                <div
                  key={`g-${row.assignee}`}
                  className="flex items-center px-3 gap-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500"
                  style={{ height: SEP_H }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-indigo-500">
                    {row.assignee[0]?.toUpperCase()}
                  </span>
                  {row.assignee}
                </div>
              )
            }

            const { task, depth, hasChildren, isExpanded } = row
            return (
              <div
                key={task.id}
                className="border-b border-gray-50 flex items-center gap-1 hover:bg-gray-50"
                style={{ height: ROW_H, paddingLeft: 8 + depth * 16 }}
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs transition-colors"
                    title={isExpanded ? '收起' : '展開'}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: STATUS_COLORS[task.status] ?? '#94a3b8' }}
                    />
                  </span>
                )}
                <span className="text-sm text-gray-700 truncate">{task.title}</span>
              </div>
            )
          })}
        </div>

        {/* Right timeline */}
        <div id="gantt-timeline" className="flex-1 overflow-auto">
          <div style={{ width: totalW, position: 'relative' }}>
            {/* Header ticks */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200" style={{ height: ROW_H, position: 'relative' }}>
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute top-0 bottom-0 flex items-center text-xs text-gray-400 pl-1 border-l border-gray-100"
                  style={{ left: tick.offset * dayW }}
                >
                  {tick.label}
                </div>
              ))}
            </div>

            {/* Grid lines + bars */}
            <div style={{ position: 'relative' }}>
              {ticks.map((tick) => (
                <div
                  key={tick.offset}
                  className="absolute top-0 bottom-0 border-l border-gray-100"
                  style={{ left: tick.offset * dayW }}
                />
              ))}

              {todayOff >= 0 && todayOff <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{ left: todayOff * dayW, width: 2, background: '#ef4444' }}
                >
                  <span
                    className="absolute text-xs text-red-500 font-bold whitespace-nowrap"
                    style={{ top: 4, left: 4 }}
                  >
                    今天
                  </span>
                </div>
              )}

              {rows.map((row) => {
                if (row.type === 'group') {
                  return (
                    <div
                      key={`g-${row.assignee}`}
                      className="bg-gray-50 border-b border-gray-200"
                      style={{ height: SEP_H }}
                    />
                  )
                }

                const { task } = row
                const taskStart = parseDate(task.created_at) ?? start
                const taskEnd   = parseDate(task.deadline) ?? end
                const barLeft   = Math.max(0, daysBetween(start, taskStart)) * dayW
                const barWidth  = Math.max(dayW, daysBetween(taskStart, taskEnd) * dayW)
                const progress  = task.progress_percent ?? 0
                const color     = STATUS_COLORS[task.status] ?? '#94a3b8'

                return (
                  <div
                    key={task.id}
                    className="relative border-b border-gray-50 hover:bg-gray-50/50"
                    style={{ height: ROW_H }}
                  >
                    {/* Background track */}
                    <div
                      className="absolute rounded"
                      style={{ left: barLeft, width: barWidth, top: 10, height: 20, background: color, opacity: 0.2 }}
                    />
                    {/* Progress fill */}
                    <div
                      className="absolute rounded"
                      style={{ left: barLeft, width: barWidth * (progress / 100), top: 10, height: 20, background: color, opacity: 0.85 }}
                    />
                    {barWidth > 40 && (
                      <span
                        className="absolute select-none pointer-events-none font-medium"
                        style={{ left: barLeft + 6, top: 14, color: progress > 30 ? 'white' : color, fontSize: 10 }}
                      >
                        {progress}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
