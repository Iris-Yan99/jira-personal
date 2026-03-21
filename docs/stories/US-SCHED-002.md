---
id: US-SCHED-002
title: User sees deterministic free-slot suggestion when conflict detected
description: 衝突推薦日期由演算法確定性計算（工時 < 10h 且無同級以上任務），不依賴 AI 猜測
parent_prd: PRD-SCHED-SMART
cards:
  - CARD-SCHED-003
status: backlog
acceptance_criteria:
  - 推薦日期為衝突日隔天起第一個滿足條件的空餘日
  - 空餘日條件：當天剩餘工時 < 10h AND 無同級或更高優先級任務
  - AI 說明文字仍然顯示，但 suggestedDate 來自演算法而非 AI parse
  - 60 天內無空餘日時，AI 說明中告知無法推薦具體日期
---
