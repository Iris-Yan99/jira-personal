---
id: CARD-PVG-002
title: GanttView.jsx — 實作甘特圖組件
description: 純 CSS 甘特圖，自動時間軸，PM 依成員分組，組員看個人，進度填色，今天紅線
parent_story: US-PVG-002
parent_prd: PRD-PERSONAL-VIEW-GANTT
status: backlog
priority: high
estimate: 4h
implementation_checklist:
  - 新增 client/src/components/GanttView.jsx
  - 計算時間軸範圍：min(today, earliest created_at) → max(latest deadline) + 7天
  - 時間單位自動選擇（<45天=天, 45-120天=週, >120天=月）
  - 左側固定任務名稱欄（220px）+ 右側可橫向捲動時間軸
  - PM 模式：依 assignee 分組，插入成員標題行
  - 組員模式：直接列任務，無分組
  - 每行渲染甘特條：created_at → deadline，進度 overlay，狀態顏色
  - 今天紅色垂直線 + 標籤
  - Hover tooltip 顯示任務名稱、日期、進度
files_to_modify:
  - client/src/components/GanttView.jsx (新增)
---
