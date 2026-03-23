import { useMemo, useEffect } from 'react'

const TASK_COL_W = 220
const MIN_DAY_W = 24

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

export default function GanttView({ tasks, currentUser }) {
  const filtered = useMemo(() => tasks.filter((t) => t.deadline), [tasks])

  const { start, end, totalDays } = useMemo(() => calcRange(filtered), [filtered])
  const unit = chooseUnit(totalDays)
  const ticks = useMemo(() => buildTicks(start, end, unit), [start, end, unit])

  const dayW = Math.max(MIN_DAY_W, unit === 'week' ? 28 : unit === 'month' ? 14 : 40)
  const totalW = totalDays * dayW

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOff = daysBetween(start, today)

  const groups = useMemo(() => {
    if (currentUser?.role !== 'pm') {
      return [{ assignee: null, tasks: filtered }]
    }
    const map = {}
    filtered.forEach((t) => {
      const key = t.assignee || '未指派'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return Object.entries(map).map(([assignee, tasks]) => ({ assignee, tasks }))
  }, [filtered, currentUser])

  useEffect(() => {
    const timeline = document.getElementById('gantt-timeline')
    const taskCol  = document.getElementById('gantt-task-col')
    if (!timeline || !taskCol) return
    const onScroll = () => { taskCol.scrollTop = timeline.scrollTop }
    timeline.addEventListener('scroll', onScroll)
    return () => timeline.removeEventListener('scroll', onScroll)
  }, [groups])

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        沒有設定 deadline 的任務
      </div>
    )
  }

  const ROW_H = 40
  const SEP_H = 36

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-4 text-sm flex-shrink-0">
        <span className="font-semibold text-gray-800">專案時程</span>
        <div className="flex gap-3">
          {[['已完成','#22c55e'],['進行中','#3b82f6'],['待辦','#94a3b8']].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 text-gray-500 text-xs">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {formatDate(start)} – {formatDate(end)} · {unit === 'day' ? '日' : unit === 'week' ? '週' : '月'}視圖
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left task col */}
        <div
          id="gantt-task-col"
          className="flex-shrink-0 border-r border-gray-200 overflow-y-auto"
          style={{ width: TASK_COL_W }}
        >
          <div className="h-10 flex items-center px-3 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white sticky top-0">
            任務名稱
          </div>
          {groups.map(({ assignee, tasks: groupTasks }) => (
            <div key={assignee ?? 'all'}>
              {assignee !== null && (
                <div className="flex items-center px-3 gap-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500" style={{ height: SEP_H }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-indigo-500">
                    {assignee[0]?.toUpperCase()}
                  </span>
                  {assignee}
                </div>
              )}
              {groupTasks.map((t) => (
                <div key={t.id} className="border-b border-gray-50 flex items-center px-3 gap-2 hover:bg-gray-50" style={{ height: ROW_H }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[t.status] ?? '#94a3b8' }} />
                  <span className="text-sm text-gray-700 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right timeline */}
        <div id="gantt-timeline" className="flex-1 overflow-auto">
          <div style={{ width: totalW, position: 'relative' }}>
            {/* Header */}
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

            {/* Grid + bars */}
            <div style={{ position: 'relative' }}>
              {ticks.map((tick) => (
                <div key={tick.offset} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: tick.offset * dayW }} />
              ))}

              {todayOff >= 0 && todayOff <= totalDays && (
                <div className="absolute top-0 bottom-0 z-10" style={{ left: todayOff * dayW, width: 2, background: '#ef4444' }}>
                  <span className="absolute text-xs text-red-500 font-bold whitespace-nowrap" style={{ top: 4, left: 4 }}>今天</span>
                </div>
              )}

              {groups.map(({ assignee, tasks: groupTasks }) => (
                <div key={assignee ?? 'all'}>
                  {assignee !== null && (
                    <div className="bg-gray-50 border-b border-gray-200" style={{ height: SEP_H }} />
                  )}
                  {groupTasks.map((t) => {
                    const taskStart = parseDate(t.created_at) ?? start
                    const taskEnd   = parseDate(t.deadline) ?? end
                    const barLeft   = Math.max(0, daysBetween(start, taskStart)) * dayW
                    const barWidth  = Math.max(dayW, daysBetween(taskStart, taskEnd) * dayW)
                    const progress  = t.progress_percent ?? 0
                    const color     = STATUS_COLORS[t.status] ?? '#94a3b8'

                    return (
                      <div key={t.id} className="relative border-b border-gray-50 hover:bg-gray-50/50" style={{ height: ROW_H }}>
                        <div className="absolute rounded" style={{ left: barLeft, width: barWidth, top: 10, height: 20, background: color, opacity: 0.2 }} />
                        <div className="absolute rounded" style={{ left: barLeft, width: barWidth * (progress / 100), top: 10, height: 20, background: color, opacity: 0.85 }} />
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
