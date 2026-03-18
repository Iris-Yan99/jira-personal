---
name: business-prd-planner
description: Turn business ideas into PRDs, Stories, and Cards. Triggers on "plan feature", "create prd", "business idea", "product planning", "feature planning", "prd structure", "how to write prd", "prd format", "story structure", "card structure".
user-invocable: true
---

# Business PRD Planner

## Purpose
Help turn business ideas and initiatives into structured PRDs, Stories, and Cards. This skill guides Claude through the process of capturing business context, breaking down requirements, and creating implementation-ready documentation.

## When to Use This Skill
- User has a business idea or initiative to implement
- Need to structure vague requirements into concrete features
- Want to break a large initiative into PRDs → Stories → Cards
- Planning product features before development

---

## Why Documents Are Training Data

Every PRD, Story, and Card you create is **training data for future AI agents**. The next agent session has zero memory of this conversation. It will read your docs to decide what to build and how.

```
Today's agent writes docs → Tomorrow's agent reads them → Builds correctly
Today's agent skips docs  → Tomorrow's agent guesses   → Builds wrong
```

This means document quality directly determines future agent effectiveness:

| Document | What It Trains | Bad Example | Good Example |
|----------|---------------|-------------|-------------|
| **PRD** | WHY to build | "Build permissions" | "Multi-tenant apps need org-scoped isolation because D11 unions all policies" |
| **Story** | WHO/WHAT scenario | "Handle orders" | "As a Sales Manager at ABC Corp, when I query orders, I only see ABC orders" |
| **Card** | HOW it was proven | "It works" | "AND filter: 22/22 tests passing. NULL active_orq → empty result (secure)" |

**The completeness test**: If a new AI agent reads ONLY this document, can it make the right decision?

**Reference**: [PRD Structure = Training Data](docs/reference/PRD-STRUCTURE-AS-TRAINING-DATA.md) — the full 7-layer knowledge stack explanation.

---

## Core Principle: Thinking Partner, Not Form Filler

**Claude's role is to help the user THINK, not just collect answers.**

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ WRONG: "What features do you want?"                         │
│  ✅ RIGHT: "Let me ask questions to help you think this through"│
└─────────────────────────────────────────────────────────────────┘
```

### How to Ask Good Questions

1. **Start with the problem, not the solution**
   - "What happens today when X?"
   - "Where does this break down?"
   - "What triggers the need for this?"

2. **Explore current state deeply**
   - "Walk me through how you do this now"
   - "Where do you lose track of information?"
   - "What manual work are you doing?"

3. **Challenge assumptions**
   - "Why is that the case?"
   - "What if you didn't have this constraint?"
   - "Is that really the problem, or a symptom?"

4. **Clarify success**
   - "If this worked perfectly, what would change?"
   - "How would you know it's working?"
   - "Who benefits and how?"

5. **Surface hidden requirements**
   - "What happens in edge cases?"
   - "Who else touches this process?"
   - "What could go wrong?"

### For Each Feature, Ask:

```markdown
## Feature: [Name]

**Current State Questions:**
- How do you handle this today?
- What tools/processes exist?
- What's broken or missing?

**User Questions:**
- Who uses this?
- What triggers them to use it?
- What do they need to accomplish?

**Success Questions:**
- What would "working" look like?
- How would you measure it?
- What's the minimum viable version?

**Priority Questions:**
- Is this a must-have or nice-to-have?
- What happens if we don't build this?
- Can this wait until later?
```

---

## Workflow

### Step 1: Capture Business Context

When user shares a business idea, capture:

```yaml
initiative:
  name: "[What is this initiative called?]"
  problem: "[What problem are we solving?]"
  current_state: "[What exists today?]"
  desired_state: "[What do we want to achieve?]"
  success_metrics: "[How do we know it worked?]"
  constraints: "[Budget, timeline, tech limitations?]"
```

**Questions to ask:**
1. What problem are you trying to solve?
2. What do you have today? What's missing?
3. How will you measure success?
4. Any constraints (budget, timeline, existing systems)?

### Step 2: Identify PRD Candidates

Break the initiative into potential PRDs:

```
┌─────────────────────────────────────────────────────────────────┐
│  BUSINESS INITIATIVE                                             │
│  "We want to [achieve X]"                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │  PRD 1  │     │  PRD 2  │     │  PRD 3  │
        │ Domain A│     │ Domain B│     │ Domain C│
        └─────────┘     └─────────┘     └─────────┘
```

**PRD breakdown criteria:**
- Each PRD = one domain or capability area
- PRD should be independently deliverable
- Clear scope boundaries between PRDs

Present to user:
```
Based on your initiative, I see [N] PRD candidates:

1. **PRD-{NAME}** (Priority: HIGH/MEDIUM/LOW)
   - Scope: [what it covers]
   - Key features: [bullet list]

2. **PRD-{NAME}** (Priority: ...)
   ...

Which PRD should we detail first?
```

### Step 3: Detail Each PRD

For the selected PRD, define:

```yaml
prd:
  id: "PRD-{ID}"
  title: "{Clear title}"
  problem: "{What problem this PRD solves}"
  solution: "{High-level approach}"

  features:
    - name: "Feature 1"
      description: "What it does"
      acceptance_criteria:
        - "User can..."
        - "System should..."

    - name: "Feature 2"
      ...

  technical_requirements:
    - database_changes: [...]
    - api_endpoints: [...]
    - integrations: [...]
    - ui_components: [...]

  out_of_scope:
    - "Things we're NOT doing in this PRD"

  dependencies:
    - "Other PRDs or systems needed"

  success_metrics:
    - metric: "Metric name"
      target: "Target value"
      measurement: "How to measure"
```

### Step 4: Break PRD into Stories

For each PRD, create user stories:

```
PRD-001: Lead Attribution
├── US-001: User can see lead source on contact
├── US-002: System captures UTM parameters
├── US-003: Marketing can view leads by channel
└── US-004: Admin can configure attribution rules
```

**Story format:**
```markdown
As a [role]
I want to [capability]
So that [business value]

Acceptance Criteria:
- [ ] Given [context], when [action], then [result]
```

### Step 5: Break Stories into Cards

For each story, create implementation cards:

```
US-001: User can see lead source
├── CARD-001: Add lead_source field to contacts schema
├── CARD-002: Create migration for new fields
├── CARD-003: Update contact detail UI
└── CARD-004: Write API tests for lead source
```

**Card = single implementable task**

### Step 6: Graph Density Gate (HARD GATE)

**A PRD without stories is a dead node.** The doc viewer can't show relationships. AI Chat can't walk the graph. `/progress` reports nothing. Future agents can't recover context.

**Before marking a PRD as anything other than `draft`, verify graph density:**

```
┌─────────────────────────────────────────────────────────────────┐
│  GRAPH DENSITY CHECK (run before status change)                  │
│                                                                  │
│  PRD → stories[] backward refs ≥ 1?     YES → continue          │
│                                         NO  → STOP, create them │
│                                                                  │
│  Story → cards[] backward refs ≥ 1?     YES → continue          │
│                                         NO  → STOP, create them │
│                                                                  │
│  All stories have prd: PRD-XXX?         YES → continue          │
│                                         NO  → STOP, fix refs    │
│                                                                  │
│  All cards have business_requirement?   YES → continue          │
│                                         NO  → STOP, fix refs    │
└─────────────────────────────────────────────────────────────────┘
```

**Mechanical verification (run these commands):**

```bash
# Count stories pointing back to this PRD
grep -rl "^prd:.*PRD-XXX" docs/stories/ | wc -l

# Count cards pointing back to this PRD
grep -rl "^business_requirement:.*PRD-XXX" docs/cards/ | wc -l

# lint-prd.sh will also warn on non-draft PRDs with zero children
bash .claude/hooks/lint-prd.sh docs/prds/PRD-XXX.md
```

**Decision matrix:**

| PRD Status | Stories | Cards | Action |
|------------|---------|-------|--------|
| draft | 0 | 0 | OK — PRD is still being shaped |
| draft | ≥1 | 0 | OK — stories exist, cards can come later |
| pending | 0 | any | BLOCKED — create stories first |
| in-progress | 0 | any | BLOCKED — create stories first |
| in-progress | ≥1 | 0 | WARN — stories exist but no implementable cards |
| done | 0 | any | ERROR — done PRD with no story trail = untraceable |

**Why this matters for future agents:**
```
Agent reads PRD-RENTAL-PAY (12 epics in prose)
  → No stories → can't find implementation scope
  → No cards → can't find what's been built
  → No @card refs → can't grep for related code
  → Result: agent rebuilds from scratch, duplicating work
```

**The gold standard:** PRD-WW-ORDER-V2 — 8 stories, 22 cards, 77 navigable relationships. Every agent session can recover full context in seconds.

---

## Document Templates

**IMPORTANT:** Before creating any PRD/Story/Card, Claude MUST read the template file first.

| Document | Template Location | Action |
|----------|-------------------|--------|
| **PRD** | `.claude/skills/ai-workflow/references/prd-template.md` | Read before creating PRD |
| **Story** | `.claude/skills/ai-workflow/references/story-template.md` | Read before creating Story |
| **Card** | `.claude/skills/ai-workflow/references/card-template-v2.md` | Read before creating Card |

### File Locations & Naming Convention
All doc files are named `{id}.md` (no slug suffix):
- PRDs: `docs/prds/PRD-{NAME}.md` (all PRDs have `PRD-` prefix)
- Stories: `docs/stories/US-{NNN}.md` or `docs/stories/AS-{PROJECT}-{NNN}.md`
- Cards: `docs/cards/CARD-{ID}.md` (e.g., `CARD-AUTH-001.md`)

---

## Output Format

After planning, provide summary:

```markdown
## Initiative: {Name}

### PRDs Identified
| PRD | Title | Priority | Status |
|-----|-------|----------|--------|
| PRD-001 | ... | HIGH | Draft |
| PRD-002 | ... | MEDIUM | Not started |

### Next Steps
1. [ ] Create PRD-001 document
2. [ ] Review with stakeholders
3. [ ] Break into stories
4. [ ] Estimate effort

### Files to Create
- `docs/prds/PRD-{NAME}.md` (e.g., `PRD-LEAD-ATTRIBUTION.md`)
- `docs/stories/US-001.md` (or `AS-PROJECT-001.md`)
- `docs/cards/CARD-001.md` (e.g., `CARD-WA-001.md`)
```

---

## Current Initiatives

Active PRDs (progress tracked in PRD frontmatter):

| Initiative | PRD File | Status |
|------------|----------|--------|
| Lead Tracking & Attribution | [docs/prds/PRD-LEAD-ATTRIBUTION.md](/docs/prds/PRD-LEAD-ATTRIBUTION.md) | In Progress |

---

## Example Usage

```
User: "I want to track where our customers come from to measure marketing effectiveness"

Claude: Let me help you plan this initiative.

**Step 1: Capturing context...**

I understand you want to:
- Problem: Can't measure which channels bring customers
- Current: Only have impression/engagement data
- Desired: Attribution tracking from ad → lead → customer

**Step 2: PRD candidates...**

I see 3 potential PRDs:
1. **PRD-LEAD-ATTRIBUTION** (HIGH) - Track lead sources
2. **PRD-CHANNEL-ANALYTICS** (MEDIUM) - Compare channels
3. **PRD-CONTENT-TRACKING** (MEDIUM) - Measure content types

Which should we detail first?

User: "Lead Attribution"

Claude: Creating PRD-LEAD-ATTRIBUTION...
[Uses PRD template, fills in context, creates document]
```

---

## Integration with ai-workflow

This skill works WITH the ai-workflow skill:
- **business-prd-planner**: Captures business context → creates PRDs
- **ai-workflow**: Takes PRDs → implements code

Flow:
```
Business Idea → [business-prd-planner] → PRD/Stories/Cards → [ai-workflow] → Code
```

---

## Sharing with Team

After creating Cards, use `synque` to share with the team:

```
synque CARD-WA-001
```

This will:
1. **Sync card to Directus** - Makes it visible in the frontend
2. **Check for PM comments** - See if PM has feedback
3. **Offer frontend URLs** - Share with team for review

### Full Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Create PRD/Story/Card                                   │
│     [business-prd-planner]                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Implement Code                                          │
│     [ai-workflow]                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Sync & Share                                            │
│     synque CARD-XXX                                         │
│     → Sync to Directus                                      │
│     → Check PM comments                                     │
│     → Get shareable URL                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. PM Feedback Loop                                        │
│     [pm-comments]                                           │
│     → PM adds comments in Directus                          │
│     → synque pulls comments                                 │
│     → Address feedback, re-sync                             │
└─────────────────────────────────────────────────────────────┘
```

See: `.claude/skills/pm-comments/SKILL.md` for full synque workflow

---

## Progress Tracking

### Single Source of Truth: PRD Frontmatter

**The PRD `progressPhases` field is the single source of truth for implementation status.**

When implementing features, Claude must:

1. **Read PRD before starting** - Check current progress state
2. **Update PRD after completing tasks** - Mark tasks as completed
3. **Track in progressPhases, not separate files** - No duplicate progress tracking

### progressPhases Schema

```yaml
progressPhases:
  - phase: "Phase 0: Planning"
    status: "done"  # done | in-progress | pending | blocked
    tasks:
      - text: "Create PRD document"
        completed: true
      - text: "Define features"
        completed: true

  - phase: "Phase 1: Documentation"
    status: "in-progress"
    tasks:
      - text: "Create User Stories"
        completed: true
      - text: "Create Technical Cards"
        completed: false
```

### When to Update Progress

| Event | Action |
|-------|--------|
| Task completed | Set `completed: true` in PRD frontmatter |
| Phase completed | Set phase `status: "done"` |
| New implementation started | Set phase `status: "in-progress"` |
| Code/collection created | Update `verification.codeExists: true` |

### Example: Tracking Lead Attribution Implementation

```yaml
# Before implementation
progressPhases:
  - phase: "Phase 2: Implementation"
    status: "pending"
    tasks:
      - text: "Create lead_clicks collection"
        completed: false

# After creating collection
progressPhases:
  - phase: "Phase 2: Implementation"
    status: "in-progress"
    tasks:
      - text: "Create lead_clicks collection (CARD-WA-004)"
        completed: true
```

---

## Lessons Learned

### 1. Use User Stories to Think Concretely

**Don't ask:** "What features do you want for lead tracking?"

**Do ask:** "Walk me through what happens when a user clicks the WhatsApp icon on your landing page"

This surfaces hidden requirements:
- "Oh, we need to know WHICH page they came from"
- "We need to capture UTM params from the URL"
- "We need backend storage, not just the message"

```
❌ Abstract: "Track lead sources"
✅ Concrete: "When user clicks WhatsApp on capydigital page after clicking Facebook ad..."
```

### 2. Check for Existing Components

Before creating new implementations, ASK:
- "Do we have an existing component that does something similar?"
- "Can we enhance the existing component instead of duplicating?"

**Example from WhatsApp attribution:**
```
New component created → User asked "we have WhatsAppFloat in synque-group-v2?"
→ Enhanced existing component instead of maintaining two
```

### 3. Question the Full Data Flow

Always think through:
```
User Action → Frontend Capture → Backend Storage → Analytics/Visibility
```

**Example:**
- Initial: UTM in message text only
- User question: "How do we know they clicked?"
- Revealed need: Backend API to log clicks BEFORE redirect to WhatsApp

### 4. UX vs Tracking Balance

- **Fire-and-forget tracking** - don't block user for analytics
- **Clean messages** - only show tracking refs when needed
- **Graceful failures** - tracking errors shouldn't break user journey

```javascript
// Good pattern: Fire-and-forget
fetch('/api/track', {...}).catch(console.error) // Don't await
window.open(whatsappUrl) // Open immediately
```

### 5. Implementation Pattern: Lead Click Attribution

Reference implementation created during Lead Attribution PRD:

```
components/whatsapp-float.tsx  ← Enhanced with UTM tracking
lib/utm-capture.ts             ← UTM capture utilities
app/api/lead-clicks/route.ts   ← Backend logging (generic for all CTA types)
```

**Flow:**
```
User visits page?utm_source=facebook&utm_campaign=summer
         ↓
Click WhatsApp/Phone/Email button
         ↓
POST /api/lead-clicks (fire & forget)
{click_type, page_slug, target, utm_*, user_agent, referrer}
         ↓
Opens WhatsApp with: "Hi... [from:pageSlug|source|campaign]"
```

**Key decisions:**
- Generic `lead_clicks` collection (supports WhatsApp, Phone, Email, Form, CTA)
- Always include `page_slug` (we always know source page)
- Only include UTM when present (clean direct visits)
- Map page_slug → orq for multi-tenant storage
