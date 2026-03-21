---
id: CARD-DOC-003
title: 前端 ProjectBreakdownModal 新增上傳文件和貼上文字 tab
description: 在現有 Modal 新增兩個輸入模式，處理 parsing 中間狀態，呼叫後端端點後切換到確認表單
parent_story: US-DOC-002
parent_prd: PRD-DOC-BREAKDOWN
status: backlog
priority: high
estimate: 4h
implementation_checklist:
  - Modal 頂部加三個 tab：手動填寫 / 上傳文件 / 貼上文字
  - 上傳文件 tab：拖放區 + 點擊選擇，接受 .pdf/.docx/.txt/.md
  - 上傳後呼叫 /api/upload/parse（multipart/form-data），再呼叫 extractProjectMeta
  - 貼上文字 tab：大 textarea + 「AI 分析」按鈕
  - 點擊「AI 分析」後呼叫 extractProjectMeta(text)
  - parsing 狀態顯示 loading spinner + 說明文字
  - 提取完成後自動切換到 confirm step，預填表單
  - 步驟狀態機：input → parsing → confirm → loading → result
files_to_modify:
  - client/src/components/ProjectBreakdownModal.jsx
---
