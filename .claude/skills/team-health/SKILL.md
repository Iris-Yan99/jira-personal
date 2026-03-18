---
name: team-health
description: System coherence audit for AI-human team effectiveness. Triggers on "team health", "coherence check", "system health", "are agents working".
user-invocable: true
---

# Team Health Skill (System Coherence Auditor)

## Purpose

Audit whether the human-AI development system is internally consistent and functional. Answer: **"Can agents work effectively in this codebase right now?"**

```
/progress health     → "Is the PROJECT healthy?"  (card counts, status distribution)
/meta-evaluation     → "Is our STRATEGY right?"   (planned vs actual, pivots)
/team-health         → "Is the SYSTEM coherent?"   (can agents work effectively?)
```

**Core insight**: In the agent era, skills ARE executable code. Stale instructions = active bugs. Data normalization without skill normalization = half a fix.

---

## Activation Triggers

| Trigger | Configuration |
|---------|--------------|
| `/team-health` | Full 5-agent coherence audit |
| `/team-health quick` | Single-agent fast check (skill accuracy only) |
| "team health" | Full 5-agent audit |
| "coherence check" | Full 5-agent audit |
| "system health" | Full 5-agent audit |
| "are agents working" | Full 5-agent audit |

---

## What This Checks (5 Dimensions)

| Dimension | Question | Why It Matters |
|-----------|----------|----------------|
| **Skill Accuracy** | Do grep patterns in skills return results? Do templates match validators? | Wrong patterns → agents get 0 results → wrong conclusions |
| **Reference Integrity** | Do card→PRD links resolve? Do @card→Card links exist? | Broken links → cards invisible in progress rollups |
| **Knowledge Freshness** | Are skills stale? Are done cards traceable? | Stale skills → agents follow outdated patterns |
| **Traceability** | Done cards with @card refs? Orphan cards? Legacy format? | Gaps → lost context, untraceable work |
| **Data Completeness** | Do stories have project tags? Do stories have cards? Do PRDs have testCoverage? | Missing data → invisible progress, wrong project totals |

---

## Canonical Reference Points

These are the sources of truth. All checks validate against these:

| Source | File | What It Defines |
|--------|------|-----------------|
| Status values | `lib/status.ts` | 7 canonical: `draft \| pending \| in-progress \| done \| blocked \| ready \| green` (green = tester-verified, excluded from loaders) |
| Frontmatter schema | `lib/prd-validator.ts` | Zod schemas for card/story/PRD validation |
| PRD ID resolution | `lib/ai-chat/context-assembler.ts` | `normalizePrdId()` — strips `PRD-` prefix, lowercases |
| Card template | `.claude/skills/ai-workflow/references/card-template-v2.md` | Official card structure |
| PRD template | `.claude/skills/ai-workflow/references/prd-template.md` | Official PRD structure |

---

## 5-Agent Coherence Audit Configuration

### Tool Rules Preamble (REQUIRED for every agent)

```
TOOL RULES: Use Glob to find files, Grep to search content, Read to read files.
NEVER use Bash with for/awk/sed/grep/find to process markdown files.
```

### Agent 1: Skill Accuracy Auditor

**Mission**: Test whether skill-documented patterns actually work against real data.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are auditing skill accuracy. Test whether grep patterns documented in skill files
actually return results when run against the codebase.

CHECKS:
1. Read .claude/skills/progress/SKILL.md — find all grep/search patterns.
   Test each pattern using the Grep tool. Report: pattern, expected behavior, actual hits.

2. Read .claude/skills/ai-workflow/references/card-template-v2.md — extract the
   status comment line (the "draft | pending | ..." part).
   Read lib/prd-validator.ts — extract the card status z.enum values.
   Read lib/status.ts — extract the DocStatus type.
   Compare all three. Report any mismatches.

3. Read .claude/skills/ai-workflow/references/prd-template.md — extract status values.
   Compare to lib/status.ts DocStatus. Report mismatches.

4. Grep all SKILL.md files for status-related patterns:
   Grep pattern="status:" path=".claude/skills/" glob="*.md"
   Check if any skill references old values (completed, active, in_progress, archived).

5. Read .claude/skills/progress/SKILL.md Data Sources section.
   Test: does "parent_prd:" pattern find cards? How many?
   Test: does "business_requirement:" pattern find cards? How many?
   Report the gap.

OUTPUT FORMAT:
## Skill Accuracy Report

### Pattern Tests
| Source Skill | Pattern | Expected | Actual Hits | Status |
|-------------|---------|----------|-------------|--------|

### Template-Validator Alignment
| Source | Status Values | Match? |

### Old Value References
| Skill File | Old Value Found | Line |

### Score: X/100
(Deduct 10 per broken pattern, 5 per old value reference, 20 per template mismatch)
```

### Agent 2: Reference Integrity Checker

**Mission**: Validate that document cross-references actually resolve.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are auditing reference integrity across the knowledge graph.

CHECKS:
1. CARD → PRD resolution:
   - Grep for "business_requirement:" in docs/cards/*.md (output_mode: content)
   - Extract the values (ignore null, empty, or "null")
   - Read docs/prds/ to get all PRD id: values
   - For each business_requirement value, check if it resolves:
     a. Direct match to a PRD id
     b. After normalizePrdId (strip "PRD-" prefix, lowercase)
   - Report unresolved references.

2. STORY → PRD resolution:
   - Grep for "^prd:" in docs/stories/*.md
   - Compare to actual PRD id values
   - Report unresolved.

3. Review candidates (NOT errors — null is valid "needs review" state):
   - Cards with business_requirement: null — surface as REVIEW CANDIDATES
   - Cards with NO business_requirement field at all — surface as REVIEW CANDIDATES
   - Cards with BOTH business_requirement AND parent_prd set (potential conflict)
   - NOTE: The review process itself generates insights (new PRD gaps, misclassifications,
     standalone cards). Do NOT auto-assign — flag for human review.

4. Legacy format detection:
   - Cards in docs/cards/ that don't have id: starting with "CARD-"
   - Cards using "card:" instead of "id:" field

5. @card reference validation:
   - Grep for "@card CARD-" in app/, lib/, components/
   - Extract unique CARD-XXX IDs referenced
   - Check each against docs/cards/ — do the referenced cards exist?

OUTPUT FORMAT:
## Reference Integrity Report

### Card→PRD Resolution
| Card ID | business_requirement | Resolves To | Status |
(only show FAILED or WARN entries)

Total: X/Y resolve (Z%)

### Story→PRD Resolution
Total: X/Y resolve (Z%)

### Review Candidates (business_requirement: null)
[list of cards with null/missing business_requirement — these are review opportunities, not errors]
Reviewing these often reveals: missing PRDs, misclassified cards, or genuinely standalone work.

### Legacy Format Cards
[list of non-CARD-prefixed files]

### @card Dangling References
[list of @card refs pointing to non-existent cards]

### Score: X/100
(Deduct 2 per unresolved ref, 5 per legacy card, 0 per review candidate — null is valid, 5 per dangling @card)
Note: null business_requirement is a REVIEW signal, not an error. Deduct only for refs that point to non-existent PRDs.
```

### Agent 3: Knowledge Freshness Scanner

**Mission**: Detect stale knowledge and untraceable work.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are auditing knowledge freshness and traceability completeness.

CHECKS:
1. Skill freshness:
   - Glob for .claude/skills/*/SKILL.md
   - For each, note the file (you can't check mtime with Grep, so read each SKILL.md
     and look for date indicators: Changelog entries, "Created:", "Updated:" dates)
   - Flag skills with no changelog or last changelog entry older than 30 days

2. @card coverage for done cards:
   - Grep for 'status: "done"' in docs/cards/*.md to get all done card IDs
   - Read the first few lines of each to extract the id: field
   - Grep for "@card" in app/, lib/, components/ to get all referenced CARD IDs
   - Compare: how many "done" cards have at least one @card reference in code?
   - Report coverage ratio: X done cards with refs / Y total done cards

3. In-progress cards with substance:
   - Grep for 'status: "in-progress"' in docs/cards/*.md
   - For each, check if there are @card references in code (evidence of work started)
   - Report: in-progress cards WITH vs WITHOUT code evidence

4. Acceptance criteria completion:
   - For done cards, grep for "- [ ]" (unchecked boxes) — done cards should have all [x]
   - Report: done cards with unchecked acceptance criteria

OUTPUT FORMAT:
## Knowledge Freshness Report

### Skill Freshness
| Skill | Last Activity | Status |
|-------|--------------|--------|
(STALE = no recent changelog, FRESH = updated recently)

### @card Traceability Coverage
- Done cards with @card refs in code: X/Y (Z%)
- Done cards WITHOUT any code reference: [list top 10]

### In-Progress Evidence
- With code evidence: X
- Without code evidence: Y (may be documentation-only or not started)

### Done Cards with Unchecked ACs
[list]

### Score: X/100
(Deduct 3 per stale skill, 0.5 per untraceable done card, 5 per done card with unchecked ACs)
```

### Agent 5: Data Completeness Auditor

**Mission**: Detect missing fields that make documents invisible to progress reporting.

```
Prompt:
TOOL RULES: Use Glob/Grep/Read tools only. Never use Bash for file reading.

You are auditing data completeness — fields that MUST exist for documents to be
visible in progress dashboards and project reports.

CHECKS:
1. Stories missing project: field
   - Glob docs/stories/{US,AS}-*.md
   - Grep for "^project:" in each — which files have NO match?
   - Report: count and list of stories without project: field

2. Stories with zero child cards
   - Grep "^story:" in docs/cards/*.md to get all story references
   - Glob docs/stories/{US,AS}-*.md to get all story IDs
   - Compare: which story IDs are NEVER referenced by any card?
   - Report: count and list of stories with no cards

3. Test coverage adoption (PRDs + Cards):
   - PRDs: Grep for "^testCoverage:" in docs/prds/PRD-*.md — which PRDs have it?
   - Cards: Grep for non-empty newman_report in docs/cards/CARD-*.md (exclude `newman_report: null` and `newman_report: ""`)
   - For cards with newman_report, verify the file path exists (broken reference = bug)
   - Report: X/Y PRDs have testCoverage (Z%), X/Y cards have newman_report (Z%)
   - Note: page.tsx bridges newman_report → testCoverage at runtime, so both produce the test tab UI

4. Cards missing story: field
   - Grep "^story:" in docs/cards/*.md — how many have it?
   - Total cards vs cards with story: — what % are linked?
   - Report: X/Y cards linked to stories (Z%)

5. Stories missing prd: field
   - Grep "^prd:" in docs/stories/*.md — how many have it?
   - Report: X/Y stories linked to PRDs (Z%)

OUTPUT FORMAT:
## Data Completeness Report

### Stories Missing project:
- Count: X stories without project: field
- [list top 10]

### Stories With Zero Cards
- Count: X stories with no child cards
- [list top 10]

### PRD Test Coverage (testCoverage: in frontmatter)
- PRDs with testCoverage: X/Y (Z%)
- [list PRDs that DO have testCoverage]

### Card Newman Reports (newman_report: in frontmatter)
- Cards with non-empty newman_report: X/Y (Z%)
- Broken references (file not found): [list any]
- Note: page.tsx bridges newman_report → testCoverage at runtime for the test tab UI

### Card→Story Linking
- Cards with story: field: X/Y (Z%)

### Story→PRD Linking
- Stories with prd: field: X/Y (Z%)

### Score: X/100
(Deduct 1 per story missing project, 2 per story with zero cards,
 0 for testCoverage since it's aspirational, 0.5 per unlinked card)
```

### Agent 4: Coherence Synthesis (Runs AFTER agents 1-5)

This agent does NOT run in parallel. It receives the outputs of agents 1-3 + 5 and synthesizes.

```
Prompt:
You are the coherence synthesis agent. You receive reports from 4 specialist agents
and produce the final Team Health Report.

INPUT: [paste outputs from agents 1-3 and 5]

TASKS:
1. Calculate overall coherence score:
   - Weight: Skill Accuracy (25%), Reference Integrity (25%), Freshness (15%), Traceability (15%), Data Completeness (20%)
   - Formula: (agent1 * 0.25) + (agent2 * 0.25) + (agent3 * 0.15) + (traceability * 0.15) + (agent5 * 0.20)

2. Identify top-3 highest-impact fixes:
   - Prioritize by: how many agents are affected (wider = higher)
   - Include specific fix commands or file paths

3. Detect patterns:
   - Are issues clustered in one dimension? (e.g., all freshness issues)
   - Are issues systemic? (e.g., all skills have same problem)
   - Any issues that compound? (e.g., broken PRD link + stale skill = agent can't find cards)

4. Generate trend (if previous report exists):
   - Compare to last run's score
   - Note improvements and regressions

OUTPUT FORMAT:
## Team Health Report

### Overall Score: XX/100
| Dimension | Score | Trend |
|-----------|-------|-------|
| Skill Accuracy | XX/100 | — |
| Reference Integrity | XX/100 | — |
| Knowledge Freshness | XX/100 | — |
| Traceability | XX/100 | — |
| Data Completeness | XX/100 | — |

### Top 3 Fixes (Highest Impact)
1. [Issue] — affects [what]. Fix: [specific action]
2. [Issue] — affects [what]. Fix: [specific action]
3. [Issue] — affects [what]. Fix: [specific action]

### Patterns Detected
- [pattern description]

### System Coherence Assessment
[2-3 sentence summary: Can agents work effectively? What's the biggest risk?]
```

---

## Orchestration Workflow

```
Step 1: Parse trigger ("/team-health" or "team-health quick")
         │
         ├─ "quick" → Run Agent 1 only (skill accuracy)
         │
         └─ full → Continue to Step 2
         │
Step 2: Launch Agents 1, 2, 3, 5 in PARALLEL (Task tool, 4 calls)
         │
Step 3: Collect results from all 4 agents
         │
Step 4: Launch Agent 4 (synthesis) with combined results
         │
Step 5: Present final report to user
         │
Step 6: Ask: "Want me to fix the top issues?"
```

---

## Scoring Guide

| Score | Assessment | Action |
|-------|-----------|--------|
| 90-100 | Excellent coherence | Maintain — run monthly |
| 70-89 | Good with gaps | Fix top issues — run bi-weekly |
| 50-69 | Degraded | Immediate attention — fix before new features |
| Below 50 | System broken | Stop feature work — fix coherence first |

### What Each Score Means for Agents

| Score Range | Agent Experience |
|-------------|-----------------|
| 90+ | Agents find correct data, skills guide accurately, context is complete |
| 70-89 | Agents mostly work but hit occasional dead ends or stale patterns |
| 50-69 | Agents frequently get wrong results, need human correction |
| <50 | Agents produce unreliable output, human must verify everything |

---

## What This Skill Does NOT Check

| Not Checked | Which Skill Checks It |
|------------|----------------------|
| Card status distribution | `/progress` |
| Strategic direction | `/meta-evaluation` |
| Blocker detection | `/progress status:blocked` |
| PM comment sync | `/pm-comments` |
| Code quality | `/code-review` |

team-health checks if all the ABOVE skills can function correctly.

---

## Integration with Other Skills

| Skill | Relationship |
|-------|-------------|
| `progress` | team-health validates that progress's patterns work |
| `meta-evaluation` | team-health is the "Level 0" check before meta-evaluation |
| `agent-teams` | team-health uses agent team orchestration pattern |
| `ai-workflow` | team-health validates workflow templates are current |

---

## When to Run

| Trigger | Frequency |
|---------|-----------|
| After bulk data changes (like CARD-DATA-003) | Always |
| Before major feature work | Recommended |
| After creating/modifying skills | Recommended |
| Weekly health check | Optional |
| When agents produce unexpected results | Diagnostic |

---

## Example Session

```
User: /team-health

AI: Running 5-agent coherence audit...

    Agent 1 (Skill Accuracy): Testing 8 patterns across 16 skills...
    Agent 2 (Reference Integrity): Validating 269 card→PRD links...
    Agent 3 (Knowledge Freshness): Scanning 16 skills + 173 done cards...
    Agent 5 (Data Completeness): Checking project tags, card coverage, test coverage...

    ## Team Health Report

    ### Overall Score: 62/100

    | Dimension | Score | Status |
    |-----------|-------|--------|
    | Skill Accuracy | 75/100 | WARN — 2 broken patterns |
    | Reference Integrity | 58/100 | FAIL — 12 broken PRD links |
    | Knowledge Freshness | 70/100 | WARN — 2 stale skills |
    | Traceability | 45/100 | FAIL — 82% done cards untraceable |

    ### Top 3 Fixes
    1. Fix 12 broken card→PRD business_requirement values
       → Cards invisible in /progress PRD rollups
    2. Update progress SKILL.md: parent_prd → business_requirement
       → Agents miss 90% of card-PRD relationships
    3. Add @card refs to done cards (105 of 128 missing)
       → Work is untraceable, context lost across sessions

    ### Assessment
    System has degraded coherence. Agents can find status data but
    cannot reliably traverse card→PRD relationships. Skill patterns
    are mostly current after CARD-DATA-002 normalization, but
    traceability adoption is very low.

    Want me to fix the top issues?
```

---

## Bug Authorship Audit (Post-Fix Diagnostic)

After fixing issues found by team-health, run this diagnostic to **trace root causes** and prevent recurrence.

### Pattern

```bash
# For each batch of fixes, git blame the problematic lines:
git log --diff-filter=A --follow -p -- docs/cards/CARD-XXX.md | head -50
# Or for specific lines:
git blame docs/prds/PRD-XXX.md | grep "status:"
```

### Classification

| Category | Example | Action |
|----------|---------|--------|
| **Legacy debt** | Pre-standard files (before lint existed) | No blame — batch fix + add lint rule |
| **Self-reinforcing bug** | Lint teaches wrong value → Claude follows → data drifts | Fix ALL 3 layers: data + code + skills |
| **Developer pattern** | Same dev makes same mistake repeatedly | Training / review process update |
| **Template drift** | Template has stale defaults, new cards inherit them | Fix template + batch fix downstream |

### Three-Layer Fix Protocol

When a self-reinforcing bug is found:
1. **Layer 1 (DATA)**: Fix all affected files (sed batch)
2. **Layer 2 (CODE)**: Fix validators, linters, parsers (`lib/status.ts`, `lint-*.sh`, `prd-validator.ts`)
3. **Layer 3 (SKILLS)**: Fix skill instructions, templates, grep patterns (`.claude/skills/*/SKILL.md`)

**Critical**: Fixing Layer 1 without Layer 2+3 = bug will recur on next agent session.

### Traceability via Git Email

Each developer has their own git account. Bug authorship traces via:
```bash
git log --format="%ae %s" -- docs/cards/ | sort | uniq -c | sort -rn | head
```
This shows which email addresses produced the most card changes. Combined with `git blame` on specific buggy lines, identifies whether bugs are systemic (all authors) or localized (one author).

### When to Run

- After every batch fix of >10 files
- When team-health score drops >10 points between runs
- When the same bug type recurs after a previous fix

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-02-24 | Claude | Created skill — CARD-HEALTH-001 |
| 2026-03-05 | Claude | Added Agent 5 (Data Completeness) — checks project tags, story↔card coverage, testCoverage adoption. Updated scoring weights. |
| 2026-03-08 | Claude | Added Bug Authorship Audit section — post-fix diagnostic for tracing root causes and preventing self-reinforcing bugs. Three-Layer Fix Protocol. |
