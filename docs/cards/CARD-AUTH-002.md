---
id: CARD-AUTH-002
title: Backend auth routes + session middleware + requireAuth
description: routes/auth.js、middleware/requireAuth.js、server.js 掛 express-session
parent_story: US-AUTH-001
parent_prd: PRD-USER-AUTH
status: backlog
priority: high
estimate: 3h
implementation_checklist:
  - 安裝：npm install express-session better-sqlite3-session-store
  - server.js：在所有路由前掛 express-session（secret 從 SESSION_SECRET env 讀，預設 'dev-secret'，maxAge 7天，store=SqliteStore）
  - 新建 middleware/requireAuth.js：if (!req.session.userId) return res.status(401).json({error:'Unauthorized'})
  - 新建 routes/auth.js：
    - POST /login：查 users by username，bcrypt.compare，成功則 req.session.userId=user.id，返回 {id,username,display_name,role}
    - POST /logout：req.session.destroy()，返回 {success:true}
    - GET /me：requireAuth，查 users by req.session.userId，返回 {id,username,display_name,role}
    - POST /users：requireAuth + requirePM，建新用戶（bcrypt hash password）
  - server.js：app.use('/api/auth', authRouter)；其餘所有 /api/* 路由前加 requireAuth
files_to_modify:
  - server.js
  - routes/auth.js (新建)
  - middleware/requireAuth.js (新建)
  - package.json
---
