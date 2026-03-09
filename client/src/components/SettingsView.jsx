export default function SettingsView() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-96 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-6">⚙️ 系统设置</h2>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Ollama 地址</span>
            <span className="text-gray-800 font-mono">http://localhost:11434</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">AI 模型</span>
            <span className="text-gray-800 font-mono">qwen3-vl:8b-instruct</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">工作时间</span>
            <span className="text-gray-800">9:00 - 18:00</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">后端端口</span>
            <span className="text-gray-800 font-mono">3001</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-gray-500">前端端口</span>
            <span className="text-gray-800 font-mono">5173</span>
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-400 text-center">数据库保存于 /data/tasks.db</p>
      </div>
    </div>
  )
}
