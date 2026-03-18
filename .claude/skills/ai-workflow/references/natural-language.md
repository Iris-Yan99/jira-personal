# Natural Language Optimization

## 5-Step Workflow

1. **Parse & Understand** - Extract core intent, requirements, constraints
2. **Determine Document Layer** - PRD vs Story vs Card (see `document-layer.md`)
3. **Optimize into Structured Prompt** - Convert to clear, actionable specification
4. **Present for Confirmation** - Show optimized version with clarifying questions
5. **Execute Based on Confirmation** - Implement exactly what was confirmed

## Template: Feature Request

```
📋 理解你的需求，優化後的提示詞：

**文檔層級判斷：**
這屬於 [PRD/Story/Card] 層級
理由：[based on document-layer.md decision questions]

**功能範圍：**
- 用戶故事：作為[角色]，我想[動作]，以便[價值]
- 相關 Collections：[database collections involved]
- 權限要求：[認證/授權]

**需要確認：**
1. [範圍問題]
2. [業務邏輯問題]
3. [優先級問題]

**技術決策（默認值）：**
- [默認值 1 - 可接受則無需回覆]
- [默認值 2 - 可接受則無需回覆]

請確認方向後我再開始實現。
```

## Template: Bug Fix

```
📋 理解你的問題，優化後的診斷計劃：

**問題描述：**
- 症狀：[觀察到的行為]
- 影響範圍：[影響範圍]
- 預期行為：[預期行為]

**診斷計劃：**
1. Reality Check: [驗證命令]
2. [診斷步驟 2]
3. [診斷步驟 3]

**需要確認：**
1. [上下文問題]
2. [復現問題]
3. [環境問題]

請提供更多信息，我將立即開始診斷。
```

## Template: API Design

```
📋 理解你的需求，優化後的 API 設計方案：

**功能需求：**
- [核心需求]
- 目標用戶：[用戶角色]

**Collection 分析：**
（使用 Collection Viewer 獲取）
- Collection: [name]
- 關鍵字段: [fields]
- 關係: [relationships]

**API 設計選項：**
方案 1: [推薦方案]
```typescript
GET /items/{collection}?fields=*&filter[orq][_eq]={orqId}
```

方案 2: [備選方案]
```typescript
GET /items/{collection}?fields=*,relation.*
```

**需要確認：**
1. [業務規則問題]
2. [數據範圍問題]
3. [授權問題]

請選擇方案並確認業務規則。
```

## Template: Document Creation

```
📋 理解你的需求，創建文檔：

**文檔類型判斷：**
| 問題 | 答案 | 結論 |
|------|------|------|
| 新產品領域？ | [是/否] | [→ PRD 或 否] |
| 新用戶能力？ | [是/否] | [→ Story 或 否] |
| 新技術任務？ | [是/否] | [→ Card 或 更新現有] |

**結論**: 創建 [PRD/Story/Card]

**重複檢查：**
- 搜索 `docs/prds/`: [結果]
- 搜索 `docs/stories/`: [結果]
- 搜索 `docs/cards/`: [結果]

**建議文檔結構：**
[根據對應模板提供大綱]

確認後我將創建文檔。
```

## Anti-Patterns

| Wrong | Correct |
|-------|---------|
| 直接實現 | 先優化提示詞，等用戶確認 |
| 假設文檔層級 | 根據 document-layer.md 判斷 |
| 跳過重複檢查 | 先搜索現有文檔 |
| 假設默認值 | 明確詢問關鍵參數 |
| 過度設計 | 先提供簡單方案，詢問是否需要複雜功能 |

## Validation

**Success indicators:**
- ✅ User confirms "yes, that's what I want" before implementation
- ✅ Document layer correctly identified
- ✅ No duplicate documents created
- ✅ Business rules and constraints surfaced early
- ✅ Avoids rework due to misunderstanding

**Failure indicators:**
- 🚨 AI starts implementing without user confirmation
- 🚨 User says "that's not what I meant" after implementation
- 🚨 Created duplicate PRD/Story/Card
- 🚨 Multiple rounds of clarification after document is written
