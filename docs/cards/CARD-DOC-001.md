---
id: CARD-DOC-001
title: 實作後端文件解析端點 POST /api/upload/parse
description: 新建 routes/upload.js，使用 multer + pdf-parse + mammoth 支持 PDF/DOCX/TXT/MD 解析，回傳純文字
parent_story: US-DOC-001
parent_prd: PRD-DOC-BREAKDOWN
status: backlog
priority: high
estimate: 3h
implementation_checklist:
  - 安裝 npm 套件：multer、pdf-parse、mammoth
  - 新建 routes/upload.js
  - 配置 multer（memoryStorage，限 10MB，過濾 MIME type）
  - 根據 MIME type 選擇解析器（pdf-parse / mammoth / 直接 toString）
  - 回傳 { text } JSON，不存檔
  - 錯誤處理：文件過大 → 413，不支持格式 → 400，解析失敗 → 422
  - 在 server.js 掛載 router 至 /api/upload
files_to_modify:
  - routes/upload.js (新建)
  - server.js
  - package.json
---
