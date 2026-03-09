import { useState } from 'react'

const WORK_HOURS = 9 // 9:00-18:00 = 9 working hours

const PRIORITY_STYLE = {
  P1: 'bg-red-100 border-l-2 border-l-red-500 text-red-800',
  P2: 'bg-orange-100 border-l-2 border-l-orange-500 text-orange-800',
  P3: 'bg-yellow-100 border-l-2 border-l-yellow-500 text-yellow-800',
  P4: 'bg-gray-100 border-l-2 border-l-gray-400 text-gray-700',
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getMondayOf(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  return r
}

export default function ScheduleView({ tasks }) {
  const [view, setView] = useState('week')
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [showDone, setShowDone] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  const getDates = () => {
    if (view === 'day') return [new Date(anchor)]
    if (view === 'week') {
      const mon = getMondayOf(anchor)
      return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
    }
    // month
    const y = anchor.getFullYear()
    const m = anchor.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => new Date(y, m, i + 1))
  }

  const navigate = (dir) => {
    setAnchor((prev) => {
      const d = new Date(prev)
      if (view === 'day') d.setDate(d.getDate() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const getTitle = () => {
    if (view === 'day') return anchor.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    if (view === 'week') {
      const mon = getMondayOf(anchor)
      const sun = addDays(mon, 6)
      return `${mon.getMonth() + 1}/${mon.getDate()} — ${sun.getMonth() + 1}/${sun.getDate()}`
    }
    return anchor.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  }

  const activeTasksFor = (dateStr) =>
    tasks
      .filter((t) => t.deadline === dateStr && t.status !== 'done')
      .sort((a, b) => {
        const pl = { P1: 4, P2: 3, P3: 2, P4: 1 }
        return (pl[b.priority_level] || 1) - (pl[a.priority_level] || 1)
      })

  const doneTasksFor = (dateStr) =>
    tasks.filter((t) => t.deadline === dateStr && t.status === 'done')

  const hoursFor = (dateStr) =>
    activeTasksFor(dateStr).reduce((s, t) => s + (t.estimated_hours || 0), 0)

  const dates = getDates()
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-700">日程视图</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { id: 'day', label: '日' },
              { id: 'week', label: '周' },
              { id: 'month', label: '月' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-1 text-sm transition-colors ${
                  view === v.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Show done toggle */}
          <button
            onClick={() => setShowDone((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-colors ${
              showDone
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
              showDone ? 'border-green-500 bg-green-500' : 'border-gray-300'
            }`}>
              {showDone && <span className="text-white text-[8px] leading-none">✓</span>}
            </span>
            显示已完成
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium min-w-[140px] text-center">{getTitle()}</span>
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">◀</button>
            <button
              onClick={() => setAnchor(new Date(today))}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              今天
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">▶</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {view === 'month' ? (
          <MonthGrid
            dates={dates}
            todayStr={todayStr}
            activeTasksFor={activeTasksFor}
            doneTasksFor={doneTasksFor}
            hoursFor={hoursFor}
            showDone={showDone}
          />
        ) : (
          <DayWeekGrid
            dates={dates}
            view={view}
            todayStr={todayStr}
            activeTasksFor={activeTasksFor}
            doneTasksFor={doneTasksFor}
            hoursFor={hoursFor}
            dayNames={DAY_NAMES}
            showDone={showDone}
          />
        )}
      </div>
    </div>
  )
}

function DayWeekGrid({ dates, view, todayStr, activeTasksFor, doneTasksFor, hoursFor, dayNames, showDone }) {
  return (
    <div className={`grid gap-4 h-full ${view === 'week' ? 'grid-cols-7' : 'max-w-sm mx-auto grid-cols-1'}`}>
      {dates.map((date, i) => {
        const ds = toDateStr(date)
        const isToday = ds === todayStr
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const items = activeTasksFor(ds)
        const doneItems = doneTasksFor(ds)
        const hours = hoursFor(ds)
        const overloaded = hours > WORK_HOURS

        return (
          <div
            key={ds}
            className={`rounded-xl border-2 p-3 flex flex-col min-h-[200px] ${
              isToday
                ? 'border-blue-400 bg-blue-50'
                : isWeekend
                ? 'border-gray-100 bg-gray-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Date header */}
            <div className="mb-2">
              {view === 'week' && (
                <div className={`text-xs font-semibold ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                  {dayNames[i]}
                </div>
              )}
              <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                {date.getMonth() + 1}/{date.getDate()}
              </div>
              {hours > 0 && (
                <div className="mt-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-semibold ${overloaded ? 'text-red-500' : 'text-gray-500'}`}>
                      {hours}h
                    </span>
                    {overloaded && <span className="text-xs text-red-400">超负荷</span>}
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${overloaded ? 'bg-red-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.min(100, (hours / WORK_HOURS) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active tasks */}
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {items.map((task) => (
                <div
                  key={task.id}
                  className={`text-xs p-1.5 rounded-lg ${PRIORITY_STYLE[task.priority_level] || PRIORITY_STYLE.P4}`}
                >
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="text-gray-500 mt-0.5">{task.estimated_hours}h</div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-gray-300 text-center pt-4">无截止任务</div>
              )}

              {/* Done tasks at bottom */}
              {showDone && doneItems.length > 0 && (
                <div className={`space-y-1 ${items.length > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                  {doneItems.map((task) => (
                    <div
                      key={task.id}
                      className="text-xs p-1.5 rounded-lg bg-gray-50 border border-gray-200 opacity-60"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 font-bold text-[10px]">✓</span>
                        <span className="text-gray-400 line-through truncate flex-1">{task.title}</span>
                        <span className="text-green-600 text-[10px] font-medium flex-shrink-0">已完成</span>
                      </div>
                      <div className="text-gray-400 mt-0.5 pl-3">{task.estimated_hours}h</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthGrid({ dates, todayStr, activeTasksFor, doneTasksFor, hoursFor, showDone }) {
  const DAY_HEADERS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const firstDayOfWeek = (dates[0].getDay() + 6) % 7 // Monday = 0

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`e${i}`} className="min-h-[90px]" />
        ))}
        {dates.map((date) => {
          const ds = toDateStr(date)
          const isToday = ds === todayStr
          const items = activeTasksFor(ds)
          const doneItems = doneTasksFor(ds)
          const hours = hoursFor(ds)

          return (
            <div
              key={ds}
              className={`min-h-[90px] p-1.5 rounded-xl border ${
                isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'
              } transition-colors`}
            >
              <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                {date.getDate()}
                {hours > 0 && (
                  <span className={`ml-1 font-normal ${hours > WORK_HOURS ? 'text-red-400' : 'text-orange-400'}`}>
                    {hours}h
                  </span>
                )}
              </div>
              {items.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate ${
                    PRIORITY_STYLE[task.priority_level] || PRIORITY_STYLE.P4
                  }`}
                >
                  {task.title}
                </div>
              ))}
              {items.length > 3 && (
                <div className="text-xs text-gray-400">+{items.length - 3} 个</div>
              )}
              {/* Done tasks in month view */}
              {showDone && doneItems.length > 0 && (
                <div className={`${items.length > 0 ? 'mt-0.5 pt-0.5 border-t border-gray-200' : ''}`}>
                  {doneItems.slice(0, 2).map((task) => (
                    <div key={task.id} className="text-xs px-1 py-0.5 rounded mb-0.5 truncate bg-gray-50 text-gray-400 line-through opacity-70">
                      ✓ {task.title}
                    </div>
                  ))}
                  {doneItems.length > 2 && (
                    <div className="text-xs text-gray-300">+{doneItems.length - 2} 已完成</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
