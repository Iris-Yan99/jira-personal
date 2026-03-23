---
id: CARD-GANTT-001
title: 甘特圖左欄樹形顯示 + A2 近期過濾
description: (A1) 左欄改為可折疊樹形，父任務顯示箭頭與縮排子任務；(A2) 預設隱藏 status=todo 且 deadline > 7天 的任務，工具欄加切換按鈕
parent_story: null
parent_prd: null
status: in-progress
priority: high
estimate: 1.5h
implementation_checklist:
  - 建立 buildRows() 生成統一的扁平 rows 陣列（含 group header + task rows，遞歸處理折疊）
  - 左欄和右側 timeline 都改為 rows.map() 渲染，高度對齊
  - expandedIds state，父任務預設全展開，點箭頭折疊/展開
  - showAll state (default false)，A2 過濾邏輯，工具欄加切換按鈕
files_to_modify:
  - client/src/components/GanttView.jsx
---
