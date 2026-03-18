# Visualizer Skill

Generate interactive HTML visualizations for project progress, PRD dependencies, test coverage, and workflow phases.

## Quick Start

```bash
# Open visualization showcase (recommended)
python .claude/skills/visualizer/scripts/visualization-showcase.py
open visualization-showcase.html

# Or generate specific visualization
python .claude/skills/visualizer/scripts/card-progress-heatmap.py
```

## Data-Driven Architecture

**Zero Hardcoding Principle**: All visualizations read from real data sources.

### Current Status

| Visualization | Status | Data Source |
|---------------|--------|-------------|
| ✅ Card Progress Heatmap | **Data-Driven** | `docs/prds/*.md` → `docs/cards/*.md` |

**Removed Visualizations** (hardcoded data):
- ❌ Progress Dashboard - removed (needs YAML format)
- ❌ PRD Graph - removed (needs YAML format)
- ❌ Phase Tracker - removed (needs YAML format)
- ❌ Test Coverage Heatmap - removed (needs YAML format)

**Next Steps**: Establish proper YAML frontmatter formats in PRDs before creating new visualizations.

**See [DATA-SOURCES.md](DATA-SOURCES.md) for data source strategy.**

## Available Visualizations

### 1. Card Progress Heatmap 🎯
**Status**: ✅ Fully Data-Driven

Shows PRD completion based on Card status with zero hardcoding.

**Data Flow**:
```
docs/prds/PRD-002.md (cards: [CARD-014, CARD-015])
    ↓
docs/cards/CARD-014-catalog-config-page.md (status: Done)
docs/cards/CARD-015-product-list-api.md (status: Done)
    ↓
Progress: 100% (16/16 cards completed)
```

**Usage**:
```bash
python .claude/skills/visualizer/scripts/card-progress-heatmap.py
```

---

## File Structure

```
.claude/skills/visualizer/
├── SKILL.md                       ← Skill manifest
├── README.md                      ← This file
├── DATA-SOURCES.md               ← Data source strategy
└── scripts/
    ├── parse_prd_markdown.py     ← Parser (YAML frontmatter + Card status)
    ├── parse_ts_data.py          ← TypeScript parser (legacy)
    ├── visualization-showcase.py ← Landing page
    └── card-progress-heatmap.py  ← ✅ Only data-driven visualization
```

## Data Source Headers

Every visualization script has a header documenting:
- **DATA SOURCE**: Where it reads data from
- **CURRENT STATUS**: ✅ Data-driven | ⚠️ Partial | ❌ Hardcoded
- **WHAT IT READS**: Which fields it uses
- **ZERO HARDCODING**: YES | NO | PARTIAL

**Example**:
```python
#!/usr/bin/env python3
"""
Generate Card Progress Heatmap.

DATA SOURCE:
  Primary: docs/prds/*.md (cards field)
  Secondary: docs/cards/*.md (status field)
  Parser: parse_prd_markdown.load_all_prds()

CURRENT STATUS: ✅ FULLY DATA-DRIVEN

ZERO HARDCODING: ✅ YES
"""
```

## Migration Priority

### Phase 1: Quick Wins ⚡
1. **PRD Graph** → Use real PRD frontmatter (1 hour)
2. **Test Coverage** → Use Card progress as proxy (30 min)

### Phase 2: Enhanced Dashboards 📊
3. **Progress Dashboard** → Calculate from PRD+Card (2 hours)

### Phase 3: Complete Migration 🎯
4. Remove all hardcoded fallback data
5. Add "Real Data" badges in UI

## Development

### Adding a New Visualization

1. Create script in `scripts/`
2. Add data source header (see above)
3. Use `parse_prd_markdown.load_all_prds()` for data
4. Update `SKILL.md` with new visualization
5. Add card to `visualization-showcase.py`
6. Update `DATA-SOURCES.md` status

### Testing Data Sources

```bash
# Check if visualization uses hardcoded data
grep -n "PRD-\|\"ww\"\|\"rk\"" script.py

# Test with empty data
mv docs/prds docs/prds.bak
python script.py  # Should show "No data" not crash
mv docs/prds.bak docs/prds
```

## See Also

- [SKILL.md](SKILL.md) - User-facing documentation
- [DATA-SOURCES.md](DATA-SOURCES.md) - Detailed migration plan
- [../../CLAUDE.md](../../CLAUDE.md) - Project architecture
