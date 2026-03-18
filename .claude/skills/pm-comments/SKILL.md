---
name: pm-comments
description: PM Comments & Sync workflow. Triggers on "synque" command, "sync card/story/prd", "pm comments", "pull comments". Syncs all doc types (cards, stories, PRDs) to Directus.
user-invocable: true
---

# PM Comments Handler Skill

## Purpose
Proactively sync documents (cards, stories, PRDs) to Directus and parse/address PM comments, creating an interactive workflow between AI and developer.

## Directus Collaboration Lifecycle (CRITICAL — Read First)

**Directus is a collaboration window, NOT a mirror of local files.**

Local markdown is the source of truth. Directus exists for live collaboration: PM comments, team visibility on `/progress`. Only docs being actively worked on should be in Directus.

### Status Lifecycle in Directus

```
┌──────────────────────────────────────────────────────────────┐
│  1. Dev starts work                                          │
│     → synque CARD-XXX                                        │
│     → Directus: status from local frontmatter (in-progress)  │
│     → PM sees it on /progress UI                             │
│                                                              │
│  2. Live collaboration                                       │
│     → PM comments via Directus UI                            │
│     → Dev reads comments via synque / pull comments           │
│     → Iterate until card is complete                         │
│                                                              │
│  3. Dev marks done                                           │
│     → Local md: status "done", PR merged                     │
│     → synque pushes status "done" to Directus                │
│     → /progress still shows it (dev done, not tested)        │
│                                                              │
│  4. Tester verifies                                          │
│     → Tester changes status to "green" in Directus UI        │
│     → Loaders exclude green (filter[status][_nin]=...green)  │
│     → /progress no longer loads from Directus                │
│     → Local md remains source of truth                       │
└──────────────────────────────────────────────────────────────┘
```

### What NOT to do
- **Do NOT "synque all"** regularly — bulk-resynque is a maintenance tool for one-time cleanup (orphan detection after ID renames), not daily workflow
- **Do NOT push all local files to Directus** — only synque what someone is actively collaborating on
- **Do NOT delete Directus records** — use status "archived" to exclude from loaders; "to_be_deleted" for orphans awaiting eventual cleanup

### Loader Behavior
All four Directus loaders exclude `archived`, `green`, and `to_be_deleted` records:
- `lib/prd-loader.ts` — `filter[status][_nin]=archived,green,to_be_deleted`
- `lib/card-loader.ts` — `filter[status][_nin]=archived,green,to_be_deleted`
- `lib/story-loader.ts` — `filter[status][_nin]=archived,green,to_be_deleted`
- `lib/api-prd-directus.ts` — `_nin: ['archived', 'green', 'to_be_deleted']`

The `/progress` UI builds its list from **both** local markdown AND Directus, deduped by ID. When a record is green/archived/to_be_deleted in Directus, `/progress` falls back to local md (which is always the source of truth for merged work).

## Doc Type Detection (CRITICAL)

**The synque command supports ALL THREE doc types.** Detect from input:

| Input Pattern | Doc Type | Directory | Sync Script | Directus Collection |
|---------------|----------|-----------|-------------|---------------------|
| `CARD-*` | card | `docs/cards/` | `sync-single-card.ts` | `cards` |
| `US-*` or `AS-*` | story | `docs/stories/` | `sync-single-story.ts` | `stories` |
| `PRD-*` | prd | `docs/prds/` | `sync-single-prd.ts` | `prd_documents` |
| URL `/docs/cards/*` | card | `docs/cards/` | `sync-single-card.ts` | `cards` |
| URL `/docs/stories/*` | story | `docs/stories/` | `sync-single-story.ts` | `stories` |
| URL `/docs/prds/*` | prd | `docs/prds/` | `sync-single-prd.ts` | `prd_documents` |
| File path `docs/cards/*` | card | `docs/cards/` | `sync-single-card.ts` | `cards` |
| File path `docs/stories/*` | story | `docs/stories/` | `sync-single-story.ts` | `stories` |
| File path `docs/prds/*` | prd | `docs/prds/` | `sync-single-prd.ts` | `prd_documents` |

**Bulk sync — DO NOT RUN unless conditions below are met:**

`scripts/sync/bulk-resynque.ts` pushes ALL local files to Directus. This **ruins the designed progress view** because `/progress` shows everything in Directus as "active work" — bulk-syncing 300+ cards floods the board with docs nobody is working on.

**When to run bulk-resynque (ONLY these situations):**
1. **After bulk ID renames** — local IDs changed, Directus has orphan records with old IDs (e.g., the Feb 28 PRD standardization: 57 IDs renamed)
2. **After Directus database reset** — D11 was wiped/restored and needs repopulating
3. **Schema migration** — a new required field was added and all records need updating

**When NOT to run:**
- Daily workflow — use `synque CARD-XXX` for individual docs
- "Just to make sure everything is synced" — Directus is a collaboration window, not a mirror
- After editing a few files — synque them individually

```bash
# DANGEROUS — only run with explicit justification
source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/bulk-resynque.ts                    # Sync all + report orphans
source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/bulk-resynque.ts --archive-orphans  # Sync all + archive stale records
```

## Prerequisites

### Required Frontmatter (All Doc Types)
All docs must have YAML frontmatter for sync to work:
```yaml
---
id: "CARD-XXX"            # Required - matches Directus .code field
title: "Doc Title"        # Required
status: "draft"           # Required - draft|pending|in-progress|done|blocked|ready
---
```

**Additional fields by type:**
- **Cards**: `author`, `team`, `business_requirement`, `story`
- **Stories**: `prd`, `author`
- **PRDs**: `owner`, `category`, `pattern`, `project`

### Shell Environment
Commands require Node 22+ (for native fetch). Always prefix with:
```bash
source ~/.nvm/nvm.sh && nvm use 22 && <command>
```

### Sync Scripts (All 4 exist and work)
| Script | Doc Type | Purpose |
|--------|----------|---------|
| `scripts/sync/sync-single-card.ts` | Card | Sync card to Directus `cards` collection |
| `scripts/sync/sync-single-story.ts` | Story | Sync story to Directus `stories` collection |
| `scripts/sync/sync-single-prd.ts` | PRD | Sync PRD to Directus `prd_documents` collection |
| `scripts/sync/bulk-resynque.ts` | All | Bulk sync all + orphan detection/archival |

## Activation Triggers

This skill responds to five distinct triggers. Each has a specific workflow.

---

### Trigger 1: `synque` (Primary Command)

**User says**: "synque", "synque CARD-001", "synque US-AUTH-001", "synque AS-AUTH-002", "synque PRD-ORDER-MANAGEMENT", "synque docs/prds/PRD-001.md"

**What it does**: Complete doc lifecycle - detect type, resolve, validate, sync, and check comments.

```
┌─────────────────────────────────────────────────────────────┐
│      synque CARD-001 / US-AUTH-001 / AS-XXX / PRD-ORDER      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 0: Detect Doc Type + Resolve Input                    │
│  - CARD-* → card, US-*/AS-* → story, PRD-* → prd            │
│  - Local file? → Use it                                     │
│  - ID only? → Search in correct docs/ subdirectory          │
│  - Not found? → Error (use URL trigger to pull)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Format Validation                                  │
│  - Check YAML frontmatter                                   │
│  - Missing? → BLOCK and prompt conversion                   │
│  - Valid? → Continue                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Sync to Directus (doc-type-aware)                  │
│  card:  npx tsx scripts/sync/sync-single-card.ts <path>     │
│  story: npx tsx scripts/sync/sync-single-story.ts <path>    │
│  prd:   npx tsx scripts/sync/sync-single-prd.ts <path>      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Check PM Comments                                  │
│  - Pull comments from Directus                              │
│  - Categorize by priority                                   │
│  - Offer interactive resolution                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Frontend Options                                   │
│  - Offer to view in browser (production/local)              │
└─────────────────────────────────────────────────────────────┘
```

**Example**:
```
User: synque CARD-PAY-011
AI: 📂 Found local file: docs/cards/CARD-PAY-011.md
    ✅ Format valid
    🔄 Syncing to Directus...
    ✅ Synced successfully
    📝 No PM comments found
    📱 View in browser? [Production / Local / Skip]
```

---

### Trigger 2: `synque` + URL (Pull from Directus)

**User says**: "synque https://synque.hk/docs/cards/CARD-PAY-011", "synque https://synque.hk/docs/stories/US-AUTH-001", "synque https://synque.hk/docs/stories/AS-AUTH-002", "synque https://synque.hk/docs/prds/PRD-ORDER-MANAGEMENT"

**What it does**: Extract doc ID + type from URL → Pull from Directus if not local → Full synque workflow.

```
┌─────────────────────────────────────────────────────────────┐
│   synque https://synque.hk/docs/{type}/{DOC-ID}             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Parse URL                                                  │
│  /docs/cards/CARD-XXX   → type=card,  id=CARD-XXX           │
│  /docs/stories/US-XXX   → type=story, id=US-XXX             │
│  /docs/stories/AS-XXX   → type=story, id=AS-XXX             │
│  /docs/prds/PRD-XXX     → type=prd,   id=PRD-XXX            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Search Local: docs/{type-dir}/{DOC-ID}.md                  │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Found ✅                    Not Found ❌
              │                           │
              │                           ▼
              │         ┌─────────────────────────────────────┐
              │         │  Pull from Directus API             │
              │         │  GET synque.hk/api/docs?path=...    │
              │         └─────────────────────────────────────┘
              │                           │
              │                           ▼
              │         ┌─────────────────────────────────────┐
              │         │  Save to docs/cards/                │
              │         │  CARD-PAY-011.md                    │
              │         └─────────────────────────────────────┘
              │                           │
              └───────────┬───────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Continue with Trigger 1 workflow (validate → sync → ...)   │
└─────────────────────────────────────────────────────────────┘
```

**Example**:
```
User: synque https://synque.hk/docs/cards/CARD-PAY-011
AI: 🔍 Parsing URL...
    Extracted Card ID: CARD-PAY-011
    📂 Searching locally... Not found
    🌐 Pulling from Directus API...
    ✅ Saved: docs/cards/CARD-PAY-011.md
    [continues with sync workflow]
```

---

### Trigger 3: `sync card/story/prd` (Push Only)

**User says**: "sync card CARD-001", "sync story US-AUTH-001", "sync story AS-AUTH-002", "sync prd PRD-ORDER-MANAGEMENT", "push to directus"

**What it does**: Push local doc to Directus. No comment processing. Auto-detects doc type.

```
┌─────────────────────────────────────────────────────────────┐
│       sync {card|story|prd} <ID-or-path>                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Detect Type + Validate Format                              │
│  - YAML frontmatter required                                │
│  - Missing? → BLOCK and prompt conversion                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Sync to Directus (type-aware script)                       │
│  card:  npx tsx scripts/sync/sync-single-card.ts <path>     │
│  story: npx tsx scripts/sync/sync-single-story.ts <path>    │
│  prd:   npx tsx scripts/sync/sync-single-prd.ts <path>      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Done (no comment check)                                    │
└─────────────────────────────────────────────────────────────┘
```

**Examples**:
```
User: sync card docs/cards/CARD-001.md
AI: ✅ Format valid
    🔄 Syncing to Directus...
    ✅ UPDATED: CARD-001
    Collection: cards

User: sync prd docs/prds/PRD-ORDER-MANAGEMENT.md
AI: ✅ Format valid
    🔄 Syncing to Directus...
    ✅ UPDATED: PRD-ORDER-MANAGEMENT
    Collection: prd_documents

User: sync story US-AUTH-001
AI: 📂 Found: docs/stories/US-AUTH-001.md
    ✅ Format valid
    🔄 Syncing to Directus...
    ✅ UPDATED: US-AUTH-001
    Collection: stories
```

---

### Trigger 4: `pm comments` (Process Comments)

**User says**: "pm comments", "check pm comments", "what did PM say about CARD-001", "pm comments US-AUTH-001", "pm comments AS-AUTH-002"

**What it does**: Pull comments from Directus → Categorize → Offer interactive resolution. Auto-detects collection from doc ID.

```
┌─────────────────────────────────────────────────────────────┐
│    pm comments CARD-001 / US-AUTH-001 / AS-XXX / PRD-ORDER  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Pull Comments from Directus (collection-aware)             │
│  CARD-*:      filter[collection]=cards                      │
│  US-*/AS-*:   filter[collection]=stories                    │
│  PRD-*:       filter[collection]=prd_documents              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Categorize by Priority                                     │
│  - High: "must", "critical", "urgent"                       │
│  - Medium: "add", "implement", "create"                     │
│  - Low: "clarify", "explain", "nice to have"                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Interactive Resolution                                     │
│  [1] Address all comments                                   │
│  [2] Start with high priority                               │
│  [3] Show implementation plan                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  For Each Comment:                                          │
│  - Show proposed change                                     │
│  - Ask: "Does this address the concern?"                    │
│  - Mark as resolved or iterate                              │
└─────────────────────────────────────────────────────────────┘
```

**Example**:
```
User: pm comments CARD-D11-SYNC-006
AI: 📝 Found 3 PM comments:

    1. [HIGH] "add error handling for network failures"
       → Action: Add try-catch blocks

    2. [MEDIUM] "draw an ascii diagram for PM to understand"
       → Action: Create visual diagram

    3. [LOW] "clarify the acceptance criteria"
       → Action: Update documentation

    Would you like me to:
    [1] Address all comments
    [2] Start with high priority only
    [3] Show implementation plan first
```

---

### Trigger 5: `pull comments` (Fetch Only)

**User says**: "pull comments", "get comments", "fetch comments from directus"

**What it does**: Fetch and display comments. No processing or interactive resolution. Auto-detects collection from doc ID.

```
┌──────────────────────────────────���──────────────────────────┐
│                   pull comments CARD-001                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Fetch from Directus                                        │
│  GET /items/directus_comments?filter[collection]=cards      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Display Raw Comments                                       │
│  - Author, timestamp, content                               │
│  - No categorization                                        │
│  - No interactive actions                                   │
└─────────────────────────────────────────────────────────────┘
```

**Example**:
```
User: pull comments CARD-001
AI: 📥 Comments for CARD-001:

    [2026-02-14 10:30] jimmy:
    "Please add error handling"

    [2026-02-14 11:45] pm:
    "Looks good, approved for production"

    Total: 2 comments
```

---

### Behavior Rules Summary

| Condition | Behavior |
|-----------|----------|
| Missing YAML frontmatter | BLOCK sync, prompt for conversion |
| Old markdown table format | FORCE conversion (no skip) |
| Doc not found locally (with URL) | Pull from Directus API (any type) |
| Doc not found anywhere | Error with helpful message |
| Comments found | Categorize by priority keywords |
| Unknown doc type | Ask user to specify (card/story/prd) |
| "synque all" / "bulk synque" | Warn: maintenance tool only. Use `bulk-resynque.ts` if confirmed |

## "synque" Command Workflow

When user says **"synque"**, follow this **process**:

### Step 0: Input Detection & Card Resolution

**Detect input type, doc type, and resolve to local file:**

| Input Type | Example | Doc Type | Action |
|------------|---------|----------|--------|
| Local file path | `docs/cards/CARD-001.md` | card | Use directly |
| Local file path | `docs/stories/US-AUTH-001.md` | story | Use directly |
| Local file path | `docs/stories/AS-AUTH-002.md` | story | Use directly |
| Local file path | `docs/prds/PRD-ORDER-MANAGEMENT.md` | prd | Use directly |
| Doc ID | `CARD-PAY-011` | card | Search `docs/cards/` |
| Doc ID | `US-AUTH-001` | story | Search `docs/stories/` |
| Doc ID | `AS-AUTH-002` | story | Search `docs/stories/` |
| Doc ID | `PRD-ORDER-MANAGEMENT` | prd | Search `docs/prds/` |
| synque.hk URL | `https://synque.hk/docs/cards/CARD-PAY-011` | card | Extract ID, search locally |
| synque.hk URL | `https://synque.hk/docs/stories/US-AUTH-001` | story | Extract ID, search locally |
| synque.hk URL | `https://synque.hk/docs/stories/AS-AUTH-002` | story | Extract ID, search locally |
| synque.hk URL | `https://synque.hk/docs/prds/PRD-ORDER-MANAGEMENT` | prd | Extract ID, search locally |

#### Doc Type Detection from ID
```
CARD-*       → card   → docs/cards/   → sync-single-card.ts
US-* or AS-* → story  → docs/stories/ → sync-single-story.ts
PRD-*        → prd    → docs/prds/    → sync-single-prd.ts
```

#### URL Parsing
Extract doc type + ID from URL pattern:
```
https://synque.hk/docs/cards/CARD-PAY-011      → card,  CARD-PAY-011
https://synque.hk/docs/stories/US-AUTH-001     → story, US-AUTH-001
https://synque.hk/docs/stories/AS-AUTH-002     → story, AS-AUTH-002
https://synque.hk/docs/prds/PRD-ORDER-MGMT     → prd,   PRD-ORDER-MGMT
```

#### Local Search
```bash
# Search locally — files are named {id}.md (no slug suffix)
# Card:
find docs/cards -name "CARD-PAY-011.md" 2>/dev/null
# Story (US- or AS- prefix):
find docs/stories -name "US-AUTH-001.md" 2>/dev/null
find docs/stories -name "AS-AUTH-002.md" 2>/dev/null
# PRD:
find docs/prds -name "PRD-ORDER-MANAGEMENT.md" 2>/dev/null
```

#### Pull from Directus (if not found locally)
If card doesn't exist locally, pull from Directus API:

```bash
# Using Node.js (preferred - handles JSON parsing)
node -e "
const https = require('https');
const fs = require('fs');
const cardId = 'CARD-PAY-011';
const url = 'https://synque.hk/api/docs?path=docs/cards/' + cardId;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error('Card not found in Directus:', json.error);
        process.exit(1);
      }
      // Files are named {id}.md (no slug suffix)
      const localPath = 'docs/cards/' + cardId + '.md';
      fs.writeFileSync(localPath, json.content);
      console.log('✅ Pulled from Directus:', localPath);
      console.log('Source:', json.source);
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      process.exit(1);
    }
  });
}).on('error', e => {
  console.error('Network error:', e.message);
  process.exit(1);
});
"
```

#### Resolution Flow Diagram
```
┌──────────────────────────────────────────────────────────┐
│                    User Input                            │
│  (URL / Card ID / File Path)                             │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Extract Doc ID                              │
│  URL: https://synque.hk/docs/cards/CARD-XXX → CARD-XXX   │
│  ID: CARD-XXX → CARD-XXX                                 │
│  Path: docs/cards/CARD-XXX.md → CARD-XXX                 │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Search Local Files                          │
│  glob: docs/{type-dir}/{DOC-ID}.md                       │
└──────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         Found ✅                 Not Found ❌
              │                       │
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────────────────┐
│  Use Local File     │   │  Pull from Directus API         │
│                     │   │  GET synque.hk/api/docs?path=   │
└─────────────────────┘   └─────────────────────────────────┘
              │                       │
              │               ┌───────┴───────┐
              │               │               │
              │          Found ✅        Not Found ❌
              │               │               │
              │               ▼               ▼
              │   ┌───────────────────┐  ┌──────────────────┐
              │   │ Save to Local     │  │ Error: Card not  │
              │   │ docs/cards/       │  │ found anywhere   │
              │   └───────────────────┘  └──────────────────┘
              │               │
              └───────┬───────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              Continue with Sync Workflow                 │
│              (Step 1: Format Validation)                 │
└──────────────────────────────────────────────────────────┘
```

### Step 1: Sync to Directus (Execute Command)
1. **Run the correct sync command based on doc type**:
   ```bash
   # Card:
   source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/sync-single-card.ts <path>
   # Story:
   source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/sync-single-story.ts <path>
   # PRD:
   source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/sync-single-prd.ts <path>
   ```
2. **Wait for sync completion** before proceeding to comments
3. **Verify sync success** before pulling comments

### Step 2: PM Comments Processing (This Skill)
After successful sync, proceed with comment workflow:

## Workflow

### Step 0: Format Validation (STRICT - Must Convert)
Before ANY sync operation:
1. **ENFORCE format requirements**:
   - ❌ YAML frontmatter is MANDATORY (no exceptions)
   - ❌ Required fields MUST exist: `id`, `title`, `status`
   - ⚠️ Recommended fields SHOULD exist: `author`, `team`, `created_date`
   - ✅ ID must match filename exactly (files are named `{id}.md`)

2. **AUTO-CONVERT old formats (no skip option)**:
```
🛑 MANDATORY Format Update Required: CARD-001.md

❌ BLOCKING Issues:
- Missing YAML frontmatter (cannot sync without it)
- Old markdown table format detected

🔄 I MUST convert this to the new format before syncing.

The card will be updated with:
---
id: CARD-001
title: "Extracted from content"
status: "pending"
author: "auto-converted"
team: "Unknown"
created_date: "2026-02-14"
---

[1] Convert and sync now (recommended)
[2] Show me the full conversion first
[3] Abort operation

Note: Cards without YAML frontmatter CANNOT be synced to Directus.
```

3. **Auto-fix with permission**:
   - Extract existing metadata from content
   - Apply card template with proper YAML frontmatter
   - Preserve all existing content
   - Show diff before applying changes

### Step 1: Pull & Parse Comments
When comments are retrieved, AI should:
1. Identify action items vs informational comments
2. Categorize requests (bug fix, feature add, clarification, etc.)
3. Priority assessment based on keywords

### Step 2: Interactive Planning
```
AI: I found 3 PM comments on CARD-D11-SYNC-006:

📝 Comment 1: "draw an ascii diagram for PM to understand"
   → Action: Create visual diagram
   → Priority: Medium

📝 Comment 2: "add error handling for network failures"
   → Action: Add try-catch blocks
   → Priority: High

📝 Comment 3: "clarify the acceptance criteria"
   → Action: Update documentation
   → Priority: Low

Would you like me to:
1. Address all comments now
2. Start with high priority only
3. Show me the implementation plan first
```

### Step 3: Implementation Actions

#### For "draw an ascii diagram":
```
┌─────────────┐     Pull      ┌──────────────┐
│   Local MD  │ ◄───────────── │   Directus   │
│    Files    │                │   Comments   │
└─────────────┘                └──────────────┘
      │                               ▲
      │ Parse                         │
      ▼                               │
┌─────────────┐                ┌──────────────┐
│  Developer  │ ───────────►   │      PM      │
│   Reviews   │     Sync       │   Feedback   │
└─────────────┘                └──────────────┘
```

#### For "add error handling":
```typescript
try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  return await response.json()
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network failure:', error)
    return fallbackData
  }
  throw error
}
```

### Step 4: Confirmation Loop
After addressing each comment:
1. Show the change to user
2. Ask: "Does this address the PM's comment?"
3. If yes, mark as resolved
4. If no, iterate with user feedback

## Comment Patterns Recognition

### Action Keywords
- **High Priority**: "must", "critical", "urgent", "breaking", "failed"
- **Feature Request**: "add", "implement", "create", "build"
- **Bug Fix**: "fix", "broken", "error", "fails", "doesn't work"
- **Clarification**: "clarify", "explain", "unclear", "what does"
- **Visual**: "diagram", "chart", "visualize", "draw"

### Response Templates

#### For Clarification Requests
```markdown
## Clarification: [Topic]

The PM asked: "[original comment]"

### Current Implementation
[explain current state]

### Proposed Clarification
[detailed explanation]

### Updated Documentation
[revised text for docs]
```

#### For Feature Requests
```markdown
## Feature Implementation: [Feature Name]

PM Request: "[original comment]"

### Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Code Changes
[show code blocks]

### Testing
[test cases]
```

## Interactive Commands

When handling comments, provide these options:
```
[1] Address all comments
[2] Address by priority (High → Low)
[3] Show implementation plan only
[4] Skip informational comments
[5] Create a new card for complex requests
```

## Frontend Integration

When "synque" is triggered, always offer frontend viewing options:

### URL Patterns (All Doc Types)
| Doc Type | Production | Local |
|----------|-----------|-------|
| Card | `https://synque.hk/docs/cards/[CARD-ID]` | `http://localhost:3000/docs/cards/[CARD-ID]` |
| Story | `https://synque.hk/docs/stories/[STORY-ID]` | `http://localhost:3000/docs/stories/[STORY-ID]` |
| PRD | `https://synque.hk/docs/prds/[PRD-ID]` | `http://localhost:3000/docs/prds/[PRD-ID]` |

**Note:** All doc files are named `{id}.md`, so the URL path segment matches the YAML `id` field for all doc types. All PRD IDs have the `PRD-` prefix (e.g., `PRD-ORDER-MANAGEMENT`, `PRD-AI-CHAT`).

### Interactive Prompt (USE AskUserQuestion TOOL)
**IMPORTANT**: Use the `AskUserQuestion` tool to ask - don't just display URLs.

```
AI uses AskUserQuestion with:
- question: "View document in browser?"
- header: "Frontend"
- options:
  - label: "Production (synque.hk)"
    description: "https://synque.hk/docs/{type}/{ID}"
  - label: "Local (localhost:3000)"
    description: "http://localhost:3000/docs/{type}/{ID}"
  - label: "Skip"
    description: "Continue without opening browser"
```

If user selects Production or Local, respond with the clickable URL.

Benefits:
- PM can see the card with Directus sync panel
- Comments are visible in the right sidebar
- Real-time sync status shown
- Can add more comments directly from UI

## Format Auto-Fix Templates

### Card Format Fix
```markdown
---
id: CARD-OAUTH-001
title: "Google OAuth Login Testing & Verification"
status: "done"
author: "jimmy"
team: "Backend"
created_date: "2026-01-31"
last_updated: "2026-01-31"
project: "oauth"
type: "card"
---

# CARD-OAUTH-001: Google OAuth Login Testing & Verification

[Original content preserved...]
```

### Story Format Fix
```markdown
---
id: US-001
title: "User can login with Google OAuth"
status: "done"
author: "pm"
created_date: "2026-01-31"
project: "oauth"
parent_prd: "PRD-SOCIAL-OAUTH"
type: "story"
---

# US-001: User can login with Google OAuth

[Original content preserved...]
```

## Example Usage: Pull from URL

```bash
User: synque https://synque.hk/docs/cards/CARD-PAY-011

AI: 🔍 Parsing URL: https://synque.hk/docs/cards/CARD-PAY-011
    Extracted Card ID: CARD-PAY-011

    📂 Searching locally...
    No local file found for CARD-PAY-011

    🌐 Pulling from Directus API...
    GET https://synque.hk/api/docs?path=docs/cards/CARD-PAY-011

    ✅ Card pulled successfully!
    Saved to: docs/cards/CARD-PAY-011.md
    Source: directus

    ## Card Summary
    | Field | Value |
    |-------|-------|
    | ID | CARD-PAY-011 |
    | Title | 插入支付网关测试数据 |
    | Status | done |
    | Team | Database & Directus |

    📱 View in browser?
    [1] Production (synque.hk)
    [2] Local (localhost:3000)
    [3] Continue

User: 3

AI: Card is now available locally at:
    docs/cards/CARD-PAY-011.md

    No PM comments found. Ready for next action.
```

## Example Usage with STRICT Format Enforcement

```bash
User: synque CARD-OAUTH-001.md

AI: 🛑 CANNOT SYNC - Format Update Required!

    File: CARD-OAUTH-001.md

    ❌ BLOCKING Issue: No YAML frontmatter detected
    This file uses the old markdown table format and MUST be converted.

    I will convert it to:
    ---
    id: CARD-OAUTH-001
    title: "Google OAuth Testing"
    status: "done"
    author: "auto-converted"
    team: "Backend"
    created_date: "2026-02-14"
    ---

    [Original content will be preserved below]

    Options:
    [1] Convert and sync now ← Recommended
    [2] Show me the full diff first
    [3] Abort (card will remain unsynced)

    Choose:

User: 1

AI: ✅ Fixed CARD-OAUTH-001.md format!

    🔄 Now syncing card to Directus...
    Running: source ~/.nvm/nvm.sh && nvm use 22 && npx tsx scripts/sync/sync-single-card.ts docs/cards/CARD-OAUTH-001.md

    ✅ Card synced successfully to Directus!

# Step 2: PM Comments - Pull and Process
    Now checking for comments...

    Changes made:
    - Added YAML frontmatter with proper id field
    - Extracted title, status, dates from content
    - Preserved all existing content

    Now checking for comments...
    Found 0 comments (no comments yet)

    📱 Next steps:
    [1] Open frontend: https://synque.hk/docs/cards/CARD-OAUTH-001
    [2] Sync to Directus to enable comments
    [3] Continue with next card

User: Y

AI: Implementing network error handling...
    [shows code changes]

    This adds try-catch with specific NetworkError handling.
    Does this address the PM's concern? [Y/n]

User: Y

AI: ✅ Marked as addressed. Moving to next comment...

    For the ASCII diagram request, here's a flow diagram:
    [shows diagram]

    Should I add this to the documentation? [Y/n]
```

## Benefits
1. **Faster iteration** - AI immediately understands and acts on feedback
2. **Less context switching** - Developer stays in flow
3. **Clear accountability** - Each comment gets addressed
4. **PM visibility** - Changes directly tied to their feedback

## Implementation Files
- `/api/sync/pull-comments` - API endpoint
- `lib/pm-comment-parser.ts` - Comment analysis logic (TODO)
- `components/pm-comments-handler.tsx` - UI component (TODO)

## Related Cards
- CARD-D11-SYNC-006: Developer Pull Comments CLI
- CARD-D11-SYNC-004: PM Comments System

---

## API Reference: Pull from Directus

### Endpoint
```
GET https://synque.hk/api/docs?path=docs/cards/{CARD-ID}
```

### Response (Success)
```json
{
  "path": "docs/cards/CARD-PAY-011.md",
  "content": "---\nid: CARD-PAY-011\ntitle: ...\n---\n\n# Content...",
  "source": "directus"
}
```

### Response (Not Found)
```json
{
  "error": "Document not found: docs/cards/CARD-XXX"
}
```

### Source Priority
The API tries these sources in order:
1. **Directus** (if `DIRECTUS_PRD_ENDPOINT` configured) - returns `source: "directus"`
2. **Local filesystem** (fallback) - returns `source: "filesystem"`

### Supported Document Types
| Type | URL Pattern | Collection |
|------|-------------|------------|
| Card | `/docs/cards/CARD-XXX` | `cards` |
| Story | `/docs/stories/US-XXX` or `/docs/stories/AS-XXX` | `stories` |
| PRD | `/docs/prds/PRD-XXX` | `prd_documents` |

### Implementation
See: `app/api/docs/route.ts`