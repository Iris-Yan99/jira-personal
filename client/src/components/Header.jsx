const TABS = [
  { id: 'board', label: '看板' },
  { id: 'schedule', label: '日程' },
  { id: 'gantt', label: '甘特圖' },
  { id: 'reports', label: '报告' },
  { id: 'settings', label: '设置' },
]

export default function Header({ activeTab, setActiveTab, onMorning, onEvening, onPrioritize, isPrioritizing, onBreakdown, currentUser, onLogout, onUserManage, searchQuery, onSearchChange }) {
  return (
    <header className="bg-white border-b border-gray-200 px-5 h-14 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
            MJ
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">MyJira</span>
        </div>

        <nav className="flex gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Search box */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 搜尋任務..."
            className="w-48 pl-3 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={onBreakdown}
          className="px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
        >
          🚀 AI 拆解項目
        </button>
        <button
          onClick={onPrioritize}
          disabled={isPrioritizing}
          className="px-3 py-1.5 text-sm font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPrioritizing ? '⏳ 排序中...' : '🤖 AI 重排优先级'}
        </button>
        <button
          onClick={onMorning}
          className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
        >
          📋 今日计划
        </button>
        <button
          onClick={onEvening}
          title="記錄今日任務進度 → 自動更新任務狀態 → AI 生成日報歸檔"
          className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          🌙 晚间复盘
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* PM-only: User management */}
        {currentUser?.role === 'pm' && (
          <button
            onClick={onUserManage}
            className="px-3 py-1.5 text-sm font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            👥 用戶管理
          </button>
        )}

        {/* Current user + logout */}
        <div className="flex items-center gap-2 pl-1">
          <span className="text-sm text-gray-600 font-medium">{currentUser?.display_name}</span>
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  )
}
