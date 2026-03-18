---
id: US-TCO-001
title: User can describe a task and get it created in one AI interaction
description: AI 任務助手改為一次性從用戶描述提取所有欄位，不再逐欄追問
parent_prd: PRD-TASK-CREATE-OPT
cards:
  - CARD-TCO-001
status: backlog
acceptance_criteria:
  - 用戶輸入一句任務描述，AI 在單次回應中返回 TASK_READY JSON
  - 缺少 estimated_hours 時使用默認值 2
  - 缺少 importance 時 AI 從語義判斷，無法判斷則默認 mid
  - 缺少 deadline 時 AI 嘗試語義推算；無法推算則 deadline 為 null，前端提示手填
  - ChatPanel 現有 UI 和確認流程不變
---
