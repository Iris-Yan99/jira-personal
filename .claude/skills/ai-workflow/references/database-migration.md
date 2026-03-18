# Database Migration Reference

**When to use**: Fresh database setup, schema migration, environment cloning
**Verified**: 2026-02-06 (d11 RDS migration)
**Success Rate**: 100% after troubleshooting

---

## 🎯 Key Learnings from Exercise

### 1. Snapshots Are Cumulative, Not Incremental

**❌ Wrong Approach:**
```bash
# Don't apply sequentially
npx directus schema apply snapshots/001-baseline.yaml
npx directus schema apply snapshots/004-users-multi-after.yaml
npx directus schema apply snapshots/005-organizations-after.yaml
npx directus schema apply snapshots/006-pages-after.yaml
npx directus schema apply snapshots/007-page-actions-after.yaml
```

**✅ Correct Approach:**
```bash
# Apply latest snapshot only
npx directus schema apply snapshots/009-users-multi-timestamps-after.yaml
```

**Why**: Each `-after.yaml` is a complete schema dump, not a diff. Snapshot 009 contains everything from 001-009.

### 2. Verify Registry vs Actual Files

**Problem Discovered**:
- `migrations/REGISTRY.md` said migration 009 was applied
- But `snapshots/009-users-multi-timestamps-after.yaml` didn't exist
- Result: OAuth failed with "Unknown column 'date_created'"

**Lesson**: Always verify snapshot files exist before migration.

```bash
# Before migration, check files
ls -la snapshots/ | grep $(tail -1 migrations/REGISTRY.md | cut -d'|' -f2)
```

### 3. Master Data Seed Order Matters

**Correct Order:**
```
1. Schema (bootstrap + snapshot)
2. Organizations (required for OAuth)
3. Roles (required for OAuth)
4. Environment variables (DEFAULT_ROLE_ID)
5. Content data (PRD, stories, cards)
```

**Why**: OAuth depends on organizations and roles existing first.

### 4. OAuth Requires 4 Components

```
✅ Organizations table populated (code: 1 for default)
✅ Default role exists (User role)
✅ DEFAULT_ROLE_ID environment variable set
✅ Timestamp fields in users_multi (date_created, date_updated)
```

Missing any = OAuth fails.

### 5. Database Name Must Match Exactly

**Issue**: Used `d11-20260206` in config but actual database is `260201`
**Error**: "Access denied for user"
**Lesson**: Always verify actual database name first

```bash
# Check actual database
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SHOW DATABASES;"
```

### 6. Create Snapshot After Manual Changes

**When you add fields via API:**
```bash
# 1. Add fields via API
curl -X POST http://localhost:8055/fields/users_multi ...

# 2. IMMEDIATELY take snapshot
cd /Users/mac/projects/d11
npx directus schema snapshot /path/to/snapshots/009-description-after.yaml

# 3. Update REGISTRY.md
# 4. Update documentation to use new snapshot
```

**Why**: Prevents future migrations from having incomplete schema.

---

## 📋 Migration Workflow Template

### Phase 1: Pre-Migration Verification

```bash
# 1. Check latest snapshot exists
LATEST=$(tail -1 migrations/REGISTRY.md | cut -d'|' -f2 | tr -d ' ')
ls -la snapshots/$LATEST

# 2. Backup current config
cp /path/to/directus/.env /path/to/directus/.env.backup-$(date +%Y%m%d)

# 3. Test database connection
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SELECT VERSION();"
```

### Phase 2: Schema Migration

```bash
# 1. Update Directus .env
# DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD

# 2. Bootstrap Directus (creates system tables)
cd /path/to/directus
npx directus bootstrap

# 3. Start Directus
npx directus start  # Keep this running

# 4. Apply latest snapshot (new terminal)
cd /path/to/frontend
npx directus schema apply snapshots/009-users-multi-timestamps-after.yaml
```

### Phase 3: Master Data Seeding

```bash
# 1. Create organizations
curl -X POST http://localhost:8055/items/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "name": "Default Organization", "code": "1", ...}'

curl -X POST http://localhost:8055/items/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name": "Development Team", "code": "12", ...}'

# 2. Create default role
curl -X POST http://localhost:8055/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name": "User", "icon": "supervised_user_circle", "admin_access": false, "app_access": true}'

# 3. Set DEFAULT_ROLE_ID in Directus .env
# Get role ID from response above
echo 'DEFAULT_ROLE_ID=role-id-here' >> /path/to/directus/.env

# 4. Restart Directus to pick up env var
```

### Phase 4: Verification

```bash
# 1. Check collections exist
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8055/collections

# 2. Verify organizations
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8055/items/organizations

# 3. Verify roles
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8055/roles

# 4. Test OAuth login
# Open frontend, try Google OAuth
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Unknown column 'date_created' in 'field list'"

**Cause**: users_multi missing timestamp fields
**Fix**:
```bash
curl -X POST http://localhost:8055/fields/users_multi \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "field": "date_created",
    "type": "timestamp",
    "meta": {"special": ["date-created"], "interface": "datetime", "readonly": true, "hidden": true},
    "schema": {"default_value": "CURRENT_TIMESTAMP", "is_nullable": false}
  }'

curl -X POST http://localhost:8055/fields/users_multi \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "field": "date_updated",
    "type": "timestamp",
    "meta": {"special": ["date-updated"], "interface": "datetime", "readonly": true, "hidden": true},
    "schema": {"default_value": "CURRENT_TIMESTAMP", "is_nullable": true}
  }'

# Then take new snapshot!
```

### Issue 2: "No organization found for user"

**Cause**: Organizations table empty
**Fix**: Seed organizations (code: 1 and 12)

### Issue 3: "No default role found"

**Cause**: No role exists or DEFAULT_ROLE_ID not set
**Fix**:
1. Create User role via API
2. Add `DEFAULT_ROLE_ID=role-uuid` to Directus .env
3. Restart Directus

### Issue 4: "Database not empty" during bootstrap

**Cause**: Database already has tables
**Fix**: Drop and recreate database first

### Issue 5: "Access denied for user"

**Cause**: Wrong database name in config
**Fix**: Verify actual database name with `SHOW DATABASES;`

---

## 📊 Success Checklist

After migration, verify:

```bash
# ✅ Collections (should have 8 custom + ~40 system)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8055/collections | grep -c '"collection"'

# ✅ Organizations (should have 2: code 1 and 12)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8055/items/organizations | grep -c '"code"'

# ✅ Roles (should have 2: Administrator + User)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8055/roles | grep -c '"name"'

# ✅ Timestamp fields in users_multi
curl -H "Authorization: Bearer $TOKEN" http://localhost:8055/fields/users_multi | grep "date_created"

# ✅ DEFAULT_ROLE_ID set
grep DEFAULT_ROLE_ID /path/to/directus/.env

# ✅ OAuth test
# Try login via frontend
```

---

## 🎓 When Claude Should Use This

**Trigger Patterns:**
- "Fresh database setup"
- "Migrate to new database"
- "Clone environment"
- "Set up new RDS"
- "Database migration"
- "Schema migration"
- "New developer setup"

**Process:**
1. Read latest snapshot from REGISTRY.md
2. Verify snapshot file exists
3. Follow Phase 1-4 workflow above
4. Verify with success checklist
5. Document any issues encountered

---

## 📝 Documentation to Create

After successful migration:

1. **Migration summary** - What was done, issues encountered
2. **Update PROCESS-MIGRATION.md** - If process changed
3. **Create new snapshot** - If manual fixes were needed
4. **Update REGISTRY.md** - Track new snapshot

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `docs/PROCESS-MIGRATION.md` | Complete migration guide |
| `docs/DATA-SEEDING.md` | Master data requirements |
| `docs/prds/PRD-MIGRATION.md` | Business context |
| `migrations/REGISTRY.md` | Migration tracking |
| `migrations/README.md` | Snapshot creation |

---

**Created**: 2026-02-06
**Based on**: Successful d11 RDS migration
**Verified**: OAuth working, all collections created
**Use for**: Fresh database setups, environment cloning
