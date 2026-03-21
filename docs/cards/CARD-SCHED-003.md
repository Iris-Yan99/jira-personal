---
id: CARD-SCHED-003
title: Compute nearestFreeDate in conflict-suggest endpoint
description: 後端 JS 演算法找衝突日後最近空餘日，hardcode 進 prompt，suggestedDate 直接用演算法結果
parent_story: US-SCHED-002
parent_prd: PRD-SCHED-SMART
status: backlog
priority: high
estimate: 2h
implementation_checklist:
  - 在 /conflict-suggest 中建立 dailyLoad map：{ [date]: { totalRemaining, maxPriorityRank } }
  - 遍歷 allTasks（status != done），累計 remainingHours 和最高 priority rank 到對應 deadline date
  - 從 task.deadline 隔天起掃描 60 天，找第一個滿足條件的日期：dailyLoad[date].totalRemaining < 10 && dailyLoad[date].maxPriorityRank < taskRank（或該日無任務）
  - 結果為 nearestFreeDate（找不到則 null）
  - prompt 注入：若有 nearestFreeDate，強制寫入「建議使用日期：{nearestFreeDate}」；若無則說明「近期無空餘日，請酌情調整」
  - res.json 中 suggestedDate 直接用 nearestFreeDate，移除原本從 AI 回應 regex parse 的邏輯
files_to_modify:
  - routes/ai.js
---
