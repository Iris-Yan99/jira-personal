---
id: US-WORKLOAD-002
title: PM 可以點擊任務卡片快速指派給組員
description: 在工作量視圖中，點擊任意任務卡片（未指派或已指派均可），出現成員 dropdown，選擇後即時更新指派人並重新整理視圖
parent_prd: PRD-WORKLOAD
cards:
  - "CARD-WORKLOAD-001"
status: backlog
acceptance_criteria:
  - 點擊任務卡片出現成員選擇 dropdown，列出所有成員（含工作量提示）
  - dropdown 包含「— 清除指派」選項
  - 選擇成員後呼叫 PUT /api/tasks/:id { assignee }，成功後重新載入任務
  - 指派後任務卡片即時移動到對應人員欄（或從未指派欄消失）
  - 點擊 dropdown 外部可關閉，不執行任何操作
  - 超載成員（>= 35h）在 dropdown 中標示警告提示
---
