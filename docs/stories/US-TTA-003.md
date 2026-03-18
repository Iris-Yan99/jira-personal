---
id: US-TTA-003
title: User is prompted to complete parent task when all subtasks are done
description: 勾選最後一個子任務完成時，彈出確認提示詢問是否完成父任務
parent_prd: PRD-TASK-TREE-A
cards:
  - CARD-TTA-005
status: backlog
acceptance_criteria:
  - 勾選葉節點為 done 後，檢查其所有兄弟節點狀態
  - 若所有兄弟均為 done，彈出確認提示「所有子任務已完成，是否完成父任務？」
  - 用戶確認 → PUT /tasks/:parentId { status: 'done' }，父任務移至已完成欄
  - 用戶取消 → 父任務狀態不變，保持原欄位
  - 遞迴觸發：父任務完成後，若其父也全子完成，繼續向上彈提示
---
