---
id: "PRD-SEARCH"
title: "快速搜尋任務"
description: "Header 常駐搜尋框，即時過濾所有視圖的任務"
status: "draft"
pattern: "requirements-first"
keyLearning: "searchQuery 在 App.jsx 統一管理，visibleTasks filter 一處搞定"
project: "myjira"
stories:
  - "US-SEARCH-001"
cards:
  - "CARD-SEARCH-001"
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# 快速搜尋任務

## Goal
在 Header 加入常駐搜尋框，輸入關鍵字即時過濾看板、日程、甘特圖的任務。

## Architecture
`searchQuery` state 放在 `App.jsx`，透過 prop 傳給 `Header.jsx`（控制 input）。
`visibleTasks` filter 加一層：title / description / assignee 含關鍵字（不分大小寫）。
Reports tab 不受影響，使用原始 tasks。

## Files
| 動作 | 檔案 |
|------|------|
| 修改 | `client/src/App.jsx` |
| 修改 | `client/src/components/Header.jsx` |
