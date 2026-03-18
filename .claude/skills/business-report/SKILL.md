---
name: business-report
description: "What can we demo?" — project-level demoability report with phase classification, implemented capabilities, and nearest-win actions. Not card counts.
user-invocable: true
---

# Business Report Skill (Reporter Agent Role)

## Purpose

Answer: **"What can we demo for each project, and what's the nearest win?"**

Not "what percentage of stories have test YAML" — but what **user-facing capabilities are implemented** and what **single action** advances each project the most.

```
/progress         → "What tasks are done?"          (card counts, status distribution)
/team-health      → "Can agents work?"               (system coherence audit)
/business-report  → "What can we demo per project?"  (demoable capabilities + nearest wins)
```

**Why the old approach failed**: Counting "verified stories / total stories" produces 0.9% — a useless number. It penalizes planning-phase projects (LMS, LR) for not having code, and calls working features "unverified" because nobody wrote Postman collections.

---

## Activation Triggers

| Trigger | Configuration |
|---------|--------------|
| `/business-report` | Full 2-agent report for all projects |
| `/business-report VEC` | Scoped to one project |
| `/business-report PRD-AI-CHAT` | Scoped to one PRD |
| "business report" | Full report |
| "what can we demo" | Full report |
| "what's working" | Full report |

---

## Core Concepts

### Project Phase (auto-detected from data)

| Phase | How Detected | Scoring? |
|-------|-------------|----------|
| **Discovery** | PRD exists, <3 stories OR 0 cards total | No — not expected to have code |
| **Planning** | Stories exist, <10% card completion | No — requirements phase |
| **Building** | 10-89% card completion across stories | YES |
| **Implemented** | ≥90% card completion | YES |
| **Verified** | Implemented + PRD has testCoverage with passing verdict | YES |

**Only Building, Implemented, and Verified projects count in the score.**

### Capability = Story with all cards done

A "capability" is a user-facing thing someone can DO. In our system, that's a story where all cards have `status: "done"`. We call these **implemented capabilities**.

- Vec has 5 implemented capabilities (browsing, account, bilingual, wishlist, VEC-008)
- Expo Push has 6 implemented capabilities (token reg, preferences, reception, deep linking, platform config, event triggers)
- LMS has 0 — but that's expected, it's in planning phase

### Nearest Win = story closest to 100% card completion

The most valuable action is always: "Complete the story that's closest to done." Not "add YAML frontmatter."

---

## 2-Agent Report Configuration

### Tool Rules Preamble (REQUIRED for every agent)

```
TOOL RULES: Use Glob to find files, Grep to search content, Read to read files.
NEVER use Bash with for/awk/sed/grep/find to process markdown files.
```

### Agent 1: Project Intelligence Scanner

**Mission**: Classify projects by phase, inventory capabilities per project, identify nearest wins.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are building project intelligence for a business demoability report.

STEP 1: Build data maps
- Grep "^project:" in docs/prds/*.md → prdId → project
- Grep "^status:" in docs/prds/*.md → prdId → prdStatus
- Grep "^prd:" OR "^parent_prd:" in docs/stories/*.md → storyId → prdId
- Grep "^story:" OR "^parent_story:" in docs/cards/*.md → cardId → storyId
- Grep "^status:" in docs/cards/*.md → cardId → cardStatus
- Grep "^status:" in docs/stories/*.md → storyId → storyStatus
- Grep "testCoverage:" in docs/prds/*.md → which PRDs have test data
- Read story titles (first 5 lines of each story file) for capability names

STEP 2: For each project (group PRDs by project: field):
a. Count: total stories, total cards, cards done
b. Card completion % = cards done / total cards (across all stories in project)
c. Classify phase:
   - Discovery: <3 stories OR 0 cards
   - Planning: stories exist, <10% cards done
   - Building: 10-89% cards done
   - Implemented: ≥90% cards done
   - Verified: ≥90% cards done AND any PRD has testCoverage with passing verdict

STEP 3: For each project in Building/Implemented/Verified phase:
a. List IMPLEMENTED CAPABILITIES: stories where ALL cards are done
   For each, note: story ID, story title (this is what we can demo)
b. List IN-PROGRESS capabilities: stories with >0% but <100% cards done
   For each, note: story ID, title, cards done/total, cards remaining count
c. Identify NEAREST WIN: the in-progress story with fewest cards remaining
   Note: story ID, title, exactly how many cards are left, what the cards are
d. List NOT STARTED: stories with 0 cards or 0% done (just count, don't list all)

STEP 4: For projects in Discovery/Planning phase:
- Just note: project name, # PRDs, # stories, phase. Don't detail stories.

OUTPUT FORMAT (use this structure exactly):

## Project Intelligence

### Active Projects (Building+)

#### [project_name]: [phase] — [X/Y capabilities implemented]
**Implemented (demoable):**
- [story title] (story_id) — [1-line description of what user can do]
- ...

**In Progress:**
- [story title] (story_id) — [done/total] cards, [N] remaining
- ...

**NEAREST WIN:** Complete [N] card(s) in [story_id] "[story_title]" → unlocks [what capability]
Cards needed: [list specific card IDs and their current status]

**Not started:** [N] stories

---

### Pipeline Projects (Discovery/Planning)

| Project | Phase | PRDs | Stories | Notes |
|---------|-------|------|---------|-------|
| lms | Planning | 3 | 24 | Full story decomposition, no code yet |
| lr | Discovery | 1 | 8 | Business discovery phase |

---

### Data Quality Flags
- Stories marked "done" with incomplete cards: [list if any]
- Projects with testCoverage data: [list PRDs]
- Orphan stories (no PRD link): [count]
```

### Agent 2: Demoability Assessor

**Mission**: For each active project, write what a stakeholder would see in a demo.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are assessing what can be demonstrated to stakeholders per project.

For each project that has stories with ALL cards done (implemented capabilities),
you need to understand WHAT those capabilities mean in business terms.

STEPS:
1. Grep "^project:" in docs/prds/*.md to get project→PRD mapping
2. For each project, find PRDs and read their TITLE and first 30 lines
   (this tells you the business domain — e-commerce, payments, notifications, etc.)
3. For each project, find stories where ALL cards have status "done":
   - Grep story: in docs/cards/*.md → build storyId → cards map
   - Grep status: in docs/cards/*.md → check which are all done
   - Read the story file (first 20 lines) to get title + description
4. Write a plain-English "demo script" per project:
   What would you SHOW a stakeholder? In what order?
   Use story titles as the feature names.
5. For projects with NO implemented capabilities but active development:
   Note what's closest and estimate when it could be demoable
   (e.g., "1 card from checkout being complete")

OUTPUT FORMAT:

## Demoability Assessment

### Can Demo NOW

#### [project_name]: [business domain]
**What you'd show:**
1. [Capability 1 — plain English, what the user sees/does]
2. [Capability 2]
...

**Demo gaps:** [what obvious things are missing from the demo]

---

### Can Demo SOON (>50% progress)

#### [project_name]
**Almost ready:** [what's close, how many cards away]
**Blocker:** [what's preventing demo-readiness]

---

### Not Demoable Yet

| Project | Phase | Why | When? |
|---------|-------|-----|-------|
```

---

## Orchestration Workflow

```
Step 1: Parse trigger ("/business-report" or "/business-report VEC")
         │
         ├─ Has scope (project/PRD)? → Pass as filter to agents
         │
Step 2: Launch Agent 1 + Agent 2 in PARALLEL
         │
Step 3: Collect results from both agents
         │
Step 4: Synthesize final report (orchestrator does this, no Agent 3 needed)
         │
Step 5: Present report with this structure:
         │
         ├─ Implementation Score (only active projects in denominator)
         ├─ Project Snapshots table (1 row per project)
         ├─ "What You Can Demo Today" (plain English per project)
         ├─ Top 3 Nearest Wins (specific actions that unlock capabilities)
         ├─ Pipeline (planning/discovery projects, briefly)
         └─ Data quality flags (if any)
```

### Synthesis Format (orchestrator produces this from agent outputs)

```markdown
## Business Report

### Implementation Score: XX%
(Implemented capabilities / Total stories in active projects)
Active = Building + Implemented + Verified phases only.
Discovery and Planning projects excluded — they're not expected to have code.

### Project Snapshots

| Project | Phase | Capabilities | Implemented | Next Win |
|---------|-------|-------------|-------------|----------|
| vec | Building | 12 stories | 5 demoable | 1 card → checkout |
| expo | Implemented | 8 stories | 6 demoable | Security hardening |
| ww | Mixed | 14 stories | 7 demoable | Complete ETL monitor |
| d11 | Verified | 2 stories | 1 verified | Add commenting |
| blue | Building | 4 stories | 0 | 2 cards → bug fixes |
| lms | Planning | 24 stories | — | Not expected yet |
| lr | Discovery | 8 stories | — | Not expected yet |

### What You Can Demo Today

**Vec Pet Supplies** (e-commerce):
Product browsing and discovery, customer account management, bilingual experience, wishlist.
Missing: checkout flow (1 card away), shipping integration, admin tools.

**Push Notifications** (mobile):
Full push notification pipeline — registration, preferences, delivery, deep linking, platform config.
Missing: E2E testing, security hardening.

[...etc per project]

### Top 3 Nearest Wins

1. **Complete 1 card in US-VEC-002** → Vec checkout becomes demoable (4/5 done).
2. **Complete 2 cards in US-BLUE-001** → Blue blog bug fixes done, blog demoable.
3. **Complete 1 card in US-AICHAT-002** → AI Chat with full project knowledge.

### Pipeline Projects

| Project | Phase | Notes |
|---------|-------|-------|
| LMS | Planning | 24 stories decomposed, 32 cards created, no code yet |
| LR | Discovery | 8 business flows identified, awaiting card creation |

### Data Quality Flags
- [only if issues found — status inconsistencies, orphans, etc.]
```

### Scope Filtering

When scoped to a project or PRD, agents should filter:

| Scope | Filter |
|-------|--------|
| `/business-report VEC` | Only PRDs with `project: "vec"` (case-insensitive) |
| `/business-report PRD-AI-CHAT` | Only the specified PRD and its stories |
| `/business-report` (no scope) | All projects |

---

## What Makes This Different from /progress

| Dimension | /progress | /business-report |
|-----------|-----------|-----------------|
| Unit of measure | Cards | Capabilities (stories) |
| Score denominator | All cards | Active-phase stories only |
| Project treatment | All equal | Phase-classified |
| Output framing | "X done, Y blocked" | "You can demo X, Y, Z" |
| Actions | "Fix blocked cards" | "Complete 1 card → unlock checkout" |
| Audience | Dev team | Stakeholders + dev team |

---

## Scoring Guide

| Score | Assessment | Meaning |
|-------|-----------|---------|
| 70%+ | Demo-ready | Multiple capabilities per active project |
| 40-69% | Core demos work | Key flows available, gaps in secondary features |
| 20-39% | Early demos | Some flows work end-to-end, many in progress |
| <20% | Too early | Focus on completing stories, not on this report |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-01 | Claude | Created skill — story-centric business flow reporter |
| 2026-03-01 | Claude | **v2 redesign** — phase-aware, demoability-focused, killed useless 0.9% score |
