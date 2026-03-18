# Pattern Violations & Self-Correction

## Overview

This document defines common pattern violations that AI should **automatically detect and fix** without user intervention.

## Detection → Self-Correction Workflow

When AI identifies a pattern violation:

1. **Acknowledge**: "I notice I didn't follow the [pattern name] pattern"
2. **Fix**: Immediately correct the violation
3. **Explain**: Briefly explain what was wrong and how it's fixed
4. **Continue**: Resume the task without asking for permission

## Common Pattern Violations

### 1. Progress Tab: Cards Not Displaying

**Symptom**: User reports "I don't see the cards in the progress tab"

**Root Causes**:
- Cards defined in PRD frontmatter but files don't exist
- Card files exist but lack YAML frontmatter (legacy markdown-only format)
- Card loading logic expects YAML frontmatter only

**Auto-Fix Pattern**:
```typescript
// ✅ Correct: Two-tier fallback
if (data && data.title) {
  // Use YAML frontmatter
} else {
  // Parse markdown headers: # CARD-XXX: Title
  // Parse status: **Status**: ✅ Complete
}
```

**When to Apply**: Any time implementing card/story/document loading from markdown files

**Reference**: `app/prd/[id]/page.tsx` lines 80-133

---

### 2. Phase Content Not Displaying

**Symptom**: User says "the progress tab doesn't show all" (referring to test results, tables, statistics)

**Root Cause**: `extractProgressSections()` only captures checkbox tasks, not additional content between phase header and task list

**Auto-Fix Pattern**:
```typescript
interface LocalProgressPhase {
  title: string
  status: string
  tasks: Array<{ checked: boolean; text: string }>
  additionalContent: string[]  // ← Add this
}

// Capture content BEFORE first checkbox task
if (!inTaskList && line.trim() !== '') {
  currentPhase.additionalContent.push(line)
}
```

**When to Apply**: When implementing progress section extraction from markdown

**Reference**: `components/prd-detail-client.tsx` lines 133-219

---

### 3. Hardcoded Data Instead of Data-Driven

**Symptom**: Adding new feature requires code changes in multiple places

**Root Cause**: Violating Zero Hardcoding Principle - logic embedded in UI instead of data files

**Auto-Fix Pattern**:
```typescript
// ❌ Wrong: Hardcoded in UI
const projects = ['ww', 'rk', 'lr']

// ✅ Correct: Data-driven
const projects = ALL_UNDOCUMENTED_FEATURES.map(f => f.project)
```

**When to Apply**:
- Adding new projects/features/collections
- Displaying lists/statistics/progress
- Any "database-like" data

**Reference**: `docs/reference/CEO-CONTEXT.md` Zero Hardcoding Principle

---

### 4. Missing YAML Frontmatter in Documents

**Symptom**: Document exists but doesn't show in UI, routes return 404

**Root Cause**: Parser requires YAML frontmatter with specific fields (e.g., Story requires `id` field)

**Auto-Fix Pattern**:
```markdown
---
id: "US-XXX"          # REQUIRED for Stories
title: "Story Title"   # REQUIRED
status: "pending"      # REQUIRED
---

# Content here
```

**When to Apply**: Creating any new PRD/Story/Card document

**Reference**:
- `references/story-template.md` lines 95-109
- `lib/story-parser.ts` validation logic

---

### 5. Server Component Using Client-Only APIs

**Symptom**: Build error "fs module not available" or "localStorage not defined"

**Root Cause**: Mixing server and client APIs

**Auto-Fix Pattern**:
```typescript
// ✅ Correct: Server Component (can use fs, path, etc.)
export default async function Page() {
  const data = await loadDataFromFilesystem()  // fs module OK
  return <ClientComponent data={data} />
}

// ✅ Correct: Client Component
"use client"
export default function ClientComponent({ data }) {
  const [state, setState] = useState()  // Client hooks OK
  return <div>...</div>
}
```

**When to Apply**: Any time reading files or using browser APIs

**Reference**: Next.js 15 App Router patterns

---

### 6. Not Using Collection Viewer First

**Symptom**: Making wrong assumptions about database schema, field types, relationships

**Root Cause**: Skipping Pattern 0 (Collection-Driven Development)

**Auto-Fix Pattern**:
1. Navigate to `/collection/[name]`
2. Click "Copy Collection Data"
3. Use JSON for accurate types, fields, relationships

**When to Apply**: ANY feature involving existing Directus collections

**Reference**: `docs/PRD-collection.md`, `CLAUDE.md` Pattern 0

---

### 7. Missing Two-Column Layout on Desktop

**Symptom**: Content that should be side-by-side is stacked vertically on desktop

**Root Cause**: Forgot responsive grid layout

**Auto-Fix Pattern**:
```tsx
// ✅ Correct: Two-column on desktop, stack on mobile
<div className="grid lg:grid-cols-2 gap-6">
  <div>Left column</div>
  <div>Right column</div>
</div>
```

**When to Apply**: Displaying related content (phases + documents, stats + details, etc.)

**Reference**: `components/prd-detail-client.tsx` lines 336-538

---

### 8. Not Preserving Markdown Formatting

**Symptom**: Tables, code blocks, or formatted content render as plain text

**Root Cause**: Using plain text rendering instead of markdown viewer

**Auto-Fix Pattern**:
```tsx
// ❌ Wrong
<div>{content}</div>

// ✅ Correct
<div className="prose prose-sm dark:prose-invert max-w-none">
  <MarkdownViewer content={content} />
</div>
```

**When to Apply**: Displaying any markdown content (test results, phase details, documentation)

**Reference**: `components/prd-detail-client.tsx` lines 401-407

---

## Self-Correction Template

When you detect a pattern violation:

```
I notice I [didn't follow pattern X / made assumption Y].

Let me fix this by [specific correction].

[Implement fix]

This ensures [benefit of following pattern].
```

**Example**:
```
I notice I didn't implement the two-tier Card loading fallback. The OAuth cards
use markdown-only metadata without YAML frontmatter.

Let me update the card loader to parse markdown headers when YAML is missing.

[Shows code changes]

This ensures both modern (YAML) and legacy (markdown-only) cards display correctly
in the Progress tab.
```

---

## When NOT to Self-Correct

Don't auto-fix when:
- User explicitly requested different approach
- Pattern doesn't apply to current context
- Change would break backward compatibility without migration plan
- Uncertain about root cause (ask first)

---

## Adding New Patterns

When discovering a new pattern violation:

1. Document it in this file using the template above
2. Update relevant reference files (card-template-v2.md, etc.)
3. Add to `SKILL.md` if it affects workflow steps
4. Create example fix in codebase for future reference

---

## Quick Reference: Pattern Detection Phrases

| User Says | Pattern Violated | Fix |
|-----------|------------------|-----|
| "I don't see cards/stories" | Missing YAML or loading fallback | Add two-tier loader |
| "Progress tab doesn't show [X]" | Missing additionalContent | Update extractProgressSections |
| "Need to add feature to UI" | Hardcoded data | Move to data files |
| "Route returns 404" | Missing required YAML field | Add frontmatter |
| "Build error: fs not found" | Server/client API mismatch | Use Server Component |
| "Schema looks wrong" | Skipped Collection Viewer | Visit /collection first |
| "Should be side by side" | Missing responsive layout | Add lg:grid-cols-2 |
| "Formatting is lost" | Plain text rendering | Use MarkdownViewer |
| "API gives 403" | Assumed limitation | Check existing scripts first |

---

### 9. Concluding API Limitations Without Checking Existing Scripts

**Symptom**: AI says "API doesn't have permission, use SQL instead" but API actually works

**Root Cause**: Jumped to conclusions without checking existing working scripts first

**Auto-Fix Protocol**:
1. **Acknowledge**: "I should have checked existing scripts first"
2. **Search**: `find scripts/ -name "*.ts" -o -name "*.js" | xargs grep -l "keyword"`
3. **Compare**: What's different between working script and my approach?
4. **Fix**: Apply the proven pattern

**When to Apply**: ANY time about to conclude "API doesn't support X"

**Proactive Prevention**: Use `references/directus-rbac-patterns.md` to load proven patterns BEFORE implementing similar functionality. Intent detection in Step 0.7 should trigger this automatically.

---

## Related Documentation

- `references/directus-rbac-patterns.md` - **Proactive: Load proven patterns BEFORE implementing**
- `references/card-template-v2.md` - Card YAML vs markdown patterns
- `references/progress-tracking.md` - Progress tab features
- `CLAUDE.md` - Zero Hardcoding Principle
- `docs/reference/CEO-CONTEXT.md` - Evaluation framework
