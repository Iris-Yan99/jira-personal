---
name: progress
description: Agent Team Progress Orchestrator - Use agent teams for superior project progress insights with strategic intelligence, data quality validation, and actionable recommendations.
user-invocable: true
---

# Progress Skill (Agent Team Orchestrator)

## Purpose

Orchestrate specialized agent teams to traverse and analyze the **PRD knowledge graph** (PRD → Story → Card → Code) for strategic project intelligence beyond simple status counts.

**Core Understanding**: The PRD structure IS the progress system - cards are living memory, not documentation.

```
┌─────────────────────────────────────────────────────────────────┐
│  Old Approach              │  Agent Team Approach               │
├─────────────────────────────┼───────────────────────────────────┤
│  Static status counts       │  Multi-dimensional analysis       │
│  Manual data interpretation │  AI strategic intelligence        │
│  No quality validation     │  Automatic inconsistency detection│
│  Lists of items            │  Actionable recommendations       │
└─────────────────────────────┴───────────────────────────────────┘
```

**Evolution**: Transform simple queries into agent team orchestration for 10x deeper insights.

---

## Activation Triggers → Agent Team Configurations

| Trigger | Example | Agent Team Configuration |
|---------|---------|--------------------------|
| `/progress` | `/progress` | **4-Agent General Progress Analysis** |
| `/progress PRD-XXX` | `/progress PRD-LEAD-ATTRIBUTION` | **4-Agent PRD-Focused Analysis** |
| `/progress status:blocked` | `/progress status:blocked` | **4-Agent Blocker Analysis** |
| `/progress health` | `/progress health` | **4-Agent Infrastructure Audit** |
| `/progress reality-check` | `/progress reality-check` | **2-Agent Reality Check** |
| `what's blocked` | "what's blocked" | **4-Agent Dependency Analysis** |
| `project status` | "project status" | **6-Agent Strategic Overview** |
| `where did the work go` | "where did the work go" | **2-Agent Reality Check** |

---

## Data Source Hierarchy (Critical Learning)

**Lesson from VEC Analysis Experience**: Agent teams amplify data quality but don't create it.

### Canonical Status Values (CARD-DATA-002)
All documents use 7 canonical statuses. **Never grep for old values.**
```
draft | pending | in-progress | done | blocked | ready | green
```
`green` = tester-verified (set in Directus UI, not in YAML). Loaders exclude `green`, `archived`, and `to_be_deleted`.
Source of truth: `lib/status.ts`. All values are double-quoted in YAML: `status: "in-progress"`

### ✅ The PRD Knowledge Graph (Primary Intelligence Source)
1. **PRD → Story → Card → Code hierarchy** - Living operational system, not documentation
2. **Cards as Checkpoints** - Minimum unit of traceable work, persistent memory
3. **YAML frontmatter relationships** - Parent PRDs, child stories, dependencies
4. **Progress Data Files** - `lib/progress-data.ts`, curated metrics
5. **Git History** - Commit patterns, @card references in code

### ❌ Unreliable Sources (Avoid)
1. **File system speculation** - Directory listings without context
2. **External codebase guessing** - Code without documentation
3. **Unstructured exploration** - Browsing without targeted analysis

### The Golden Rule
```
Agent Teams + PRD Knowledge Graph = Strategic Intelligence
Agent Teams + File System Speculation = Amplified Unreliability
```

**Pattern**: Traverse PRD → Story → Card hierarchy as primary intelligence source. Cards are living memory that persist across AI sessions.

### Tool Usage Rule (CRITICAL)
**Sub-agents MUST use Glob and Grep tools — NOT Bash** for reading files.
- Use `Glob` to find files: `docs/cards/CARD-*.md`, `docs/prds/PRD-*.md`
- Use `Grep` to extract frontmatter fields: `pattern="^status:" path="docs/cards/"`
- Use `Read` to read specific file contents
- **NEVER** use `bash` with `for`, `awk`, `sed`, `grep`, `find` to process markdown files
- This avoids permission prompts that disrupt the user experience

---

## Agent Team Orchestration Workflow

### Step 1: Parse Trigger Intent

```
┌─────────────────────────────────────────────────────────────────┐
│  User: "/progress status:blocked"                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Intent Classification:                                         │
│  - Type: Blocker Analysis                                       │
│  - Scope: All projects                                          │
│  - Configuration: 4-Agent Blocker Analysis                     │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Configure Agent Team

**4-Agent Blocker Analysis Configuration:**
```
Agent 1: Status Data Quality - Find actual blocked items, validate status consistency
Agent 2: Dependency Analysis - Map dependency chains, identify blocking relationships
Agent 3: Root Cause Investigation - Analyze why items are blocked, categorize blockers
Agent 4: Action Synthesis - Recommend specific unblocking actions, prioritize solutions
```

### Step 3: Execute Agent Team via Task Tool

**Every agent prompt MUST include this preamble:**
```
TOOL RULES: Use Glob to find files, Grep to search content, Read to read files.
NEVER use Bash with for/awk/sed/grep/find to process markdown files.
```

```typescript
// Orchestrate agent team using Task tool with subagent_type: "general-purpose"
Task({
  description: "Blocker analysis",
  prompt: `TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.
    Analyze project blockers using specialized agent team:
    Agent 1: Status data quality...
    Agent 2: Dependency analysis...
    Agent 3: Root cause investigation...
    Agent 4: Action synthesis...`,
  subagent_type: "general-purpose"
})
```

## Agent Team Configurations

### 4-Agent General Progress Analysis (`/progress`)
```
Agent 1: Status Distribution Analysis - Current status breakdown, completion rates, velocity metrics
Agent 2: Flow Intelligence - draft→in-progress→done conversion rates, bottleneck identification
Agent 3: Data Quality Guardian - Status consistency validation, field standardization issues
Agent 4: Strategic Context - Multi-project health, resource allocation patterns, priority alignment
```

### 4-Agent PRD-Focused Analysis (`/progress PRD-XXX`)
```
Agent 1: PRD Scope Analysis - All cards/stories under specific PRD, completion percentage
Agent 2: Dependency Mapping - Card interdependencies within PRD, critical path analysis
Agent 3: Quality Assessment - Implementation consistency, acceptance criteria coverage
Agent 4: Timeline Intelligence - Progress velocity, estimated completion, risk factors
```

### 4-Agent Blocker Analysis (`/progress status:blocked`)
```
Agent 1: Status Data Quality - Find actual blocked items, validate status consistency
Agent 2: Dependency Analysis - Map dependency chains, identify blocking relationships
Agent 3: Root Cause Investigation - Analyze why items are blocked, categorize blockers
Agent 4: Action Synthesis - Recommend specific unblocking actions, prioritize solutions
```

### 4-Agent Infrastructure Audit (`/progress health`)
```
Agent 1: Technical Debt Scanner - Unsafe operations, field inconsistencies, schema issues
Agent 2: System Integration Health - API functionality, service connectivity, error patterns
Agent 3: Process Maturity Assessment - Workflow effectiveness, documentation quality
Agent 4: Strategic Architecture Review - Multi-system coordination, scalability concerns
```

### 2-Agent Reality Check (`/progress reality-check`)

Answers: "Where did the work actually go? What shipped vs what's just planning?"

```
Agent 1: Card Classification & Completion
  - Read ALL card frontmatter (status, project, parent_prd, tags)
  - Classify each card as FEATURE or TOOLING:
    TOOLING indicators: parent_prd contains ai-chat, ai-driven, agent-teams,
      progress, migration, workflow, schema infra, sync, meta-evaluation
    FEATURE indicators: everything else (orders, payments, contacts, products,
      inventory, VEC business, LMS, landing pages, WhatsApp, blog)
  - Calculate completion rates per category
  - Identify "planning-only" cards (draft status, no implementation evidence)
  - Verify all statuses are canonical (draft, pending, in-progress, done, blocked, ready, green)

Agent 2: Delivery Honesty & Recommendations
  - Read ALL PRD frontmatter to classify PRDs as feature vs tooling
  - Strip planning-only cards to show actual delivered work ratio
  - Identify self-referential tooling (tools that manage other tools)
  - Check git log for recent activity patterns (feature vs foundation commits)
  - Answer honestly: "What percentage of effort went to product vs tooling?"
  - Recommend: what feature work is closest to shipping value?
```

**Output format:**
```markdown
## Reality Check: Where the Work Went

### Delivered Work (cards with actual implementation)
| Category | Done | Total | Rate |
|----------|------|-------|------|
| Feature  | XX   | XX    | XX%  |
| Tooling  | XX   | XX    | XX%  |

### Planning Only (draft/pending, no code)
- LMS: XX cards (0 implemented)
- ...

### Self-Referential Tooling
Tools that exist to manage other tools: [list]

### Closest to Shipping
Feature cards that are in-progress or have most dependencies done: [list]
```

### 6-Agent Strategic Overview (`project status`)
```
Agent 1: Portfolio Health - Multi-project status, resource distribution
Agent 2: Execution Intelligence - Velocity trends, capacity utilization
Agent 3: Quality Governance - Standards compliance, technical debt
Agent 4: Strategic Alignment - Business priorities vs execution reality
Agent 5: Risk Assessment - Blockers, dependencies, failure modes
Agent 6: Executive Synthesis - Key insights, decisions needed, recommendations
```

---

## Implementation Notes

```bash
# Query comments for a card (requires synque first)
curl -H "Authorization: Bearer $DIRECTUS_PRD_TOKEN" \
  "$DIRECTUS_PRD_ENDPOINT/items/directus_comments?filter[collection][_eq]=cards&filter[item][_eq]=CARD-XXX"
```

### Step 3: Analyze Results

**Blocker Detection** - Scan comments for keywords:

| Priority | Keywords | Visual |
|----------|----------|--------|
| **BLOCKER** | "blocked", "blocker", "cannot proceed", "等待", "waiting" | 🚫 |
| **URGENT** | "urgent", "asap", "critical", "緊急" | ⚡ |
| **QUESTION** | "?", "clarify", "請問", "什麼意思" | ❓ |

**Stale Detection** - Calculate days since `date_updated`:

| Threshold | Status | Visual |
|-----------|--------|--------|
| > 3 days | Warning | ⚠️ |
| > 7 days | At Risk | 🔴 |
| > 14 days | Abandoned? | ❌ |

### Step 4: Generate Summary

Output format:

```markdown
📊 Progress Report: PRD-LEAD-ATTRIBUTION

## Summary
- 3 cards completed, 2 in progress, 1 blocked
- Last activity: 2 hours ago

## 🚫 Blocked
- CARD-WA-005: Backend API endpoint
  └─ PM Comment: "需要確認 UTM 參數格式"
  └─ Blocked since: 3 days ago

## ⚡ In Progress
- CARD-WA-004: Implement UTM capture (Jimmy)
  └─ Last update: 2h ago

## ✅ Completed
- CARD-WA-001: WhatsApp Float enhancement ✓
- CARD-WA-002: Create lead_clicks collection ✓
- CARD-WA-003: Add frontend tracking ✓

## ⚠️ Risk
- CARD-WA-005 has no updates in 3 days
```

---

## Query Patterns

### By PRD
```
/progress PRD-LEAD-ATTRIBUTION
```
Returns all cards where `business_requirement` matches (via normalizePrdId)

### By Project
```
/progress project:ww
```
Returns all cards where `project = ww`

### By Status
```
/progress status:blocked
/progress status:in-progress
/progress status:done
```

### Stale Items
```
/progress stale:3d   # No activity > 3 days
/progress stale:7d   # No activity > 7 days
```

### Combined Filters
```
/progress PRD-AUTH status:in-progress stale:3d
```

---

## Data Sources

### Primary: Local Markdown Files (Source of Truth)

```bash
# Find all cards
ls docs/cards/CARD-*.md

# Extract status from YAML frontmatter
grep -A10 "^---" docs/cards/CARD-XXX.md | grep "status:"

# Find cards by PRD (primary field is business_requirement, NOT parent_prd)
grep -l 'business_requirement: "PRD-XXX"' docs/cards/*.md
# Note: ~230+ cards use business_requirement, ~10 use parent_prd (updated 2026-02-28)

# Find in-progress cards (values MUST be quoted in YAML)
grep -l 'status: "in-progress"' docs/cards/*.md
```

| Location | Content |
|----------|---------|
| `docs/cards/CARD-*.md` | Card frontmatter + content |
| `docs/stories/{US,AS}-*.md` | Story frontmatter + content |
| `docs/prds/PRD-*.md` | PRD frontmatter + content |

### Secondary: Directus (When Synced)

After `synque` command, cards sync to Directus for:
- PM comments (not in local files)
- Web UI access
- Cross-session queries

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `cards` | Synced cards | id, title, status, parent_prd, date_updated |
| `directus_comments` | PM feedback | collection, item, comment, date_created |

**Current State:** Local markdown = source of truth. Directus = enhancement for comments.

---

## Infrastructure Health Check (`/progress health`)

### Purpose

Audit the Agent Era infrastructure to ensure it's actually working, not just existing.

### Health Check Commands

```bash
# 1. CLAUDE.md size (should be <400 lines)
wc -l CLAUDE.md

# 2. Card freshness (stale = not modified in 30+ days)
find docs/cards -name "*.md" -mtime +30 | wc -l

# 3. Card status distribution
echo "In Progress: $(grep -l 'status: "in-progress"' docs/cards/*.md 2>/dev/null | wc -l)"
echo "Done: $(grep -l 'status: "done"' docs/cards/*.md 2>/dev/null | wc -l)"
echo "Blocked: $(grep -l 'status: \"blocked\"' docs/cards/*.md 2>/dev/null | wc -l)"

# 4. Code traceability (@card references)
grep -r "@card" app/ lib/ components/ 2>/dev/null | wc -l

# 5. PRD v2 adoption (progressPhases)
echo "PRDs with progressPhases: $(grep -l 'progressPhases:' docs/prds/*.md 2>/dev/null | wc -l)"
echo "Total PRDs: $(ls docs/prds/PRD-*.md 2>/dev/null | wc -l)"

# 6. Skills count
ls .claude/skills/*/SKILL.md 2>/dev/null | wc -l
```

### Health Report Format

```markdown
📊 Agent Era Health Check

## Infrastructure
| Metric | Value | Status |
|--------|-------|--------|
| CLAUDE.md lines | 326 | ✅ <400 |
| Total skills | 13 | ✅ |

## Card Health
| Metric | Value | Status |
|--------|-------|--------|
| Total cards | 183 | - |
| In progress | 0 | ⚠️ None active |
| Stale (30+ days) | 45 | ❌ 25% stale |
| @card in code | 0 | ❌ Not adopted |

## Adoption
| Metric | Value | Status |
|--------|-------|--------|
| PRD v2 format | 19% | ⚠️ Low |
| Card freshness | 75% | ⚠️ Needs attention |

## Recommendations
1. Update stale cards or mark as done/archived
2. Add @card references when implementing features
3. Migrate PRDs to v2 format with progressPhases
```

### What Each Metric Means

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| CLAUDE.md lines | <400 | 400-600 | >600 |
| In-progress cards | >0 | 0 | - |
| Stale cards | <10% | 10-25% | >25% |
| @card in code | >50 | 10-50 | <10 |
| PRD v2 adoption | >80% | 50-80% | <50% |

### Recovery Actions

| Problem | Action |
|---------|--------|
| 0 in-progress cards | Review and update card statuses |
| High stale % | Archive or update old cards |
| No @card refs | Add when implementing features |
| Low PRD v2 | Add progressPhases to frontmatter |
| CLAUDE.md too long | Move details to skills |

---

## Example Sessions

### Session 0: Infrastructure Health Check

```
User: /progress health

AI: 📊 Agent Era Health Check

    ## Infrastructure
    | Metric | Value | Status |
    |--------|-------|--------|
    | CLAUDE.md lines | 326 | ✅ <400 |
    | Total skills | 13 | ✅ |

    ## Card Health
    | Metric | Value | Status |
    |--------|-------|--------|
    | Total cards | 183 | - |
    | In progress | 0 | ⚠️ None active |
    | Stale (30+ days) | 45 | ❌ 25% stale |
    | @card in code | 0 | ❌ Not adopted |

    ## Recommendations
    1. ⚠️ No cards marked in-progress - update card statuses
    2. ❌ 45 stale cards - review and archive/complete
    3. ❌ No @card references - add when implementing

    Run weekly to track adoption trends.
```

### Session 1: Start of Day Context Recovery

```
User: /progress

AI: 📊 Progress Report: All Active Cards

    ## Summary
    - 12 cards in progress across 3 PRDs
    - 2 blocked items need attention
    - 3 cards stale > 3 days

    ## 🚫 Blocked (2)

    PRD-LEAD-ATTRIBUTION:
    - CARD-WA-005: Backend API endpoint
      └─ 🚫 "需要確認 UTM 參數格式" (PM, 3d ago)

    PRD-AUTH:
    - CARD-OAUTH-007: Token refresh
      └─ 🚫 "Waiting for security review" (Jimmy, 2d ago)

    ## ⚠️ Stale Items (3)
    - CARD-PAY-003: No updates in 5 days
    - CARD-UI-012: No updates in 4 days
    - CARD-DB-001: No updates in 3 days

    ## ⚡ Recently Active
    - CARD-WA-004: UTM capture (updated 2h ago)
    - CARD-AUTH-003: Login flow (updated 4h ago)

    What would you like to focus on?
    [1] Unblock CARD-WA-005
    [2] Check on stale items
    [3] Continue CARD-WA-004
```

### Session 2: Check Specific PRD

```
User: /progress PRD-LEAD-ATTRIBUTION

AI: 📊 Progress Report: PRD-LEAD-ATTRIBUTION

    ## Overview
    Lead Attribution - WhatsApp click tracking

    | Status | Count |
    |--------|-------|
    | Completed | 3 |
    | In Progress | 2 |
    | Blocked | 1 |
    | Pending | 0 |

    ## Cards

    ✅ CARD-WA-001: WhatsApp Float enhancement
       Completed: 2026-02-14

    ✅ CARD-WA-002: Create lead_clicks collection
       Completed: 2026-02-14

    ✅ CARD-WA-003: Add frontend tracking
       Completed: 2026-02-15

    ⚡ CARD-WA-004: Implement UTM capture
       Status: in-progress
       Author: Jimmy
       Last update: 2 hours ago

    🚫 CARD-WA-005: Backend API endpoint
       Status: blocked
       └─ Comment: "需要確認 UTM 參數格式是否與 GA4 相容"
       └─ Blocked for: 3 days
       └─ Action needed: Clarify UTM format with PM

    ## Recent Comments

    CARD-WA-004 (Jimmy, 2h ago):
    "UTM parsing logic implemented, testing now"

    CARD-WA-005 (PM, 3d ago):
    "需要確認 UTM 參數格式是否與 GA4 相容"
```

### Session 3: Find Blockers

```
User: what's blocked

AI: 🚫 Blocked Cards Report

    Found 2 blocked cards:

    ## 1. CARD-WA-005: Backend API endpoint
       PRD: PRD-LEAD-ATTRIBUTION
       Blocked for: 3 days

       Blocker Comment:
       > "需要確認 UTM 參數格式是否與 GA4 相容" - PM

       Suggested Action:
       Research GA4 UTM format and respond to PM

    ## 2. CARD-OAUTH-007: Token refresh implementation
       PRD: PRD-AUTH
       Blocked for: 2 days

       Blocker Comment:
       > "Waiting for security review of token storage" - Jimmy

       Suggested Action:
       Schedule security review meeting

    Would you like me to help unblock one of these?
```

---

## Integration with Other Skills

| Skill | Relationship |
|-------|--------------|
| `pm-comments` | Syncs cards TO Directus; progress reads FROM Directus |
| `ai-workflow` | Creates cards; progress tracks their status |
| `business-prd-planner` | Creates PRDs; progress tracks PRD completion |

---

## Implementation Notes

### No Script Required (MVP)

This skill works by:
1. AI parses the command
2. AI constructs Directus API queries
3. AI fetches data using curl/fetch
4. AI formats and presents results

No separate script needed - AI executes queries directly.

### Future Enhancement: Cached Queries

For performance, could add:
```typescript
// lib/progress/query-cache.ts
const CACHE_TTL = 60 * 1000 // 1 minute

export async function getCachedCards(prdId: string) {
  const cacheKey = `cards:${prdId}`
  // Check cache, fetch if stale
}
```

---

## Why This Matters

```
┌─────────────────────────────────────────────────────────────────┐
│  Without /progress                                              │
│  ────────────────                                               │
│  1. Open Directus UI                                            │
│  2. Navigate to cards collection                                │
│  3. Filter by PRD                                               │
│  4. Check each card's comments                                  │
│  5. Manually identify blockers                                  │
│  6. Calculate stale items                                       │
│  → 10-15 minutes                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  With /progress                                                 │
│  ─────────────                                                  │
│  1. Type "/progress PRD-XXX"                                    │
│  2. Get instant summary with blockers highlighted               │
│  → 10 seconds                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Context recovery time: 10-15 minutes → 10 seconds**

---

*Created: 2026-02*
*PRD: PRD-AI-PROGRESS-MONITOR*
*Status: MVP*
