# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Skills

Use the skills in `.claude/skills/` for all tasks. Start with `/core/router` if unsure which skill to use.

**Common workflows:**
- New feature → `/workflow/brainstorming` → `/workflow/writing-plans` → `/workflow/tdd` → `/workflow/verification` → `/workflow/finishing-branch`
- Bug fix → `/workflow/debugging` → `/workflow/verification`
- UI work → `/design/frontend-design`
- Tests → `/testing/web-testing`

---

## Project: MyJira

AI-powered personal task management. React + Vite frontend, Express backend, SQLite database, Ollama local LLM.

### Commands

```bash
# Dependencies
npm run install:all

# Development (hot reload)
npm run dev                                         # Frontend :5173 + Backend :3001
docker compose -f docker-compose.dev.yml up         # Full Docker dev mode

# Production
docker compose up -d --build                        # Build and start
docker compose logs -f app                          # Check logs
docker compose down                                 # Stop

# Backend only
node server.js
NODE_ENV=production node server.js
```

### Architecture

**Stack:** React 18 + Vite / Express 4 + better-sqlite3 / SQLite / Ollama (local LLM)

```
React (:5173) → Vite proxy → Express (:3001) → SQLite / Ollama (:11434)
```

In production, Express serves built frontend from `client/dist/`.

### Backend

- `server.js` — Express entry; mounts 5 route groups under `/api/`
- `db.js` — SQLite schema init (tables: `tasks`, `daily_logs`, `reports`, `task_logs`)
- `routes/tasks.js` — CRUD for tasks
- `routes/ai.js` — All Ollama interactions: chat, prioritize, morning briefing, reports, conflict suggestions
- `routes/logs.js`, `reports.js`, `task-logs.js` — Supporting data

### Frontend (`client/src/`)

- `App.jsx` — Root state (tasks, activeTab, AI modal); all API calls flow through here
- `utils/api.js` — Centralized fetch wrapper
- `utils/conflicts.js` — Client-side deadline conflict detection
- Components: `KanbanBoard`, `ChatPanel`, `ScheduleView`, `ReportsView`, `MorningBriefing`, `EveningReview`

### AI Integration

Ollama runs locally at `http://localhost:11434` (Docker: `http://ollama:11434`).
Default model: `qwen3-vl:8b-instruct` (override via `OLLAMA_MODEL`).
All AI prompts are in Chinese.

**Key AI flows:**
- **Task creation** — `ChatPanel` → `/api/ai/chat` (multi-turn until `TASK_READY:` JSON); frontend parses and POSTs to `/api/tasks`
- **Prioritization** — Sends all tasks → `/api/ai/prioritize`; returns `priority_score` (0–100) and `priority_level` (P1–P4)
- **Reports** — `/api/ai/daily-report`, `/weekly-report`, `/monthly-report` → saved to DB via `/api/reports`

### Database Rules

- **Never modify `CREATE TABLE` directly** — use `ALTER TABLE` for schema changes
- All migrations go in `db.js` → `runMigrations()` with version check via `PRAGMA user_version`
- SQLite at `./data/tasks.db` (WAL mode, gitignored, persisted via Docker volume)

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `NODE_ENV` | `development` | `production` serves built frontend |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama endpoint (Docker: `http://ollama:11434`) |
| `OLLAMA_MODEL` | `qwen3-vl:8b-instruct` | LLM model |

### Git Workflow

- New feature → `git checkout -b feature/xxx`
- Commit → `git add . && git commit -m "feat: description"`
- Merge → `git checkout main && git merge feature/xxx && git push origin main`
- Use `/workflow/finishing-branch` skill when completing a branch
