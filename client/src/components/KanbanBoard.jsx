import { useState, useEffect, useMemo } from 'react'
import TaskEditModal from './TaskEditModal'
import { api } from '../utils/api'
import { buildTree, calcProgress, getDescendantIds } from '../utils/taskTree'

const COLUMNS = [
  {
    id: 'todo',
    label: '待办',
    color: 'text-gray-700',
    countColor: 'bg-gray-200 text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  {
    id: 'in_progress',
    label: '进行中',
    color: 'text-blue-700',
    countColor: 'bg-blue-100 text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'done',
    label: '已完成',
    color: 'text-green-700',
    countColor: 'bg-green-100 text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
]

const IMPORTANCE_CYCLE = ['low', 'mid', 'high']
const IMPORTANCE_LABEL = { high: '🔴 高', mid: '🟡 中', low: '🟢 低' }
const IMPORTANCE_CLASS = {
  high: 'bg-red-50 border-red-200 text-red-700',
  mid: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-green-50 border-green-200 text-green-700',
}
const HOURS_CYCLE = [1, 2, 4, 8]
const DEPTH_COLORS = ['border-blue-300', 'border-yellow-400', 'border-green-400', 'border-purple-300', 'border-pink-300']
const PRIORITY_BADGE = {
  P1: 'bg-red-500 text-white', P2: 'bg-orange-400 text-white',
  P3: 'bg-yellow-400 text-gray-800', P4: 'bg-gray-300 text-gray-700',
}

function isBlocked(task) {
  return (task.blockers || []).some(b => b.status !== 'done')
}

function unlockDate(task) {
  const incomplete = (task.blockers || []).filter(b => b.status !== 'done')
  const dates = incomplete.map(b => b.deadline).filter(Boolean)
  if (dates.length === 0) return null
  return dates.sort().at(-1) // latest deadline
}

function fmtH(h) {
  const n = Number(h) || 0
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`
}

// ─── TaskTreeNode ────────────────────────────────────────────────────────────
function TaskTreeNode({ task, childrenMap, tasksById, depth, expandedIds, onToggle, onLeafDone, onOpenEdit, onDragStart, quickLogTaskId, onQuickLogOpen, qlHours, setQlHours, qlNote, setQlNote, qlSubmitting, handleQuickLog }) {
  const children = childrenMap[task.id] || []
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(task.id)
  const progress = calcProgress(task.id, childrenMap, tasksById)
  const depthColor = DEPTH_COLORS[depth % DEPTH_COLORS.length]

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = task.deadline
    ? (() => { const [y, m, d] = task.deadline.split('-').map(Number); return new Date(y, m - 1, d) })()
    : null
  const daysLeft = deadline ? Math.round((deadline - today) / 86400000) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done'
  const blocked = isBlocked(task)
  const unlock = unlockDate(task)

  return (
    <div className={depth > 0 ? `ml-3 pl-3 border-l-2 ${depthColor}` : ''}>
      <div
        className={`bg-white rounded-xl border p-3 mb-2 ${
          blocked ? 'border-2 border-yellow-400' : 'border-gray-100'
        } ${depth === 0 ? 'shadow-sm cursor-grab active:cursor-grabbing' : ''} ${!hasChildren ? 'hover:shadow-md transition-all' : ''}`}
        draggable={depth === 0}
        onDragStart={depth === 0 ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id) } : undefined}
        onDragEnd={depth === 0 ? () => onDragStart(null) : undefined}
        onClick={!hasChildren ? () => onOpenEdit(task) : undefined}
      >
        {/* Milestone / Unplanned badges */}
        {(task.task_type === 'milestone' || task.unplanned === 1) && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {task.task_type === 'milestone' && (
              <span className="text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">🏁 里程碑</span>
            )}
            {task.unplanned === 1 && (
              <span className="text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">📌 計劃外</span>
            )}
          </div>
        )}

        {/* Blocked badge */}
        {blocked && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded-full">
              ⛔ BLOCKED
            </span>
            {unlock ? (
              <span className="text-xs text-yellow-700">解鎖於 {unlock}</span>
            ) : (
              <span className="text-xs text-yellow-600">
                等待 {(task.blockers || []).filter(b => b.status !== 'done').length} 個前置任務
              </span>
            )}
          </div>
        )}
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          {!hasChildren && (
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => onLeafDone(task)}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 cursor-pointer accent-blue-600 flex-shrink-0"
            />
          )}
          <h3
            className={`flex-1 text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}
            onClick={hasChildren ? () => onOpenEdit(task) : undefined}
            style={hasChildren ? { cursor: 'pointer' } : {}}
          >
            {task.title}
          </h3>
          <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[task.priority_level] || PRIORITY_BADGE.P4}`}>
            {task.priority_level || 'P4'}
          </span>
          {task.status !== 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickLogOpen(quickLogTaskId === task.id ? null : task.id) }}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-blue-500 px-1 py-0.5 rounded transition-colors"
              title="記錄工時"
            >
              ⏱
            </button>
          )}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(task.id) }}
              className="text-xs text-gray-400 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap flex-shrink-0"
            >
              {isExpanded ? '▲ 收起' : `▼ ${children.length}子任務`}
            </button>
          )}
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className={`flex items-center gap-1 text-xs mb-2 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            <span>📅</span>
            <span>{task.deadline}</span>
            {isOverdue && <span>(已逾期)</span>}
            {!isOverdue && daysLeft !== null && daysLeft <= 7 && task.status !== 'done' && (
              <span className="text-orange-500">({daysLeft === 0 ? '今天' : `${daysLeft}天後`})</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{progress}%</span>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-xs text-gray-400">👤</span>
            <span className="text-xs text-gray-500 font-medium">{task.assignee}</span>
          </div>
        )}

        {/* Notes summary */}
        {task.progress_note && (
          <div className="mt-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 line-clamp-2">
            {task.progress_note}
          </div>
        )}
        {task.coordination_note && (
          <div className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 font-medium line-clamp-2">
            ⚠ {task.coordination_note}
          </div>
        )}

        {/* Time progress bar */}
        {task.actual_hours > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">工時進度</span>
              <span className="text-xs text-gray-500">{fmtH(task.actual_hours)} / {fmtH(task.estimated_hours || 0)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {(() => {
                const pct = Math.min((task.actual_hours / (task.estimated_hours || 1)) * 100, 100)
                const overrun = task.actual_hours > (task.estimated_hours || 0)
                return <div className={`h-full rounded-full transition-all duration-300 ${overrun ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
              })()}
            </div>
            <div className="text-right mt-0.5">
              {task.actual_hours > (task.estimated_hours || 0) ? (
                <span className="text-xs text-red-500 font-medium">超 {fmtH(task.actual_hours - (task.estimated_hours || 0))}</span>
              ) : (
                <span className="text-xs text-gray-400">剩餘 {fmtH((task.estimated_hours || 0) - task.actual_hours)}</span>
              )}
            </div>
          </div>
        )}

        {/* Quick log popover */}
        {quickLogTaskId === task.id && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold text-blue-700">⏱ 記錄工時</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={qlHours}
                onChange={(e) => setQlHours(e.target.value)}
                placeholder="小時數"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                autoFocus
              />
              <span className="text-xs text-gray-500">h</span>
              <input
                type="text"
                value={qlNote}
                onChange={(e) => setQlNote(e.target.value)}
                placeholder="備註（選填）"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => onQuickLogOpen(null)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
              <button
                onClick={handleQuickLog}
                disabled={qlSubmitting || !parseFloat(qlHours)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                {qlSubmitting ? '...' : '記錄'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <div className="mb-2">
          {children.map((child) => (
            <TaskTreeNode
              key={child.id}
              task={child}
              childrenMap={childrenMap}
              tasksById={tasksById}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onLeafDone={onLeafDone}
              onOpenEdit={onOpenEdit}
              onDragStart={onDragStart}
              quickLogTaskId={quickLogTaskId}
              onQuickLogOpen={onQuickLogOpen}
              qlHours={qlHours}
              setQlHours={setQlHours}
              qlNote={qlNote}
              setQlNote={setQlNote}
              qlSubmitting={qlSubmitting}
              handleQuickLog={handleQuickLog}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────
export default function KanbanBoard({ tasks, onTasksChange }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())

  // Quick log state
  const [quickLogTaskId, setQuickLogTaskId] = useState(null)
  const [qlHours, setQlHours] = useState('')
  const [qlNote, setQlNote] = useState('')
  const [qlSubmitting, setQlSubmitting] = useState(false)

  // Quick create state
  const [qcOpen, setQcOpen] = useState(false)
  const [qcDesc, setQcDesc] = useState('')
  const [qcTitle, setQcTitle] = useState('')
  const [qcDeadline, setQcDeadline] = useState('')
  const [qcHours, setQcHours] = useState(2)
  const [qcImportance, setQcImportance] = useState('mid')
  const [qcParentId, setQcParentId] = useState(null)
  const [qcExtracting, setQcExtracting] = useState(false)
  const [qcCreating, setQcCreating] = useState(false)
  const [qcDeadlineError, setQcDeadlineError] = useState(false)

  const [activeProjectId, setActiveProjectId] = useState(null)

  const { roots, childrenMap, tasksById } = useMemo(() => buildTree(tasks), [tasks])

  // Root tasks with children → project pills
  const projects = useMemo(
    () => roots.filter(r => (childrenMap[r.id] || []).length > 0),
    [roots, childrenMap]
  )

  // Tasks/roots scoped to selected project
  const boardTasks = useMemo(() => {
    if (!activeProjectId) return tasks
    const descIds = getDescendantIds(activeProjectId, childrenMap)
    return tasks.filter(t => descIds.has(t.id))
  }, [activeProjectId, tasks, childrenMap])

  const boardRoots = useMemo(() => {
    if (!activeProjectId) return roots
    return tasks.filter(t => t.parent_id === activeProjectId)
  }, [activeProjectId, roots, tasks])

  // Milestones within current scope
  const milestones = useMemo(() => {
    const all = tasks.filter(t => t.task_type === 'milestone')
    if (!activeProjectId) return all
    const descIds = getDescendantIds(activeProjectId, childrenMap)
    return all.filter(t => descIds.has(t.id))
  }, [tasks, activeProjectId, childrenMap])

  // Done completion prompt state
  const [donePrompt, setDonePrompt] = useState(null) // null | { taskId, task, fromCheckbox }
  const [donePromptHours, setDonePromptHours] = useState('')
  const [donePromptDate, setDonePromptDate] = useState('')

  const handleDoneConfirm = async (hours) => {
    const { taskId, task, fromCheckbox } = donePrompt
    const completionDate = donePromptDate || localDateStr()
    setDonePrompt(null)
    setDonePromptHours('')
    setDonePromptDate('')
    await api.updateTask(taskId, { status: 'done', completed_at: completionDate })
    await api.createTaskLog({
      task_id: taskId,
      date: completionDate,
      type: 'status_change',
      content: `状态从「${STATUS_LABEL[task.status]}」变更为「已完成」`,
    })
    if (hours > 0) {
      await api.quickLog(taskId, hours, '任務完成', completionDate)
    }
    if (fromCheckbox && task.parent_id) {
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: 'done' } : t)
      checkParentCompletion(task.parent_id, updatedTasks)
    }
    onTasksChange()
  }

  const toggleExpand = (id) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleQuickLog = async () => {
    const hours = parseFloat(qlHours)
    if (!hours || hours <= 0) return
    setQlSubmitting(true)
    try {
      await api.quickLog(quickLogTaskId, hours, qlNote)
      onTasksChange()
      setQuickLogTaskId(null)
      setQlHours('')
      setQlNote('')
    } finally {
      setQlSubmitting(false)
    }
  }

  useEffect(() => {
    if (!quickLogTaskId) return
    const handler = (e) => { if (e.key === 'Escape') setQuickLogTaskId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quickLogTaskId])

  const STATUS_LABEL = { todo: '待办', in_progress: '进行中', done: '已完成' }

  const localDateStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const handleDrop = async (colId) => {
    if (!dragId) return
    const task = tasks.find((t) => t.id === dragId)
    if (task && task.status !== colId) {
      if (colId === 'done') {
        setDonePrompt({ taskId: dragId, task, fromCheckbox: false })
      } else {
        await api.updateTask(dragId, { status: colId })
        await api.createTaskLog({
          task_id: dragId,
          date: localDateStr(),
          type: 'status_change',
          content: `状态从「${STATUS_LABEL[task.status]}」变更为「${STATUS_LABEL[colId]}」`,
        })
        onTasksChange()
      }
    }
    setDragId(null)
    setDragOver(null)
  }

  const checkParentCompletion = (parentId, currentTasks) => {
    if (!parentId) return
    const siblings = currentTasks.filter((t) => t.parent_id === parentId)
    const allDone = siblings.length > 0 && siblings.every((t) => t.status === 'done')
    if (!allDone) return
    const parent = currentTasks.find((t) => t.id === parentId)
    if (!parent || parent.status === 'done') return
    const confirmed = window.confirm(`所有子任務已完成，是否完成「${parent.title}」？`)
    if (confirmed) {
      api.updateTask(parentId, { status: 'done' }).then(() => {
        onTasksChange()
        const updated = currentTasks.map((t) => t.id === parentId ? { ...t, status: 'done' } : t)
        checkParentCompletion(parent.parent_id, updated)
      })
    }
  }

  const handleLeafDone = async (task) => {
    if (task.status !== 'done') {
      // Marking as done → show completion prompt
      setDonePrompt({ taskId: task.id, task, fromCheckbox: true })
    } else {
      // Unchecking → revert immediately, no prompt
      await api.updateTask(task.id, { status: 'todo' })
      onTasksChange()
    }
  }

  const resetQc = () => {
    setQcOpen(false)
    setQcDesc('')
    setQcTitle('')
    setQcDeadline('')
    setQcHours(2)
    setQcImportance('mid')
    setQcParentId(null)
    setQcExtracting(false)
    setQcCreating(false)
    setQcDeadlineError(false)
  }

  useEffect(() => {
    if (!qcOpen) return
    const handler = (e) => { if (e.key === 'Escape') resetQc() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [qcOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtract = async () => {
    if (!qcDesc.trim()) return
    setQcExtracting(true)
    try {
      const result = await api.extractTask(qcDesc)
      if (result.title) setQcTitle(result.title)
      if (result.deadline) {
        setQcDeadline(result.deadline)
        setQcDeadlineError(false)
      } else {
        setQcDeadline('')
        setQcDeadlineError(true)
      }
      if (result.estimated_hours) setQcHours(result.estimated_hours)
      if (result.importance) setQcImportance(result.importance)
    } catch (err) {
      console.error(err)
    } finally {
      setQcExtracting(false)
    }
  }

  const handleQuickCreate = async () => {
    if (!qcTitle.trim() || !qcDeadline) {
      setQcDeadlineError(!qcDeadline)
      return
    }
    setQcCreating(true)
    try {
      await api.createTask({
        title: qcTitle.trim(),
        deadline: qcDeadline,
        estimated_hours: qcHours,
        importance: qcImportance,
        description: '',
        tags: [],
        status: 'todo',
        parent_id: qcParentId || null,
      })
      onTasksChange()
      resetQc()
    } catch (err) {
      console.error(err)
    } finally {
      setQcCreating(false)
    }
  }

  const totalHours = (colId) =>
    boardTasks.filter((t) => t.status === colId).reduce((s, t) => s + (t.estimated_hours || 0), 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-700">任务看板</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{boardTasks.length} 个任务</span>
          <button
            onClick={() => { setQcOpen(true); if (activeProjectId) setQcParentId(activeProjectId) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ⚡ 快速创建
          </button>
        </div>
      </div>

      {/* Project filter pills */}
      {projects.length > 0 && (
        <div className="px-6 py-2 border-b border-gray-100 flex gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={() => setActiveProjectId(null)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${!activeProjectId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >全部</button>
          {projects.map(p => (
            <button key={p.id} onClick={() => setActiveProjectId(p.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${activeProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {p.title}
              {p.status === 'in_progress' && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 align-middle" />}
              {p.status === 'done' && ' ✓'}
            </button>
          ))}
        </div>
      )}

      {/* Project banner + milestone strip */}
      {activeProjectId && (() => {
        const proj = tasksById[activeProjectId]
        if (!proj) return null
        const STATUS_CLS = { todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700' }
        const STATUS_LBL = { todo: '待辦', in_progress: '進行中', done: '已完成' }
        const todayStr = new Date().toISOString().slice(0, 10)
        return (
          <>
            <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-semibold text-indigo-700">{proj.title}</span>
              {proj.description && <span className="text-xs text-indigo-400 truncate max-w-xs">{proj.description}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[proj.status]}`}>{STATUS_LBL[proj.status]}</span>
              <span className="text-xs text-indigo-400 ml-auto">{boardTasks.length} 個子任務</span>
            </div>
            {milestones.length > 0 && (
              <div className="px-6 py-3 border-b border-purple-100 bg-purple-50/40 flex-shrink-0">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">🏁 里程碑</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {milestones.map(m => {
                    const prog = calcProgress(m.id, childrenMap, tasksById)
                    const descIds = getDescendantIds(m.id, childrenMap)
                    const hasDelayed = [...descIds].some(id => {
                      const t = tasksById[id]
                      return t && t.status !== 'done' && t.deadline && t.deadline < todayStr
                    })
                    const msOverdue = m.status !== 'done' && m.deadline && m.deadline < todayStr
                    const warn = msOverdue || hasDelayed
                    return (
                      <div key={m.id} onClick={() => setEditTask(m)}
                        className={`flex-shrink-0 bg-white border rounded-xl px-3 py-2 min-w-44 cursor-pointer hover:shadow-sm transition-shadow ${warn ? 'border-red-300' : prog === 100 ? 'border-green-300' : 'border-purple-200'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{m.title}</span>
                          {warn && <span className="text-xs text-red-500 flex-shrink-0">⚠</span>}
                          {!warn && prog === 100 && <span className="text-xs text-green-500 flex-shrink-0">✓</span>}
                        </div>
                        {m.deadline && <p className="text-xs text-gray-400 mb-1.5">{m.deadline}{msOverdue ? ' · 已逾期' : ''}</p>}
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${warn ? 'bg-red-400' : prog === 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${prog}%` }} />
                        </div>
                        <p className="text-xs text-right mt-0.5 text-gray-400">{prog}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* Quick create form */}
      {qcOpen && (
        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex-shrink-0">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={qcDesc}
              onChange={(e) => setQcDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              placeholder="描述任务（可选）：「下周五前完成报告，很重要，约3小时」"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              disabled={qcExtracting}
            />
            <button
              onClick={handleExtract}
              disabled={!qcDesc.trim() || qcExtracting}
              className="px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {qcExtracting ? '解析中...' : '✨ AI 解析'}
            </button>
          </div>

          <div className="flex gap-2 items-start flex-wrap">
            {/* Parent task selector */}
            <select
              value={qcParentId || ''}
              onChange={(e) => setQcParentId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">頂層任務</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>

            <div className="flex-1 min-w-48">
              <input
                type="text"
                value={qcTitle}
                onChange={(e) => setQcTitle(e.target.value)}
                placeholder="任务标题 *"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <input
                type="date"
                value={qcDeadline}
                onChange={(e) => { setQcDeadline(e.target.value); setQcDeadlineError(false) }}
                className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${
                  qcDeadlineError ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'
                }`}
              />
              {qcDeadlineError && <p className="text-xs text-red-500 mt-1">截止日期必填</p>}
            </div>

            <button
              onClick={() => setQcHours(HOURS_CYCLE[(HOURS_CYCLE.indexOf(qcHours) + 1) % HOURS_CYCLE.length])}
              className="px-3 py-2 bg-white border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              title="点击切换工时"
            >
              ⏱ {qcHours}h
            </button>

            <button
              onClick={() => setQcImportance(IMPORTANCE_CYCLE[(IMPORTANCE_CYCLE.indexOf(qcImportance) + 1) % IMPORTANCE_CYCLE.length])}
              className={`px-3 py-2 border text-xs font-medium rounded-lg hover:opacity-80 transition-colors whitespace-nowrap ${IMPORTANCE_CLASS[qcImportance]}`}
              title="点击切换重要程度"
            >
              {IMPORTANCE_LABEL[qcImportance]}
            </button>

            <button
              onClick={handleQuickCreate}
              disabled={!qcTitle.trim() || !qcDeadline || qcCreating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {qcCreating ? '创建中...' : '创建'}
            </button>
            <button
              onClick={resetQc}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-hidden p-5">
        <div className="flex gap-4 h-full">
          {COLUMNS.map((col) => {
            const colRoots = boardRoots.filter((t) => t.status === col.id)
            return (
              <div
                key={col.id}
                className={`flex-1 flex flex-col rounded-xl border-2 transition-all ${
                  dragOver === col.id ? 'drag-over' : `${col.bg} ${col.border}`
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countColor}`}>
                      {boardTasks.filter((t) => t.status === col.id).length}
                    </span>
                  </div>
                  {boardTasks.filter((t) => t.status === col.id).length > 0 && (
                    <span className="text-xs text-gray-400">{totalHours(col.id)}h</span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-3">
                  {colRoots.map((task) => (
                    <TaskTreeNode
                      key={task.id}
                      task={task}
                      childrenMap={childrenMap}
                      tasksById={tasksById}
                      depth={0}
                      expandedIds={expandedIds}
                      onToggle={toggleExpand}
                      onLeafDone={handleLeafDone}
                      onOpenEdit={setEditTask}
                      onDragStart={setDragId}
                      quickLogTaskId={quickLogTaskId}
                      onQuickLogOpen={setQuickLogTaskId}
                      qlHours={qlHours}
                      setQlHours={setQlHours}
                      qlNote={qlNote}
                      setQlNote={setQlNote}
                      qlSubmitting={qlSubmitting}
                      handleQuickLog={handleQuickLog}
                    />
                  ))}
                  {colRoots.length === 0 && (
                    <div className={`text-center text-sm py-10 ${dragOver === col.id ? 'text-blue-400' : 'text-gray-300'}`}>
                      {dragOver === col.id ? '放置到此处' : '暂无任务'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Done completion prompt */}
      {donePrompt && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50"
          onClick={() => handleDoneConfirm(0)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-72" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-3">
              <span className="text-3xl">✅</span>
              <h3 className="text-sm font-semibold text-gray-700 mt-2 truncate px-2">「{donePrompt.task.title}」</h3>
              <p className="text-xs text-gray-400 mt-0.5">這次花了多久？</p>
            </div>

            {/* Completion date selector */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1.5">完成日期</p>
              <div className="flex gap-1.5 items-center">
                {(() => {
                  const today = localDateStr()
                  const yesterday = (() => {
                    const d = new Date(); d.setDate(d.getDate() - 1)
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                  })()
                  const active = donePromptDate || today
                  return (
                    <>
                      <button
                        onClick={() => setDonePromptDate('')}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${active === today ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >今天</button>
                      <button
                        onClick={() => setDonePromptDate(yesterday)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${active === yesterday ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >昨天</button>
                      <input
                        type="date"
                        value={donePromptDate}
                        max={today}
                        onChange={e => setDonePromptDate(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
                      />
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[0.5, 1, 2, 4].map(h => (
                <button
                  key={h}
                  onClick={() => handleDoneConfirm(h)}
                  className="py-2.5 text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 active:scale-95 transition-all"
                >{h}h</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                min="0.5"
                step="0.5"
                autoFocus
                value={donePromptHours}
                onChange={e => setDonePromptHours(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDoneConfirm(parseFloat(donePromptHours) || 0)}
                placeholder="自填小時數..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
              />
              {donePromptHours && (
                <button
                  onClick={() => handleDoneConfirm(parseFloat(donePromptHours) || 0)}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                >記錄</button>
              )}
            </div>
            <button
              onClick={() => handleDoneConfirm(0)}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            >跳過，不記錄工時</button>
          </div>
        </div>
      )}

      {editTask && (
        <TaskEditModal
          task={editTask}
          tasks={tasks}
          onClose={() => setEditTask(null)}
          onSave={async (data) => {
            await api.updateTask(editTask.id, data)
            onTasksChange()
            setEditTask(null)
          }}
          onDelete={async () => {
            await api.deleteTask(editTask.id)
            onTasksChange()
            setEditTask(null)
          }}
        />
      )}
    </div>
  )
}
