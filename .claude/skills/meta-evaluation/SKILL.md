---
name: meta-evaluation
description: Use agent teams to evaluate and improve agent team patterns recursively, creating exponential strategic improvement loops
user-invocable: true
---

# Meta-Evaluation Skill

## Purpose
Enable recursive evaluation where agent teams analyze their own effectiveness, creating self-improving systems that scale strategic analysis beyond human capacity.

## The Core Insight
We discovered this pattern by accident: We used agent teams to analyze cards, which revealed that agent teams are excellent at strategic evaluation, which we discovered USING agent teams. This recursion is the key to exponential improvement.

## When to Use
- Strategic reviews: "What have we actually built?"
- Pattern evolution: "How can our patterns improve?"
- Team effectiveness: "Are our agent teams working?"
- Knowledge audits: "What does our card history tell us?"

## Trigger Keywords
- "evaluate our evaluation", "meta-analysis"
- "strategic review", "what have we really built"
- "improve our patterns", "recursive improvement"

---

## The Recursive Loop Pattern

### Level 1: Execution
Agent teams do work → Create cards as memory

### Level 2: Evaluation
Agent teams analyze Level 1 cards → Discover patterns

### Level 3: Meta-Evaluation
Agent teams analyze Level 2 analysis → Discover the recursion

### Level N: Infinite Improvement
Each level improves the patterns below it

---

## Primary Pattern: Strategic Codebase Evaluation

### When: Quarterly or Major Decisions
"We need to understand what we've really built versus what we planned"

### Configuration
```
Run strategic evaluation using cards as memory:
1. Agent: Analyze all cards - what features have momentum?
2. Agent: Technical reality - what actually works?
3. Agent: Strategic gaps - planned vs implemented
4. Agent: Recommendations - what to double down vs abandon
```

### Real Example (2026-02-21)
**Discovered:**
- Planned: LMS + VEC e-commerce (66 cards, 0% built)
- Reality: AI-powered dev environment (90% built)
- Technical debt: 476 unsafe operations
- Strategic pivot: Focus on AI tools, abandon LMS

**This discovery happened IN 5 MINUTES using agent teams**

---

## Meta-Evaluation Process

### Step 1: Gather Evidence (Cards as Memory)
```python
evidence_sources = {
    "cards": "Project reality - what got built",
    "PRDs": "Project plans - what was intended",
    "code": "Technical reality - what actually works",
    "patterns": "What approaches succeeded/failed"
}
```

### Step 2: Multi-Perspective Analysis
```
Agent A: What patterns led to success?
Agent B: What patterns led to abandonment?
Agent C: What wasn't planned but emerged?
Agent D: What should we stop/start/continue?
```

### Step 3: Recursive Insight
"We're using agent teams to discover that agent teams are good at discovery"

### Step 4: Pattern Evolution
Update the patterns based on what we learned about the patterns.

---

## Why This Is More Powerful Than JIRA MCP

### JIRA Integration Limitations
- External system dependency
- Fixed schema and workflow
- No recursive improvement
- Can't analyze its own effectiveness

### Knowledge Graph Advantages
- **Self-contained**: Cards live in repo
- **AI-native**: Designed for agent traversal
- **Recursive**: Can evaluate itself
- **Persistent**: Survives session resets
- **Evolving**: Patterns improve themselves

---

## Practical Applications

### 1. Weekly Pattern Review
```bash
# Every Friday: How did our patterns perform?
/meta-evaluate --period=week --focus=patterns
```

Output: Which patterns helped/hindered, suggested improvements

### 2. Sprint Retrospective
```bash
# Sprint end: What actually happened vs plan?
/meta-evaluate --sprint=current --compare=planned
```

Output: Reality vs intentions, pivot recommendations

### 3. Technical Debt Discovery
```bash
# Monthly: What problems keep appearing?
/meta-evaluate --focus=technical-debt --depth=recursive
```

Output: Systemic issues, root causes, fix prioritization

### 4. Team Effectiveness
```bash
# Quarterly: How effective are our agent teams?
/meta-evaluate --subject=agent-teams --metric=impact
```

Output: Which configurations work, ROI analysis, optimization suggestions

---

## The Exponential Improvement Formula

### Traditional Linear Improvement
Do work → Review → Improve → Repeat

**Growth**: Linear (1x, 2x, 3x...)

### Recursive Meta-Evaluation
Do work → Evaluate → Evaluate the evaluation → Improve the improvement process

**Growth**: Exponential (1x, 2x, 4x, 8x...)

### Evidence
- Debugging: 7.5x faster with agent teams
- Strategic analysis: 200+ cards in 5 minutes
- Pattern discovery: Found real product vs planned
- Continuous improvement: Each iteration improves the process

---

## Integration with Other Skills

### Enhances All Skills
Every skill can be meta-evaluated:
- `ai-workflow`: Evaluate which workflow steps actually help
- `progress`: Evaluate if progress tracking improves outcomes
- `context-review`: Evaluate context assembly effectiveness

### Creates Skill Evolution
```
Version 1: Basic pattern
   ↓ (meta-evaluate)
Version 2: Improved based on usage analysis
   ↓ (meta-evaluate)
Version 3: Self-improving pattern
   ↓ (meta-evaluate)
Version N: Optimal pattern discovered through recursion
```

---

## Implementation Checklist

### To Start Meta-Evaluation
- [ ] Run agent teams on your cards (not external tickets)
- [ ] Analyze what the analysis revealed
- [ ] Document the meta-insights
- [ ] Update patterns based on discoveries
- [ ] Repeat recursively

### Success Indicators
- [ ] Patterns evolve without human intervention
- [ ] Strategic insights emerge from card analysis
- [ ] Team effectiveness measurably improves
- [ ] Recursive loops create compound improvements

---

## Key Advantages Over External Systems

### Your Knowledge Graph
- **Ownership**: You control the schema
- **Evolution**: Patterns improve recursively
- **Integration**: Native to your workflow
- **Memory**: Persists across AI sessions
- **Scale**: Analyzes hundreds of cards simultaneously

### External Systems (JIRA, etc.)
- Dependency on external API
- Fixed schema limitations
- No recursive improvement
- Session context gets lost
- Sequential analysis only

---

## The Meta-Insight

> "We discovered agent teams are excellent at strategic evaluation BY USING agent teams for strategic evaluation. This recursive discovery IS the pattern."

This skill enables your knowledge graph to become self-improving, creating strategic advantages that compound over time.

---

## Related
- **Card**: CARD-AGENT-003 (documents the discovery)
- **Pattern**: Pattern 6 in agent-teams skill
- **Evidence**: 222 cards analyzed, real vs planned product discovered
- **Impact**: Strategic pivot from LMS to AI-powered dev environment