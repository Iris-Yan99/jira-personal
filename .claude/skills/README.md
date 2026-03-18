# Claude Code Skills

Specialized skills that Claude Code automatically invokes based on task descriptions.

## Quick Start

| I want to... | Use Skill |
|--------------|-----------|
| Create a new feature | `brainstorming` → `writing-plans` → `tdd` |
| Fix a bug | `debugging` |
| Run tests | `web-testing` or `api-testing` |
| Design a page | `frontend-design` |
| Create documents | `pdf` / `pptx` / `docx` |
| Review code | `code-review` |
| Understand the project | `onboard` |
| Find the right skill | `router` |

## Core Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `router` | /router, "what skill", "help me" | Smart routing, recommends correct skill |
| `onboard` | /onboard, "I'm new", "how to start" | Project detection, recommends workflows |
| `progress` | /progress | Project progress tracking |

## Workflow Skills

### Design & Planning

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `brainstorming` | /brainstorming, "create feature" | Requirements exploration, design proposals |
| `writing-plans` | /writing-plans, "plan" | Write implementation plans |
| `planning` | /planning | Manus-style file-based planning |

### Development

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `tdd` | /tdd, "test driven" | Test-Driven Development (RED-GREEN-REFACTOR) |
| `debugging` | /debugging, "bug", "error" | Systematic debugging (4 phases) |
| `executing-plans` | /executing-plans, "execute plan" | Execute implementation plans |
| `verification` | "verify", "confirm" | Pre-completion verification |

### Code Review

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `code-review` | /code-review, "review" | Code review |
| `requesting-code-review` | "request review" | Request code review |
| `receiving-code-review` | "handle feedback" | Handle review feedback |

### Git & Branches

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `git-worktrees` | /git-worktrees, "parallel development" | Use git worktrees |
| `finishing-branch` | "finish branch", "merge", "PR" | Complete development branch |

### Agent & Parallel Work

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `dispatching-parallel-agents` | "parallel agents" | Dispatch parallel agents |
| `subagent-driven-development` | "subagent" | Subagent-driven development |

## Testing Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `web-testing` | /web-testing, "e2e", "playwright" | Full-stack E2E testing (Playwright + Newman) |
| `api-testing` | /api-testing, "newman" | Newman/Postman API testing |
| `e2e-test` | /e2e-test, "E2E" | E2E + integration tests |

## Design Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `frontend-design` | /frontend-design, "UI", "page design" | Frontend page design |
| `ui-ux-system` | "palette", "fonts", "UX" | Design system (161 palettes, 57 fonts) |

## Document Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `pdf` | /pdf, "PDF" | PDF document processing |
| `pptx` | /pptx, "PPT", "slides" | PowerPoint presentations |
| `docx` | /docx, "Word", "document" | Word documents |
| `xlsx` | /xlsx, "Excel", "spreadsheet" | Excel spreadsheets |
| `canvas-design` | /canvas-design, "design", "poster" | Visual design |
| `doc-coauthoring` | "coauthor document" | Document co-authoring |
| `theme-factory` | "theme", "style" | Theme styling |

## Tool Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `mcp-builder` | /mcp-builder, "MCP server" | Build MCP servers |
| `skill-creator` | /skill-creator | Create new skills |
| `claude-api` | /claude-api, "Claude API", "SDK" | Claude API development |
| `planning` | /planning, "Manus" | Manus-style file planning |
| `algorithmic-art` | "algorithmic art", "p5.js" | Algorithmic art |
| `web-artifacts-builder` | "artifacts" | Web artifacts builder |

## Domain Skills (Project-Specific)

> These skills are project-specific and can be removed when distributing to other teams.

### Directus Related

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `directus-schema` | /directus-schema, "seed", "database" | Directus schema reference |
| `d11-frontend` | /d11-frontend, "D11 frontend" | D11 frontend integration |
| `rbac` | /rbac, "permission", "role" | RBAC permission management |
| `backend-extension` | /backend-extension, "backend extension" | Backend extension development |
| `migration` | /migration, "migrate" | Data migration |

### Project Management

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `ai-workflow` | /ai-workflow | AI development workflow |
| `pm-comments` | /pm-comments, "synque", "sync" | PM comments sync |
| `visualizer` | /visualizer | Data visualization |

### Other

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `landing-page` | /landing-page | Landing page management |
| `landing-audit` | /landing-audit | Landing page audit |
| `agent-teams` | /agent-teams | Agent team orchestration |
| `team-health` | /team-health | Team health check |
| `business-prd-planner` | /business-prd-planner | PRD planning |
| `business-report` | /business-report | Business report |
| `meta-evaluation` | /meta-evaluation | Meta-evaluation |
| `context-review` | /context-review | Context review |

## Skill Structure

```
.claude/skills/
├── SKILL-CATALOG.md          # Full skill index
├── README.md                 # This file
├── README-CN.md              # Chinese version
├── [skill-name]/             # Each skill at depth 1
│   ├── SKILL.md              # Skill manifest
│   ├── references/           # Reference files (optional)
│   └── templates/            # Template files (optional)
└── ...
```

## How Skills Work

### Automatic Invocation

Claude Code automatically invokes skills when their description matches user intent:

```
User: "Run the migration"
→ Claude Code invokes `migration` skill

User: "Create a new collection for users"
→ Claude Code invokes `migration` skill

User: "Run Newman tests for OAuth API"
→ Claude Code invokes `api-testing` skill

User: "Review PR #106"
→ Claude Code invokes `code-review` skill
```

### Manual Invocation

Users can explicitly invoke skills:

```bash
/brainstorming
/tdd
/web-testing
/migration
```

## Creating New Skills

1. Create directory: `mkdir -p .claude/skills/[skill-name]`
2. Create SKILL.md with frontmatter:

```yaml
---
name: skill-name
description: What this skill does. Triggers when user says X, Y, Z.
user-invocable: true
---

# Skill Name

When to use, triggers, workflow...
```

## Important Discovery

**Skill discovery only scans depth 1 directories.** Nested directories (depth 2+) with `SKILL.md` files will NOT be recognized.

```
✅ skills/my-skill/SKILL.md      # Works (depth 1)
❌ skills/category/my-skill/SKILL.md  # Won't work (depth 2)
```

## See Also

- [SKILL-CATALOG.md](SKILL-CATALOG.md) - Complete skill index
- [CLAUDE.md](../CLAUDE.md) - Project overview
