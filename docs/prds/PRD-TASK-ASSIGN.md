---
id: "PRD-TASK-ASSIGN"
title: "任務指派"
description: "PM 可指派任務給任意用戶；組員只能認領給自己；Kanban 顯示負責人名字"
status: "draft"
pattern: requirements-first
keyLearning: "復用現有 assignee text 欄位 + members 表，最小改動，users sync to members on creation"
project: jira-personal
stories:
  - US-ASSIGN-001
  - US-ASSIGN-002
cards:
  - CARD-ASSIGN-001
  - CARD-ASSIGN-002
  - CARD-ASSIGN-003
  - CARD-ASSIGN-004
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

## Overview

任務指派功能讓 PM 可以將任務分配給團隊成員，組員可以認領任務給自己。Kanban 卡片上顯示負責人名字方便一眼看清工作分配狀況。

## Architecture

不新增 DB 欄位，沿用現有 `tasks.assignee`（text）+ `members` 表。建立用戶帳號時自動 sync 一筆 member 記錄，保持兩表一致。

**權限規則：**
- PM：可將 assignee 設為任意 member 或清空
- Member：只能將 assignee 設為自己的 display_name，或清空

**前端：**
- TaskEditModal assignee 下拉：PM 顯示全部 members，組員只顯示「無」+ 自己
- KanbanBoard 卡片右下角：顯示 assignee 名字（有值才顯示）

## Scope

- users 建立時 sync members（後端）
- tasks PUT 加 assignee 權限校驗（後端）
- TaskEditModal assignee dropdown role-filter（前端）
- KanbanBoard 卡片顯示 assignee（前端）
