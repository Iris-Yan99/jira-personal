---
paths:
  - "docs/**"
  - "lib/prd-*.ts"
  - "lib/card-*.ts"
  - "lib/story-*.ts"
---

# Docs Rules

## Card-First Workflow (Rule 1)
Every code change needs a card. Card before code, not after.

## Document Hierarchy
```
PRD (Requirements) → docs/prds/PRD-*.md
  └── Story (Capabilities) → docs/stories/{US,AS}-*.md
        └── Card (Tasks) → docs/cards/CARD-*.md
              └── Code → @card CARD-XXX reference
```

## Document IDs
Filename = YAML `id:` field exactly. All UPPERCASE.
- `PRD-AI-CHAT.md` → `id: "PRD-AI-CHAT"`
- `US-AICHAT-001.md` → `id: "US-AICHAT-001"`
- `CARD-AICHAT-013.md` → `id: "CARD-AICHAT-013"`

## Lint Before Commit

| File type | Lint command |
|-----------|-------------|
| PRDs | `bash .claude/hooks/lint-prd.sh <file>` |
| Cards | `bash .claude/hooks/lint-card.sh <file>` |
| Stories | `bash .claude/hooks/lint-story.sh <file>` |

PostToolUse hook auto-runs these on Edit/Write.

## Layer Decision

New domain → **PRD**. New user capability → **Story**. Technical task → **Card**. Bug fix → **Code**.
