# Duplicate Prevention

## Three-Layer Search Pattern

Before creating ANY new PRD/Story/Card, execute this search:

```bash
# Layer 0: PRD Level (Product domain check)
grep -ri "關鍵詞" docs/prds/
grep -ri "keyword" docs/prds/ docs/PRD-*.md

# Layer 1: Story Level (User capability check)
grep -ri "關鍵詞" docs/stories/
grep -ri "keyword" docs/stories/

# Layer 2: Card Level (Technical implementation check)
grep -r "GET\|POST\|PUT\|DELETE" docs/cards/*.md | grep -i "keyword"
find docs/cards/ -name "*keyword*"

# Layer 3: Code Level (Actual implementation check)
ls app/ | grep -i "keyword"
grep -r "keyword" lib/api*.ts
grep -r "keyword" components/
```

## AI Auto-Translation

When user uses Chinese, automatically translate to English for search:

```
用戶輸入: "批量導入票務"
AI搜索: 批量.*導入 | bulk.*import | batch.*import | ticket.*import

用戶輸入: "訂單統計報表"
AI搜索: 訂單.*統計 | order.*statistic | order.*report | order.*analytics
```

## Similarity Analysis Decision

```
Found similar content?
    ↓
>70% overlap? → Ask: Merge vs Extend vs Separate?
<70% overlap? → Ask: Related or Independent?
```

## User Clarification Template

```
🤖 我發現這兩個需求非常相似（XXX vs YYY）：

   選項 1: 合併為一個 [PRD/Story/Card] - 統一的[功能名稱]
   選項 2: 創建兩個獨立文檔 - 請說明業務場景區別
   選項 3: 擴展現有文檔 - 已有類似功能，僅需增強

   您的選擇？
```

## When to Create New

**Only create new PRD if:**
- ✅ User confirms it's a different business domain
- ✅ Different success metrics needed
- ✅ No existing PRD can be extended

**Only create new Story if:**
- ✅ User confirms it's a different user journey
- ✅ Different user personas or access levels
- ✅ No existing Story can be extended

**Only create new Card if:**
- ✅ New API endpoint or database table
- ✅ Cannot be handled by updating existing Card
- ✅ Different technical requirements

## Red Flags (Potential Duplicates)

### PRD Level
- 🚨 Similar business domain ("會員系統" vs "用戶管理")
- 🚨 Overlapping success metrics
- 🚨 Same target user segment

### Story Level
- 🚨 Similar verbs ("查看訂單" vs "瀏覽訂單")
- 🚨 Same domain entities (Order, Ticket, User)
- 🚨 Similar acceptance criteria

### Card Level
- 🚨 Overlapping API endpoints
- 🚨 Same database collections
- 🚨 Similar technical deliverables

## Search Before Create Checklist

Before creating any new document:

- [ ] Searched `docs/prds/` for similar PRDs
- [ ] Searched `docs/stories/` for similar Stories
- [ ] Searched `docs/cards/` for similar Cards
- [ ] Searched `lib/prd-data.ts` for registered PRDs
- [ ] Checked `/prd` page for existing features
- [ ] If similar found, asked user about merge/extend/separate

## Example: Avoiding Duplicate

**User Request**: "我想做客戶分組功能"

**AI Search**:
```bash
# Search existing
grep -ri "客戶.*分組\|customer.*group" docs/
grep -ri "tags" docs/prds/ docs/cards/
```

**AI Finds**: `docs/PRD-customer-groups.md` exists

**AI Response**:
```
🤖 我發現已存在類似功能：

   現有文檔：docs/PRD-customer-groups.md
   - 使用 tags 表實現客戶分組
   - 支持 M2M 關係

   請選擇：
   1. 擴展現有 PRD - 添加新需求
   2. 創建新 PRD - 如果是完全不同的業務場景

   您的選擇？
```
