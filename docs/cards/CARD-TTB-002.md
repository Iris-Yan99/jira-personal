---
id: CARD-TTB-002
title: Add members API route and SettingsView member management UI
description: 新增 routes/members.js、掛載到 server.js、SettingsView 加成員管理區塊
parent_story: US-TTB-001
parent_prd: PRD-TASK-TREE-B
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 新增 routes/members.js：
    - GET / → 返回所有成員陣列
    - POST / → 新增成員（body: { name }），name 不可為空
    - DELETE /:id → 刪除成員
  - server.js 掛載：app.use('/api/members', require('./routes/members'))
  - client/src/utils/api.js 新增：
    - getMembers: () => request('/members')
    - createMember: (name) => request('/members', json({ name }))
    - deleteMember: (id) => request('/members/' + id, { method: 'DELETE' })
  - SettingsView.jsx 新增「團隊成員」區塊：
    - useEffect 載入成員列表
    - 輸入框 + 新增按鈕（或 Enter 觸發）
    - 成員列表，每項有刪除按鈕
files_to_modify:
  - routes/members.js  (新增)
  - server.js
  - client/src/utils/api.js
  - client/src/components/SettingsView.jsx
---
