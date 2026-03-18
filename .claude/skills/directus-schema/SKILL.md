---
name: directus-schema
description: |
  Directus schema references, seed data, and fresh database setup.
  Triggers on:
  - "seed data" / "sample data" / "update seed"
  - "setup database" / "set up database" / "fresh database"
  - Schema reference questions about M2O/O2M/M2M relations
  - Backend extensions, multi-org RBAC, OAuth providers

  NOTE: For "run migration", "create migration", "take snapshot" → use `/migration` skill
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(node *), Bash(npx *), Read, Write, Glob, Grep
---

# Directus Schema & Backend Management

Specialized skill for Directus schema references, seed data, fresh database setup, backend extensions, and multi-org architecture.

**For migration workflows** (run/create/snapshot): Use the `/migration` skill instead.

## When to Use This Skill

- Setting up fresh database
- Seeding sample/master data
- Schema reference questions (M2O/O2M/M2M patterns)
- Backend extension development
- Multi-org RBAC implementation
- OAuth provider setup

## Key Rules

1. **Always create Card first** - Track every schema change
2. **Always snapshot before** - Enable rollback
3. **Always use two API calls for relations** - `/fields` + `/relations`
4. **Always update REGISTRY.md** - Maintain audit trail
5. **Always reference Card in commit** - Link migration to context

## Migration Types

| Type | Example | Template Script |
|------|---------|--------------------|
| New Collection | Create users_multi collection | `scripts/collections/create-users-multi-collection.ts` |
| New Collection | Create job collection (ETL) | `scripts/collections/create-job-collection.ts` |
| New Collection + M2O | Create record collection with job relation | `scripts/collections/create-record-collection.ts` |
| Add Fields | Add timestamp fields | `scripts/add-users-multi-timestamps.ts` |
| M2O Relation | card.story_id → story.id | `scripts/create-card-story-relation.ts` |
| O2M Field | story.cards | `scripts/create-story-cards-o2m.ts` |

## Directus Environments

This project uses **dual Directus architecture**:

| Environment | Version | Purpose | Location |
|-------------|---------|---------|----------|
| **orq-dev** | Directus 9 | Legacy, SMS/Email auth | Production (old) |
| **d11** | Directus 11 | Modern, OAuth support | `./backend` (or ask user) |

**Important**: Schema migrations are developed on **d11** (Directus 11).

**See**: `references/directus-versions.md` for full environment guide

## Backend Extensions

### Directus Backend Extensions (Database Operations)

**When to use:** Custom API endpoints with database access, OAuth providers, business logic modules

**Pattern**: Modular extension architecture documented in OAuth implementation

**Example**: `./backend/extensions/directus-extension-oauth/`

**Key Learnings**:
1. Separate schema (migrations) from logic (extension)
2. One Card per module for detailed documentation
3. Test backend first with Newman before frontend integration
4. Use Directus services for system tables, direct SQL for custom tables

**Environment Variable Note**: `NEXT_PUBLIC_AUTH_SERVER_URL` is shared by all auth methods (SMS, Email, OAuth). Directus 9 has SMS/Email only, Directus 11 adds OAuth support.

**Related PRDs**:
- [PRD-SOCIAL-OAUTH](../../docs/prds/PRD-SOCIAL-OAUTH.md) - OAuth extension (D11)
- [PRD-AUTH](../../docs/prds/PRD-AUTH.md) - Baseline auth (D9)
- [PRD-RBAC-MULTI-TENANT](../../docs/prds/PRD-RBAC-MULTI-TENANT.md) - Multi-org RBAC

## References

Detailed reference files loaded on-demand:

| File | Purpose |
|------|---------|
| `references/directus-relations.md` | Two-step API flow for M2O/O2M/M2M |
| `references/directus-sdk-best-practices.md` | CRUD, error handling, type safety |
| `references/directus-versions.md` | Dual environment, multi-org, OAuth, RBAC |
| `../backend-extension/references/backend-extensions.md` | **→ Moved to `backend-extension` skill** |

## Fresh Database Setup

For setting up a **new Directus instance from scratch**, see:

- **[PRD-MIGRATION](../../docs/prds/PRD-MIGRATION.md)** - Complete fresh database setup guide
- **[FRESH-DB-SETUP.md](../../docs/FRESH-DB-SETUP.md)** - Step-by-step manual setup
- **[setup-fresh-database.sh](../../scripts/setup-fresh-database.sh)** - Automated setup script

**Key command** (apply latest cumulative snapshot):
```bash
npx directus schema apply snapshots/009-users-multi-timestamps-after.yaml
```

### AI Instructions for Migration Tasks or set up database

**IMPORTANT**: When a user asks to set up or migrate a Directus database:

1. **Ask for Directus backend location first**:
   ```
   Where is your Directus backend located?
   - Default: ./backend
   - Or specify your custom path
   ```

2. **Verify the directory exists** before proceeding with any commands

3. **Key facts to communicate**:
   - Snapshots are CUMULATIVE (only apply latest: 009)
   - DO NOT loop through all snapshots - this causes conflicts
   - Master data (organizations, roles) must be seeded after schema

4. **If user has no existing d11 directory**, guide them to:
   - Run `./scripts/setup-fresh-database.sh` which will prompt for location
   - Or manually create with `mkdir -p` and `npm install directus`

5. **After schema applied, seed master data**:
   ```bash
   node scripts/seed-d11-sample-data.js
   ```
   - See [Seeding Master Data](#seeding-master-data) section for details
   - Use `--force` flag to reset existing seed data

### AI Instructions for Collection Creation / Running Migrations

**IMPORTANT**: When a user asks to create a new collection or run a migration, follow this workflow IN ORDER:

#### Step 1: Ask for Connection Details

```
Question 1: What is your Directus endpoint URL?
- Default: http://localhost:8055
- Or specify your custom URL (e.g., https://directus.example.com)

Question 2: Do you have a Directus Admin Token?
- If yes: Please provide the token
- If no: Generate one in Directus Admin UI:
  Settings → Access Tokens → Create Token (with Admin role)

Question 3: Where is your Directus backend located? (for snapshots)
- Default: ./backend
- Or specify your custom path
```

#### Step 2: Check Migration Registry

```bash
# Read migrations/REGISTRY.md to get next migration number
cat migrations/REGISTRY.md
# Example: Last migration is 014, next is 015
```

#### Step 3: Create Card First (DO NOT SKIP!)

```bash
# Use schema migration template
cp docs/cards/CARD-TEMPLATE-SCHEMA-MIGRATION.md \
   docs/cards/CARD-SCHEMA-NNN-description.md

# Fill in Card frontmatter:
migration_number: "015"
migration_file: "015-description-after.yaml"
snapshot_before: "015-description-before.yaml"
snapshot_after: "015-description-after.yaml"
```

**Key Rule**: Always create Card BEFORE writing any migration script code.

#### Step 4: Ask Collection Design Questions

```
Question 4: What fields should the collection have?
- Basic (id, name, status)
- With timestamps (+ date_created, date_updated)
- Full CRUD (+ description, sort)

Question 5: Should it have organization (orq) relation?
- Yes: M2O to organizations for multi-tenant
- No: Keep it simple
```

#### Step 5: Snapshot Before Changes

```bash
# Directus 11 uses specific Node version
bash -c 'source ~/.nvm/nvm.sh && \
  cd ./backend && \
  nvm use 22.22.0 && \
  npx directus schema snapshot \
  ./snapshots/NNN-description-before.yaml'
```

#### Step 6: Create Migration Script

Create script at `scripts/collections/create-{collection}-collection.ts`

**Reference**: `references/directus-relations.md`

**Implementation Script Pattern**: See `scripts/collections/create-users-multi-collection.ts` for complete example.

**CRITICAL**: When creating relations, use TWO API calls:
```typescript
// Step 1: Create field
await fetch(`${DIRECTUS_URL}/fields/collection`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    field: 'foreign_key_field',
    type: 'integer',
    schema: {
      foreign_key_table: 'related_collection',
      foreign_key_column: 'id'
    },
    meta: {
      interface: 'select-dropdown-m2o',
      special: ['m2o']
    }
  })
})

// Step 2: Create relation (DO NOT SKIP!)
await fetch(`${DIRECTUS_URL}/relations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    collection: 'main_collection',
    field: 'foreign_key_field',
    related_collection: 'related_collection',
    schema: {
      on_delete: 'SET NULL'
    },
    meta: {
      one_field: null  // or 'reverse_field_name' for O2M
    }
  })
})
```

#### Step 7: Run Migration Script

```bash
bash -c 'source ~/.nvm/nvm.sh && nvm use 22 && \
  DIRECTUS_URL=http://localhost:8055 \
  DIRECTUS_ADMIN_TOKEN=xxx \
  npx tsx scripts/collections/create-xxx.ts'
```

#### Step 8: After Migration Completes, ASK User

```
Migration completed successfully!

Would you like me to take a schema snapshot?
- Yes: I'll provide the command for your Directus backend directory
- No: You can run it manually later

Snapshot command (run from Directus backend):
cd {DIRECTUS_PATH} && npx directus schema snapshot \
  ./snapshots/NNN-description-after.yaml
```

**Why Ask User Instead of Automating:**
- **Schema snapshots** require specific D11 environment setup
- **REGISTRY.md updates** need proper migration number sequencing
- **User validation** ensures understanding of changes made

#### Step 9: Update Registry

Add entry to `migrations/REGISTRY.md`:
```markdown
| 015 | 015-description-after.yaml | CARD-SCHEMA-015 | Description | 2026-02-15 | ✅ Applied |
```

#### Step 10: Update Progress Tracking (if applicable)

If the migration relates to a PRD, update `lib/progress-data.ts`:
```typescript
// Add notes field to track implementation status
{
  id: 'PRD-XXX',
  title: 'Feature Name',
  codeExists: false,
  prdAccurate: 'accurate',
  testsExist: false,
  lastVerified: '2026-02-15',
  notes: '⚠️ Collection created (Migration 015), SQL constraints pending'
}
```

#### Step 11: Commit Everything

```bash
git add docs/cards/CARD-SCHEMA-NNN-*.md \
        scripts/collections/create-*.ts \
        snapshots/NNN-*-before.yaml \
        snapshots/NNN-*-after.yaml \
        migrations/REGISTRY.md \
        lib/progress-data.ts

git commit -m "feat: description (CARD-SCHEMA-NNN)

Migration NNN: What changed
Card: CARD-SCHEMA-NNN-description

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

#### Summary Checklist

- [ ] Connection details gathered (URL, token, d11 path)
- [ ] Migration number from REGISTRY.md
- [ ] Card created FIRST
- [ ] Collection design confirmed (fields, orq relation)
- [ ] Before snapshot taken
- [ ] Migration script created and run
- [ ] After snapshot taken
- [ ] REGISTRY.md updated
- [ ] Progress tracking updated (if PRD-related)
- [ ] All files committed

## Seeding Master Data

After schema is applied, seed master data using the **API-based script** (standard for all developers):

### Standard Seed Script

```bash
# First run (creates all data, skips existing)
node scripts/seed-d11-sample-data.js

# Reset and recreate all seed data
node scripts/seed-d11-sample-data.js --force
```

**Script location**: `scripts/seed-d11-sample-data.js`

### What the Script Creates

| Type | Items Created |
|------|---------------|
| Organizations | ORQ-63 (active), ORQ-75 (active), ORQ-99 (pending) |
| Roles | User (default), Org Admin, Sales Manager, Support Agent |
| Policies | Sales (ORQ-63), Support (ORQ-75), Org Admin (ORQ-63), System Admin |
| Users | John (multi-org), Jane (single-org), Jimmy (org admin) |
| Permissions | Collection-level RBAC per policy |

### Prerequisites

The script reads from `.env.local`:
```env
NEXT_PUBLIC_API_ORQ=http://localhost:8055
DIRECTUS_ADMIN_TOKEN=your-admin-token-here
```

### When to Use `--force`

Use `--force` when:
- You've modified the seed script and want to apply changes
- Sample data is corrupted and needs reset
- Testing clean-slate scenarios

**Warning**: `--force` deletes existing seed data before recreating.

### AI Instructions for Seeding Tasks

**IMPORTANT**: When a user asks to seed data, update seed data, or set up sample data:

1. **Always use the API-based script**:
   ```bash
   node scripts/seed-d11-sample-data.js
   ```

2. **Check prerequisites first**:
   - Directus must be running
   - `.env.local` must have `DIRECTUS_ADMIN_TOKEN`
   - Schema must be applied (run snapshot apply first if needed)

3. **For updating seed data** (user wants to add/modify sample data):
   - Edit `scripts/seed-d11-sample-data.js`
   - Run with `--force` to apply changes
   - Commit the updated script

4. **Alternative SQL script** (for reference only):
   - `scripts/seed-d11-sample-data.sql` exists but is NOT recommended
   - SQL allows custom IDs but bypasses Directus validation
   - Use only for debugging or manual database fixes

## Full Migration Guide

**Complete documentation**: `./migrations/README.md`

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-02-15 | Claude | Merged workflow into AI Instructions section (11 steps); added Card-first, design questions, progress tracking |
| 2026-02-14 | Claude | Added Seeding Master Data section with explicit script reference; added seed/setup triggers |
| 2026-02-11 | Claude | Added ETL collection scripts (job, record) to Migration Types table |
| 2026-02-11 | Claude | Added AI instructions for collection creation (ask for endpoint URL and admin token) |
| 2026-02-11 | Claude | Added AI instructions for migration tasks (ask user for d11 location) |
| 2026-02-11 | Claude | Updated migration example to 009/010; fixed snapshot naming; added Fresh Database Setup section |
| 2026-01-27 | Claude | Initial skill created |
