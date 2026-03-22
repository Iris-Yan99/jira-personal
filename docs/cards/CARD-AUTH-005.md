---
id: CARD-AUTH-005
title: Frontend auth wiring — App.jsx + api.js + Header
description: AuthContext、啟動時 /me 檢查、api.js 加 credentials+401 攔截、Header 顯示用戶信息
parent_story: US-AUTH-003
parent_prd: PRD-USER-AUTH
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 新建 client/src/context/AuthContext.jsx：提供 currentUser state、login(user)/logout() 方法；logout 呼叫 POST /api/auth/logout
  - App.jsx：useEffect 啟動時 fetch GET /api/auth/me（credentials: include）；401 → setCurrentUser(null)；成功 → setCurrentUser(data)；currentUser 為 null → 渲染 <LoginPage onLogin={setCurrentUser} />
  - api.js：request() 函式加 credentials: 'include'；res.status === 401 時 throw error 並觸發全局登出（可用 window.dispatchEvent 或直接 import logout）
  - Header.jsx：右上角顯示 currentUser.display_name + 登出按鈕（onClick → logout）；currentUser.role === 'pm' 顯示「用戶管理」按鈕 → setShowUserManage(true)
  - App.jsx：渲染 UserManageModal（showUserManage state）
files_to_modify:
  - client/src/context/AuthContext.jsx (新建)
  - client/src/App.jsx
  - client/src/utils/api.js
  - client/src/components/Header.jsx
---
