---
id: "PRD-SCHED-SMART"
title: "智能排程約束：父子截止日期 + 衝突推薦空餘時間"
description: "父子任務截止日期硬約束；衝突建議日期改為確定性演算法找最近空餘時間"
status: "draft"
pattern: requirements-first
keyLearning: "衝突推薦日期應由程式碼確定性計算，AI 只負責生成說明文字"
project: "*"
stories:
  - US-SCHED-001
  - US-SCHED-002
cards:
  - CARD-SCHED-001
  - CARD-SCHED-002
  - CARD-SCHED-003
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PRD-SCHED-SMART：智能排程約束

## 目標

1. 父子任務截止日期強制約束：子任務截止日不能超過父任務，提供一鍵同步更新父任務選項
2. 衝突推薦日期改為確定性演算法：找衝突日之後最近的「空餘日」，AI 只解釋原因

## Feature 1：父子截止日期約束

### 規則

| 情況 | 行為 |
|------|------|
| 子任務 deadline > 父任務 deadline | 阻止保存，顯示行內錯誤 + 提供「同步更新父任務」選項 |
| 勾選「同步更新父任務」後保存 | 同一次 doSave 額外呼叫 `api.updateTask(parent_id, { deadline })` |
| 父任務 deadline 改早、有子任務超出 | 允許保存，但顯示超出子任務清單警告（非阻斷） |

### 實作位置

純前端 `TaskEditModal.jsx`，`tasks` 陣列已傳入可直接 lookup。

- `set('deadline', v)` 時：若有 parent_id，檢查 v > parent.deadline → 設 `deadlineError`
- `set('deadline', v)` 時（父任務情境）：掃描直接子任務，找出 deadline > v 的，設 `childDeadlineWarning`
- 新增 state：`deadlineError: null | string`、`childDeadlineWarning: string[]`、`syncParentDeadline: boolean`
- 保存前驗證：`deadlineError && !syncParentDeadline` → 阻止
- `doSave` 內：若 `syncParentDeadline`，在主 `onSave` 後額外 call `api.updateTask(parent_id, { deadline: form.deadline })`

## Feature 2：衝突推薦 — 最近空餘時間

### 空餘日定義（AC 結合）

- 當天所有未完成任務剩餘工時總和 < 10h
- 當天無同級或更高優先級任務（`PRIORITY_RANK[t.priority_level] >= PRIORITY_RANK[task.priority_level]`）

### 流程

1. `/conflict-suggest` 收到 `allTasks`、`task` 後，後端 JS 掃描從衝突日隔天起 60 天
2. 找第一個滿足「空餘日」條件的日期 → `nearestFreeDate`
3. 若 60 天內找不到，`nearestFreeDate = null`（prompt 說明無空餘日）
4. `nearestFreeDate` 硬塞進 prompt：「請使用此日期 {nearestFreeDate} 作為建議日期」
5. `suggestedDate` 直接用 `nearestFreeDate`，不再從 AI 回應 parse
