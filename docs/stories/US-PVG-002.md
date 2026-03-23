---
id: US-PVG-002
title: 使用者可以在甘特圖 tab 查看任務時程
description: 新增甘特圖視圖，PM 看全局（依成員分組），組員看個人時程
parent_prd: PRD-PERSONAL-VIEW-GANTT
cards:
  - "CARD-PVG-002"
  - "CARD-PVG-003"
status: backlog
acceptance_criteria:
  - Header 出現「甘特圖」tab，點擊切換到 GanttView
  - 只有有 deadline 的任務會出現在甘特圖
  - X 軸時間範圍自動根據任務 deadline 計算（含 7 天 buffer）
  - PM 視角：任務依 assignee 分組，每組顯示成員標題行
  - 組員視角：只顯示自己的任務，無分組
  - 每條任務顯示：彩色條（created_at → deadline）+ 進度填色 overlay
  - 今天位置顯示紅色垂直線
  - 顏色：todo=灰、in_progress=藍、done=綠
---
