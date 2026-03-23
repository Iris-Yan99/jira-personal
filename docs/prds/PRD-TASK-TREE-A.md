---
id: "PRD-TASK-TREE-A"
title: "任務樹結構（核心）：父子關係 + 看板樹形渲染"
description: "在任務表新增 parent_id 支持無限層級，看板以遞迴巢狀展開顯示子任務，進度由子任務自動計算"
status: "draft"
pattern: discovery-driven
keyLearning: "Flat API + 前端建樹是最低風險方案，既保留現有 AI/報告功能，又支持任意深度樹"
project: jira-personal
stories:
  - US-TTA-001
  - US-TTA-002
  - US-TTA-003
cards:
  - CARD-TTA-001
  - CARD-TTA-002
  - CARD-TTA-003
  - CARD-TTA-004
  - CARD-TTA-005
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PRD-TASK-TREE-A：任務樹結構（核心）

## 問題

Plano 只有扁平任務列表，無法表達任務間的層級依賴關係。大型項目無法拆解為可追蹤的子任務。

## 目標

1. 任務支持無限層級父子關係（`parent_id` 自引用）
2. 看板只顯示頂層任務，可展開/收起子樹
3. 父任務進度由子任務完成比例自動計算（遞迴）
4. 葉節點進度可手動設定 0-100%
5. 所有子任務完成時提示用戶確認父任務完成
6. 支持隨時 re-parent（修改 `parent_id`），防止循環引用

## 範圍

### 包含
- `tasks` 表新增 `parent_id`、`progress_percent` 欄位（migration）
- 後端 CRUD 支持新欄位
- 前端 `taskTree.js` 工具：建樹、遞迴計算進度、取子孫 ID
- KanbanBoard 遞迴渲染 `TaskTreeNode`
- TaskEditModal 新增父任務下拉（含循環引用過濾）
- 快速創建表單新增父任務選項

### 不包含（PRD-B）
- 責任人（assignee）
- 進度備注、需協調事項
- 成員管理

## 架構決策

- API 返回扁平陣列（含 `parent_id`），前端建樹，不改變 API 結構
- 進度計算：有子任務 → `done子任務數 / 總子任務數 × 100`（遞迴）；葉節點 → `progress_percent` 欄位
- 看板欄位只過濾 `parent_id IS NULL` 的任務渲染頂層
- `ON DELETE CASCADE` 確保刪除父任務時子任務一起刪除

## 數據模型

```sql
-- 新增欄位（via ALTER TABLE migration）
parent_id       INTEGER REFERENCES tasks(id) ON DELETE CASCADE  -- null = 頂層
progress_percent INTEGER DEFAULT 0                               -- 葉節點手動進度
```

## 進度計算規則

```
calcProgress(taskId):
  children = childrenMap[taskId]
  if children.length == 0:
    return tasks[taskId].progress_percent  // 葉節點手動值
  doneCount = children.filter(c => c.status === 'done').length
  return Math.round(doneCount / children.length * 100)
  // 若要加權可用 avg(calcProgress(child)) 遞迴
```
