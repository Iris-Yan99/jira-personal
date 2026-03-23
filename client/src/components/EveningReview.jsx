import { useState } from 'react'
import { api } from '../utils/api'
import ReportContent from './ReportContent'

export default function EveningReview({ tasks, onClose, onComplete }) {
  const [logs, setLogs] = useState(
    tasks.map((task) => ({ task_id: task.id, task, progress_percent: 0, note: '', problem: '' }))
  )
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'done'
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  const updateLog = (index, field, value) => {
    setLogs((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  const STATUS_LABEL = { todo: '待办', in_progress: '进行中', done: '已完成' }

  const submit = async () => {
    setStep('loading')
    setError('')
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    try {
      // Save daily logs, sync task status, write task_logs
      await Promise.all(
        logs.map((log) => {
          const newStatus =
            log.progress_percent === 100 ? 'done'
            : log.progress_percent > 0   ? 'in_progress'
            : 'todo'
          const oldStatus = log.task.status
          const ops = [
            api.createLog({
              task_id: log.task_id,
              date: today,
              progress_percent: log.progress_percent,
              note: log.note,
            }),
            api.updateTask(log.task_id, { status: newStatus }),
            // evening_review task log
            api.createTaskLog({
              task_id: log.task_id,
              date: today,
              type: 'evening_review',
              content: `完成度 ${log.progress_percent}%${log.note ? '，备注：' + log.note : ''}${log.problem ? '，遇到的问题：' + log.problem : ''}`,
            }),
          ]
          // status_change log if status changed
          if (newStatus !== oldStatus) {
            ops.push(api.createTaskLog({
              task_id: log.task_id,
              date: today,
              type: 'status_change',
              content: `状态从「${STATUS_LABEL[oldStatus]}」变更为「${STATUS_LABEL[newStatus]}」`,
            }))
          }
          return Promise.all(ops)
        })
      )

      const taskLogs = await api.getTaskLogs({ days: 7 })
      const { content } = await api.dailyReport(logs, tasks, today, taskLogs)
      await api.createReport({ type: 'daily', content, date: today })

      setReport(content)
      setStep('done')
      onComplete()
    } catch (err) {
      setError(err.message || '生成失败，请检查 Ollama 服务')
      setStep('input')
    }
  }

  const copy = () => navigator.clipboard.writeText(report)

  const exportMd = () => {
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-report-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && step !== 'loading' && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌙</span>
            <div>
              <h2 className="font-semibold text-gray-800">晚间复盘</h2>
              <p className="text-xs text-gray-400 mt-0.5">填寫今日進度 → 自動更新任務狀態 → AI 生成日報歸檔</p>
            </div>
          </div>
          {step !== 'loading' && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xl transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'input' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">请记录今日各任务的完成情况：</p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  ⚠️ {error}
                </div>
              )}

              {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-12">今日暂无进行中的任务</div>
              ) : (
                logs.map((log, i) => (
                  <div key={log.task_id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800 text-sm">{log.task.title}</h3>
                      <span className={`text-sm font-bold ${log.progress_percent >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {log.progress_percent}%
                      </span>
                    </div>

                    <div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={log.progress_percent}
                        onChange={(e) => updateLog(i, 'progress_percent', parseInt(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <textarea
                      placeholder="进展备注（可选，如：完成了主要逻辑，待联调）"
                      value={log.note}
                      onChange={(e) => updateLog(i, 'note', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white"
                    />
                    <textarea
                      placeholder="遇到的问题 / 阻塞事项（可选，将记入任务日志）"
                      value={log.problem}
                      onChange={(e) => updateLog(i, 'problem', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50/40 focus:bg-white"
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">正在保存进度，AI 生成日报中...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-green-500 text-lg">✅</span>
                <p className="text-sm text-green-700 font-medium">进度已保存，日报已生成并归档</p>
              </div>
              <ReportContent content={report} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end flex-shrink-0">
          {step === 'input' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submit}
                disabled={logs.length === 0}
                className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
              >
                提交并生成日报
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <button onClick={copy} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                📋 复制
              </button>
              <button onClick={exportMd} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                📄 导出
              </button>
              <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
                完成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
