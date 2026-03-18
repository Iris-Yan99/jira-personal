import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function SettingsView() {
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      const member = await api.createMember(name);
      setMembers((prev) => [...prev, member]);
      setNewName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    await api.deleteMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* System info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">系统设置</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Ollama 地址', 'http://localhost:11434'],
              ['AI 模型', 'qwen3-vl:8b-instruct'],
              ['工作时间', '9:00 - 18:00'],
              ['后端端口', '3001'],
              ['前端端口', '5173'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-800 font-mono">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">数据库保存于 /data/tasks.db</p>
        </div>

        {/* Member management */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">成员管理</h2>
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入成员姓名"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              添加
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无成员</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{m.name}</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
