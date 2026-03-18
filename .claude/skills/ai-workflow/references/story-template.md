# Story Template

## File Location

```
docs/stories/US-{NNN}-{description}.md
```

## Template

```markdown
---
id: "US-{NNN}"
title: "{Story Title}"
slug: "us-{nnn}-{description}"
status: "pending"
project: "{project-code}"
priority: "HIGH"
estimate: "{X-Y hours}"
prd: "{prd-id}"
tags:
  - {tag1}
  - {tag2}
---

# US-{NNN}: {Story Title}

> {One-line description}

## Story

**As a** [persona/role]
**I want to** [goal/desire]
**So that** [benefit/value]

---

## Acceptance Criteria

### AC-1: {Criteria Name}
```gherkin
Given [context/precondition]
When [action/trigger]
Then [expected outcome]
```

### AC-2: {Criteria Name}
```gherkin
Given [context/precondition]
When [action/trigger]
Then [expected outcome]
```

### AC-3: {Criteria Name}
```gherkin
Given [context/precondition]
When [action/trigger]
Then [expected outcome]
```

---

## Related Cards

| Card | Purpose | Status |
|------|---------|--------|
| [CARD-XXX](/docs/cards/CARD-XXX-...) | {Description} | {Status} |
| [CARD-YYY](/docs/cards/CARD-YYY-...) | {Description} | {Status} |

---

## Dependencies

- **Depends on**: [Other stories/features this depends on]
- **Blocks**: [Stories/features that depend on this]

---

## Technical Notes

### Collections Used
- `{collection_name}` - {purpose}

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /items/{collection} | {description} |
| POST | /items/{collection} | {description} |

---

## Notes

[Additional context, assumptions, or considerations]

---

## Source

- PRD: [PRD-XXX](/prd/xxx) - {PRD title}
- Investigation: [Link if applicable]

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | {Name} | Story created |

---

*Created: YYYY-MM-DD*
*Owner: {Team/Person}*
```

## YAML Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` | ✅ Yes | **Unique Story ID** (CRITICAL: story-parser requires this) | `"US-LR-001"` |
| `title` | ✅ Yes | Story title | `"Payment Link Generation"` |
| `slug` | ✅ Yes | URL-friendly identifier | `"us-lr-001-payment-link"` |
| `status` | ✅ Yes | Current status | `"pending"`, `"in-progress"`, `"done"` |
| `project` | ✅ Yes | Project code | `"lr"`, `"ww"`, `"rk"` |
| `priority` | Recommended | Priority level | `"HIGH"`, `"MEDIUM"`, `"LOW"`, `"CRITICAL"` |
| `estimate` | Recommended | Time estimate | `"8-12 hours"`, `"3-5 days"` |
| `prd` | Recommended | Parent PRD reference | `"lr-discovery"`, `"PRD-001"` |
| `tags` | Optional | Categorization tags | `["payment", "gateway", "lr"]` |

**IMPORTANT**: The `id` field is **required** for Story routes to work. Without it, story-parser.ts will fail validation and Stories will return 404 errors.

## Story Status Values

| Status | Meaning |
|--------|---------|
| pending | Initial creation, not yet started (replaces "Draft") |
| in-progress | Cards are being implemented |
| done | All acceptance criteria met |

## Linking Stories

### In Story → Link to Cards
```markdown
## Related Cards

| Card | Purpose | Status |
|------|---------|--------|
| [CARD-001](/docs/cards/CARD-001-xxx) | API implementation | Done |
```

### In Card → Link to Story
```yaml
---
story: "US-XXX"
---
```

### In PRD → Link to Stories
```markdown
## Related Documentation

| Document | Purpose |
|----------|---------|
| [US-XXX](/docs/stories/US-XXX-...) | User story for this feature |
```

## Reference Examples

- `docs/stories/US-001-developer-documentation-access.md`
- `docs/stories/US-021-FE-vip-reservation-frontend.md`

## Existing Templates

Copy from: `docs/templates/STORY_ANALYSIS.md`

```bash
cp docs/templates/STORY_ANALYSIS.md docs/stories/US-XXX-my-feature.md
```

## Changelog Standard

**Every story MUST have a changelog section.** Update it when:

| Event | Entry Format |
|-------|--------------|
| Story created | `Story created` |
| Status change | `Status: pending → in-progress` |
| Card added | `Added: CARD-XXX for {purpose}` |
| AC updated | `Updated: AC-{N} - {what changed}` |
| Story completed | `Completed: all ACs verified` |

### Changelog Format

```markdown
## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-02-11 10:00 | Claude | Completed: all ACs verified |
| 2026-02-11 08:00 | Claude | Updated: AC-1 - added edge case |
| 2026-02-10 14:00 | Claude | Added: CARD-002 for API implementation |
| 2026-02-10 10:00 | Claude | Story created |
```

### Rules

1. **Newest entries at top** - Most recent first
2. **Include timestamp** - Date and time (HKT preferred)
3. **Author attribution** - Who made the change
4. **Brief but informative** - One line summary
5. **Update on every significant change** - Status, AC, Card changes
