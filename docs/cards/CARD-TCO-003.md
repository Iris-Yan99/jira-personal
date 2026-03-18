---
id: CARD-TCO-003
title: Add extractTask() method to api.js
description: 前端 API client 新增對 /api/ai/extract-task 的調用方法
parent_story: US-TCO-003
parent_prd: PRD-TASK-CREATE-OPT
status: backlog
priority: medium
estimate: 0.5h
implementation_checklist:
  - 在 client/src/utils/api.js 新增 extractTask(description) 方法
  - POST /api/ai/extract-task，body: { description }
  - 返回 { title, deadline, estimated_hours, importance }
files_to_modify:
  - client/src/utils/api.js
---
