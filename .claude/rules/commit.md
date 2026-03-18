---
paths:
  - ".git/**"
---

# Commit Rules

## Atomic Commits (Rule 2)

Code + Card together in every commit. Never commit code without its card update.

## Commit Message Format

Subject line must START with a document reference:
- `CARD-XXX: description` — task card
- `US-XXX: description` — user story
- `PRD-XXX: description` — product requirement

Examples:
- `CARD-RIGID-002: add path-scoped rule files`
- `US-RIGID-004: modularize CLAUDE.md`
- `PRD-RIGID-ARCHITECTURE: add enforcement phase`

PreToolUse Check 7 enforces this.

## Code References

Add `@card` or `@story` comments at top of file or function:
```typescript
// @card CARD-PAY-011 — payment test data insertion
function insertTestData() { ... }

// @story US-WW-ENV-001 — standalone landing kills nav chrome
const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_LANDING === 'true'
```

## Lint Before Commit

Run relevant lint script before committing. PostToolUse hook handles this for Edit/Write.
For manual commits: `bash .claude/hooks/lint-prd.sh`, `lint-card.sh`, `lint-story.sh`, `lint-d11.sh`.

## --no-verify Blocked

`git commit --no-verify` is denied by permission rule. Do not attempt to bypass.
