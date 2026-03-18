---
name: migration
description: |
  Directus schema migrations. Triggers on:
  - "run migration" / "run the migration" / "migration latest" / "apply migration"
  - "create migration" / "new migration" / "add migration"
  - "take snapshot" / "schema snapshot"
  - "create collection" / "add field" / "add relation"
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(node *), Bash(npx *), Bash(source *), Bash(ls *), Bash(cat *), Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Migration Skill

Manages Directus schema migrations with **mandatory snapshot workflow**.

## STEP 0: Detect Scenario (MANDATORY)

**Before doing anything**, determine which scenario:

| User Says | Scenario | Action |
|-----------|----------|--------|
| "run migration", "migration latest", "apply migration" | **RUN** | Go to [Run Existing](#run-existing-migration) |
| "create migration", "new migration", "create collection", "add field" | **CREATE** | Go to [Create New](#create-new-migration) |
| "take snapshot", "schema snapshot" | **SNAPSHOT** | Go to [Snapshot Only](#snapshot-only) |

---

## Run Existing Migration

### Step 1: Read Registry

```bash
cat migrations/REGISTRY.md
```

Find the **latest migration** (highest number). Check its status.

### Step 2: Check Snapshot Status

```bash
ls -la snapshots/{NNN}-*
```

| Status | Next Action |
|--------|-------------|
| Both before + after exist | ✅ Done - inform user |
| Only after exists | ⚠️ Before was missed - note in registry |
| Neither exists | Continue to Step 3 |

### Step 3: Ask D11 Location

Use `AskUserQuestion`:
- Default: `./backend`
- Or custom path

### Step 4: Take Before Snapshot (if migration not yet applied)

```bash
source ~/.nvm/nvm.sh && cd {D11_PATH} && nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/{NNN}-{name}-before.yaml
```

### Step 5: Run Migration Script

```bash
source ~/.nvm/nvm.sh && nvm use 20 && \
  npx tsx scripts/collections/{script}.ts
```

### Step 6: Take After Snapshot (MANDATORY)

```bash
source ~/.nvm/nvm.sh && cd {D11_PATH} && nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/{NNN}-{name}-after.yaml
```

### Step 7: Update Registry

Edit `migrations/REGISTRY.md` - add snapshot date to status.

### Step 8: Summary

Report to user:
- Migration number
- Script run
- Snapshots taken (before/after)
- Registry updated

---

## Create New Migration

### Step 1: Read Registry - Get Next Number

```bash
cat migrations/REGISTRY.md | grep -E "^\| [0-9]" | tail -5
```

Next number = highest + 1

### Step 2: Ask Details

Use `AskUserQuestion`:
1. What to create? (collection/field/relation)
2. Collection name?
3. D11 path (default: `./backend`)

### Step 3: Take Before Snapshot (MANDATORY - DO NOT SKIP)

```bash
source ~/.nvm/nvm.sh && cd {D11_PATH} && nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/{NNN}-{name}-before.yaml
```

### Step 4: Create Migration Script

Create at: `scripts/collections/{action}-{name}.ts`

For relations, reference: `.claude/skills/directus-schema/references/directus-relations.md`

### Step 5: Run Migration Script

```bash
source ~/.nvm/nvm.sh && nvm use 20 && \
  npx tsx scripts/collections/{script}.ts
```

### Step 6: Take After Snapshot (MANDATORY - DO NOT SKIP)

```bash
source ~/.nvm/nvm.sh && cd {D11_PATH} && nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/{NNN}-{name}-after.yaml
```

### Step 7: Update Registry

Add new row to `migrations/REGISTRY.md`:

```markdown
| {NNN} | `{NNN}-{name}-after.yaml` | CARD-SCHEMA-{NNN} | {Description} | {DATE} | ✅ Applied |
```

### Step 8: Verify Files Created

```bash
ls -la snapshots/{NNN}-*
ls -la scripts/collections/*{name}*
```

---

## Snapshot Only

### Step 1: Ask D11 Location

### Step 2: Ask Snapshot Name

### Step 3: Take Snapshot

```bash
source ~/.nvm/nvm.sh && cd {D11_PATH} && nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/{filename}.yaml
```

---

## Environment

| Purpose | Node Version | Command Prefix |
|---------|--------------|----------------|
| Directus CLI (snapshots) | 22.22.0 | `cd {D11_PATH} && nvm use 22.22.0` |
| Migration scripts (tsx) | 20 | `nvm use 20` |

**D11 Default Path**: `./backend`

---

## Mandatory Checklist

For every migration:

- [ ] Registry read first (know the migration number)
- [ ] Before snapshot taken (or documented why missing)
- [ ] Migration script exists and runs
- [ ] After snapshot taken
- [ ] Registry updated with status

---

## Files

| File | Purpose |
|------|---------|
| `migrations/REGISTRY.md` | Migration audit trail |
| `snapshots/{NNN}-*-before.yaml` | Pre-migration state |
| `snapshots/{NNN}-*-after.yaml` | Post-migration state |
| `scripts/collections/*.ts` | Migration scripts |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-15 | Created - separated from directus-schema skill |
