---
id: "PRD-TASK-TREE-B"
title: "任務樹結構（PM 工作流）：責任人 + 進度備注 + 需協調事項"
description: "每個任務節點支持分配責任人、填寫進度備注和需協調事項，看板就地顯示摘要"
status: "draft"
pattern: discovery-driven
keyLearning: "需協調事項紅色高亮讓 PM 能在看板一眼掃描所有需介入節點，不必逐一點開 Modal"
project: jira-personal
stories:
  - US-TTB-001
  - US-TTB-002
cards:
  - CARD-TTB-001
  - CARD-TTB-002
  - CARD-TTB-003
  - CARD-TTB-004
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
depends_on: PRD-TASK-TREE-A
---

# PRD-TASK-TREE-B：PM 工作流

## 前置條件

PRD-TASK-TREE-A 已完成（需要 TaskTreeNode、childrenMap 等基礎設施）。

## 問題

任務樹有了之後，PM 還需要：知道每個任務由誰負責、了解每個節點的進度說明、快速識別哪些節點有資源協調需求。

## 目標

1. 每個任務可分配責任人（從成員列表選或手動輸入）
2. 每個任務有進度備注和需協調事項兩個文字欄位
3. 看板節點展開後就地顯示摘要（需協調事項紅色高亮）
4. SettingsView 可管理團隊成員列表

## 範圍

### 包含
- `tasks` 表新增 `assignee`、`progress_note`、`coordination_note`
- `members` 新表 + `routes/members.js` CRUD
- TaskTreeNode 顯示責任人、備注摘要
- TaskEditModal 新增「備注」Tab + 責任人 combobox
- SettingsView 新增成員管理區塊

### 不包含
- 多人分配（每任務只支持一個責任人）
- 成員頭像、Email 等欄位（只有 name）
- 通知 / 提醒功能

## 資料模型

```sql
-- tasks 新增（migration v2）
ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN progress_note TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN coordination_note TEXT DEFAULT '';

-- 成員表（migration v2）
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
```

## 責任人 Combobox 規則

- 下拉列出 `members` 表所有成員
- 允許直接輸入不在列表中的名字（自由文字）
- 輸入值儲存為 `assignee` TEXT，不強制關聯 members 表
