---
id: "PRD-TASK-CREATE-OPT"
title: "任務創建優化：單次 AI 提取 + 快速創建"
description: "優化 AI 任務助手為一輪對話完成提取，並在看板新增行內快速創建表單"
status: "draft"
pattern: discovery-driven
keyLearning: "聊天模式與快速創建應走獨立路徑，職責分離避免相互影響"
project: jira-personal
stories:
  - US-TCO-001
  - US-TCO-002
  - US-TCO-003
cards:
  - CARD-TCO-001
  - CARD-TCO-002
  - CARD-TCO-003
  - CARD-TCO-004
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PRD-TASK-CREATE-OPT：任務創建優化

## 問題

目前 AI 任務助手採用逐欄位追問的多輪對話模式，用戶需要多次來回才能創建一個任務，體驗慢且繁瑣。此外沒有快速創建路徑，無法在不使用 AI 的情況下快速新增任務。

## 目標

1. AI 對話改為單次提取：用戶一句話描述，AI 立即返回結構化任務數據
2. 在看板頁面新增行內快速創建表單，支持純手填或自然語言 AI 解析兩種路徑

## 範圍

### 包含
- 修改 `/api/ai/chat` system prompt，移除逐一追問邏輯
- 新增 `POST /api/ai/extract-task` 輕量 endpoint
- 看板頂部新增行內快速創建表單 UI
- AI 語義推算截止日期（無法推算時標紅要求手填）
- AI 語義判斷重要程度（高/中/低）

### 不包含
- ChatPanel 的 UI 改動
- 衝突檢測邏輯改動（沿用現有 `detectConflicts`）
- 其他頁面（Schedule、Reports、Settings）

## 架構決策

- `/api/ai/chat`：保留多輪對話能力，僅修改 prompt 策略為一次性提取
- `/api/ai/extract-task`：新 endpoint，無對話上下文，專用於快速創建的單次解析
- `KanbanBoard.jsx`：新增行內表單，不影響現有看板拖拽邏輯

## 默認值規則

| 欄位 | 默認值 | AI 語義覆蓋 |
|------|--------|-------------|
| `estimated_hours` | `2` | 「一小時」→ 1，「半天」→ 4 |
| `importance` | `mid` | 「重要/緊急/關鍵」→ high；「隨便/不急/低優」→ low |
| `deadline` | `null` | 「明天」→ +1天；「下週」→ +7天；無法推算 → null |

`deadline` 為 null 時，前端標紅阻止提交。
