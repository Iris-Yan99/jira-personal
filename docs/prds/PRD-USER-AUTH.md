---
id: "PRD-USER-AUTH"
title: "用戶認證系統"
description: "Cookie-based session 登入、PM 建立帳號、角色管理（pm/member）"
status: "draft"
pattern: requirements-first
keyLearning: "現有 members 表保留不動，新建 users 表；tasks.assignee 遷移留給下一個子系統"
project: "*"
stories:
  - US-AUTH-001
  - US-AUTH-002
  - US-AUTH-003
cards:
  - CARD-AUTH-001
  - CARD-AUTH-002
  - CARD-AUTH-003
  - CARD-AUTH-004
  - CARD-AUTH-005
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PRD-USER-AUTH：用戶認證系統

## 目標

為 Plano 加入多用戶支持基礎：登入/登出、cookie session、PM 建立帳號、初始 admin 帳號。

## 範圍（本 PRD 只做這些）

- ✅ users 表 + bcrypt 密碼
- ✅ express-session + SQLite session store
- ✅ POST /api/auth/login、logout、GET /api/auth/me
- ✅ POST /api/auth/users（PM only）
- ✅ 所有 API 加 requireAuth middleware（401 保護）
- ✅ 前端登入頁 + 全局 auth 狀態 + 401 攔截
- ✅ PM 用戶管理 UI（建立 / 列出帳號）
- ❌ tasks.assignee → user_id 遷移（下一個子系統）
- ❌ 個人視圖、角色權限控制（下一個子系統）

## 資料庫

```sql
CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT CHECK(role IN ('pm','member')) DEFAULT 'member',
  created_at   TEXT DEFAULT (datetime('now','localtime'))
)
```

Migration: `version < 6`，建 `users` 表。首次啟動若 users 表為空，自動插入 `admin` / `admin123` / `pm`。

## 後端架構

- `routes/auth.js` — login / logout / me / 建帳號
- `middleware/requireAuth.js` — 檢查 req.session.userId，否則 401
- `server.js` — 掛 express-session（better-sqlite3-session-store）
- 所有現有 routes 加 requireAuth（除 /api/auth/login）

## 前端架構

- `client/src/pages/LoginPage.jsx` — 登入表單
- `client/src/context/AuthContext.jsx` — 全局 user state + login/logout helpers
- `App.jsx` — 啟動時 GET /api/auth/me，未登入渲染 LoginPage
- `api.js` — 所有 fetch 加 `credentials: 'include'`，401 → logout + redirect
- `Header.jsx` — 顯示登入用戶名稱 + 登出按鈕；PM 顯示「用戶管理」入口
- `UserManageModal.jsx` — PM 建立帳號（username/display_name/password/role）+ 列出現有帳號

## 依賴

- 新增 npm packages: `bcrypt`, `express-session`, `better-sqlite3-session-store`
