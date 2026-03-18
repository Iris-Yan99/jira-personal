# Document Layer Decision

## Three-Layer Hierarchy

```
PRD (Product Requirements)     ← 產品領域、業務上下文、成功指標
  ↓ has many
Stories (User Capabilities)    ← 用戶旅程、驗收標準
  ↓ has many
Cards (Technical Tasks)        ← API 端點、技術規格
  ↓ maps to
Code (app/, lib/, components/) ← 實際實現
```

## Decision Questions

### Question 1: Is this a NEW product domain?

**Create new PRD if:**
- ✅ New business model or revenue stream
- ✅ New customer segment or market
- ✅ New product category
- ✅ Requires separate success metrics

### Question 2: Is this a NEW user capability?

**Create new Story if:**
- ✅ New end-to-end user journey
- ✅ New actor or user role
- ✅ Crosses multiple technical components
- ✅ Has distinct acceptance criteria

### Question 3: Is this a NEW technical task?

**Create new Card if:**
- ✅ New API endpoint
- ✅ New database table
- ✅ New external integration

**Update existing Card if:**
- ✅ Adding fields to existing endpoint
- ✅ Enhancing existing functionality
- ✅ Performance optimization

## Decision Matrix

| User Request | Layer | Action |
|-------------|-------|--------|
| "我想做會員積分系統" | **PRD** | Create PRD |
| "用戶能查看訂單歷史" | **Story** | Create Story |
| "訂單列表需要分頁" | **Card** | Update Card |
| "修復分頁的bug" | **Code** | Update code |

## Common Mistakes

**Mistake 1: Creating new Story for minor enhancement**
```
❌ User: "訂單列表需要排序"
   AI: Creates new US-XXX "Order Sorting Feature"

✅ Correct: Update existing order-list Card
```

**Mistake 2: Creating new Card for same endpoint**
```
❌ User: "訂單創建需要添加備註字段"
   AI: Creates new Card "order-create-with-notes"

✅ Correct: Update existing order-create Card
```

**Mistake 3: Missing PRD for new product domain**
```
❌ User: "我想做會員系統"
   AI: Creates US-XXX "Member Management" directly

✅ Correct: Create PRD first, then Stories under it
```

## Validation Template

When uncertain about document layer:

```
🤖 我分析這個需求屬於 [PRD/Story/Card] 層：

   理由: [Explanation based on decision questions]

   相關現有文檔:
   - [List any existing PRD/Story/Card that might be related]

   是否正確？如不正確，請說明業務場景。
```

## This Repo's Document Locations

| Type | Location | Naming |
|------|----------|--------|
| PRD | `docs/prds/` | `PRD-{NAME}.md` |
| Story | `docs/stories/` | `US-{NNN}-{slug}.md` |
| Card | `docs/cards/` | `CARD-{NNN}-{slug}.md` |
| Guide | `docs/guides/` | `{NAME}.md` |

## PRD Registration

After creating a PRD, it must be registered in `lib/prd-data.ts`:

```typescript
// Add to PRD_LIST array
{
  id: 'my-feature',
  title: 'My Feature Title',
  description: 'Brief description',
  keyLearning: 'Main takeaway',
  pattern: 'discovery-driven',  // or 'collection-driven' | 'requirements-first'
  status: 'draft',              // or 'pending' | 'in-progress' | 'done' | 'blocked' | 'ready' (green = tester-set in Directus)
  filePath: 'docs/prds/PRD-MY-FEATURE.md',
  relatedCollections: ['collection_name'],
  tags: ['relevant-tag'],
}
```
