---
id: CARD-SEARCH-001
title: 實作 Header 搜尋框 + visibleTasks 過濾
description: App.jsx 加 searchQuery state，Header 加 input，visibleTasks 加 keyword filter
parent_story: US-SEARCH-001
parent_prd: PRD-SEARCH
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - App.jsx 加 searchQuery state + onSearchChange handler
  - visibleTasks filter 加 keyword 過濾（title/description/assignee）
  - Header.jsx 加搜尋 input + × 清除按鈕，接收 searchQuery/onSearchChange props
files_to_modify:
  - client/src/App.jsx
  - client/src/components/Header.jsx
---
