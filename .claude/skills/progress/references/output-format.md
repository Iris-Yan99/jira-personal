# Progress Output Formats

## Standard Summary Format

```markdown
📊 Progress Report: {SCOPE}

## Summary
- {completed} cards completed, {in_progress} in progress, {blocked} blocked
- Last activity: {relative_time}

## 🚫 Blocked ({count})
- {CARD-ID}: {title}
  └─ {blocker_comment} ({author}, {time_ago})
  └─ Action: {suggested_action}

## ⚡ In Progress ({count})
- {CARD-ID}: {title} ({author})
  └─ Last update: {relative_time}

## ✅ Completed ({count})
- {CARD-ID}: {title} ✓

## ⚠️ Risk
- {CARD-ID} has no updates in {days} days
```

## Compact Format (for quick checks)

```markdown
📊 {SCOPE}: {completed}✅ {in_progress}⚡ {blocked}🚫

🚫 CARD-XXX: {title} - "{comment_preview}..."
⚠️ CARD-YYY: stale {days}d
```

## Detailed Card Format

```markdown
## {CARD-ID}: {title}

| Field | Value |
|-------|-------|
| Status | {status_emoji} {status} |
| PRD | {parent_prd} |
| Author | {author} |
| Created | {created_date} |
| Updated | {date_updated} |

### Comments ({count})

**{author}** ({relative_time}):
> {comment_text}

### Acceptance Criteria
- [x] {completed_item}
- [ ] {pending_item}
```

## Status Emojis

| Status | Emoji |
|--------|-------|
| completed | ✅ |
| in_progress | ⚡ |
| blocked | 🚫 |
| pending | ⏳ |
| draft | 📝 |

## Priority Indicators

| Priority | Visual | Keywords |
|----------|--------|----------|
| BLOCKER | 🚫 | blocked, blocker, cannot proceed, 等待 |
| URGENT | ⚡ | urgent, asap, critical, 緊急 |
| QUESTION | ❓ | ?, clarify, 請問, 什麼意思 |
| WARNING | ⚠️ | > 3 days stale |
| RISK | 🔴 | > 7 days stale |

## Time Formatting

| Duration | Display |
|----------|---------|
| < 1 hour | "just now" |
| 1-23 hours | "{n}h ago" |
| 1-6 days | "{n}d ago" |
| 7+ days | "{date}" |

## Stale Thresholds

| Days | Label | Visual |
|------|-------|--------|
| 3-6 | Warning | ⚠️ |
| 7-13 | At Risk | 🔴 |
| 14+ | Abandoned? | ❌ |
