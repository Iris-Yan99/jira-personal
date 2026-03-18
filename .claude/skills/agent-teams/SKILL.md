---
name: agent-teams
description: Orchestrate Claude agent teams for parallel execution, multi-dimensional analysis, and accelerated discovery. Proven to deliver 7.5x performance improvements.
user-invocable: true
---

# Agent Teams Skill

## Purpose
Orchestrate multiple Claude agents to traverse the **PRD knowledge graph** (PRD → Story → Card → Code) in parallel, extracting strategic intelligence from living memory that persists across AI sessions. Based on empirical testing that proved 7.5x performance improvements and multi-dimensional discovery capabilities.

**Core Principle**: The PRD structure IS the operational system - cards are checkpoints, not documentation.

## When to Use
- Complex tasks requiring multiple perspectives
- Comprehensive testing across scenarios
- Implementation with tests and docs
- Data quality analysis across systems
- Evidence gathering for decisions
- Any task where "one thing at a time" feels limiting

## Trigger Keywords
- "use agent teams", "run agents in parallel"
- "test comprehensively", "multi-dimensional analysis"
- "implement with full coverage"
- "analyze from all angles"

---

## Proven Patterns (From Real Usage)

### Pattern 1: Discovery Teams
**Used for**: Understanding complex systems quickly
```
Discover system comprehensively:
1. Agent: Find all related documents and patterns
2. Agent: Analyze implementation and architecture
3. Agent: Check available schemas and data
4. Agent: Find existing tests and patterns
```
**Real Result**: Found 17 AICHAT cards, complex dependency chains, and test framework in 2 minutes

### Pattern 2: Implementation Teams
**Used for**: Building features with full coverage
```
Implement feature completely:
1. Agent: Write core implementation
2. Agent: Create comprehensive test fixtures
3. Agent: Design testing strategy
4. Agent: Document the feature
```
**Real Result**: Built query-aware context assembly with 16 test fixtures simultaneously

### Pattern 3: Testing Teams
**Used for**: Systematic quality validation
```
Test system thoroughly:
1. Agent: Test scenario type A
2. Agent: Test scenario type B
3. Agent: Test scenario type C
4. Agent: Test edge cases
```
**Real Result**: Tested 12 scenarios, found 30-50% token reduction, discovered 5 improvements

### Pattern 4: Analysis Teams
**Used for**: Multi-dimensional system evaluation
```
Analyze from all angles:
1. Agent: Technical architecture
2. Agent: Data quality
3. Agent: Performance metrics
4. Agent: User experience
```
**Real Result**: Discovered status inconsistencies, circular dependencies, missing relationships

### Pattern 5: Evidence Teams
**Used for**: Data-driven decision making
```
Gather evidence in parallel:
1. Agent: Current behavior testing
2. Agent: Historical pattern analysis
3. Agent: Similar implementations
4. Agent: Impact assessment
```

### Pattern 6: PRD Knowledge Graph Traversal
**Used for**: Quarterly reviews, major pivots, team onboarding, discovering project reality vs plans
```
Strategic PRD graph traversal using cards as living memory:
1. Agent: PRD hierarchy analysis (traverse PRD → Story → Card relationships)
2. Agent: Card completion patterns (analyze YAML frontmatter, status, dependencies)
3. Agent: Cross-project intelligence (identify patterns across PRD domains)
4. Agent: Strategic recommendations (based on knowledge graph evidence)
```
**Real Result**: Analyzed 222 cards across PRD hierarchy, discovered REAL product (AI-powered dev environment) vs planned product (LMS/VEC), found 476 unsafe operations, made strategic recommendations based on knowledge graph evidence

**Key Insight**: PRD structure IS the operational system. Cards are living checkpoints that persist across AI sessions. Agent teams traverse this knowledge graph to understand what you're ACTUALLY building vs what you THINK you're building.

**Critical Data Source Learning**: Agent teams + structured data (PRD/Card/Story) = reliable intelligence. Agent teams + speculation = amplified unreliability.

**When to Use**:
- Quarterly strategic reviews
- Major pivot decisions
- New team member onboarding
- **VEC Analysis Success**: Used structured VEC cards → 57% completion rate, actionable priorities, reliable metrics in 5 minutes
- "What have we really built?" assessments
- Product-market fit validation
- Technical debt audits across entire codebase

**Value**: Bridges the gap between plans (PRDs) and reality (cards) by treating cards as project memory that agents can systematically analyze.

---

## Configuration Rules

### ⚠️ MANDATORY DATA SOURCE VALIDATION
**Before ANY agent team execution, validate data sources to prevent speculation failures:**

```typescript
// See: validators/data-source-validator.ts
PRIMARY Sources (MUST use first):
- docs/cards/*.md, docs/prds/*.md, docs/stories/*.md (YAML frontmatter)
- Collection schemas from /collection/{name}
- API responses with defined schemas

INVALID Sources (WILL fail):
- Directory exploration without context
- File counting/sizing
- Code browsing without @card references
- Speculation about structure

Rule: Agent teams + speculation = 4x amplified failure
```

### DO ✅
- **Use structured data first** - PRD → Story → Card hierarchy
- **Specialize each agent** - Give focused, specific tasks
- **Balance workloads** - Similar complexity across agents
- **Define clear outputs** - What should each agent produce
- **Make independent tasks** - No dependencies between agents
- **Plan aggregation** - How will results combine

### DON'T ❌
- **Use speculation** - No "explore files" or "browse directories"
- **Create dependencies** - Agent B waiting for Agent A
- **Overlap responsibilities** - Multiple agents doing same thing
- **Mix complexities** - Simple task vs complex multi-step task
- **Exceed 4-6 agents** - Diminishing returns beyond this
- **Leave success vague** - "test stuff" vs specific scenarios

---

## Domain-Specific Applications

### For PM Tasks
```
PM analysis in parallel:
1. Agent: Calculate completion metrics across all PRDs
2. Agent: Identify blockers and critical paths
3. Agent: Analyze velocity and trends
4. Agent: Assess resource allocation
```

### For Code Review
```
Review code comprehensively:
1. Agent: Architecture and design patterns
2. Agent: Security and error handling
3. Agent: Performance and optimization
4. Agent: Tests and documentation
```

### For Debugging
```
Debug issue from all angles:
1. Agent: Trace error through codebase
2. Agent: Check similar historical issues
3. Agent: Test various fix approaches
4. Agent: Analyze root cause patterns
```

### For Data Quality
```
Audit data systematically:
1. Agent: Schema consistency
2. Agent: Relationship integrity
3. Agent: Status field validation
4. Agent: Missing data patterns
```

### For Feature Planning
```
Plan feature thoroughly:
1. Agent: Technical feasibility
2. Agent: Impact on existing code
3. Agent: Test requirements
4. Agent: Documentation needs
```

---

## Discovery Engine

Agent teams don't just complete tasks - they **discover next steps**:

### Example Discoveries from Real Usage
1. **Found through testing**: Status inconsistencies → CARD-DATA-001 (Data Quality)
2. **Found through analysis**: AI can be PM → CARD-PM-001 (PM Dashboard)
3. **Found through implementation**: Need automation → CARD-AGENT-002 (Team Tools)

### How Discovery Works
- Each agent's unique perspective reveals different patterns
- Parallel execution prevents tunnel vision
- Multi-dimensional view shows systemic issues
- Evidence accumulation enables confident decisions

---

## Measuring Success

### Speed Metrics
- Sequential baseline time vs parallel execution
- Typically 4-7x improvement
- Best case: 7.5x (20 min → 3 min)

### Quality Metrics
- Issues discovered (3-5x more than sequential)
- Coverage achieved (100% vs 60% typical)
- Patterns identified (multi-dimensional)
- Evidence quality (data-driven vs assumptions)

### Discovery Metrics
- New cards/tasks identified
- Systemic issues found
- Improvement opportunities discovered
- Cross-domain patterns recognized

---

## Advanced Techniques

### Dynamic Team Composition
Adjust team size based on task:
- 2 agents: Simple comparison tasks
- 3-4 agents: Standard multi-perspective analysis
- 5-6 agents: Complex system-wide evaluation

### Iterative Refinement
```
Round 1: Broad discovery teams
Round 2: Focused investigation teams
Round 3: Solution validation teams
```

### Cross-Domain Teams
Mix domains for richer insights:
```
1. Agent: Technical implementation
2. Agent: Business impact
3. Agent: User experience
4. Agent: Operational concerns
```

---

## Integration with Other Skills

### With `context-review`
Use agent teams to run test fixtures in parallel for faster regression testing

### With `ai-workflow`
Replace Step 0 sequential checks with parallel discovery teams

### With `migration`
Run schema analysis across multiple collections simultaneously

### With `progress`
Analyze project health from multiple dimensions at once

---

## Anti-Patterns and Pitfalls

### Anti-Pattern: Waterfall Teams
❌ Agent 1 gathers data → Agent 2 analyzes → Agent 3 implements
✅ All agents work simultaneously on different aspects

### Anti-Pattern: Kitchen Sink
❌ "Agent 1: Do everything about feature X"
✅ "Agent 1: Test status queries for feature X"

### Anti-Pattern: Unequal Distribution
❌ Agent 1: 10 minute task, Agent 2: 1 minute task
✅ All agents complete in similar timeframes

---

## Real Success Stories

### Context Assembler Improvement
- **Method**: 4 agents testing different query types
- **Time**: 3 minutes (vs 20+ sequential)
- **Found**: 30-50% token reduction opportunity
- **Discovered**: 5 systemic data quality issues

### Query-Aware Implementation
- **Method**: 4 agents for implement/test/document/validate
- **Result**: Complete feature with tests ready
- **Quality**: No rework needed, comprehensive coverage
- **Bonus**: Discovered next improvements to make

---

## Quick Start Templates

### Template: "Test My Feature"
```
Test [feature] comprehensively:
1. Agent: Test happy path scenarios
2. Agent: Test error conditions
3. Agent: Test edge cases
4. Agent: Test performance
```

### Template: "Implement with Coverage"
```
Implement [feature]:
1. Agent: Core implementation
2. Agent: Unit tests
3. Agent: Integration tests
4. Agent: Documentation
```

### Template: "Analyze System Health"
```
Analyze [system]:
1. Agent: Data quality audit
2. Agent: Performance metrics
3. Agent: Dependency analysis
4. Agent: Usage patterns
```

---

## Related

- **PRD**: PRD-AGENT-TEAMS (formalized patterns)
- **Story**: US-AGENT-001 (diagnostic testing teams)
- **Card**: CARD-AGENT-001 (usage patterns)
- **Evidence**: Context assembler testing that proved 7.5x improvement
- **Next**: CARD-DATA-001, CARD-PM-001, CARD-AGENT-002 (discovered through teams)