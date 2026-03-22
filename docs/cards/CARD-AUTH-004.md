---
id: CARD-AUTH-004
title: LoginPage component
description: 獨立登入頁面，username + password 表單，錯誤提示
parent_story: US-AUTH-002
parent_prd: PRD-USER-AUTH
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 新建 client/src/pages/LoginPage.jsx
  - 表單：username input、password input、登入按鈕
  - 呼叫 POST /api/auth/login（credentials: include）
  - 成功 → onLogin(user) callback
  - 失敗 → 顯示錯誤訊息（帳號或密碼錯誤）
  - 樣式：置中卡片，與主 App 風格一致（Tailwind）
files_to_modify:
  - client/src/pages/LoginPage.jsx (新建)
---
