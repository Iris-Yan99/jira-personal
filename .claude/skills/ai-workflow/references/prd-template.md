# PRD Template

## File Location

```
docs/prds/PRD-{FEATURE-NAME}.md
```

## YAML Frontmatter (Required)

### Basic Version (Minimum Required)

```yaml
---
id: "PRD-FEATURE-NAME"             # REQUIRED: PRD- prefix + UPPERCASE (e.g., PRD-AI-CHAT, PRD-ORDER-MANAGEMENT)
title: "Feature Title"
description: "Brief description of the feature"
status: "draft"                   # draft | pending | in-progress | done | blocked | ready
pattern: discovery-driven         # collection-driven | discovery-driven | requirements-first
keyLearning: "Main takeaway from this implementation"
project: ww                       # ww | rk | vec

relatedCollections:
  - collection_name               # Database collections this feature uses

tags:
  - relevant-tag

verification:
  codeExists: false
  prdAccurate: unknown            # accurate | partial | outdated | missing | unknown
  testsExist: false
  lastVerified: null              # Format: "YYYY-MM"
---
```

### PRD v2.0 Version (Recommended)

```yaml
---
# ============ IDENTIFICATION ============
id: "PRD-FEATURE-NAME"                    # PRD- prefix + UPPERCASE
title: "Feature Title"
description: "Brief description of the feature"

# ============ OWNERSHIP (v2.0) ============
owner: "Claude"                   # Who owns this feature
category: "developer-tools"       # High-level grouping
product_area: "Feature Domain"    # Business domain

# ============ LIFECYCLE ============
status: "draft"                   # draft | pending | in-progress | done | blocked | ready
pattern: requirements-first       # collection-driven | discovery-driven | requirements-first
keyLearning: "Key insight from this work"
createdDate: "2026-01-26"
lastUpdated: "2026-01-26"

# ============ RELATIONSHIPS (v2.0) ============
relatedCollections:
  - collection_name
stories:                          # v2.0 - structured array
  - US-030
  - US-031
cards:                            # v2.0 - structured array
  - CARD-030-A
  - CARD-030-B
relatedPRDs:                      # v2.0 - explicit PRD links
  - PRD-001
  - PRD-015
source_memo: null                 # v2.0 - or 'MEMO-001'
tags:
  - tag1
  - tag2

# ============ QUALITY (v2.0) ============
verification:
  codeExists: false
  prdAccurate: unknown
  testsExist: false
  lastVerified: null
trustLevel: medium                # v2.0 - high | medium | low

# ============ MULTI-PROJECT ============
project: ww                       # ww | rk | vec

# ============ PROGRESS TRACKING (YAML-First) ============
# This replaces the markdown "Progress Checklist" section
# The Progress tab reads from this YAML data (with markdown fallback for legacy PRDs)
progressPhases:
  - phase: "Phase 0: Planning & Design"
    status: "done"                  # done | in-progress | pending | blocked
    tasks:
      - text: "Analyze requirements"
        completed: true
      - text: "Design architecture"
        completed: true
      - text: "Create PRD document"
        completed: true
      - text: "Break down into stories"
        completed: false
  - phase: "Phase 1: Documentation"
    status: "in-progress"
    tasks:
      - text: "Create User Stories"
        completed: true
      - text: "Create Technical Cards"
        completed: false
      - text: "Register in prd-data.ts"
        completed: false
  - phase: "Phase 2: Implementation"
    status: "pending"
    tasks:
      - text: "Implement core functionality"
        completed: false
      - text: "Add error handling"
        completed: false
  - phase: "Phase 3: Testing"
    status: "pending"
    tasks:
      - text: "Unit tests"
        completed: false
      - text: "Integration tests"
        completed: false
---
```

## Markdown Body Template

```markdown
# PRD: Feature Title

> One-line description

---

## 📝 Changelog (PRD v2.0)

| Date | Change | Reason | Author |
|------|--------|--------|--------|
| YYYY-MM-DD | Created PRD | Initial feature planning | [Name] |
| YYYY-MM-DD | Added Stories US-XXX to US-YYY | Break down into user stories | [Name] |
| YYYY-MM-DD | Added implementation cards | Define technical tasks | [Name] |

---

## 📋 Progress Tracking (YAML-First)

**NEW IN v2.0**: Progress tracking moved to YAML frontmatter (`progressPhases` field).

**Why YAML instead of Markdown?**
- ✅ Machine-readable (can aggregate across PRDs)
- ✅ Single source of truth (no duplication)
- ✅ Aligns with YAML-first governance
- ✅ Easier to query and visualize

**Progress Tab Behavior:**
- The `/prd/{id}` Progress tab reads from YAML `progressPhases` field
- **Legacy support**: Falls back to markdown parsing for old PRDs
- See YAML template above for structure

**Migration Note:**
- Old PRDs with markdown `### Phase X: Title - STATUS` sections still work (fallback)
- New PRDs should use YAML `progressPhases` field only
- See `docs/architecture/PROGRESS-TRACKING-EVOLUTION.md` for migration plan

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [CARD-XXX](/docs/cards/CARD-XXX-...) | Technical card |
| [US-XXX](/docs/stories/US-XXX-...) | Parent user story |

---

## Overview

### Business Purpose
[Why is this feature needed? What problem does it solve?]

### User Personas
| Persona | Needs |
|---------|-------|
| [Role] | [What they need from this feature] |

### Success Metrics
- [Metric 1]
- [Metric 2]

---

## Features

### 1. [Feature Name]
[Description of the feature]

### 2. [Feature Name]
[Description of the feature]

---

## Architecture

### Component Map

```
/app/[feature]/
├── page.tsx                    ← Main page
├── [subpage]/page.tsx          ← Sub pages
└── ...

/components/[feature]/
├── component-name.tsx
└── ...

/lib/[feature]/
├── api.ts                      ← API client
└── hooks.ts                    ← React hooks
```

### State Management

[Describe Zustand store or React Context if applicable]

### API Integration

[Document API endpoints used]

```typescript
// Example API pattern
GET /items/{collection}?filter[orq][_eq]={orqId}
POST /items/{collection}
```

---

## Collections

### Primary Collections

| Collection | Fields | Relationships |
|------------|--------|---------------|
| [name] | [key fields] | [relationships] |

### API Patterns

```typescript
// Fetch with expansion
GET /items/{collection}?fields=*,relation.*

// Create
POST /items/{collection}
{ field: value }
```

---

## Key Learnings

### What Worked
- [Learning 1]

### What Didn't Work
- [Learning 1]

### Recommendations
- [Recommendation 1]

---

*Created: YYYY-MM*
*Status: [status]*
*Pattern: [pattern]*
```

## Progress Tracking (Phase 1 - YAML-First)

**Primary**: Update YAML frontmatter (source of truth)
- Add `progressPhases` field with task breakdown
- Update `verification` field with testing status
- Set `evolutionPhase`, `stories`, `cards` for relationship tracking

**Secondary** (temporary - until Phase 2 automation):
Update `lib/progress-data.ts` to sync with YAML:

```typescript
// Add to PRD_STATUSES (mirrors verification field from YAML)
export const PRD_STATUSES: PRDStatus[] = [
  {
    id: 'PRD-FEATURE-NAME',         // Must match YAML frontmatter id (PRD- prefix + UPPERCASE)
    title: 'Feature Title',
    codeExists: false,             // From YAML verification.codeExists
    prdAccurate: 'unknown',        // From YAML verification.prdAccurate
    testsExist: false,             // From YAML verification.testsExist
    lastVerified: null             // From YAML verification.lastVerified
  },
]
```

**Important**: YAML frontmatter is the source of truth. `progress-data.ts` is a temporary aggregation file.

**Future** (Phase 2): `progress-data.ts` will be auto-generated from YAML at build time.

See `docs/architecture/PROGRESS-TRACKING-EVOLUTION.md` for migration roadmap.

## Verification

After creating:

1. Visit `/prd` - PRD should appear in list (auto-discovered from YAML)
2. Visit `/prd/{id}` - Individual PRD page should work
3. Visit `/prd` Progress tab - Verify status shows correctly
4. Check `yarn build` passes

## Reference Examples

| Complexity | Example |
|------------|---------|
| Simple | `docs/PRD-csv-import.md` |
| Standard | `docs/prds/PRD-ORDER-MANAGEMENT.md` |
| Complex | `docs/prds/PRD-011-FE-vip-reservation-frontend.md` |
