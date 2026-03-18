# Commit Workflow

## Overview

When committing code that relates to a card, include card updates in the same commit. This ensures documentation stays in sync with code.

**Rule**: Code + Card + progress-data.ts = Single Atomic Commit

## Atomic Commit Pattern

```bash
# Single commit includes:
# 1. Code changes (the implementation)
# 2. Card update (status, acceptance criteria, changelog)
# 3. progress-data.ts update (if card is tracked there)

git add src/components/feature.tsx        # Code
git add docs/cards/CARD-XXX.md           # Card (filename = ID.md)
git add lib/progress-data.ts              # Progress tracking
git commit -m "feat(feature): implement X (CARD-XXX)"
```

## What to Update in Cards

| Field | When to Update |
|-------|----------------|
| `status` | `pending` → `in-progress` → `done` |
| `updated` | Always (current date) |
| `completed_date` | When status becomes `done` |
| Acceptance Criteria | `[ ]` → `[x]` as items are done |
| Changelog | Add entry with date, author, change |

### Example Card Update

**Before:**
```yaml
---
id: CARD-XXX
status: "in-progress"
updated: "2026-02-15"
---
```

**After:**
```yaml
---
id: CARD-XXX
status: "done"
updated: "2026-02-16"
completed_date: "2026-02-16"
---
```

**Acceptance Criteria:**
```markdown
## Acceptance Criteria
- [x] Feature implemented    # Was [ ]
- [x] Tests passing          # Was [ ]
```

**Changelog:**
```markdown
## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-02-16 | Claude | **COMPLETED** - All acceptance criteria met |
```

## Code-to-Docs Sync Pattern

When implementing code, always check if it relates to existing cards.

### Sync Checklist

1. **Before coding**: Search for related cards
   ```bash
   grep -r "feature-name" docs/cards/
   ```

2. **After implementing**: Update the card
   - Mark acceptance criteria as done `[x]`
   - Update status if appropriate
   - Add changelog entry

3. **Update progress-data.ts** if the card is tracked
   ```bash
   grep "CARD-XXX" lib/progress-data.ts
   ```

4. **Commit together**: Code + Card + progress-data.ts

### Finding Related Cards

| Implementation Type | Card Pattern to Search |
|--------------------|------------------------|
| New route `/progress` | `CARD-*-progress*` |
| API endpoint | `CARD-*-api*`, `CARD-*-endpoint*` |
| Component | `CARD-*-{component-name}*` |
| Bug fix | Check card that introduced the feature |

### progress-data.ts Updates

When a card status changes, update `lib/progress-data.ts`:

```typescript
// In LAYER_DOCUMENTS array
{
  type: 'card',
  id: 'CARD-XXX',
  title: 'Card Title',
  path: 'docs/cards/CARD-XXX.md',
  link: '/docs/cards/CARD-XXX',
  status: 'done',  // Update this
},
```

## Key Files

| File | Purpose |
|------|---------|
| `docs/cards/CARD-*.md` | Card markdown files |
| `lib/progress-data.ts` | Progress tracking data |
| `references/card-template-v2.md` | Card schema reference |
| `references/progress-tracking.md` | What data to update |

## Status Values

| Status | Meaning |
|--------|---------|
| `draft` | Not started, initial state |
| `pending` | Planned, not yet active |
| `in-progress` | Currently working on |
| `done` | Completed and verified |
| `blocked` | Waiting on dependency |
| `ready` | Ready for next phase |

## Example Commit Message

```
feat(progress): add status badges to card display (CARD-DEVOPS-002)

- Add status badges to Status View tab
- Add status badges to Review tab timeline
- Add status badges to Comments panel
- Create cardStatusMap with useMemo for O(1) lookups

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## When NOT to Update Cards

- Quick bug fixes unrelated to any card
- Dependency updates
- Formatting/linting changes
- README updates (unless tracked by a card)

## Verification

After committing, verify:
- [ ] Card status matches implementation state
- [ ] Acceptance criteria checkboxes are accurate
- [ ] Changelog has latest entry
- [ ] `/progress` page shows correct status (if deployed)

## Coherence Feedback Loop (CARD-HEALTH-001)

After bulk changes that touch multiple layers, run the coherence loop:

```
Change Layer 1 (data/docs)  → Run /team-health quick  → Fix Layer 2+3 drift
Change Layer 2 (code)       → Run /team-health quick  → Fix Layer 1+3 drift
Change Layer 3 (skills)     → Run /team-health quick  → Fix Layer 1+2 drift
```

**Why**: Each layer assumes the others are correct. Changing one without checking the others creates silent drift that compounds. Skills teaching wrong grep patterns, code using wrong field names, data with non-canonical values — all invisible until an agent produces wrong results.

**Pattern**: Change → Test against reality → Discover gap → Fix → Repeat until clean.

**Trigger**: After editing 3+ files across different layers, or after any skill modification.
