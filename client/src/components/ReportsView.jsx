import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import ReportContent from './ReportContent'

const TYPE_LABEL = { daily: '日报', weekly: '周报', monthly: '月报' }
const TYPE_COLOR = {
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-purple-100 text-purple-700',
  monthly: 'bg-green-100 text-green-700',
}

export default function ReportsView({ tasks }) {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(null) // null | 'weekly' | 'monthly'
  const [filter, setFilter] = useState('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    const data = await api.getReports()
    setReports(data)
    if (data.length > 0 && !selected) setSelected(data[0])
  }

  const localDateStr = (d = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const generateWeekly = async () => {
    setGenerating('weekly')
    try {
      const today = new Date()
      const mon = new Date(today)
      const day = mon.getDay()
      mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
      const startDate = localDateStr(mon)
      const endDate = localDateStr(today)
      const taskLogs = await api.getTaskLogs({ days: 30 })
      const { content } = await api.weeklyReport(tasks, taskLogs, startDate, endDate)
      const r = await api.createReport({ type: 'weekly', content, date: endDate })
      await loadReports()
      setSelected(r)
    } catch (err) {
      alert('生成失败：' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const generateMonthly = async () => {
    setGenerating('monthly')
    try {
      const today = new Date()
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      const taskLogs = await api.getTaskLogs({})
      const { content } = await api.monthlyReport(tasks, taskLogs, month)
      const date = localDateStr()
      const r = await api.createReport({ type: 'monthly', content, date })
      await loadReports()
      setSelected(r)
    } catch (err) {
      alert('生成失败：' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleDelete = async (report) => {
    if (!window.confirm('确认删除这份报告？')) return
    await api.deleteReport(report.id)
    if (selected?.id === report.id) setSelected(null)
    loadReports()
  }

  const copy = (content) => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportPdf = (report) => {
    const typeLabel = TYPE_LABEL[report.type]
    const win = window.open('', '_blank')
    const escaped = report.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${typeLabel} - ${report.date}</title>
  <style>
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
      font-size: 14px;
      line-height: 1.9;
      color: #1a1a1a;
      max-width: 740px;
      margin: 48px auto;
      padding: 0 48px;
    }
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .header h1 { font-size: 18px; margin: 0; }
    .header span { font-size: 12px; color: #666; }
    pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
    @media print {
      body { margin: 0; padding: 32px 48px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${typeLabel}</h1>
    <span>${report.date}</span>
  </div>
  <pre>${escaped}</pre>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`)
    win.document.close()
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.type === filter)

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-72 flex flex-col bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800">报告中心</h2>

          {/* Generate buttons */}
          <div className="flex gap-2">
            <button
              onClick={generateWeekly}
              disabled={!!generating}
              className="flex-1 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {generating === 'weekly' ? '⏳ 生成中' : '+ 周报'}
            </button>
            <button
              onClick={generateMonthly}
              disabled={!!generating}
              className="flex-1 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {generating === 'monthly' ? '⏳ 生成中' : '+ 月报'}
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {['all', 'daily', 'weekly', 'monthly'].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-1 py-1 text-xs transition-colors ${
                  filter === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? '全部' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                selected?.id === r.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[r.type]}`}>
                  {TYPE_LABEL[r.type]}
                </span>
                <span className="text-xs text-gray-400">{r.date}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                {r.content.replace(/#+\s/g, '').substring(0, 80)}...
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-300">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">暂无报告</p>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${TYPE_COLOR[selected.type]}`}>
                  {TYPE_LABEL[selected.type]}
                </span>
                <span className="text-sm text-gray-500">{selected.date}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copy(selected.content)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copied ? '✅ 已复制' : '📋 复制'}
                </button>
                <button
                  onClick={() => exportPdf(selected)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  📄 导出 PDF
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-3xl">
                <ReportContent content={selected.content} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-300">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-gray-400">选择左侧报告查看详情</p>
              <p className="text-gray-300 text-sm mt-2">或点击「+ 周报」/「+ 月报」生成新报告</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
