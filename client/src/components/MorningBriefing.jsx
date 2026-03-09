export default function MorningBriefing({ content, onClose }) {
  const copy = () => {
    if (content) navigator.clipboard.writeText(content)
  }

  const exportMd = () => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `morning-plan-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <h2 className="font-semibold text-gray-800">今日工作计划</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg text-xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {content ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{content}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 gap-3 text-gray-500">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">AI 正在生成今日计划...</p>
            </div>
          )}
        </div>

        {content && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end flex-shrink-0">
            <button
              onClick={copy}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📋 复制
            </button>
            <button
              onClick={exportMd}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              📄 导出 MD
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
