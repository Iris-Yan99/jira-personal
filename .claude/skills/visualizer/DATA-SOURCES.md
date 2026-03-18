# Visualization Data Sources

**Zero Hardcoding Principle**: All visualizations should read from real data sources, not hardcoded values.

## Current Status

| Visualization | Status | Data Source |
|---------------|--------|-------------|
| **Card Progress Heatmap** | ✅ **Active** | `docs/prds/*.md` (cards) → `docs/cards/*.md` (status) |

**Removed Visualizations** (hardcoded data - removed per user request):
| Visualization | Reason | Future Plan |
|---------------|--------|-------------|
| **Progress Dashboard** | ❌ Hardcoded fallback mock | Establish YAML format first |
| **PRD Graph** | ❌ Hardcoded relationships | Establish YAML format first |
| **Phase Tracker** | ❌ Hardcoded phases | Establish YAML format first |
| **Test Coverage Heatmap** | ❌ Hardcoded coverage | Establish YAML format first |

---

## Data Source Hierarchy

### Tier 1: YAML Frontmatter (Single Source of Truth)
**Location**: `docs/prds/*.md`, `docs/cards/*.md`, `docs/stories/*.md`

**Why**:
- ✅ File-based, version-controlled
- ✅ No duplication
- ✅ Human-readable and AI-parseable
- ✅ Follows CLAUDE.md standards

**Parser**: `.claude/skills/visualizer/scripts/parse_prd_markdown.py`

**What it provides**:
```python
{
  'prds': [
    {
      'id': 'PRD-002',
      'title': 'Product Catalog',
      'status': 'done',
      'cards': ['CARD-014', 'CARD-015', ...],
      'progress': {
        'total_cards': 16,
        'completed': 16,
        'in_progress': 0,
        'pending': 0,
        'progress_pct': 100.0,
        'cards': [...]  # Full Card data with status
      }
    }
  ]
}
```

### Tier 2: TypeScript Data Files (Fallback)
**Location**: `lib/progress-data.ts`, `lib/prd-data.ts`

**Why**:
- ⚠️ Used by client components (cannot use fs module)
- ⚠️ Requires manual sync with YAML frontmatter
- ⚠️ Duplication risk

**Parser**: `.claude/skills/visualizer/scripts/parse_ts_data.py` (future)

**When to use**:
- Only when YAML data is incomplete
- For project-level aggregations not in PRD files

---

## Active Visualization

### Card Progress Heatmap ✅
**Status**: Fully data-driven
**Source**: `parse_prd_markdown.load_all_prds()`

```python
prds = load_all_prds()
for prd in prds:
    progress = prd['progress']  # Automatically calculated from Card status
```

---

## Future Visualizations (Require YAML Format First)

### Progress Dashboard
**Removed**: Used hardcoded fallback mock
**Future approach**: Calculate from PRD+Card data

**Proposed implementation**:
```python
# OLD (hardcoded)
data = {
    "projects": [
        {"id": "ww", "features": {"undocumented": 6, "documented": 0}}  # ❌ Hardcoded
    ]
}

# NEW (data-driven)
prds = load_all_prds()
projects = {}
for prd in prds:
    project_id = prd.get('project', 'unknown')
    if project_id not in projects:
        projects[project_id] = {
            'id': project_id,
            'total_prds': 0,
            'completed_prds': 0,
            'total_cards': 0,
            'completed_cards': 0
        }

    projects[project_id]['total_prds'] += 1
    if prd.get('status') == 'done':
        projects[project_id]['completed_prds'] += 1

    if 'progress' in prd:
        projects[project_id]['total_cards'] += prd['progress']['total_cards']
        projects[project_id]['completed_cards'] += prd['progress']['completed']
```

---

### PRD Graph
**Removed**: Used hardcoded mock data
**Future approach**: Real PRD relationships from YAML

**Proposed implementation**:
```python
# OLD (hardcoded)
nodes = [
    {"id": "PRD-001", "type": "prd", "title": "Create Order"}  # ❌ Hardcoded
]

# NEW (data-driven)
prds = load_all_prds()
nodes = []
links = []

for prd in prds:
    # Add PRD node
    nodes.append({
        'id': prd['id'],
        'type': 'prd',
        'title': prd['title'],
        'project': prd.get('project', 'unknown')
    })

    # Add Card nodes and links
    for card_id in prd.get('cards', []):
        nodes.append({'id': card_id, 'type': 'card'})
        links.append({'source': prd['id'], 'target': card_id, 'type': 'has_card'})

    # Add Collection nodes and links
    for collection in prd.get('relatedCollections', []):
        nodes.append({'id': collection, 'type': 'collection'})
        links.append({'source': prd['id'], 'target': collection, 'type': 'uses_collection'})
```

---

### Phase Tracker
**Removed**: Used hardcoded phases
**Future approach**: Extract from PRD progress sections or `lib/progress-data.ts`

**Options**:
1. Parse `### Phase X:` from PRD markdown
2. Use `lib/progress-data.ts` (project-level phases)

---

### Test Coverage Heatmap
**Removed**: Used hardcoded mock coverage
**Future approach**: Real test coverage from PRD frontmatter

**Proposed implementation**:
```python
# OLD (hardcoded)
coverage_data = {
    'PRD-001': {'passRate': 85, 'total': 20}  # ❌ Hardcoded
}

# NEW (data-driven)
prds = load_all_prds()
for prd in prds:
    # Option 1: Use Card progress as coverage proxy
    if 'progress' in prd:
        prd['coverage'] = {
            'passRate': prd['progress']['progress_pct'],
            'total': prd['progress']['total_cards'],
            'passed': prd['progress']['completed'],
            'failed': prd['progress']['pending'] + prd['progress']['in_progress']
        }

    # Option 2: Read from testCoverage field (if exists)
    if 'testCoverage' in prd:
        prd['coverage'] = prd['testCoverage']
```

---

## Implementation Status

### Completed ✅
- [x] Document current state (this file)
- [x] Add data source comments to visualization scripts
- [x] Implement Card-driven progress calculation
- [x] Create Card Progress Heatmap (fully data-driven)
- [x] Remove all hardcoded visualizations per user request

### Next Steps 🎯
1. **Establish YAML frontmatter formats** - Define proper structure for:
   - Project-level progress data
   - PRD relationships and dependencies
   - Test coverage fields
   - Phase tracking information

2. **Future visualizations** (after YAML formats established):
   - Progress Dashboard (from PRD+Card data)
   - PRD Dependency Graph (from YAML relationships)
   - Phase Tracker (from PRD progress sections)
   - Test Coverage Heatmap (from testCoverage field or Card progress)

---

## How to Add Data Source Documentation

**At the top of every visualization script, add**:

```python
#!/usr/bin/env python3
"""
Generate [Visualization Name].

DATA SOURCE:
  Primary: docs/prds/*.md (YAML frontmatter)
  Secondary: docs/cards/*.md (status field)
  Fallback: lib/progress-data.ts (when YAML incomplete)

CURRENT STATUS: [✅ Data-driven | ⚠️ Partial | ❌ Hardcoded]

WHAT IT READS:
  - PRD fields: id, title, status, cards, relatedCollections
  - Card fields: status (Done/In Progress/Pending)
  - Calculated: progress (from Card statuses)

ZERO HARDCODING: [YES | NO | PARTIAL]
"""
```

---

## Validation

**To check if a visualization is truly data-driven**:

1. **Grep for hardcoded values**:
   ```bash
   grep -n "PRD-" script.py  # Should only appear in comments
   grep -n "\"ww\"" script.py  # Project IDs should come from data
   ```

2. **Check fallback blocks**:
   ```bash
   grep -A 5 "except\|fallback\|mock" script.py
   ```

3. **Run with empty data**:
   ```bash
   # If visualization crashes with no PRDs, it's not robust
   mv docs/prds docs/prds.bak
   python script.py
   mv docs/prds.bak docs/prds
   ```

---

## Migration Checklist

For each visualization that needs migration:

- [ ] Add data source documentation at top of file
- [ ] Remove hardcoded mock data
- [ ] Use `parse_prd_markdown.load_all_prds()` or `load_real_data()`
- [ ] Handle empty data gracefully (show "No data" instead of crashing)
- [ ] Add inline comments explaining data transformations
- [ ] Test with real PRD data
- [ ] Update SKILL.md with new data source
- [ ] Mark as ✅ Data-driven in this file
