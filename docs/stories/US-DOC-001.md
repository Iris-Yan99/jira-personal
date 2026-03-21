---
id: US-DOC-001
title: User can upload a document and let AI extract project metadata
description: 用戶在 ProjectBreakdownModal 選擇「上傳文件」tab，上傳 PDF/DOCX/TXT/MD 文件後，AI 自動提取項目標題、截止日期、描述和背景信息並預填表單
parent_prd: PRD-DOC-BREAKDOWN
cards:
  - CARD-DOC-001
  - CARD-DOC-002
status: backlog
acceptance_criteria:
  - 上傳 PDF、DOCX、TXT、MD 文件均可成功解析為純文字
  - 上傳過大文件（>10MB）或不支持格式時顯示錯誤提示
  - AI 提取完成後自動切換到確認表單，所有提取到的字段已預填
  - missing 字段顯示紅框 + 「必填」提示
  - confidence=low 字段顯示黃底 + ⚠️ 圖標
---
