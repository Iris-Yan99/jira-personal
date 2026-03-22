---
id: CARD-ASSIGN-004
title: TaskEditModal assignee 下拉按角色 filter
description: PM 看全部 members，組員只看「無」和自己
parent_story: US-ASSIGN-002
parent_prd: PRD-TASK-ASSIGN
status: backlog
priority: high
estimate: 1h
implementation_checklist:
  - TaskEditModal.jsx import useAuth，取得 currentUser
  - assignee 下拉選單的 members 列表：
    - PM：顯示所有 members（現有邏輯不變）
    - Member：filter 只保留 display_name === currentUser.display_name 的項目
  - 選項包含空字串選項「無人負責」
files_to_modify:
  - client/src/components/TaskEditModal.jsx
---
