---
id: CARD-PVG-001
title: App.jsx — 計算 visibleTasks 並傳遞給所有視圖
description: 依角色過濾任務，member 只看自己的，pm 看全部；統一傳給所有 tab
parent_story: US-PVG-001
parent_prd: PRD-PERSONAL-VIEW-GANTT
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - 在 App.jsx 的 return 前計算 visibleTasks（role==='member' 過濾，否則全部）
  - 將 KanbanBoard tasks 改為 visibleTasks
  - 將 ScheduleView tasks 改為 visibleTasks
files_to_modify:
  - client/src/App.jsx
---
