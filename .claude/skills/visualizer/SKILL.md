---
name: visualizer
description: Generate interactive HTML visualizations for project progress, PRD dependencies, test coverage, and workflow phases. Use when exploring project status, understanding relationships, or creating progress reports.
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(python *)
---

# Project Visualizer

Generate interactive HTML visualizations to explore project state, progress, and relationships.

> **Data Source**: Reads PRD metadata from YAML frontmatter in `docs/prds/*.md` files (following the official pattern from CLAUDE.md)

## Available Visualizations

### 0. Visualization Showcase 🎨
**File**: `visualization-showcase.html`

Interactive landing page to access data-driven visualizations:
- One-click access to Card Progress Heatmap
- Shows which visualizations were removed (hardcoded data)
- Explains focus on YAML format first

**Usage:**
```bash
python .claude/skills/visualizer/scripts/visualization-showcase.py
```

**Ask Claude**: "Show visualization showcase"

---

### 1. Card Progress Heatmap 🎯
**File**: `card-progress-heatmap.html`

**⭐ Fully Data-Driven** - Zero hardcoding:
- Visual heatmap of PRD completion based on Card status
- Color-coded by progress %
- Shows Done/Active/Pending Card counts
- Interactive filtering
- Auto-updates when Card status changes

**Data Source**: `docs/prds/*.md` (cards field) → `docs/cards/*.md` (status field)

**Usage:**
```bash
python .claude/skills/visualizer/scripts/card-progress-heatmap.py
```

**Ask Claude**: "Show Card progress"

---

## Removed Visualizations

The following visualizations were removed due to hardcoded data. Focus is on establishing proper YAML frontmatter formats first before creating new visualizations.

- ❌ Multi-Project Progress Dashboard (hardcoded project data)
- ❌ PRD Dependency Graph (hardcoded relationships)
- ❌ Workflow Phase Tracker (hardcoded phases)
- ❌ Test Coverage Heatmap (hardcoded test data)

---

## How to Invoke

**Three ways to generate visualizations:**

1. **Direct Script Execution** (fastest):
   ```bash
   python .claude/skills/visualizer/scripts/<script-name>.py
   ```

2. **Ask Claude** (natural language):
   ```
   "Visualize the project progress"
   "Show me test coverage"
   "Create a dependency graph"
   ```

3. **Slash Command**:
   ```
   /visualizer
   ```

## What Visualizations Show

- **Interactive elements**: Click, drag, filter, zoom
- **Real-time data**: Reads from PRD markdown YAML frontmatter
- **Color coding**: Green (complete), yellow (in progress), red (critical), gray (pending/no data)
- **Self-contained**: Single HTML file with embedded CSS/JavaScript

## Data Sources

| Visualization | Data Source | Status |
|---------------|-------------|--------|
| **Card Progress Heatmap** | `docs/prds/*.md` (cards) → `docs/cards/*.md` (status) | ✅ Active |
| Progress Dashboard | Removed - needs YAML format | ❌ Removed |
| PRD Graph | Removed - needs YAML format | ❌ Removed |
| Phase Tracker | Removed - needs YAML format | ❌ Removed |
| Test Coverage | Removed - needs YAML format | ❌ Removed |

## Technical Details

- **Language**: Python 3 (built-in libraries only, no pip install required)
- **Parser**: `parse_prd_markdown.py` (reads YAML frontmatter from markdown files)
- **Output**: Self-contained HTML with inline CSS/JavaScript
- **Browser**: Auto-opens in default browser
- **Compatibility**: Works with all modern browsers (Chrome, Firefox, Safari, Edge)

## File Locations

Generated HTML files are in the project root and excluded from git (see `.gitignore`):
- `visualization-showcase.html` ⭐ Landing page
- `card-progress-heatmap.html` 🎯 Only data-driven visualization

## Future Visualizations (Planned)

- API Endpoint Coverage (shows which endpoints are documented/tested)
- Collection Schema Explorer (interactive schema browser)
- Codebase Map (file tree with sizes and types)
