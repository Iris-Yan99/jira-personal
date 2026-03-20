import { useState } from 'react'
import { api } from '../utils/api'

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const IMPORTANCE_COLORS = {
  high: 'bg-red-50 text-red-700 border-red-200',
  mid: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
}

const TABS = [
  { id: 'manual', label: '手動填寫' },
  { id: 'upload', label: '上傳文件' },
  { id: 'paste', label: '貼上文字' },
]

export default function ProjectBreakdownModal({ onClose, onImported }) {
  // step: form | parsing | confirm | loading | result
  const [step, setStep] = useState('form')
  const [inputTab, setInputTab] = useState('manual')
  const [form, setForm] = useState({ title: '', description: '', deadline: '', background: '' })
  const [extracted, setExtracted] = useState(null) // { missing, confidence }
  const [pasteText, setPasteText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({})
  const [importing, setImporting] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // ── AI extraction (shared by upload and paste) ──────────────
  const runExtraction = async (text) => {
    setStep('parsing')
    setError('')
    try {
      const meta = await api.extractProjectMeta(text)
      setForm({
        title: meta.title || '',
        description: meta.description || '',
        deadline: meta.deadline || '',
        background: meta.background || '',
      })
      setExtracted(meta)
      setStep('confirm')
    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  const handleFileUpload = async (file) => {
    setStep('parsing')
    setError('')
    try {
      const { text } = await api.parseDocument(file)
      await runExtraction(text)
    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  // ── Generate plan (shared by manual confirm and confirm step) ─
  const handleGenerate = async () => {
    if (!form.title.trim() || !form.deadline) {
      setError('請填寫項目名稱和截止日期')
      return
    }
    setError('')
    setStep('loading')
    try {
      const result = await api.breakdownProject(form)
      setPlan(result)
      const sel = {}
      result.milestones.forEach((m, mi) => {
        sel[mi] = {}
        m.tasks.forEach((_, ti) => { sel[mi][ti] = true })
      })
      setSelected(sel)
      setStep('result')
    } catch (err) {
      setError(err.message)
      setStep(extracted ? 'confirm' : 'form')
    }
  }

  // ── Task selection ────────────────────────────────────────────
  const toggleTask = (mi, ti) =>
    setSelected((s) => ({ ...s, [mi]: { ...s[mi], [ti]: !s[mi]?.[ti] } }))

  const toggleMilestone = (mi) => {
    const allOn = plan.milestones[mi].tasks.every((_, ti) => selected[mi]?.[ti])
    setSelected((s) => {
      const next = { ...s[mi] }
      plan.milestones[mi].tasks.forEach((_, ti) => { next[ti] = !allOn })
      return { ...s, [mi]: next }
    })
  }

  const selectedCount = plan
    ? plan.milestones.reduce((sum, m, mi) =>
        sum + m.tasks.filter((_, ti) => selected[mi]?.[ti]).length, 0)
    : 0

  // ── Import ────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true)
    try {
      for (let mi = 0; mi < plan.milestones.length; mi++) {
        const m = plan.milestones[mi]
        const tasksToImport = m.tasks.filter((_, ti) => selected[mi]?.[ti])
        if (tasksToImport.length === 0) continue
        const milestone = await api.createTask({
          title: m.title,
          description: m.description || '',
          deadline: m.deadline,
          estimated_hours: tasksToImport.reduce((s, t) => s + (t.estimated_hours || 2), 0),
          importance: 'high',
          task_type: 'milestone',
          status: 'todo',
          tags: [],
        })
        await Promise.all(
          tasksToImport.map((t) =>
            api.createTask({
              title: t.title,
              description: t.description || '',
              deadline: m.deadline,
              estimated_hours: t.estimated_hours || 2,
              importance: t.importance || 'mid',
              task_type: 'task',
              status: 'todo',
              parent_id: milestone.id,
              tags: [],
            })
          )
        )
      }
      onImported()
      onClose()
    } catch (err) {
      setError('導入失敗：' + err.message)
    } finally {
      setImporting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  const isMissing = (field) => extracted?.missing?.includes(field)
  const isLowConf = (field) => extracted?.confidence?.[field] === 'low'

  const fieldCls = (field) =>
    inputCls + (isMissing(field) ? ' !border-red-400 focus:!ring-red-200' : '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🚀 AI 項目拆解</h2>
            <p className="text-xs text-gray-400 mt-0.5">輸入項目信息，AI 自動生成里程碑和任務計劃</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* Tab switcher */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setInputTab(t.id); setError('') }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      inputTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Manual */}
              {inputTab === 'manual' && (
                <div className="space-y-4">
                  <Field label="項目名稱" required>
                    <input className={inputCls} placeholder="例：Q2 用戶增長計劃" value={form.title} onChange={set('title')} />
                  </Field>
                  <Field label="截止日期" required>
                    <input type="date" className={inputCls} value={form.deadline} onChange={set('deadline')} />
                  </Field>
                  <Field label="項目目標">
                    <textarea className={inputCls + ' resize-none'} rows={3} placeholder="描述項目要達成的目標（可選）" value={form.description} onChange={set('description')} />
                  </Field>
                  <Field label="背景信息">
                    <textarea className={inputCls + ' resize-none'} rows={2} placeholder="團隊、資源、限制條件等（可選）" value={form.background} onChange={set('background')} />
                  </Field>
                </div>
              )}

              {/* Upload */}
              {inputTab === 'upload' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) handleFileUpload(file)
                  }}
                  onClick={() => document.getElementById('doc-file-input').click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                    dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-3xl mb-3">📄</p>
                  <p className="text-sm font-medium text-gray-700">拖放文件到此，或點擊選擇</p>
                  <p className="text-xs text-gray-400 mt-1">支持 PDF / DOCX / TXT / MD，最大 10MB</p>
                  <input
                    id="doc-file-input"
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => { if (e.target.files[0]) handleFileUpload(e.target.files[0]) }}
                  />
                </div>
              )}

              {/* Paste */}
              {inputTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    className={inputCls + ' resize-none'}
                    rows={9}
                    placeholder="將項目實施方案文字貼入此處..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <button
                    onClick={() => runExtraction(pasteText)}
                    disabled={!pasteText.trim()}
                    className="w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    🤖 AI 分析
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}

          {/* ── PARSING STEP ── */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">AI 正在分析文件內容...</p>
              <p className="text-xs text-gray-400 mt-1">提取項目標題、截止日期等信息</p>
            </div>
          )}

          {/* ── CONFIRM STEP ── */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {extracted?.missing?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                  ⚠️ 以下必填項未能從文件中提取，請手動補充：
                  <strong> {extracted.missing.join('、')}</strong>
                </div>
              )}

              <Field label="項目名稱" required>
                <div className="relative">
                  <input
                    className={fieldCls('title')}
                    value={form.title}
                    onChange={set('title')}
                    placeholder="項目名稱"
                  />
                  {isLowConf('title') && !isMissing('title') && (
                    <span className="absolute right-2 top-2 text-yellow-500 text-xs" title="AI 推斷，建議確認">⚠️</span>
                  )}
                </div>
                {isMissing('title') && <p className="text-xs text-red-500 mt-1">必填，請補充</p>}
              </Field>

              <Field label="截止日期" required>
                <div className="relative">
                  <input
                    type="date"
                    className={fieldCls('deadline')}
                    value={form.deadline}
                    onChange={set('deadline')}
                  />
                  {isLowConf('deadline') && !isMissing('deadline') && (
                    <span className="absolute right-10 top-2 text-yellow-500 text-xs" title="AI 推斷，建議確認">⚠️</span>
                  )}
                </div>
                {isMissing('deadline') && <p className="text-xs text-red-500 mt-1">必填，請補充</p>}
              </Field>

              <Field label="項目目標">
                <textarea
                  className={`${inputCls} resize-none ${isLowConf('description') ? 'bg-yellow-50' : ''}`}
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="項目要達成的目標"
                />
              </Field>

              <Field label="背景信息">
                <textarea
                  className={`${inputCls} resize-none ${isLowConf('background') ? 'bg-yellow-50' : ''}`}
                  rows={2}
                  value={form.background}
                  onChange={set('background')}
                  placeholder="團隊、資源、限制條件等"
                />
              </Field>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}

          {/* ── LOADING STEP ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">AI 正在分析並生成項目計劃...</p>
              <p className="text-xs text-gray-400 mt-1">通常需要 10–30 秒</p>
            </div>
          )}

          {/* ── RESULT STEP ── */}
          {step === 'result' && plan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  共 <span className="font-semibold text-gray-800">{plan.milestones.length}</span> 個里程碑，
                  已選 <span className="font-semibold text-blue-600">{selectedCount}</span> 個任務
                </p>
                <button onClick={() => setStep(extracted ? 'confirm' : 'form')} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  重新生成
                </button>
              </div>

              {plan.milestones.map((m, mi) => {
                const allOn = m.tasks.every((_, ti) => selected[mi]?.[ti])
                return (
                  <div key={mi} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      className="flex items-start gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleMilestone(mi)}
                    >
                      <input type="checkbox" checked={allOn} onChange={() => toggleMilestone(mi)} onClick={(e) => e.stopPropagation()} className="mt-0.5 accent-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">M{mi + 1}</span>
                          <span className="font-semibold text-gray-800 text-sm">{m.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">截止 {m.deadline}</span>
                          {m.description && <span className="text-xs text-gray-500 truncate">{m.description}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {m.tasks.map((t, ti) => (
                        <div
                          key={ti}
                          className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${selected[mi]?.[ti] ? '' : 'opacity-50'}`}
                          onClick={() => toggleTask(mi, ti)}
                        >
                          <input type="checkbox" checked={!!selected[mi]?.[ti]} onChange={() => toggleTask(mi, ti)} onClick={(e) => e.stopPropagation()} className="mt-0.5 accent-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{t.title}</p>
                            {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${IMPORTANCE_COLORS[t.importance] || IMPORTANCE_COLORS.mid}`}>
                              {t.importance}
                            </span>
                            <span className="text-xs text-gray-400">{t.estimated_hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
          {/* Back button for confirm step */}
          {step === 'confirm' && (
            <button
              onClick={() => { setStep('form'); setExtracted(null) }}
              className="mr-auto text-xs text-gray-400 hover:text-gray-600 underline"
            >
              ← 重新分析
            </button>
          )}

          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 ml-auto">取消</button>

          {/* Manual form → generate */}
          {step === 'form' && inputTab === 'manual' && (
            <button
              onClick={handleGenerate}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              生成計劃
            </button>
          )}

          {/* Confirm step → generate */}
          {step === 'confirm' && (
            <button
              onClick={handleGenerate}
              disabled={!form.title.trim() || !form.deadline}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              生成計劃
            </button>
          )}

          {/* Result step → import */}
          {step === 'result' && (
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '導入中...' : `確認導入 ${selectedCount} 個任務`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
