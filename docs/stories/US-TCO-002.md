---
id: US-TCO-002
title: User can quick-create a task from the Kanban board without using the chat panel
description: 看板頂部新增行內快速創建表單，標題+截止必填，其他有默認值
parent_prd: PRD-TASK-CREATE-OPT
cards:
  - CARD-TCO-003
  - CARD-TCO-004
status: backlog
acceptance_criteria:
  - 看板頁面頂部顯示「⚡ 快速創建」按鈕
  - 點擊後展開行內表單，含標題、截止日期、工時 tag（默認 2h）、重要度 tag（默認中）
  - 截止日期為空時「創建」按鈕 disabled 並標紅提示
  - 創建成功後表單收起，看板任務列表刷新
  - 點「取消」或按 Escape 收起表單
---
