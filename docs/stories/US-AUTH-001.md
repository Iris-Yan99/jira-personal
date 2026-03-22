---
id: US-AUTH-001
title: User can log in with username and password
description: 任何人打開應用先看到登入頁，輸入帳號密碼後進入主介面；未登入無法存取任何 API
parent_prd: PRD-USER-AUTH
cards:
  - CARD-AUTH-001
  - CARD-AUTH-002
status: backlog
acceptance_criteria:
  - 未登入時所有 /api/* 路由返回 401（除 /api/auth/login）
  - 前端啟動時調用 GET /api/auth/me，401 則渲染 LoginPage
  - 登入成功後渲染主 App，顯示登入用戶的 display_name
  - 登出後清除 session，返回登入頁
  - 密碼用 bcrypt hash 儲存，不明文
---
