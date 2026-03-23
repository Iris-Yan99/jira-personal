---
id: US-WORKLOAD-001
title: PM 可以查看所有組員的工作量分布
description: PM 切換到「工作量」tab，左側看到每位組員的任務數量與預估工時，並以進度條視覺化負載程度
parent_prd: PRD-WORKLOAD
cards:
  - "CARD-WORKLOAD-001"
  - "CARD-WORKLOAD-002"
status: backlog
acceptance_criteria:
  - Header 出現「👥 工作量」tab，僅 PM 角色可見，member 看不到
  - 左側面板列出所有成員，顯示：任務數、預估工時合計、工作量進度條
  - 工時 >= 35h 進度條顯示橘色警告，>= 40h 顯示紅色 ⚠️
  - 右側顯示「未指派」欄（assignee 為空且非 done 的任務）以及各成員欄（各自未完成任務）
  - 每個任務卡片顯示：標題、優先級、截止日期
---
