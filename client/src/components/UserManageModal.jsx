import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 focus:bg-white transition-colors'

export default function UserManageModal({ onClose }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', display_name: '', password: '', role: 'member' })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.display_name.trim() || !form.password) return
    setCreating(true)
    setError('')
    try {
      await api.createUser(form)
      setForm({ username: '', display_name: '', password: '', role: 'member' })
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const ROLE_LABEL = { pm: 'PM', member: '組員' }
  const ROLE_CLS = { pm: 'bg-blue-100 text-blue-700', member: 'bg-gray-100 text-gray-600' }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">👥 用戶管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Create user form */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">建立新帳號</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">帳號 *</label>
                  <input className={inputCls} value={form.username} onChange={set('username')} placeholder="登入帳號" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">顯示名稱 *</label>
                  <input className={inputCls} value={form.display_name} onChange={set('display_name')} placeholder="顯示名稱" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">密碼 *</label>
                  <input type="password" className={inputCls} value={form.password} onChange={set('password')} placeholder="初始密碼" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">角色</label>
                  <select className={inputCls} value={form.role} onChange={set('role')}>
                    <option value="member">組員</option>
                    <option value="pm">PM</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={creating || !form.username.trim() || !form.display_name.trim() || !form.password}
                className="w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? '建立中...' : '建立帳號'}
              </button>
            </form>
          </div>

          {/* User list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">現有帳號（{users.length}）</h3>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{u.display_name}</span>
                    <span className="text-xs text-gray-400 ml-2">@{u.username}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_CLS[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">關閉</button>
        </div>
      </div>
    </div>
  )
}
