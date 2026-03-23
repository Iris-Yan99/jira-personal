---
id: "PRD-PERSONAL-VIEW-GANTT"
title: "個人視圖 + 甘特圖"
description: "組員自動只看自己的任務；新增甘特圖 tab，PM 看全局依成員分組，組員看個人時程"
status: "draft"
pattern: "requirements-first"
keyLearning: "視圖過濾在前端 visibleTasks 一處控制，所有 tab 共用，不需後端改動"
project: "myjira"
stories:
  - "US-PVG-001"
  - "US-PVG-002"
cards:
  - "CARD-PVG-001"
  - "CARD-PVG-002"
  - "CARD-PVG-003"
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# 個人視圖 + 甘特圖

## Goal

讓組員登入後只看到指派給自己的任務（不需手動過濾）；同時新增甘特圖視圖，PM 可看全局時程，組員可看個人時程。

## Architecture

**個人視圖：** `App.jsx` 計算 `visibleTasks`：
- `currentUser.role === 'member'` → `tasks.filter(t => t.assignee === currentUser.display_name)`
- `currentUser.role === 'pm'` → 全部 tasks

`visibleTasks` 統一傳給 KanbanBoard、ScheduleView、GanttView。無後端改動。

**甘特圖：** 新增 `GanttView.jsx` 組件 + Header 加「甘特圖」tab。

## GanttView 規格

- **資料來源**：`visibleTasks`（已依角色過濾），只顯示有 deadline 的任務
- **時間軸**：自動從 `min(今天, 最早 created_at)` 到 `max(最晚 deadline) + 7天 buffer`
- **時間單位**：跨度 < 45天 → 天；45–120天 → 週；> 120天 → 月
- **PM 視角**：依 assignee 分組，顯示成員標題行
- **組員視角**：直接列個人任務（無分組）
- **每行**：左側固定任務名稱欄 + 右側彩色條（created_at → deadline）+ 進度填色 overlay
- **今天標記**：紅色垂直線
- **顏色**：todo=灰、in_progress=藍、done=綠
- **實作**：純 CSS 百分比計算，不引入外部 library

## Files

| 動作 | 檔案 |
|------|------|
| 修改 | `client/src/App.jsx` |
| 修改 | `client/src/components/Header.jsx` |
| 新增 | `client/src/components/GanttView.jsx` |
