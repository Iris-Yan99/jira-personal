---
id: "PRD-WORKLOAD"
title: "PM 工作量視圖與快速任務分配"
description: "新增 👥 工作量 tab（PM 專用），左側組員工作量條，右側未指派任務池 + 各人任務欄，點擊任務卡片即可選人指派"
status: "draft"
pattern: "requirements-first"
keyLearning: "純前端計算工作量，不需新後端；點擊 dropdown 指派比拖拉實作成本低 60% 且功能等價"
project: "myjira"
stories:
  - "US-WORKLOAD-001"
  - "US-WORKLOAD-002"
cards:
  - "CARD-WORKLOAD-001"
  - "CARD-WORKLOAD-002"
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
---

# PM 工作量視圖與快速任務分配

## Goal

讓 PM 在一個視圖內同時看到所有組員的工作量分布與未指派任務，點擊即可完成分配，無需逐一開啟任務編輯彈窗。

## Architecture

**無需新後端端點**，全部使用現有 API：
- `GET /api/tasks` — 取得所有任務
- `PUT /api/tasks/:id { assignee }` — 更新指派人
- `GET /api/members` — 取得成員清單

`WorkloadView.jsx` 為純展示元件，所有工作量計算在前端完成。
PM 角色控制：Header.jsx 中 `工作量` tab 僅在 `currentUser.role === 'pm'` 時顯示。

## Layout

```
左側面板 (220px)            右側面板 (flex)
─────────────────    ────────────────────────────────────
組員工作量清單        未指派 (N) | Alice (M) | Carol (K) …
  👤 Alice  65%      ┌──────────┬───────────┬──────────┐
  👤 Bob   ⚠️ 超載   │ ●任務A   │ ●任務C    │ ●任務E   │
  👤 Carol  30%      │ ●任務B   │           │          │
  👤 David  15%      │ ●任務D   │ ← 點擊出現dropdown → │
                     └──────────┴───────────┴──────────┘
```

## Data

| 欄位 | 來源 | 說明 |
|------|------|------|
| 未指派任務 | `tasks.filter(t => !t.assignee && t.status !== 'done')` | 右側第一欄 |
| 各人任務 | `tasks.filter(t => t.assignee === name && t.status !== 'done')` | 各人欄位 |
| 工作量小時 | `sum(estimated_hours)` 排除 done | 工作量條數值 |
| 警告閾值 | `>= 35h` 顯示橘色，`>= 40h` 顯示紅色 ⚠️ | 視覺提示 |

## Files

| 動作 | 檔案 |
|------|------|
| 新增 | `client/src/components/WorkloadView.jsx` |
| 修改 | `client/src/components/Header.jsx` |
| 修改 | `client/src/App.jsx` |
