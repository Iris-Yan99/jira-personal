import { useState } from 'react'
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

export default function KanbanBoard({ tasks, onTasksChange }) {
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [editTask, setEditTask] = useState(null)

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

  const totalHours = (colId) =>
    byStatus[colId].reduce((s, t) => s + (t.estimated_hours || 0), 0)

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-700">任务看板</h2>
        <span className="text-sm text-gray-400">{tasks.length} 个任务</span>
      </div>

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
