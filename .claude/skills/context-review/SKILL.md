---
name: context-review
description: Systematic review of AI Chat context-assembler quality. Run test questions against Gemini, compare answers, diagnose context gaps, and improve the assembler.
user-invocable: false
---

# Context Review Skill

## Purpose
Systematic review of the AI Chat context-assembler quality. Run test questions against Gemini, compare answers, diagnose context gaps, and improve the assembler.

**This is the feedback loop that makes the context-assembler better over time.**

## When to Use
- After any change to `lib/ai-chat/context-assembler.ts`
- After adding new document types or relationship types
- Periodically to catch regressions from data changes (new cards, updated statuses)
- When a user reports a bad AI Chat answer

## Trigger Keywords
- "review context", "test context assembler", "context review"
- "run ai chat tests", "test gemini quality"
- "prompt regression test"

---

## The Pattern (Why This Exists)

The context-assembler is our graph RAG pipeline. It determines what Gemini knows. Bad context = bad answers. This skill formalizes the feedback loop:

```
Change assembler → Run test questions → Compare answers → Find gaps → Fix → Re-test
```

Discovered on 2026-02-20: adding ~30 tokens of card rollup data changed Gemini's answer from wrong to right. Small context changes have outsized impact.

---

## Process with Subagents (Recommended)

### Step 0: Pre-Flight Code Review (BEFORE launching agents)
Read `lib/ai-chat/context-assembler.ts` and check the story/card/prd branches for obvious issues (undefined variables, scoping errors). This takes 10 seconds and prevents wasting agent tokens on 500 errors.

```
Pre-flight checklist:
- [ ] Read story branch (~line 437-482): variable names consistent?
- [ ] Read card branch (~line 320-435): depends_on resolution working?
- [ ] Read prd branch (~line 484-550): child story rollup intact?
- [ ] Dev server running? curl -s http://localhost:3000/api/ai-chat | jq .configured
```

### Step 1: Balanced Parallel Testing
Split 21 test fixtures across 4 agents by **question type**, not doc type. This prevents one agent from being overloaded.

```
Agent 1: Document-Level Queries (5 tests, ~2 min)
  - prd-next-steps, prd-progress
  - story-card-status, story-blockers
  - intent-progress-phases
  → Tests PRD→Story→Card graph traversal

Agent 2: Card + Relationship Queries (5 tests, ~2 min)
  - card-blocked, card-ac-review, card-relationships
  - intent-relationships-why, intent-relationships-siblings
  → Tests depends_on, siblings, triggers resolution

Agent 3: Status/Deps/Progress Queries (6 tests, ~2.5 min)
  - intent-status-check, intent-status-project-wide
  - intent-dependencies-simple, intent-dependencies-cascade
  - intent-progress-granular, intent-next-steps-tactical
  → Tests operational queries across doc types

Agent 4: Review/Ambiguous/Edge Cases (5 tests, ~2 min)
  - intent-next-steps-strategic, intent-review-acceptance-criteria
  - intent-review-architecture, intent-ambiguous-mixed
  - intent-ambiguous-help
  → Tests analysis quality and graceful degradation
```

**Balance principle:** Each agent should have 4-6 tests with similar complexity. If one agent has >2x the tests of another, rebalance. Wall clock = slowest agent, so unbalanced = wasted parallel capacity.

**Anti-patterns from 2026-02-22 test run:**
- Splitting by doc type put 14 tests in one agent vs 2-3 in others → 6 min wall clock
- No pre-flight → story branch bug (allCards undefined) wasted 35K agent tokens
- Bug fix applied mid-test → inconsistent results across agents

**When to Use Subagents:**
- After any context-assembler.ts changes
- When investigating poor AI responses
- Before implementing context improvements
- Quarterly regression testing

---

## Process (Sequential Alternative)

### Step 1: Load Test Fixtures

Read the test fixtures file:
```
lib/ai-chat/test-fixtures.json
```

This contains test questions per doc type (prd, card, story), each with:
- `question`: What to ask Gemini
- `docContext`: Which document to ask about
- `verifies`: What context feature this tests
- `expectedBehavior`: What a correct answer includes
- `regressionHistory`: Past results for comparison

### Step 2: Run Tests

For each test fixture, call the AI Chat API:

```bash
# Ensure dev server is running
curl -s http://localhost:3000/api/ai-chat | jq .configured

# Run a test
curl -s -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "<question from fixture>"}],
    "docContext": {
      "id": "<from fixture>",
      "type": "<from fixture>",
      "title": "<from fixture>",
      "content": "",
      "frontmatter": {"id": "<from fixture>", "title": "<from fixture>", "status": "in-progress"}
    }
  }'
```

### Step 3: Evaluate

For each response, check against `expectedBehavior`:

| Check | How |
|---|---|
| References specific card IDs? | Search response for CARD-XXX patterns |
| Flags status inconsistencies? | Look for warnings about mismatched statuses |
| Gives actionable recommendation? | Not just "here's what's done" but "here's what to do next" |
| Cross-references dependencies? | Mentions depends_on cards and their statuses |
| Uses relationship semantics? | Explains WHY, not just WHAT |

### Step 4: Diagnose Gaps

If a test fails, trace the cause:

1. **Check what context was assembled** — look at `systemPromptLength` and `sourcesCount` in the response
2. **Read context-assembler.ts** — what does it load for this doc type?
3. **Identify the missing data** — what did Gemini need but not have?
4. **Propose a fix** — what should the assembler add?

### Step 5: Fix and Re-test

1. Modify `context-assembler.ts`
2. Re-run the failing test
3. Verify the answer improves
4. Update `regressionHistory` in the fixture file
5. Commit both the fix and the updated fixture

---

## Running All Tests (Script)

```bash
# Run all test fixtures and save results
source ~/.nvm/nvm.sh && nvm use 22

node -e "
const fixtures = require('./lib/ai-chat/test-fixtures.json');
const results = [];

async function runTest(test, docType) {
  const body = {
    messages: [{ role: 'user', content: test.question }],
    docContext: {
      id: test.docContext.id,
      type: test.docContext.type,
      title: test.docContext.title,
      content: '',
      frontmatter: { id: test.docContext.id, title: test.docContext.title, status: 'in-progress' }
    }
  };

  try {
    const res = await fetch('http://localhost:3000/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return {
      id: test.id,
      docType,
      tokens: data.tokenEstimate,
      responseLength: data.response?.length || 0,
      response: data.response?.slice(0, 500) || 'ERROR',
      expectedBehavior: test.expectedBehavior
    };
  } catch (e) {
    return { id: test.id, docType, error: e.message };
  }
}

async function main() {
  for (const [docType, tests] of Object.entries(fixtures.tests)) {
    for (const test of tests) {
      console.log('Running:', test.id);
      const result = await runTest(test, docType);
      results.push(result);
    }
  }
  console.log('\n=== RESULTS ===\n');
  for (const r of results) {
    console.log('---', r.id, '(' + r.docType + ') ---');
    console.log('Tokens:', r.tokens);
    if (r.error) {
      console.log('ERROR:', r.error);
    } else {
      console.log('Response (first 500 chars):', r.response);
      console.log('Expected:', r.expectedBehavior.join(' | '));
    }
    console.log();
  }
}

main();
"
```

---

## Agent Team Discoveries (2026-02-21)

Through parallel agent testing, we discovered 5 critical improvements needed:

### 1. Query-Aware Context Assembly (Highest Impact)
**Finding**: Context assembler loads the same content regardless of question intent.
**Fix**: Implement query classification to load different context for:
- Status checks → Load dependencies with completion focus
- Next steps → Load ready cards and pending work
- Risk analysis → Load blockers and dependency chains
- Implementation → Load code patterns and test examples

### 2. Relevance-Based Truncation
**Finding**: Linear truncation at 2000 chars can cut off critical dependency info.
**Fix**: Score content by relevance and preserve critical relationships when truncating.

### 3. Status Synchronization
**Finding**: Cards showing "ready" in files but reported as "pending" in responses.
**Fix**: Ensure real-time frontmatter reading without caching.

### 4. Circular Dependency Detection
**Finding**: CARD-002 depends on CARD-003, but CARD-003 triggers CARD-002.
**Fix**: Add validation warnings for circular dependency patterns.

### 5. Cross-Project Boundaries
**Finding**: LMS project cards can accidentally pull WW project context.
**Fix**: Add optional project-aware filtering.

**Test Results That Proved These Improvements:**
- PRD tests: 83% accuracy but missed blocked items
- Card tests: Good dependency resolution but status sync issues
- Story tests: Complete child card visibility but no progress phases
- Edge cases: Found circular patterns and truncation data loss

---

## When to Add New Test Fixtures

| Event | Action |
|---|---|
| Found a bad Gemini answer | Add as a failing test with the question that exposed it |
| Added new context to assembler | Add a test that verifies the new context is used |
| New doc type or relationship | Add tests for that doc type |
| User reported confusion | Reproduce the question as a test |

## Test Fixture Format

```json
{
  "id": "unique-test-id",
  "question": "The exact question to ask Gemini",
  "docContext": {
    "id": "DOC-ID",
    "type": "prd|card|story",
    "title": "Document Title"
  },
  "verifies": "What assembler feature this tests",
  "expectedBehavior": [
    "Specific check 1",
    "Specific check 2"
  ],
  "regressionHistory": [
    {
      "date": "2026-02-20",
      "result": "FAIL → PASS",
      "fix": "What was changed in context-assembler.ts",
      "before": "What Gemini said before the fix",
      "after": "What Gemini said after the fix"
    }
  ]
}
```

---

## Related

- **Test fixtures**: `lib/ai-chat/test-fixtures.json`
- **Context assembler**: `lib/ai-chat/context-assembler.ts`
- **AI Chat API**: `app/api/ai-chat/route.ts`
- **Knowledge Graph tab**: `components/knowledge-graph-viewer.tsx` (data quality UI)
- **Card**: CARD-AICHAT-017 (evolving context — documents learnings)
- **Logs**: `logs/ai-chat.jsonl` (conversation audit trail)
