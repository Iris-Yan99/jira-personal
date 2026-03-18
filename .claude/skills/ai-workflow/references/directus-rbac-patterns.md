# Reference Implementations

## Overview

This document maps **detected intents** to **proven reference scripts** that AI should consult BEFORE implementing similar functionality.

**Purpose**: Prevent reinventing the wheel and avoid mistakes by learning from past successful implementations.

**When to Load**: AI should automatically load relevant sections when detecting matching intents in Step 0.

---

## Intent → Reference Mapping

| Intent Detected | Reference Script | Key Learning |
|-----------------|------------------|--------------|
| RBAC / Policy creation | `scripts/setup-policy-test-rbac.ts` | No custom IDs on system tables, store UUIDs |
| Sample data seeding | `scripts/seed-d11-sample-data.js` | Check exists before create, --force flag pattern |
| OAuth testing | `tests/postman/d11-oauth-policy-test.postman_collection.json` | Test multi-org, policies in response |
| Directus permissions | `scripts/setup-policy-test-rbac.ts` | directus_access table is the key junction |
| Multi-org user creation | `scripts/seed-d11-sample-data.js` | User → Role → Policy → Permissions chain |
| Collection creation | `scripts/collections/create-*.ts` | Two-step API for M2O relations |
| ETL job/record | `scripts/collections/create-job-collection.ts` | Job → Record M2O pattern |

---

## RBAC / Policy Work

**Intent Keywords**: "policy", "role", "RBAC", "permission", "directus_access", "multi-org access"

### Reference Script
`scripts/setup-policy-test-rbac.ts`

### Key Learnings

1. **Directus 11 Custom ID Restriction**
   ```bash
   # ❌ FORBIDDEN: Custom IDs on system tables via API
   POST /policies {"id":"custom-id", "name":"Test"}  → 403 Forbidden

   # ✅ CORRECT: Let Directus generate UUIDs
   POST /policies {"name":"Test"}  → 200 Success (auto UUID)
   ```

2. **Store UUIDs for Later Reference**
   ```javascript
   const createdIds = {
     policies: {},  // name → uuid
     roles: {},     // name → uuid
     users: {},     // email → uuid
   };

   // After creating policy
   const result = await api.post('/policies', { name: 'My Policy' });
   createdIds.policies['My Policy'] = result.data.id;

   // Use stored UUID for permissions
   await api.post('/permissions', {
     policy: createdIds.policies['My Policy'],
     collection: 'orders',
     action: 'read'
   });
   ```

3. **directus_access Table Pattern**
   ```javascript
   // THE KEY TABLE: Links users to policies
   await api.post('/access', {
     user: createdIds.users['john@example.com'],
     policy: createdIds.policies['Sales-Policy'],
     sort: 1  // Primary policy
   });
   ```

4. **Check Before Create (Idempotency)**
   ```javascript
   // Check if exists
   const existing = await api.get(`/policies?filter[name][_eq]=${name}`);
   if (existing.data.length > 0) {
     createdIds.policies[name] = existing.data[0].id;
     console.log(`⏭️  ${name} already exists`);
   } else {
     const result = await api.post('/policies', { name });
     createdIds.policies[name] = result.data.id;
   }
   ```

### When This Applies
- Creating policies via API
- Creating roles via API
- Setting up RBAC test infrastructure
- Multi-org permission setup

---

## Sample Data Seeding

**Intent Keywords**: "seed", "sample data", "test data", "demo data", "populate database"

### Reference Script
`scripts/seed-d11-sample-data.js`

### Key Learnings

1. **Idempotent Execution Pattern**
   ```javascript
   // --force flag for reset capability
   const forceMode = process.argv.includes('--force');

   if (forceMode) {
     await cleanupExistingData();  // Delete in reverse order
   }
   ```

2. **Dependency Order**
   ```
   1. Organizations (base data)
   2. Policies (no dependencies)
   3. Permissions (depends on policies)
   4. Roles (no dependencies)
   5. Users (depends on roles)
   6. directus_access (depends on users + policies)
   7. Sample data (depends on organizations)
   ```

3. **Cleanup in Reverse Order**
   ```javascript
   // Foreign key constraints require reverse order
   async function cleanupExistingData() {
     // 1. Delete access records first
     // 2. Delete users
     // 3. Delete permissions
     // 4. Delete policies
     // 5. Delete roles
     // 6. Delete organizations
   }
   ```

4. **Environment Configuration Pattern**
   ```javascript
   const config = {
     apiUrl: process.env.NEXT_PUBLIC_API_ORQ || 'http://localhost:8055',
     adminToken: process.env.DIRECTUS_ADMIN_TOKEN || '',
   };

   // Load from .env.local
   const envPath = path.join(__dirname, '../.env.local');
   if (fs.existsSync(envPath)) {
     // Parse and apply
   }
   ```

### When This Applies
- Creating demo/test data
- Database initialization scripts
- CI/CD seed scripts

---

## OAuth / Authentication Testing

**Intent Keywords**: "OAuth", "login", "authentication", "token", "policies in response"

### Reference Script
`tests/postman/d11-oauth-policy-test.postman_collection.json`

### Key Learnings

1. **Custom Login Endpoint**
   ```javascript
   // D11 uses custom /login/email, NOT /auth/login
   POST /login/email {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Expected Response Structure**
   ```javascript
   {
     "data": {
       "access_token": "...",
       "user": {
         "policies": [
           { "id": "uuid", "name": "Policy", "sort": 1, "icon": "...", "description": "..." }
         ],
         "role": { "pages": [...], "page_actions": [...] }
       },
       "organization": { "id": 63, "name": "...", "code": "ORQ-63" },
       "organizations": [...]
     }
   }
   ```

3. **Test Assertions Pattern**
   ```javascript
   pm.test('Policies array exists', () => {
     const user = pm.response.json().data.user;
     pm.expect(user.policies).to.be.an('array');
   });

   pm.test('Multi-org user has multiple policies', () => {
     const policies = pm.response.json().data.user.policies;
     pm.expect(policies.length).to.be.at.least(2);
   });
   ```

### When This Applies
- Testing OAuth implementation
- Validating login response format
- Debugging missing policies

---

## Collection Creation

**Intent Keywords**: "create collection", "new table", "schema change", "migration"

### Reference Scripts
- `scripts/collections/create-job-collection.ts`
- `scripts/collections/create-record-collection.ts`

### Key Learnings

1. **Two-Step API for M2O Relations**
   ```typescript
   // Step 1: Create field
   await api.post(`/fields/${collection}`, {
     field: 'job_id',
     type: 'integer',
     schema: { is_nullable: true, foreign_key_table: 'job', foreign_key_column: 'id' },
     meta: { interface: 'select-dropdown-m2o', special: ['m2o'] }
   });

   // Step 2: Create relation
   await api.post('/relations', {
     collection: collection,
     field: 'job_id',
     related_collection: 'job',
     meta: { one_field: 'records' }  // O2M virtual field on job
   });
   ```

2. **Migration Registry Pattern**
   - Always update `migrations/REGISTRY.md`
   - Take before/after snapshots
   - Reference Card in commit

### When This Applies
- Adding new Directus collections
- Creating M2O/O2M/M2M relations
- Schema migrations

---

## Quick Lookup Protocol

**BEFORE concluding "API doesn't support X":**

```bash
# 1. Search for existing scripts
find scripts/ -name "*.ts" -o -name "*.js" | xargs grep -l "POST /policies"
find scripts/ -name "*.ts" -o -name "*.js" | xargs grep -l "keyword"

# 2. Read working scripts
cat scripts/setup-policy-test-rbac.ts

# 3. Compare differences
# - What's different between working script and my approach?
# - Is it the ID? Permission? Auth token? Endpoint?

# 4. Test isolated hypothesis
curl -X POST http://localhost:8055/policies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'  # Without custom ID
```

---

## Adding New References

When a new pattern is discovered through successful implementation:

1. **Document the Intent Keywords** - What would trigger this lookup?
2. **Reference the Script** - Where is the working code?
3. **Extract Key Learnings** - What's the non-obvious insight?
4. **Add to Intent Mapping Table** - Update the quick reference

---

## Related Documentation

- `scripts/setup-policy-test-rbac.ts` - RBAC test infrastructure
- `scripts/seed-d11-sample-data.js` - Sample data seeding
- `tests/postman/d11-oauth-policy-test.postman_collection.json` - OAuth tests
- `migrations/REGISTRY.md` - Schema migration tracking
- `docs/prds/PRD-RBAC-MULTI-TENANT.md` - Complete RBAC architecture
