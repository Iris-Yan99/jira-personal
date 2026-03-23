---
id: CARD-WORKLOAD-002
title: Header + App.jsx 接入工作量 tab
description: Header 新增「👥 工作量」tab 僅 PM 可見；App.jsx 渲染 WorkloadView 並傳入 tasks、currentUser、onTasksChange
parent_story: US-WORKLOAD-001
parent_prd: PRD-WORKLOAD
status: backlog
priority: high
estimate: 0.5h
implementation_checklist:
  - Header.jsx：TABS 改為動態（依 currentUser.role 過濾），加入 { id:'workload', label:'👥 工作量' }
  - 或在 nav 渲染時加條件：workload tab 只在 currentUser?.role === 'pm' 時渲染
  - App.jsx：import WorkloadView，在 main 區塊加 {activeTab === 'workload' && <WorkloadView tasks={tasks} currentUser={currentUser} onTasksChange={loadTasks} />}
files_to_modify:
  - client/src/components/Header.jsx
  - client/src/App.jsx
---
