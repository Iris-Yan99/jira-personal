// @card CARD-WORKLOAD-001
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { api } from '../utils/api'
import { buildTree } from '../utils/taskTree'

const PRIORITY_BADGE = {
  P1: 'bg-red-500 text-white',
  P2: 'bg-orange-400 text-white',
  P3: 'bg-yellow-400 text-gray-800',
  P4: 'bg-gray-300 text-gray-700',
}

const WEEK_HOURS = 40    // 100% workload threshold
const WARN_HOURS = 35    // warning threshold
const COORD_WEIGHT = 0.2 // parent (coordination) task counts as 20%

// childrenMap is built from ALL active tasks so parent status is global
function calcWorkload(allTasks, memberName, childrenMap) {
  const raw = allTasks
    .filter(t => t.assignee === memberName && t.status !== 'done')
    .reduce((sum, t) => {
      const isParent = (childrenMap[t.id]?.length || 0) > 0
      return sum + (t.estimated_hours || 0) * (isParent ? COORD_WEIGHT : 1)
    }, 0)
  return Math.round(raw * 10) / 10
}

// Build a tree scoped to a specific member's task list.
// A task is a root in this column if its parent is not also in this set.
function buildMemberTree(memberTasks) {
  const ids = new Set(memberTasks.map(t => t.id))
  const childrenMap = {}
  memberTasks.forEach(t => { childrenMap[t.id] = [] })
  memberTasks.forEach(t => {
    if (t.parent_id && ids.has(t.parent_id)) {
      childrenMap[t.parent_id].push(t)
    }
  })
  const roots = memberTasks.filter(t => !t.parent_id || !ids.has(t.parent_id))
  return { roots, childrenMap }
}

function WorkloadBar({ hours }) {
  const pct = Math.min((hours / WEEK_HOURS) * 100, 100)
  const color =
    hours >= WEEK_HOURS ? 'bg-red-500' :
    hours >= WARN_HOURS ? 'bg-orange-400' :
    'bg-blue-500'
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function AssignDropdown({ allTasks, members, globalChildrenMap, onAssign, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-44 py-1"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
        指派給
      </div>
      {members.map(m => {
        const hours = calcWorkload(allTasks, m.name, globalChildrenMap)
        const isOver = hours >= WARN_HOURS
        return (
          <button
            key={m.id}
            onClick={() => onAssign(m.name)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors"
          >
            <span className="text-gray-700">👤 {m.name}</span>
            <span className={`text-xs ${isOver ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
              {hours}h{isOver ? ' ⚠️' : ''}
            </span>
          </button>
        )
      })}
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          onClick={() => onAssign('')}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
        >
          — 清除指派
        </button>
      </div>
    </div>
  )
}

function TaskCard({ task, allTasks, members, globalChildrenMap, onAssign, depth = 0 }) {
  const [open, setOpen] = useState(false)
  const isCoord = (globalChildrenMap[task.id]?.length || 0) > 0
  const effectiveHours = task.estimated_hours > 0
    ? Math.round(task.estimated_hours * (isCoord ? COORD_WEIGHT : 1) * 10) / 10
    : 0

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div
        className="relative bg-white border border-gray-100 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer select-none"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-800 leading-snug">{task.title}</span>
          <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[task.priority_level] || PRIORITY_BADGE.P4}`}>
            {task.priority_level || 'P4'}
          </span>
        </div>
        {isCoord && (
          <div className="text-xs text-purple-500 font-medium mb-0.5">📋 統籌</div>
        )}
        {task.deadline && (
          <div className="text-xs text-gray-400">📅 {task.deadline}</div>
        )}
        {task.estimated_hours > 0 && (
          <div className="text-xs text-gray-400 mt-0.5">
            ⏱ {task.estimated_hours}h
            {isCoord && (
              <span className="text-purple-400 ml-1">× 20% = {effectiveHours}h</span>
            )}
          </div>
        )}
        {task.assignee && (
          <div className="text-xs text-blue-500 mt-0.5">👤 {task.assignee}</div>
        )}
        {open && (
          <AssignDropdown
            allTasks={allTasks}
            members={members}
            globalChildrenMap={globalChildrenMap}
            onAssign={(name) => { onAssign(task.id, name); setOpen(false) }}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

function TaskTreeColumn({ memberTasks, allTasks, members, globalChildrenMap, onAssign }) {
  const { roots, childrenMap } = useMemo(() => buildMemberTree(memberTasks), [memberTasks])

  function renderNodes(tasks, depth) {
    return tasks.map(t => (
      <Fragment key={t.id}>
        <TaskCard
          task={t}
          allTasks={allTasks}
          members={members}
          globalChildrenMap={globalChildrenMap}
          onAssign={onAssign}
          depth={depth}
        />
        {childrenMap[t.id]?.length > 0 && renderNodes(childrenMap[t.id], depth + 1)}
      </Fragment>
    ))
  }

  return <>{renderNodes(roots, 0)}</>
}

export default function WorkloadView({ tasks, currentUser, onTasksChange }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {})
  }, [])

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])

  const { childrenMap: globalChildrenMap } = useMemo(() => buildTree(activeTasks), [activeTasks])

  const unassigned = useMemo(
    () => activeTasks.filter(t => !t.assignee),
    [activeTasks]
  )

  const memberWorkloads = useMemo(() => {
    return members.map(m => ({
      ...m,
      hours: calcWorkload(activeTasks, m.name, globalChildrenMap),
      tasks: activeTasks.filter(t => t.assignee === m.name),
    }))
  }, [members, activeTasks, globalChildrenMap])

  const handleAssign = async (taskId, assignee) => {
    await api.updateTask(taskId, { assignee: assignee || '' })
    onTasksChange()
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left: member workload panel */}
      <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">組員工作量</div>
        <div className="text-xs text-gray-300 mb-3">統籌任務折算 20% 工時</div>
        {memberWorkloads.map(m => (
          <div key={m.id} className="mb-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">👤 {m.name}</span>
              {m.hours >= WARN_HOURS && <span className="text-xs text-orange-500 font-bold">⚠️</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {m.tasks.length} 個任務 · {m.hours}h
            </div>
            <WorkloadBar hours={m.hours} />
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">暫無成員</div>
        )}
      </div>

      {/* Right: task columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full" style={{ minWidth: `${(memberWorkloads.length + 1) * 224}px` }}>

          {/* Unassigned column */}
          <div className="w-52 flex-shrink-0 flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-600">未指派</span>
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold">
                {unassigned.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskTreeColumn
                memberTasks={unassigned}
                allTasks={activeTasks}
                members={members}
                globalChildrenMap={globalChildrenMap}
                onAssign={handleAssign}
              />
              {unassigned.length === 0 && (
                <div className="text-xs text-gray-300 text-center py-8">全部已指派 ✓</div>
              )}
            </div>
          </div>

          {/* Per-member columns */}
          {memberWorkloads.map(m => (
            <div key={m.id} className="w-52 flex-shrink-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
                <span className="text-sm font-semibold text-gray-600">{m.name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                  {m.tasks.length}
                </span>
                {m.hours >= WARN_HOURS && (
                  <span className="text-xs text-orange-500">⚠️ {m.hours}h</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <TaskTreeColumn
                  memberTasks={m.tasks}
                  allTasks={activeTasks}
                  members={members}
                  globalChildrenMap={globalChildrenMap}
                  onAssign={handleAssign}
                />
                {m.tasks.length === 0 && (
                  <div className="text-xs text-gray-300 text-center py-8">無任務</div>
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
