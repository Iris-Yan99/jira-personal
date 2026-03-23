---
id: CARD-PVG-003
title: App.jsx + Header — 新增甘特圖 tab
description: Header 加「甘特圖」tab，App.jsx 引入 GanttView 並傳入 visibleTasks
parent_story: US-PVG-002
parent_prd: PRD-PERSONAL-VIEW-GANTT
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - Header.jsx：tabs 陣列加入 { id:'gantt', label:'甘特圖' }
  - App.jsx：import GanttView
  - App.jsx：activeTab === 'gantt' && <GanttView tasks={visibleTasks} currentUser={currentUser} />
files_to_modify:
  - client/src/components/Header.jsx
  - client/src/App.jsx
---
