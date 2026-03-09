import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import KanbanBoard from './components/KanbanBoard'
import ScheduleView from './components/ScheduleView'
import ReportsView from './components/ReportsView'
import SettingsView from './components/SettingsView'
import MorningBriefing from './components/MorningBriefing'
import EveningReview from './components/EveningReview'
import { api } from './utils/api'

export default function App() {
  const [activeTab, setActiveTab] = useState('board')
  const [tasks, setTasks] = useState([])
  const [isPrioritizing, setIsPrioritizing] = useState(false)
  const [showMorning, setShowMorning] = useState(false)
  const [morningContent, setMorningContent] = useState('')
  const [showEvening, setShowEvening] = useState(false)

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.getTasks()
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handlePrioritize = async () => {
    if (tasks.length === 0) return
    setIsPrioritizing(true)
    try {
      const { priorities } = await api.prioritize(tasks)
      await Promise.all(
        priorities.map((p) =>
          api.updateTask(p.id, {
            priority_score: p.priority_score,
            priority_level: p.priority_level,
          })
        )
      )
      await loadTasks()
    } catch (err) {
      console.error('Prioritize failed:', err)
      alert('AI 优先级排序失败：' + err.message)
    } finally {
      setIsPrioritizing(false)
    }
  }

  const handleMorning = async () => {
    setShowMorning(true)
    setMorningContent('')
    try {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const pendingTasks = tasks.filter((t) => t.status !== 'done')
      const { content } = await api.morning(pendingTasks, today)
      setMorningContent(content)
    } catch (err) {
      setMorningContent('⚠️ 生成失败，请检查 Ollama 服务是否正在运行（http://localhost:11434）。\n\n错误：' + err.message)
    }
  }

  // Evening review: only show tasks that should be handled today
  const eveningTasks = (() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const pad = (n) => String(n).padStart(2, '0')
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    // End of current week (Sunday)
    const eow = new Date(now)
    eow.setDate(eow.getDate() + (7 - (eow.getDay() || 7)))
    const eowStr = `${eow.getFullYear()}-${pad(eow.getMonth() + 1)}-${pad(eow.getDate())}`
    return tasks.filter((t) => {
      if (t.status === 'done') return false
      if (t.status === 'in_progress') return true
      if (t.deadline && t.deadline <= todayStr) return true
      if ((t.priority_level === 'P1' || t.priority_level === 'P2') && t.deadline && t.deadline <= eowStr) return true
      return false
    })
  })()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onMorning={handleMorning}
        onEvening={() => setShowEvening(true)}
        onPrioritize={handlePrioritize}
        isPrioritizing={isPrioritizing}
      />

      <main className="flex-1 overflow-hidden">
        {activeTab === 'board' && (
          <div className="flex h-full">
            <div className="w-[30%] min-w-[280px] max-w-[400px] border-r border-gray-200 h-full overflow-hidden flex-shrink-0">
              <ChatPanel onTaskCreated={loadTasks} tasks={tasks} />
            </div>
            <div className="flex-1 h-full overflow-hidden">
              <KanbanBoard tasks={tasks} onTasksChange={loadTasks} />
            </div>
          </div>
        )}
        {activeTab === 'schedule' && <ScheduleView tasks={tasks} />}
        {activeTab === 'reports' && <ReportsView tasks={tasks} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {showMorning && (
        <MorningBriefing
          content={morningContent}
          onClose={() => {
            setShowMorning(false)
            setMorningContent('')
          }}
        />
      )}

      {showEvening && (
        <EveningReview
          tasks={eveningTasks}
          onClose={() => setShowEvening(false)}
          onComplete={loadTasks}
        />
      )}
    </div>
  )
}
