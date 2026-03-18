import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '../utils/api'
import { detectConflicts } from '../utils/conflicts'
import { buildTree, getDescendantIds } from '../utils/taskTree'

const PRIORITY_COLORS = {
  P1: 'bg-red-100 text-red-700 border-red-300',
  P2: 'bg-orange-100 text-orange-700 border-orange-300',
  P3: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  P4: 'bg-gray-100 text-gray-600 border-gray-300',
}

const LOG_TYPE = {
  manual:         { label: '手动记录', cls: 'bg-blue-100 text-blue-700' },
  evening_review: { label: '晚间复盘', cls: 'bg-orange-100 text-orange-700' },
  status_change:  { label: '状态变更', cls: 'bg-gray-100 text-gray-600' },
}

const STATUS_LABEL = { todo: '待办', in_progress: '进行中', done: '已完成' }

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const localDateStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function TaskEditModal({ task, tasks = [], onClose, onSave, onDelete }) {
  const [activeTab, setActiveTab] = useState('info')

  // ── Info tab state ──────────────────────────────────────────
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    deadline: task.deadline || '',
    estimated_hours: task.estimated_hours ?? 1,
    importance: task.importance || 'mid',
    status: task.status || 'todo',
    priority_level: task.priority_level || 'P4',
    tags: Array.isArray(task.tags) ? task.tags.join(', ') : '',
    parent_id: task.parent_id || null,
    assignee: task.assignee || '',
    progress_percent: task.progress_percent ?? 0,
  })

  // ── Notes tab state ──────────────────────────────────────────
  const [progressNote, setProgressNote] = useState(task.progress_note || '')
  const [coordinationNote, setCoordinationNote] = useState(task.coordination_note || '')

  // ── Members for assignee datalist ───────────────────────────
  const [members, setMembers] = useState([])
  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {})
  }, [])

  // ── Dependency state ─────────────────────────────────────────
  const [localBlockers, setLocalBlockers] = useState(task.blockers || [])
  const pendingAdd = useRef(new Set())
  const pendingRemove = useRef(new Set())

  const addBlocker = (blockerId) => {
    const blocker = tasks.find(t => t.id === blockerId)
    if (!blocker || localBlockers.find(b => b.id === blockerId)) return
    setLocalBlockers(prev => [...prev, {
      id: blocker.id, title: blocker.title, status: blocker.status, deadline: blocker.deadline,
    }])
    pendingAdd.current.add(blockerId)
    pendingRemove.current.delete(blockerId)
  }

  const removeBlocker = (blockerId) => {
    setLocalBlockers(prev => prev.filter(b => b.id !== blockerId))
    pendingRemove.current.add(blockerId)
    pendingAdd.current.delete(blockerId)
  }

  const { childrenMap } = useMemo(() => buildTree(tasks), [tasks])
  const descendantIds = useMemo(() => getDescendantIds(task.id, childrenMap), [task.id, childrenMap])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Conflict state: null | { reasons, suggestion, suggestedDate, loading }
  const [conflict, setConflict] = useState(null)

  // ── Logs tab state ──────────────────────────────────────────
  const [taskLogs, setTaskLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [newLogContent, setNewLogContent] = useState('')
  const [addingLog, setAddingLog] = useState(false)

  useEffect(() => {
    if (activeTab === 'logs') loadLogs()
  }, [activeTab])

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const data = await api.getTaskLogs({ task_id: task.id })
      setTaskLogs(data)
    } finally {
      setLogsLoading(false)
    }
  }

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }))
    // Clear conflict warning if deadline or hours change
    if (key === 'deadline' || key === 'estimated_hours' || key === 'priority_level') {
      setConflict(null)
    }
  }

  const doSave = async () => {
    setSaving(true)
    if (form.status !== task.status) {
      await api.createTaskLog({
        task_id: task.id,
        date: localDateStr(),
        type: 'status_change',
        content: `状态从「${STATUS_LABEL[task.status]}」变更为「${STATUS_LABEL[form.status]}」`,
      })
    }
    // Sync pending dependency changes
    const addPromises = [...pendingAdd.current].map(id =>
      api.addDependency(task.id, id).catch(e => {
        if (e.message.includes('Circular')) alert('無法添加前置任務：存在循環依賴')
      })
    )
    const removePromises = [...pendingRemove.current].map(id =>
      api.removeDependency(task.id, id)
    )
    await Promise.all([...addPromises, ...removePromises])
    pendingAdd.current.clear()
    pendingRemove.current.clear()

    await onSave({
      ...form,
      title: form.title.trim(),
      estimated_hours: parseFloat(form.estimated_hours) || 1,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      parent_id: form.parent_id || null,
      clear_parent: form.parent_id === null,
      progress_note: progressNote,
      coordination_note: coordinationNote,
    })
    setSaving(false)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return

    // If conflict already shown and user is clicking save again → means "忽略继续保存"
    if (conflict && !conflict.loading) {
      await doSave()
      return
    }

    // First click: check conflicts
    const reasons = detectConflicts(
      { ...form, estimated_hours: parseFloat(form.estimated_hours) || 1 },
      tasks,
      task.id
    )
    if (reasons.length === 0) {
      await doSave()
      return
    }

    // Show conflict warning and fetch AI suggestion
    setConflict({ reasons, suggestion: '', suggestedDate: null, loading: true })
    try {
      const { suggestion, suggestedDate } = await api.conflictSuggest(
        { ...form, title: form.title, estimated_hours: parseFloat(form.estimated_hours) || 1 },
        reasons,
        tasks
      )
      setConflict({ reasons, suggestion, suggestedDate, loading: false })
    } catch {
      setConflict({ reasons, suggestion: '（无法获取 AI 建议）', suggestedDate: null, loading: false })
    }
  }

  const adoptSuggestedDate = () => {
    if (!conflict?.suggestedDate) return
    set('deadline', conflict.suggestedDate)
  }

  const handleDelete = async () => {
    if (!window.confirm(`确认删除任务「${task.title}」？`)) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const addLog = async () => {
    const content = newLogContent.trim()
    if (!content) return
    setAddingLog(true)
    await api.createTaskLog({ task_id: task.id, date: localDateStr(), type: 'manual', content })
    setNewLogContent('')
    await loadLogs()
    setAddingLog(false)
  }

  const exportLogsPdf = () => {
    const IMPORTANCE = { high: '高', mid: '中', low: '低' }
    const win = window.open('', '_blank')
    const logsHtml = taskLogs.map((log, i) => {
      const t = LOG_TYPE[log.type] || LOG_TYPE.manual
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
      return `
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #e5e7eb;background:${bg}">
          <div style="min-width:90px;color:#6b7280;font-size:12px;padding-top:2px">${log.date}</div>
          <div style="flex:1">
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${
              log.type === 'manual' ? '#dbeafe' : log.type === 'evening_review' ? '#fed7aa' : '#f3f4f6'
            };color:${
              log.type === 'manual' ? '#1d4ed8' : log.type === 'evening_review' ? '#c2410c' : '#4b5563'
            }">${t.label}</span>
            <p style="margin:6px 0 0;color:#374151;font-size:13px;line-height:1.6">${log.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
          </div>
        </div>`
    }).join('')

    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>任务日志 - ${task.title}</title>
<style>
  body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:720px;margin:40px auto;padding:0 40px;color:#111}
  h1{font-size:20px;margin-bottom:4px} .meta{color:#6b7280;font-size:13px;margin-bottom:24px}
  h2{font-size:15px;font-weight:600;margin:20px 0 8px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  @media print{body{margin:0;padding:28px 40px}}
</style></head><body>
  <h1>${task.title}</h1>
  <div class="meta">
    截止：${task.deadline || '无'} · 预估 ${task.estimated_hours}h ·
    重要度：${IMPORTANCE[task.importance] || '-'} · 优先级：${task.priority_level || '-'}
  </div>
  ${task.description ? `<p style="color:#4b5563;font-size:13px;margin-bottom:20px">${task.description}</p>` : ''}
  <h2>任务日志时间线（共 ${taskLogs.length} 条）</h2>
  ${logsHtml || '<p style="color:#9ca3af">暂无日志记录</p>'}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`)
    win.document.close()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-4 pb-0 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 truncate pr-4">{task.title}</h2>
            <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl">×</button>
          </div>
          {/* Tabs */}
          <div className="flex gap-0">
            {[{ id: 'info', label: '基本信息' }, { id: 'notes', label: '备注' }, { id: 'logs', label: '日志' }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Info Tab ── */}
        {activeTab === 'info' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <Field label="标题 *">
                <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="任务标题" />
              </Field>
              <Field label="父任務">
                <select
                  value={form.parent_id || ''}
                  onChange={(e) => set('parent_id', e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                >
                  <option value="">— 無（頂層任務）—</option>
                  {tasks
                    .filter((t) => t.id !== task.id && !descendantIds.has(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))
                  }
                </select>
              </Field>
              <Field label="描述">
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="详细描述（可选）" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="截止日期">
                  <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputCls} />
                </Field>
                <Field label="预估工时 (小时)">
                  <input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={(e) => set('estimated_hours', e.target.value)} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="重要程度">
                  <select value={form.importance} onChange={(e) => set('importance', e.target.value)} className={inputCls}>
                    <option value="high">高</option>
                    <option value="mid">中</option>
                    <option value="low">低</option>
                  </select>
                </Field>
                <Field label="状态">
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                    <option value="todo">待办</option>
                    <option value="in_progress">进行中</option>
                    <option value="done">已完成</option>
                  </select>
                </Field>
              </div>
              <Field label="优先级">
                <div className="flex gap-2">
                  {['P1', 'P2', 'P3', 'P4'].map((p) => (
                    <button key={p} onClick={() => set('priority_level', p)}
                      className={`flex-1 py-1.5 text-sm rounded-lg border font-bold transition-all ${
                        form.priority_level === p ? PRIORITY_COLORS[p] : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="标签（逗号分隔）">
                <input type="text" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="开发, 会议, 文档" className={inputCls} />
              </Field>
              <Field label="负责人">
                <input
                  type="text"
                  list="members-list"
                  value={form.assignee}
                  onChange={(e) => set('assignee', e.target.value)}
                  placeholder="输入或选择成员"
                  className={inputCls}
                />
                <datalist id="members-list">
                  {members.map((m) => <option key={m.id} value={m.name} />)}
                </datalist>
              </Field>
              {(childrenMap[task.id] || []).length === 0 && (
                <Field label={`进度 (${form.progress_percent}%)`}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.progress_percent}
                    onChange={(e) => set('progress_percent', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </Field>
              )}

              <Field label="前置任務（Blocked By）">
                <div className="space-y-2">
                  {localBlockers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {localBlockers.map(b => (
                        <span
                          key={b.id}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                            b.status === 'done'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-yellow-50 border-yellow-300 text-yellow-800'
                          }`}
                        >
                          {b.status === 'done' ? '✓' : '⏳'} {b.title}
                          <button
                            type="button"
                            onClick={() => removeBlocker(b.id)}
                            className="ml-0.5 text-gray-400 hover:text-red-500 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={e => { if (e.target.value) addBlocker(Number(e.target.value)) }}
                    className={inputCls}
                  >
                    <option value="">＋ 添加前置任務...</option>
                    {tasks
                      .filter(t =>
                        t.id !== task.id &&
                        !descendantIds.has(t.id) &&
                        !localBlockers.find(b => b.id === t.id)
                      )
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))
                    }
                  </select>
                </div>
              </Field>

              {/* Conflict warning */}
              {conflict && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">
                    ⚠️ 检测到日程冲突
                  </p>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    {conflict.reasons.map((r, i) => (
                      <li key={i}>· {r}</li>
                    ))}
                  </ul>
                  {conflict.loading ? (
                    <p className="text-xs text-yellow-600 italic">AI 正在生成建议...</p>
                  ) : conflict.suggestion ? (
                    <div className="text-xs text-yellow-800 bg-yellow-100 rounded-lg p-2 whitespace-pre-wrap">
                      {conflict.suggestion}
                    </div>
                  ) : null}
                  {!conflict.loading && conflict.suggestedDate && (
                    <button
                      onClick={adoptSuggestedDate}
                      className="w-full py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      采用建议日期 ({conflict.suggestedDate})
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                {deleting ? '删除中...' : '🗑 删除'}
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || conflict?.loading}
                  className={`px-5 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors font-medium ${
                    conflict && !conflict.loading
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? '保存中...' : conflict && !conflict.loading ? '忽略继续保存' : '保存'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Notes Tab ── */}
        {activeTab === 'notes' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  进度备注
                </label>
                <textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  rows={5}
                  placeholder="当前进展说明..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                  需协调事项
                </label>
                <textarea
                  value={coordinationNote}
                  onChange={(e) => setCoordinationNote(e.target.value)}
                  rows={5}
                  placeholder="需要项目经理协调的事项..."
                  className={`${inputCls} resize-none border-red-200 focus:ring-red-300`}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button
                onClick={doSave}
                disabled={saving}
                className="px-5 py-2 text-sm rounded-lg disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        )}

        {/* ── Logs Tab ── */}
        {activeTab === 'logs' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {logsLoading && (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">加载中...</div>
              )}
              {!logsLoading && taskLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">暂无日志记录</p>
                </div>
              )}
              {!logsLoading && taskLogs.map((log) => {
                const t = LOG_TYPE[log.type] || LOG_TYPE.manual
                return (
                  <div key={log.id} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-[80px] text-xs text-gray-400 pt-0.5">{log.date}</div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1 ${t.cls}`}>
                        {t.label}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{log.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add log + export */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLogContent}
                  onChange={(e) => setNewLogContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLog()}
                  placeholder="手动添加日志记录..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                />
                <button
                  onClick={addLog}
                  disabled={addingLog || !newLogContent.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
                >
                  {addingLog ? '...' : '添加'}
                </button>
              </div>
              <button
                onClick={exportLogsPdf}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                📄 导出日志 PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
