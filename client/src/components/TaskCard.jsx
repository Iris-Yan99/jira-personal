const PRIORITY_STYLE = {
  P1: { badge: 'bg-red-500 text-white', border: 'border-l-red-500' },
  P2: { badge: 'bg-orange-400 text-white', border: 'border-l-orange-400' },
  P3: { badge: 'bg-yellow-400 text-gray-800', border: 'border-l-yellow-400' },
  P4: { badge: 'bg-gray-300 text-gray-700', border: 'border-l-gray-300' },
}

const IMPORTANCE_STYLE = {
  high: 'text-red-500',
  mid: 'text-amber-500',
  low: 'text-green-500',
}

const IMPORTANCE_LABEL = { high: '高', mid: '中', low: '低' }

export default function TaskCard({ task, onClick, onDragStart, onDragEnd }) {
  const p = PRIORITY_STYLE[task.priority_level] || PRIORITY_STYLE.P4

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Parse YYYY-MM-DD as local date to avoid UTC offset shifting the day
  const deadline = task.deadline
    ? (() => { const [y, m, d] = task.deadline.split('-').map(Number); return new Date(y, m - 1, d) })()
    : null
  const daysLeft = deadline ? Math.round((deadline - today) / 86400000) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${p.border} p-3 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all select-none group`}
    >
      <div className="flex items-start gap-2 mb-2">
        <h3 className="flex-1 text-sm font-medium text-gray-800 leading-snug">{task.title}</h3>
        <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${p.badge}`}>
          {task.priority_level || 'P4'}
        </span>
      </div>

      <div className="space-y-1.5">
        {task.deadline && (
          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
            <span>📅</span>
            <span>{task.deadline}</span>
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
              <span className="text-orange-500 font-medium">
                ({daysLeft === 0 ? '今天' : `${daysLeft}天后`})
              </span>
            )}
            {isOverdue && <span className="text-red-500">(已逾期)</span>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>⏱</span>
            <span>{task.estimated_hours}h</span>
          </div>
          <span className={`text-xs font-medium ${IMPORTANCE_STYLE[task.importance] || 'text-gray-400'}`}>
            重要度: {IMPORTANCE_LABEL[task.importance] || '-'}
          </span>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {task.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
