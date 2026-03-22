---
id: US-AUTH-003
title: Frontend handles auth state globally with graceful 401 recovery
description: AuthContext 提供全局用戶狀態；api.js 攔截 401 自動登出；Header 顯示登入信息
parent_prd: PRD-USER-AUTH
cards:
  - CARD-AUTH-005
status: backlog
acceptance_criteria:
  - 所有 fetch 請求帶 credentials: include
  - 任何 API 返回 401 時，前端自動清除 auth 狀態並渲染 LoginPage
  - Header 右上角顯示當前用戶 display_name 和登出按鈕
  - PM 用戶 Header 顯示「用戶管理」按鈕，組員不顯示
---
