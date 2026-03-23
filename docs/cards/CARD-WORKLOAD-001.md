---
id: CARD-WORKLOAD-001
title: 實作 WorkloadView.jsx — 工作量視圖主元件
description: 新增 WorkloadView 元件，包含左側成員工作量面板、右側任務欄（未指派 + 各人），以及點擊指派 dropdown
parent_story: US-WORKLOAD-001
parent_prd: PRD-WORKLOAD
status: backlog
priority: high
estimate: 3h
implementation_checklist:
  - 建立 client/src/components/WorkloadView.jsx
  - 左側面板：api.getMembers() 取成員，計算各人 sum(estimated_hours) 排除 done 任務
  - 工作量條：(totalHours / 40) * 100%，>= 35h 橘色，>= 40h 紅色 ⚠️
  - 右側面板：水平滾動列，第一欄「未指派」，後續每人一欄
  - 任務卡片：顯示 title、priority_level badge、deadline
  - 點擊任務卡片 → 開啟 AssignDropdown（inline state: openCardId）
  - AssignDropdown：列出所有成員 + 各人工時提示 + 清除指派選項
  - 選擇後呼叫 api.updateTask(taskId, { assignee }) → onTasksChange()
  - 點擊 dropdown 外部關閉（useEffect + mousedown listener）
files_to_modify:
  - client/src/components/WorkloadView.jsx (新增)
---
