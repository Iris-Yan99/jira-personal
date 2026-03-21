---
id: CARD-DOC-004
title: 前端確認表單：missing 高亮 + confidence 警告 + 回退按鈕
description: confirm step 的預填表單 UI，處理缺失字段提示、低可信度警告、回退到上一步邏輯
parent_story: US-DOC-003
parent_prd: PRD-DOC-BREAKDOWN
status: backlog
priority: medium
estimate: 2h
implementation_checklist:
  - confirm step 渲染與現有手動填寫一致的表單字段
  - missing 字段：紅色邊框 + 欄位下方「必填，請補充」提示文字
  - confidence=low 字段：黃色背景 + ⚠️ 圖標 + tooltip「AI 推斷，建議確認」
  - 「生成計劃」按鈕：缺少必填時 disabled，否則觸發現有 handleGenerate 流程
  - 左下角「← 重新分析」按鈕：清空提取結果，回到 input step（保留用戶選擇的 tab）
  - 手動填寫 tab 直接進入 confirm step（現有行為），不顯示回退按鈕
files_to_modify:
  - client/src/components/ProjectBreakdownModal.jsx
---
