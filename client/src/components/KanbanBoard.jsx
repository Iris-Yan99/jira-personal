import { useState, useEffect } from 'react'
import TaskCard from './TaskCard'
import TaskEditModal from './TaskEditModal'
import { api } from '../utils/api'

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

export default function KanbanBoard({ tasks, onTasksChange }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [editTask, setEditTask] = useState(null)

  // Quick create state
  const [qcOpen, setQcOpen] = useState(false)
  const [qcDesc, setQcDesc] = useState('')
  const [qcTitle, setQcTitle] = useState('')
  const [qcDeadline, setQcDeadline] = useState('')
  const [qcHours, setQcHours] = useState(2)
  const [qcImportance, setQcImportance] = useState('mid')
  const [qcExtracting, setQcExtracting] = useState(false)
  const [qcCreating, setQcCreating] = useState(false)
  const [qcDeadlineError, setQcDeadlineError] = useState(false)

  const byStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  const STATUS_LABEL = { todo: '待办', in_progress: '进行中', done: '已完成' }

  const localDateStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const handleDrop = async (colId) => {
    if (!dragId) return
    const task = tasks.find((t) => t.id === dragId)
    if (task && task.status !== colId) {
      await api.updateTask(dragId, { status: colId })
      await api.createTaskLog({
        task_id: dragId,
        date: localDateStr(),
        type: 'status_change',
        content: `状态从「${STATUS_LABEL[task.status]}」变更为「${STATUS_LABEL[colId]}」`,
      })
      onTasksChange()
    }
    setDragId(null)
    setDragOver(null)
  }

  const resetQc = () => {
    setQcOpen(false)
    setQcDesc('')
    setQcTitle('')
    setQcDeadline('')
    setQcHours(2)
    setQcImportance('mid')
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
    byStatus[colId].reduce((s, t) => s + (t.estimated_hours || 0), 0)

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-700">任务看板</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{tasks.length} 个任务</span>
          <button
            onClick={() => setQcOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ⚡ 快速创建
          </button>
        </div>
      </div>

      {qcOpen && (
        <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 flex-shrink-0">
          {/* 自然語言輸入行 */}
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

          {/* 表單欄位行 */}
          <div className="flex gap-2 items-start flex-wrap">
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
              {qcDeadlineError && (
                <p className="text-xs text-red-500 mt-1">截止日期必填</p>
              )}
            </div>

            {/* 工時 Tag */}
            <button
              onClick={() => setQcHours(HOURS_CYCLE[(HOURS_CYCLE.indexOf(qcHours) + 1) % HOURS_CYCLE.length])}
              className="px-3 py-2 bg-white border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              title="点击切换工时"
            >
              ⏱ {qcHours}h
            </button>

            {/* 重要度 Tag */}
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

      <div className="flex-1 overflow-hidden p-5">
        <div className="flex gap-4 h-full">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`flex-1 flex flex-col rounded-xl border-2 transition-all ${
                dragOver === col.id ? 'drag-over' : `${col.bg} ${col.border}`
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(col.id)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDragOver(null)
                }
              }}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countColor}`}>
                    {byStatus[col.id].length}
                  </span>
                </div>
                {byStatus[col.id].length > 0 && (
                  <span className="text-xs text-gray-400">{totalHours(col.id)}h</span>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                {byStatus[col.id].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setEditTask(task)}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setDragOver(null)
                    }}
                  />
                ))}
                {byStatus[col.id].length === 0 && (
                  <div className={`text-center text-sm py-10 ${
                    dragOver === col.id ? 'text-blue-400' : 'text-gray-300'
                  }`}>
                    {dragOver === col.id ? '放置到此处' : '暂无任务'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
