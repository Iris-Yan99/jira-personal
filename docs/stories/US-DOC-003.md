---
id: US-DOC-003
title: User can review and edit extracted fields before generating the plan
description: 確認表單顯示 AI 提取結果，用戶可修改任意字段、補填缺失必填項，確認後觸發現有拆解流程
parent_prd: PRD-DOC-BREAKDOWN
cards:
  - CARD-DOC-004
status: backlog
acceptance_criteria:
  - 確認表單與現有手動填寫表單字段一致（title、deadline、description、background）
  - 缺失必填字段（title、deadline）阻止提交並高亮提示
  - 用戶修改後點「生成計劃」正常觸發 /api/ai/breakdown-project
  - 可點「重新上傳/重新分析」回到上一步
---
