---
id: US-SCHED-001
title: User can set child task deadline within parent task boundary
description: 編輯子任務截止日期時，系統阻止設定超過父任務截止日，並提供一鍵同步更新父任務選項
parent_prd: PRD-SCHED-SMART
cards:
  - CARD-SCHED-001
  - CARD-SCHED-002
status: backlog
acceptance_criteria:
  - 子任務截止日 > 父任務截止日時，保存按鈕被阻止，顯示錯誤訊息
  - 錯誤訊息旁出現 checkbox「同步將父任務截止日更新為 {date}」
  - 勾選 checkbox 後可正常保存，父任務截止日同時更新
  - 父任務截止日提前時，顯示超出子任務清單警告（不阻斷保存）
  - 子任務無 parent_id 時不觸發任何約束
---
