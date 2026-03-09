import { useState, useRef, useEffect } from 'react'
import { api } from '../utils/api'
import { detectConflicts } from '../utils/conflicts'

// Extracts the JSON object after TASK_READY: using brace matching,
// so it works regardless of position in the response or extra trailing text.
function extractTaskReady(text) {
  const idx = text.indexOf('TASK_READY:')
  if (idx === -1) return null
  const after = text.slice(idx + 'TASK_READY:'.length).trimStart()
  const start = after.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < after.length; i++) {
    if (after[i] === '{') depth++
    else if (after[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(after.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

const IMPORTANCE_LABEL = { high: '高', mid: '中', low: '低' }
const IMPORTANCE_COLOR = {
  high: 'bg-red-100 text-red-700',
  mid: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const INITIAL_MSG = {
  role: 'assistant',
  content: '你好！我是你的 AI 任务助手 👋\n\n请直接描述你想创建的任务，我会帮你整理好所有信息。\n\n例如：「下周五前完成用户认证模块的开发，预计需要 8 小时，比较重要」',
}

export default function ChatPanel({ onTaskCreated, tasks = [] }) {
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingTask, setPendingTask] = useState(null)
  // conflictInfo: null | { reasons, suggestion, suggestedDate, loading }
  const [conflictInfo, setConflictInfo] = useState(null)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingTask, conflictInfo])

  // Auto-check conflicts whenever a new pendingTask arrives
  useEffect(() => {
    if (!pendingTask) { setConflictInfo(null); return }
    const reasons = detectConflicts(pendingTask, tasks)
    if (reasons.length === 0) { setConflictInfo(null); return }
    setConflictInfo({ reasons, suggestion: '', suggestedDate: null, loading: true })
    api.conflictSuggest(pendingTask, reasons, tasks)
      .then(({ suggestion, suggestedDate }) =>
        setConflictInfo({ reasons, suggestion, suggestedDate, loading: false })
      )
      .catch(() =>
        setConflictInfo((prev) => prev ? { ...prev, suggestion: '（无法获取 AI 建议）', loading: false } : null)
      )
  }, [pendingTask]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      // Send conversation without the initial greeting
      const conversation = newMsgs
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(({ role, content }) => ({ role, content }))

      const { content } = await api.chat(conversation)

      // Robustly extract TASK_READY anywhere in the response
      const taskData = extractTaskReady(content)
      if (taskData) {
        const cleanContent = content.replace(/TASK_READY:\s*\{[\s\S]*/, '').trim()
        if (cleanContent) {
          setMessages((prev) => [...prev, { role: 'assistant', content: cleanContent }])
        }
        setPendingTask(taskData)
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content }])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ 无法连接 AI 服务，请确认 Ollama 正在运行（http://localhost:11434）。' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const doCreateTask = async (task) => {
    try {
      await api.createTask(task)
      onTaskCreated()
      const title = task.title
      setPendingTask(null)
      setConflictInfo(null)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `✅ 任务「${title}」已创建！\n\n需要继续添加其他任务吗？` },
      ])
    } catch (err) {
      console.error(err)
    }
  }

  const confirmTask = () => doCreateTask(pendingTask)

  const adoptSuggestedDate = () => {
    if (!conflictInfo?.suggestedDate) return
    const updated = { ...pendingTask, deadline: conflictInfo.suggestedDate }
    setPendingTask(updated)
    // conflictInfo will re-check via useEffect
  }

  const cancelTask = () => {
    setPendingTask(null)
    setConflictInfo(null)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '好的，我们重新来。请告诉我你的任务需求，或者告诉我需要修改哪些信息？' },
    ])
  }

  const resetChat = () => {
    setMessages([INITIAL_MSG])
    setPendingTask(null)
    setConflictInfo(null)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <h2 className="font-semibold text-sm text-gray-700">AI 任务助手</h2>
        </div>
        <button
          onClick={resetChat}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-100 rounded transition-colors"
        >
          清空
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {pendingTask && (
          <div className="chat-message bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-700">📌 请确认任务信息</p>
            <div className="space-y-2 text-sm text-gray-700">
              <Row label="标题" value={pendingTask.title} />
              {pendingTask.description && <Row label="描述" value={pendingTask.description} />}
              <Row label="截止日期" value={pendingTask.deadline} />
              <Row label="预估工时" value={`${pendingTask.estimated_hours} 小时`} />
              <div className="flex gap-2">
                <span className="text-gray-500 font-medium">重要程度</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${IMPORTANCE_COLOR[pendingTask.importance]}`}>
                  {IMPORTANCE_LABEL[pendingTask.importance] || pendingTask.importance}
                </span>
              </div>
              {pendingTask.tags?.length > 0 && <Row label="标签" value={pendingTask.tags.join('、')} />}
            </div>

            {/* Conflict warning */}
            {conflictInfo && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1">
                  ⚠️ 检测到日程冲突
                </p>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {conflictInfo.reasons.map((r, i) => (
                    <li key={i}>· {r}</li>
                  ))}
                </ul>
                {conflictInfo.loading ? (
                  <p className="text-xs text-yellow-600 italic">AI 正在生成建议...</p>
                ) : conflictInfo.suggestion ? (
                  <div className="text-xs text-yellow-800 bg-yellow-100 rounded-lg p-2 whitespace-pre-wrap">
                    {conflictInfo.suggestion}
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {conflictInfo && !conflictInfo.loading ? (
                <>
                  <button
                    onClick={confirmTask}
                    className="flex-1 py-2 bg-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    忽略继续创建
                  </button>
                  {conflictInfo.suggestedDate && (
                    <button
                      onClick={adoptSuggestedDate}
                      className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      采用建议日期
                    </button>
                  )}
                </>
              ) : conflictInfo?.loading ? (
                <button disabled className="flex-1 py-2 bg-blue-300 text-white text-sm font-medium rounded-xl opacity-60">
                  检测冲突中...
                </button>
              ) : (
                <>
                  <button
                    onClick={confirmTask}
                    className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    ✅ 确认创建
                  </button>
                  <button
                    onClick={cancelTask}
                    className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    ✏️ 重新描述
                  </button>
                </>
              )}
              {(conflictInfo && !conflictInfo.loading) && (
                <button
                  onClick={cancelTask}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="描述你的任务..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 bg-gray-50 focus:bg-white transition-colors"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm font-medium"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
