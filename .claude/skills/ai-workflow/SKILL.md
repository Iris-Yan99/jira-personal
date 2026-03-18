---
name: ai-workflow
description: |
  AI 開發工作流規範。當 Claude 執行任何開發任務時自動觸發：
  (1) 新功能開發 - 需要創建 PRD/Story/Card
  (2) API 修改 - 修改現有端點、字段、業務邏輯
  (3) Bug 修復 - 排查和修復問題
  (4) 重構 - 代碼結構變更
  (5) 自然語言需求 - 用戶用口語描述需求
  (6) 文檔創建/更新 - 創建或更新 PRD/Story/Card
  (7) Collection 探索 - 使用 Collection Viewer 發現 schema
  觸發條件：用戶請求實現功能、修改代碼、修復 bug、或描述任何開發需求
---

# AI Development Workflow - SaaS Sales Order

## Mandatory 4-Step Process

Every development task MUST follow these steps:

### Step 0: Intent Analysis (意圖解析)

**首先解析用戶意圖，而不是直接執行命令。**

#### 0.1 檢查上下文干擾

```
⚠️ 用戶打開的文件可能與任務無關！

判斷方法：
- 用戶的問題關鍵詞是否與打開的文件相關？
- 如果不相關 → 忽略打開的文件，專注於用戶問題
- 如果相關 → 作為 Reality Check 的輸入
```

#### 0.2 信息源選擇

**回答代碼/業務相關問題前，必須按正確順序查詢信息源。**

| 問題類型 | 查詢順序 | 說明 |
|----------|----------|------|
| **業務流程** | PRD → Story → Card → Code | 先確定功能範圍，再看實現 |
| **API 用法** | Card → Collection Viewer → Code | Card 是契約，Collection 是 schema |
| **數據結構** | `/collection/[name]` → Code | Collection Viewer 是 schema 真相源 |
| **項目狀態** | `/prd` → `lib/progress-data.ts` | PRD Hub 顯示所有功能狀態 |
| **代碼細節** | Code → Tests | 直接查 `app/` `lib/` `components/` |

#### 0.3 匹配任務類型

| Request Pattern | Task Type | Load Reference |
|-----------------|-----------|----------------|
| "我想做..." / "Help me implement..." | Natural Language | `references/natural-language.md` |
| New feature / New PRD | New Feature | `references/duplicate-prevention.md` |
| "PRD or Story or Card?" | Document Layer | `references/document-layer.md` |
| "Create PRD for..." | PRD Creation | `references/prd-template.md` |
| "Create Story for..." | Story Creation | `references/story-template.md` |
| "Create Card for..." | Card Creation | `references/card-template-v2.md` |
| **Code implementation (any)** | **Card Required** | **Search existing Card or create new one** |
| **"sync card" / "push card" / "同步 card"** | **Card Sync Only** | **Run: `npx tsx scripts/sync/sync-single-card.ts <path>`** |
| **"synque"** | **Complete Sync + Comments Workflow** | **→ Use `pm-comments` skill (handles both sync + comments)** |
| "探索 collection" / "了解 schema" | Collection Discovery | `references/collection-driven.md` |
| "Update progress" / After completing docs | Progress Tracking | `references/progress-tracking.md` |
| **"Create collection" / "Add relation" / Schema change** | **Directus Schema** | **→ Use `directus-schema` skill** |
| Directus M2O / O2M / FK / Virtual field | **Directus Relations** | **→ Use `directus-schema` skill** |
| **"Debug permissions" / "403 error" / "Check role"** | **Directus Environment** | **→ Use `directus-schema` skill** |
| **"multi-org" / "OAuth flow" / "users_multi"** | **Multi-Org Architecture** | **→ Use `directus-schema` skill** |
| **"RBAC" / "policy" / "role" / "directus_access"** | **RBAC Implementation** | **`references/directus-rbac-patterns.md`** |
| **"seed" / "sample data" / "test data" / "populate"** | **Data Seeding** | **`references/directus-rbac-patterns.md`** |
| **"Backend extension" / "OAuth provider" / "Directus extension"** | **Backend Extensions** | **→ Use `directus-schema` skill** |
| **"Run tests" / "Test API" / Phase 4 Testing** | **API Testing** | **→ Use `api-testing` skill** |
| **"Run Newman" / "Newman test" / "Update test results"** | **Newman Testing** | **→ Use `api-testing` skill** |
| **"Create landing page" / "新建落地頁" / "品牌頁面"** | **Landing Page** | `docs/LANDING_PAGES.md` |
| Error / Bug / Fix | Troubleshooting | Go to Step 1 directly |
| **"這是什麼" / "解釋"** | **Explanation** | No ref → 直接回答 |
| Simple fix / typo | Simple Fix | No ref → Go to Step 1 |

#### 0.4 判斷是否需要完整流程

```
❌ 不需要完整流程：
- Explanation 類型 → 選擇正確信息源 → 直接回答
- Simple Fix → 直接修復

✅ 需要完整流程：
- 會修改代碼的任務
- 會創建/修改文檔的任務
- 新功能開發
```

#### 0.5 自動檢測模式違規 (Pattern Violation Detection)

**在執行任何步驟前，檢查是否違反已知模式。**

| User Complaint | Pattern Violated | Auto-Fix Reference |
|----------------|------------------|-------------------|
| "I don't see cards/stories" | Missing YAML or loading fallback | `references/pattern-violations.md` #1 |
| "Progress tab doesn't show [X]" | Missing additionalContent | `references/pattern-violations.md` #2 |
| "Need to add feature to UI" | Hardcoded data | `references/pattern-violations.md` #3 |
| "Route returns 404" | Missing required YAML field | `references/pattern-violations.md` #4 |
| "Should be side by side" | Missing responsive layout | `references/pattern-violations.md` #7 |
| "Formatting is lost" | Plain text rendering | `references/pattern-violations.md` #8 |
| "PRD format is wrong" | Missing required YAML fields | Validate before creation |
| "PRD won't load" | Invalid YAML syntax | Check frontmatter syntax |

**Auto-Correction Protocol**:
1. **Acknowledge**: "I notice I didn't follow [pattern]"
2. **Fix**: Immediately correct without asking permission
3. **Explain**: Brief explanation of fix
4. **Continue**: Resume task

**Full Pattern List**: See `references/pattern-violations.md`

#### 0.5.1 PRD Format Validation Checklist

**MANDATORY: Before creating ANY PRD, validate all required fields using THREE-TIER ENFORCEMENT.**

```yaml
✅ TIER 1 (AI Skills) + TIER 2 (Runtime) - REQUIRED FIELDS:
- id: "PRD-FEATURE-NAME"              # PRD- prefix + UPPERCASE (e.g., PRD-AI-CHAT, PRD-ORDER-MANAGEMENT)
- title: "Feature Title"              # 1-200 characters
- description: "Brief description"    # 1-500 characters
- status: "draft"                     # MUST be: draft | pending | in-progress | done | blocked | ready
- pattern: discovery-driven           # MUST be: collection-driven | discovery-driven | requirements-first
- keyLearning: "Main takeaway"        # 1-1000 characters, key insight
- project: ww                         # MUST be: ww | rk | vec | lr | foundation | * | array

✅ REQUIRED FOR DOCUMENT LINKING (bidirectional):
- stories: []                         # Array of story IDs (e.g., ["US-ANGLISS-WABA-001"])
- cards: []                           # Array of card IDs (e.g., ["CARD-ANGLISS-WABA-001"])

⚠️ **BIDIRECTIONAL LINKING RULE**:
When creating/updating documents, ALWAYS maintain bidirectional links:
- PRD → lists stories[] and cards[]
- Story → lists cards[] in frontmatter AND parent_prd
- Card → has parent_story AND parent_prd in frontmatter

✅ RECOMMENDED FOR QUALITY (shown in PRD Quality Checklist):
- progressPhases:                     # YAML-first progress tracking (REQUIRED for new PRDs)
    - phase: "Phase 1: Name"
      status: "in-progress"           # done | in-progress | pending | blocked
      tasks:
        - text: "Task description"
          completed: false
  # Golden example: docs/prds/PRD-LR-DISCOVERY.md
- verification:                       # Tracking object
    codeExists: false
    prdAccurate: unknown              # accurate | partial | outdated | missing | unknown
    testsExist: false
    lastVerified: null                # Format: "YYYY-MM-DD" (string, not date)
- testCoverage:                       # API test results
    summary:
      passRate: 0                     # 0-100
      verdict: unknown                # passing | partial | failing | unknown
- relatedCollections: []              # Array of collection names
- tags: []                            # Array of relevant tags
```

**THREE-TIER ENFORCEMENT SYSTEM**:

| Tier | What | When | Coverage | Status |
|------|------|------|----------|--------|
| **Tier 1** | AI Skill Validation | Before creation | AI only | ✅ Active |
| **Tier 2** | Runtime Validation (Zod) | On page load | AI + Humans | ✅ Active |
| **Tier 3** | Build-Time CI Check | Pre-commit | All commits | ⏳ Future |

**Validation Actions**:

1. **BEFORE Creating PRD (Tier 1 - This Skill)**:
   ```typescript
   // Pseudo-code - AI must mentally validate:
   - ✅ id has PRD- prefix + UPPERCASE (e.g., PRD-AI-CHAT)
   - ✅ status is one of: draft, pending, in-progress, done, blocked, ready
   - ✅ pattern is one of: collection-driven, discovery-driven, requirements-first
   - ✅ project is valid: ww, rk, vec, lr, foundation, *, or array
   - ✅ keyLearning is present (1-1000 chars)
   - ⚠️ verification.prdAccurate is one of: accurate, partial, outdated, missing, unknown
   - ⚠️ verification.lastVerified is string format "YYYY-MM-DD" (not date object)
   ```

2. **AFTER Creating PRD (Tier 2 - Runtime)**:
   - User refreshes page → Runtime validator (lib/prd-validator.ts) runs automatically
   - If errors: RED banner shows with detailed error messages + inline suggestions
   - If warnings: PRD Quality Checklist shows ⚠️ for recommended fields
   - User sees what's missing and how to fix it

3. **CONTINUOUS IMPROVEMENT**:
   - Each PRD page shows "PRD Quality Checklist" with real-time status
   - Required fields: ✅ (enforced)
   - Stories/Cards: ⚠️ if missing, ✅ if present
   - Verification: ⚠️ if missing, ✅ if present (shows accuracy + date)
   - Test Coverage: ⚠️ if missing, ✅ if present (shows pass rate + verdict)
   - Collections: ℹ️ optional

**Common Mistakes to AUTO-FIX**:
- ❌ `id: prd-xxx` → ✅ `id: PRD-XXX` (PRD- prefix + UPPERCASE)
- ❌ `status: wip` → ✅ `status: draft` (valid enum)
- ❌ `pattern: agile` → ✅ `pattern: discovery-driven` (valid enum)
- ❌ `project: XX` → ✅ `project: ww` (valid project code)
- ❌ `prdAccurate: verified` → ✅ `prdAccurate: accurate` (valid enum)
- ❌ `lastVerified: 2026-01-29` → ✅ `lastVerified: '2026-01-29'` (string not date)
- ❌ Missing `keyLearning` → ✅ Add with insight from implementation

**Runtime Validation Error Messages** (User will see):
```
⚠️ PRD Format Validation Failed

❌ id: PRD IDs must use PRD- prefix + UPPERCASE
   💡 Use format: PRD-FEATURE-NAME (e.g., "PRD-AI-CHAT", "PRD-ORDER-MANAGEMENT")

❌ status: Status must be one of: draft, pending, in-progress, done, blocked, ready
   💡 Valid values: draft, pending, in-progress, done, blocked, ready

❌ verification.prdAccurate: Expected "accurate" | "partial" | "outdated" | "missing" | "unknown"
   💡 Choose one of the valid accuracy values
```

**PRD Quality Standards** (Always shown on PRD pages):
- ✅ Required Fields: id, title, description, status, pattern, keyLearning, project
- ⚠️ Progress Phases: Required for new PRDs - use `progressPhases` YAML field
- ⚠️ Stories/Cards: Recommended - add stories/cards for progress tracking
- ⚠️ Verification: Recommended - verify code exists and PRD accuracy
- ⚠️ Test Coverage: Recommended - add API test coverage
- ℹ️ Related Collections: Optional - link database collections if applicable

### Step 0.6: Proposal Generation (提案生成)

**在執行實質性變更前，生成提案供用戶確認。**

#### 觸發條件（任一滿足）

- 新功能實現
- 涉及 3+ 文件修改
- 數據庫結構變更
- 創建新 PRD/Story/Card

#### 跳過條件

- 簡單任務（typo、單點 bug fix）
- 用戶已給出詳細規範
- 用戶明確說"直接做"

#### 提案格式

```markdown
## Proposal: [簡短標題]

### 理解
我理解您的需求是：[複述]

### 文檔層級判斷
根據需求分析，這屬於 [PRD/Story/Card] 層級
理由：[解釋]

### 影響範圍
| 層級 | 文件 | 操作 |
|------|------|------|
| PRD | docs/prds/PRD-xxx.md | 新建/修改 |
| Code | app/xxx/ | 新建/修改 |

### 實施步驟
1. [步驟]
2. [步驟]

### 待確認
- [ ] 理解正確？
- [ ] 可以開始？
```

### Step 1: Reality Check (現狀檢查)

**先驗證現狀，再動手實施。**

#### 1.1 Collection-Driven Discovery (推薦)

**對於涉及數據庫的任務，先用 Collection Viewer 獲取 schema：**

```bash
# 訪問 Collection Viewer
/collection/[collection-name]

# 點擊 "Copy Collection Data" 獲取完整 JSON
# JSON 包含：
# - fieldDetails: 所有字段類型、要求
# - requiredFields: POST 必填字段
# - relationalFields: M2O, O2M, M2M 關係
# - sampleData: 真實數據範例
```

#### 1.2 Legacy Document Migration Enforcement

**當遇到舊格式文檔時，必須提議遷移到 YAML frontmatter。**

**檢查方法：**
```bash
# Check if Card/Story has YAML frontmatter
head -5 docs/cards/CARD-*.md | grep "^---$"
head -5 docs/stories/US-*.md | grep "^---$"
```

**遷移觸發條件（任一滿足時提議遷移）：**
- 用戶要求編輯/更新舊格式文檔
- 用戶創建新文檔時發現相關舊文檔
- 在 Reality Check 中發現缺少 YAML frontmatter

**遷移動作：**
1. **提議遷移**：「我注意到這個 Card/Story 使用舊格式（表格式）。是否要遷移到 YAML frontmatter 標準格式？這樣可以：」
   - 與新文檔保持一致
   - 支持自動化工具（進度追蹤、可視化）
   - 便於數據驅動分析

2. **執行遷移**（用戶同意後）：
   - 讀取現有內容
   - 提取關鍵信息（status, title, parentId 等）
   - 添加 YAML frontmatter
   - 保留原有 markdown 內容
   - 參考模板：`references/card-template-v2.md` 或 `references/story-template.md`

3. **批量遷移選項**：如果發現多個舊文檔，詢問是否批量遷移

**重要規則：**
- ❌ 不要靜默遷移 - 總是先詢問用戶
- ✅ 遷移後驗證文件可讀性
- ✅ 保留原有內容結構
- ✅ 使用正確的模板格式

**已知遺留文檔統計**（截至最後檢查）：
- 38 Cards 缺少 YAML frontmatter
- 49 Stories 缺少 YAML frontmatter

#### 1.3 文檔現狀檢查

```bash
# PRD 狀態
ls docs/prds/
grep -l "status:.*done" docs/prds/*.md

# Story 狀態
ls docs/stories/
cat docs/stories/_index.yaml 2>/dev/null

# Card 狀態
ls docs/cards/
grep -l "status:.*done" docs/cards/*.md

# 相關代碼
ls app/[feature]/
ls components/[feature]/
ls lib/[feature]/
```

#### 1.4 API 模式檢查

```bash
# 查找現有 API 模式
grep -r "getApiOrqUrl\|getAccessToken" lib/
grep -r "fetch.*items" lib/api*.ts

# 確認組織過濾模式
grep -r "getCurrentOrq\|orq" lib/
```

### Step 2: Execute Development

1. 根據 Step 0 確定的文檔層級創建/更新文檔
2. 遵循 `references/` 中的模板
3. 使用 Collection Viewer 數據驅動開發
4. 確保 TypeScript 編譯通過

#### 2.0 Card Association Rule (MANDATORY)

**Every code implementation MUST have an associated Card for progress tracking.**

```
┌────────────────────────────────────────────────────────────────┐
│  RULE: No code changes without a Card                          │
│                                                                │
│  Code Implementation → MUST have → Card                        │
│       ↓                              ↓                         │
│  - New feature                   - Track progress              │
│  - Bug fix                       - Document changes            │
│  - Enhancement                   - Enable AI to summarize      │
│  - Refactoring                   - Provide audit trail         │
└────────────────────────────────────────────────────────────────┘
```

**Before writing code, check:**
1. **Existing Card?** Search `docs/cards/CARD-*` for related work
2. **Create Card?** If no existing Card, create one first
3. **Parent PRD?** Link Card to parent PRD in `cards:` array

**Card naming convention:**
```
CARD-{PRD-PREFIX}-{NNN}.md

Examples:
- CARD-OAUTH-003.md      (OAuth PRD → Card 003)
- CARD-ANGLISS-WABA-001.md    (Angliss PRD → Card 001)
- CARD-LR-001.md       (LR PRD → Card 001)
```

**Progress updates in Card:**
- Update `status:` field as work progresses (Backlog → In Progress → Done)
- Add implementation notes to Card body
- Update `## Changelog` section with date and summary
- **AI MUST update Card after each significant code change**

#### 2.1 PRD 創建（如適用）

**適用於**：功能 PRD、調查文檔、進度追蹤、驗證清單

1. **創建 PRD 文件 + Runtime Validation**
   - 路徑：`docs/prds/PRD-{NAME}.md`
   - 使用 YAML frontmatter（這是唯一的 source of truth）
   - 參考：`references/prd-template.md`
   - **CRITICAL: Validate BEFORE saving** using `lib/prd-validator.ts`:
     ```typescript
     import { validatePRD } from '@/lib/prd-validator'
     const validation = validatePRD(frontmatter)
     if (!validation.valid) {
       console.error('PRD validation failed:', validation.errors)
       // Fix errors before proceeding
     }
     ```
   - **日期字段**：
     - `updatedDate: 'YYYY-MM-DD'` - 更新時手動修改（用於排序）
     - Directus PRD 自動管理 `date_created`/`date_updated`（無需手動）
   - **可見性控制**：
     - `visibility: 'public'` - 顯示在 `/showcase`（客戶可見）
     - `visibility: 'internal'` - 僅顯示在 `/prd`（內部）
     - **默認**：省略此字段 = `'internal'`（安全默認）
   - **文檔類型標籤**（用於區分不同用途）：
     - 功能 PRD：`tags: ['core-feature', ...]`
     - 調查文檔：`tags: ['investigation', ...]`
     - 進度追蹤：`tags: ['progress-tracking', ...]`
     - 驗證清單：`tags: ['validation', 'checklist', ...]`

   - **Progress Section 格式要求**（關鍵！Progress tab 自動提取）：
     ```markdown
     ### Phase X: Title - STATUS
     - [x] Completed task
     - [ ] Pending task
     ```
     - 狀態關鍵字：COMPLETE/IN PROGRESS/PENDING/BLOCKED
     - 必須以 `### Phase` 開頭
     - 必須包含狀態（`- STATUS` 或 `(STATUS)` 或 emoji）
     - 使用 `- [x]` 表示完成，`- [ ]` 表示待辦
     - 詳見：`references/prd-template.md` Progress Section Rules

2. **THREE-TIER FALLBACK - 無需更新 `lib/prd-data.ts`**
   ```
   Priority 1: Directus (if DIRECTUS_PRD_ENDPOINT set)
             ↓ 自動包含 date_created, date_updated
   Priority 2: Markdown frontmatter (prd-parser.ts 讀取 YAML)
             ↓ 手動設置 createdDate, updatedDate
   Priority 3: Legacy prd-data.ts (僅用於向後兼容)
             ↓ 手動設置 createdDate, updatedDate
   ```

   **重要**：
   - ✅ 如果 PRD 在 Directus → 無需做任何事
   - ✅ 如果 PRD 有 frontmatter → 無需添加到 prd-data.ts
   - ⚠️ 僅當 PRD 既不在 Directus 也沒有 frontmatter 時才添加到 prd-data.ts

3. **更新 Progress Tracking**
   - 文件：`lib/progress-data.ts`
   - 添加到 `PRD_STATUSES`（追蹤準確性）
   - 添加到 `LAYER_DOCUMENTS`（如果是 Story/Card 層級的一部分）
   - 標記 `EVOLUTION_PHASES` 任務完成（如適用）
   - 參考：`references/progress-tracking.md`

4. **驗證 + Runtime Validation Check**
   - 訪問 `/prd/{id}` 確認無 validation error banner（紅色警告）
   - 如果看到 validation errors:
     - ❌ 修復 YAML frontmatter 錯誤
     - ✅ 刷新頁面驗證修復成功
   - 訪問 `/prd` 確認顯示（PRD 自動從 YAML 發現）
   - 訪問 `/prd` Progress tab 確認進度更新
   - 使用排序功能測試日期字段（Newest/Oldest）
   - 如果 `visibility: 'public'`，檢查 `/showcase` 是否顯示
   - **IMPORTANT**: Never commit PRD with validation errors

#### 2.2 Story 創建（如適用）

1. **創建 Story 文件 + Runtime Validation**
   - 路徑：`docs/stories/US-{NNN}.md` 或 `docs/stories/AS-{PROJECT}-{NNN}.md`
   - 參考：`references/story-template.md`
   - **CRITICAL: Validate BEFORE saving**:
     ```typescript
     import { validateStory } from '@/lib/prd-validator'
     const validation = validateStory(frontmatter)
     if (!validation.valid) {
       console.error('Story validation failed:', validation.errors)
       // Fix errors before proceeding
     }
     ```
   - **IMPORTANT**: `id` field is REQUIRED (story-parser.ts requires it)

2. **關聯 Cards**
   - 在 Story 中列出相關 Cards
   - 在 Cards 中引用父 Story

3. **更新 Progress Tracking**
   - 添加到 `LAYER_DOCUMENTS`（type: 'story'）
   - 參考：`references/progress-tracking.md`

4. **Changelog 維護（REQUIRED）**
   - 每個 Story 必須有 `## Changelog` section
   - 每次更新 Story 時添加新條目
   - 格式：`| Date | Author | Change |`
   - 參考：`references/story-template.md` → Changelog Standard

#### 2.3 Card 創建（如適用）

1. **創建 Card 文件 + Runtime Validation**
   - 路徑：`docs/cards/CARD-{NNN}.md`
   - 參考：`references/card-template-v2.md`
   - **CRITICAL: Validate BEFORE saving**:
     ```typescript
     import { validateCard } from '@/lib/prd-validator'
     const validation = validateCard(frontmatter)
     if (!validation.valid) {
       console.error('Card validation failed:', validation.errors)
       // Fix errors before proceeding
     }
     ```

2. **定義技術規格**
   - API 契約
   - 數據結構
   - 驗收標準

3. **更新 Progress Tracking**
   - 添加到 `LAYER_DOCUMENTS`（type: 'card', 包含 parentId）
   - 參考：`references/progress-tracking.md`

4. **Changelog 維護（REQUIRED）**
   - 每個 Card 必須有 `## Changelog` section
   - 每次更新 Card 時添加新條目
   - 格式：`| Date | Author | Change |`
   - 參考：`references/card-template-v2.md` → Changelog Standard

### Step 3: Verify & Document

#### 3.1 編譯驗證

```bash
yarn build
# 或
yarn lint
```

#### 3.2 文檔一致性

| 檢查項 | 驗證方法 |
|--------|----------|
| PRD 在 prd-data.ts 中註冊？ | `grep "id:" lib/prd-data.ts` |
| PRD 在 /prd 顯示？ | 訪問 `/prd` |
| 文檔層級正確？ | 對照 `references/document-layer.md` |

#### 3.3 完成檢查清單

- [ ] 文檔創建/更新完成
- [ ] `lib/prd-data.ts` 更新（如創建 PRD）
- [ ] `yarn build` 通過
- [ ] 相關文檔互相引用正確
- [ ] **Story Changelog 已更新**（如修改 Story）
- [ ] **Card Changelog 已更新**（如修改 Card）
- [ ] **Card 進度已更新**（如實現代碼）

#### 3.4 Card Progress Update Protocol

**After ANY code implementation, AI MUST update the associated Card:**

```markdown
## In the Card's Changelog section, add:

| Date | Author | Change |
|------|--------|--------|
| 2026-02-14 | Claude | Implemented email login in auth gate, added tabbed UI |

## In the Card's body, update:

### Implementation Summary
- Added email/password login tab
- Updated navigation to backend-controlled
- Files modified: components/prd-auth-gate.tsx
```

**Card status progression:**
```
Backlog → In Progress → Review → Done
   ↓           ↓          ↓       ↓
 Created    Coding     Testing  Shipped
```

**What to include in Card updates:**
- Files created/modified
- Key decisions made
- Technical approach taken
- Any blockers or issues
- Next steps (if not complete)

### Step 4: Verify & Document (Final Check)

**最終驗證和文檔一致性檢查。**

#### 4.1 編譯驗證

```bash
yarn build
# 或
yarn lint
```

#### 4.2 API Testing (Phase 4 PRD 驗證)

**When PRD enters Phase 4 (Testing), delegate to `api-testing` skill.**

Claude Code will automatically invoke the `api-testing` skill when:
- PRD Phase 4 begins
- API testing is requested
- Test coverage needs updating

**The `api-testing` skill handles:**
- Running Newman/Postman tests
- Extracting test statistics
- Updating PRD frontmatter with test coverage
- Managing test artifacts and AC mappings

---

## Document Layer Decision (核心)

### Three-Layer Hierarchy

> **These documents are training data for future AI agents.** Each layer teaches the next session what to build and why. See [PRD Structure = Training Data](docs/reference/PRD-STRUCTURE-AS-TRAINING-DATA.md) for the full 7-layer knowledge stack.

```
PRD (Product Requirements)     ← WHY: 產品領域、業務上下文、成功指標
  ↓ has many
Stories (User Capabilities)    ← WHO/WHAT: 用戶旅程、驗收標準、具體場景
  ↓ has many
Cards (Technical Tasks)        ← HOW: API 端點、技術規格、邊界案例證明
  ↓ maps to
Code (app/, lib/, components/) ← 實際實現 (with @card references)
```

### Decision Matrix

| 用戶說 | 層級 | 動作 |
|--------|------|------|
| "我想做會員積分系統" | **PRD** | 創建 PRD |
| "用戶能查看訂單歷史" | **Story** | 創建 Story |
| "訂單列表需要分頁" | **Card** | 更新 Card |
| "修復分頁的bug" | **Code** | 直接修復代碼 |

### Decision Questions

**Question 1: 這是新的產品領域嗎？**
- ✅ 新業務模式 → 創建 PRD
- ✅ 新客戶群體 → 創建 PRD
- ✅ 需要獨立成功指標 → 創建 PRD

**Question 2: 這是新的用戶能力嗎？**
- ✅ 新的端到端用戶旅程 → 創建 Story
- ✅ 新的用戶角色 → 創建 Story
- ✅ 跨多個技術組件 → 創建 Story

**Question 3: 這是新的技術任務嗎？**
- ✅ 新 API 端點 → 創建 Card
- ✅ 新數據表 → 創建 Card
- ✅ 增強現有功能 → 更新現有 Card

---

## Key Patterns for This Repo

### Pattern 0: Collection-Driven Development (推薦)

**當任務涉及現有數據庫 collection 時，必須先用 Collection Viewer：**

```
1. 訪問 /collection/[collection]
2. 點擊 "Copy Collection Data"
3. 獲得完整 JSON schema
4. 根據 schema 開發，避免猜測
```

**優勢：**
- 70% 更快的 API 整合
- 消除架構猜測
- 首次嘗試就獲得準確代碼

### Organization-Aware Development

**所有 API 調用必須使用組織感知模式：**

```typescript
// 獲取當前組織
import { useOrgStore } from '@/stores/org-store'
const orqId = useOrgStore.getState().getSelectedOrq()

// 獲取 API URL
import { getApiOrqUrl, getAccessToken } from '@/lib/config'
const apiUrl = getApiOrqUrl()
const token = getAccessToken()
```

### External API Integration (Server-Side)

**當整合外部 API（Gemini, OpenAI, Stripe 等），必須使用 server-side API route：**

```
Client Component → API Route → External API
     (browser)      (server)     (third-party)
```

**為什麼？**
- `NEXT_PUBLIC_*` 變量會暴露在瀏覽器 JS 中（任何人可見）
- 無 `NEXT_PUBLIC_` 前綴的變量僅限 server-side（安全）

**模式：**
```typescript
// 1. Service layer (services/xxx.ts)
const API_KEY = process.env.EXTERNAL_API_KEY;  // 安全
const client = API_KEY ? new ExternalClient({ apiKey: API_KEY }) : null;

// 2. API route (app/api/xxx/route.ts)
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const result = await service.generate(prompt);
  return NextResponse.json({ success: true, data: result });
}

// 3. Client hook (lib/hooks/use-xxx.ts)
const response = await fetch('/api/xxx', {
  method: 'POST',
  body: JSON.stringify({ prompt })
});
```

**詳見：** `references/nextjs-api-routes.md`

### API Field Expansion

**不同的 field 參數返回不同數據結構：**

```typescript
// Pattern 1: 簡單 (返回 ID 數組)
GET /items/user_groups?fields=*
→ { "company": [10, 11, 12] }

// Pattern 2: 展開 (返回嵌套對象)
GET /items/user_groups?fields=*,company.company_id.*
→ { "company": [{ "company_id": { "id": 10, "name": "..." } }] }
```

**規則**: 始終檢查現有 API 調用以匹配 field expansion 模式。

---

### PRD Date Field Workflow

**日期字段維護策略**（重要：隨時間更新）：

```yaml
# Frontmatter 中的日期字段
---
id: "PRD-EXAMPLE"
updatedDate: '2026-01-22'  # ← 每次更新 PRD 時手動修改此字段
---
```

**何時更新 `updatedDate`：**
- ✅ 修改 PRD 內容（業務邏輯、API 規格、驗收標準）
- ✅ 更新驗證狀態（`verification.prdAccurate`）
- ✅ 添加新的 related docs 或 collections
- ❌ 僅修改錯別字或格式（可選更新）

**用途**：
- `/prd` 頁面的 "Sort by" 功能（Newest First / Oldest First）
- CEO 可以快速找到最近更新的 PRD
- 評估文檔活躍度

**注意**：
- Directus PRD 的 `date_updated` 自動更新（無需手動）
- Legacy prd-data.ts 中的 `updatedDate` 手動維護
- 如果忘記更新日期，排序可能不準確但不影響功能

---

## Anti-Patterns to Avoid

| Wrong | Correct |
|-------|---------|
| 被用戶打開的文件帶偏 | 先解析用戶意圖，判斷文件相關性 |
| 直接執行而不理解意圖 | Step 0 先解析意圖 |
| 猜測數據結構 | 用 Collection Viewer 獲取 schema |
| 假設而不詢問 | 有歧義時詢問確認 |
| 跳過 Reality Check | 每次都先驗證現狀 |
| 創建重複文檔 | 先搜索現有 PRD/Story/Card |
| 混用 field expansion 模式 | 匹配現有代碼的模式 |
| 將 PRD 同時添加到 frontmatter 和 prd-data.ts | 使用三層回退，避免重複 |
| 更新 PRD 但忘記更新 updatedDate | 手動維護 updatedDate 以支持排序 |
| **寫代碼但不更新 Card** | **每次代碼實現後必須更新關聯 Card** |
| **代碼實現沒有 Card** | **先創建 Card，再寫代碼** |

---

## References

按需加載的詳細參考文檔：

| 文件 | 用途 |
|------|------|
| `references/directus-rbac-patterns.md` | **Directus 系統表 API 模式：RBAC、Seeding、OAuth** |
| `references/pattern-violations.md` | **自動檢測並修復常見模式違規（Cards 不顯示、Phase 內容缺失、硬編碼等）** |
| `references/document-layer.md` | PRD vs Story vs Card 決策 |
| `references/prd-template.md` | PRD 創建完整模板 |
| `references/story-template.md` | Story 創建完整模板 |
| `references/card-template-v2.md` | Card 創建完整模板 |
| `references/collection-driven.md` | Collection-Driven 開發模式 + Directus PRD 遷移 |
| `references/duplicate-prevention.md` | 防重複創建搜索模式 |
| `references/natural-language.md` | 自然語言需求結構化 |
| `references/progress-tracking.md` | 進度追蹤（管理層可視化） |
| `references/commit-workflow.md` | **Commit 工作流（Code + Card + progress-data.ts 原子提交）** |
| `references/nextjs-api-routes.md` | Next.js API 路由模式（安全調用外部 API） |
| `docs/reference/PRD-STRUCTURE-AS-TRAINING-DATA.md` | **Why docs = training data for future agents (7-layer knowledge stack)** |
| `docs/reference/MULTI-ORG-SWITCHING.md` | **Data ownership models (A/B/C/D) + AND filter pattern** |
| ~~`references/directus-sdk-best-practices.md`~~ | **→ Moved to `directus-schema` skill** |
| ~~`references/directus-relations.md`~~ | **→ Moved to `directus-schema` skill** |
| ~~`references/directus-versions.md`~~ | **→ Moved to `directus-schema` skill** |
| ~~`references/api-testing.md`~~ | **→ Moved to `api-testing` skill** |
| ~~`references/backend-extensions.md`~~ | **→ Moved to `directus-schema` skill** |
| `docs/LANDING_PAGES.md` | **Landing Page CSS 隔離標準、Container 模式、Navigation 整合** |

---

## Specialized Skills (Delegated)

For complex domain-specific tasks, Claude Code will automatically invoke specialized skills:

### Directus Schema Changes
**→ Use `directus-schema` skill** for:
- Creating/modifying Directus collections
- Adding fields and relations (M2O, O2M, M2M)
- Taking schema snapshots
- Managing migration registry
- Two-step API calls for relations

**Triggers**: "Create collection", "Add relation", "Migration", "Schema snapshot"

### API Testing & Validation
**→ Use `api-testing` skill** for:
- Running Newman/Postman tests
- Updating PRD test coverage
- Phase 4 PRD validation
- Extracting test statistics
- AC mapping and test reports

**Triggers**: "Run tests", "Test API", "Newman test", "Phase 4", "Update test results"

---

## Backend Development Patterns

### Directus Backend Extensions
**→ Use `directus-schema` skill** for:
- Custom API endpoints with database access
- OAuth providers
- Business logic modules
- Backend extensions

**Triggers**: "Backend extension", "OAuth provider", "Directus extension"

### Next.js API Routes (This Repo)

**When to use:** Same repo as frontend, business logic in Next.js, can call Directus APIs, AI/external API proxies, data aggregation

**Pattern**: App Router API routes (`app/api/*/route.ts`)

**Database Access**: ✅ Via Directus SDK (recommended), REST API (fetch), or Direct DB (with caveats)

**Reference**: `references/nextjs-api-routes.md`

**Examples in This Repo**:
- `app/api/ai-context/route.ts` - Data aggregation (file system)
- `app/api/payment/txn/route.ts` - Payment API
- `app/api/prd/[id]/route.ts` - Dynamic routes (YAML parsing)
- `app/api/ai/gemini/route.ts` - External API proxy

**Key Patterns**:
1. Server-side API keys (NO `NEXT_PUBLIC_` prefix)
2. Use Directus SDK for type-safe database operations
3. File system operations (YAML parsing, markdown discovery)
4. Next.js 15: `context.params` is async (MUST await)

**When to Choose**:
- **Next.js API Route + Directus SDK**: Logic in same repo, want Directus to handle permissions/validation
- **Directus Extension** (use `directus-schema` skill): Need direct Knex/services, custom auth logic

---

## File Locations

### Documents
```
docs/prds/PRD-*.md              ← PRD 文件 (ALL have PRD- prefix)
docs/stories/US-*.md            ← Story 文件 (US-NNN.md or AS-PROJECT-NNN.md)
docs/cards/CARD-*.md            ← Card 文件 (CARD-NNN.md, no slug suffix)
docs/guides/*.md                ← 指南文件
docs/templates/                 ← 模板文件
docs/PROGRESS-DIRECTUS-PRD.md   ← Directus PRD 遷移進度追蹤
```

### Data Files
```
lib/prd-parser.ts               ← PRD 解析器 (服務端，讀取 YAML frontmatter)
lib/progress-data.ts            ← 進度數據 (管理層可視化)
lib/prd-data.ts                 ← PRD 元數據 (fallback，不再是主要來源)
```

**重要**: PRD 的 source of truth 是 YAML frontmatter，不是 prd-data.ts
- 創建 PRD = 只需創建 markdown 文件
- 更新進度 = 更新 progress-data.ts

**可選**: Directus PRD Collection (數據庫存儲)
- 環境變量: `DIRECTUS_PRD_ENDPOINT` + `DIRECTUS_ADMIN_TOKEN`
- 啟用後: 使用 Directus API 創建 `prd`/`story`/`card` collections
- 詳見: `docs/PROGRESS-DIRECTUS-PRD.md`

### Code
```
app/[feature]/                  ← 頁面路由
components/[feature]/           ← UI 組件
lib/api-*.ts                    ← API 客戶端
lib/hooks/use-*.ts              ← React hooks
stores/*.ts                     ← Zustand stores
```

### Scripts
```
scripts/collections/            ← Collection creation scripts (migrations)
scripts/add-*.ts                ← Field addition scripts (migrations)
scripts/*.ts                    ← Other utility scripts
```
