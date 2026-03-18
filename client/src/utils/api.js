const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(BASE + url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const json = (data) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const api = {
  // Tasks
  getTasks: () => request('/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', json(data)),
  updateTask: (id, data) => request(`/tasks/${id}`, { ...json(data), method: 'PUT' }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/logs${q ? '?' + q : ''}`);
  },
  createLog: (data) => request('/logs', json(data)),

  // Reports
  getReports: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports${q ? '?' + q : ''}`);
  },
  createReport: (data) => request('/reports', json(data)),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

  // Task logs
  getTaskLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/task-logs${q ? '?' + q : ''}`);
  },
  createTaskLog: (data) => request('/task-logs', json(data)),

  // AI
  chat: (messages) => request('/ai/chat', json({ messages })),
  prioritize: (tasks) => request('/ai/prioritize', json({ tasks })),
  morning: (tasks, date) => request('/ai/morning', json({ tasks, date })),
  dailyReport: (logs, tasks, date, taskLogs) => request('/ai/daily-report', json({ logs, tasks, date, taskLogs })),
  weeklyReport: (tasks, taskLogs, startDate, endDate) => request('/ai/weekly-report', json({ tasks, taskLogs, startDate, endDate })),
  monthlyReport: (tasks, taskLogs, month) => request('/ai/monthly-report', json({ tasks, taskLogs, month })),
  conflictSuggest: (task, conflicts, allTasks) => request('/ai/conflict-suggest', json({ task, conflicts, allTasks })),
  extractTask: (description) => request('/ai/extract-task', json({ description })),

  // Members
  getMembers: () => request('/members'),
  createMember: (name) => request('/members', json({ name })),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),

  // Dependencies
  addDependency: (taskId, dependsOnId) =>
    request('/dependencies', json({ task_id: taskId, depends_on_id: dependsOnId })),
  removeDependency: (taskId, dependsOnId) =>
    request('/dependencies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, depends_on_id: dependsOnId }),
    }),
};
