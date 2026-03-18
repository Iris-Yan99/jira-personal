# Directus Version Reference - Testing & Collection Creation

**Last Updated**: 2026-01-28
**Environments**: orq-dev (Directus 9.24.0) + d11 (Directus 11.14.1)

---

## Dual-Environment Architecture

We operate **two separate Directus instances** with different versions:

| Environment | Version | Database | Purpose | Snapshot Location |
|-------------|---------|----------|---------|-------------------|
| **orq-dev** | 9.24.0 | MySQL | Production SaaS (WantWant) — orders, products, contacts | `snapshots/orq-dev/` |
| **d11** | 11.14.1 | MySQL | New architecture — auth, OAuth, PRD/Story/Card collections | `snapshots/` (root) |

### Snapshot Subfolder Convention

```
snapshots/
├── 001-baseline.yaml              ← d11 (Directus 11.14.1)
├── 001-baseline-summary.md
├── 004-users-multi-after.yaml     ← d11 migration: users_multi table
├── 004-users-multi-before.yaml
├── 005-organizations-after.yaml   ← d11 migration: organizations table
├── 005-organizations-before.yaml
├── 006-pages-after.yaml           ← d11 migration: pages table
├── 006-pages-before.yaml
├── 007-page-actions-after.yaml    ← d11 migration: page_actions table
├── 007-page-actions-before.yaml
└── orq-dev/
    └── 001-orq-dev-full.yaml      ← orq-dev (Directus 9.24.0, 2MB full schema)
```

**Rule**: Root-level snapshots = d11. Subfolder `orq-dev/` = orq-dev instance.

### d11 Current State

The d11 instance is being set up with the **correct Directus 11 architecture from scratch**:

- **`directus_users` table**: Fresh — no custom fields added yet
- **`users_multi` table**: Created (Migration 004) — maps users to multiple organizations
- **`organizations` table**: Created (Migration 005) — organization registry
- **`pages` table**: Created (Migration 006) — navigation/page definitions
- **`page_actions` table**: Created (Migration 007) — page-level action permissions
- **Custom collections**: `card`, `story`, `prd` (from baseline)

**Key**: We are building d11 "the right way" using policies, not retrofitting v9 patterns.

### Version Detection

```bash
# Check orq-dev version
head -3 snapshots/orq-dev/*.yaml | grep directus
# → directus: 9.24.0

# Check d11 version
head -3 snapshots/001-baseline.yaml | grep directus
# → directus: 11.14.1

# Via API (requires auth)
curl -s "$DIRECTUS_URL/server/info" | jq '.data.directus'
```

### Why Version Matters

| Aspect | Directus 9.x | Directus 11.x |
|--------|--------------|---------------|
| **Permission Model** | Role → Permissions | Role → Policy → Permissions |
| **Permission Field** | `role` (UUID) | `policy` (UUID) |
| **API Endpoints** | `/permissions?filter[role]` | `/permissions?filter[policy]`, `/policies` |
| **User Permissions** | Via single role | Via multiple policies (additive) |
| **Schema Debugging** | `/permissions`, `/roles` | `/permissions`, `/policies`, `/roles` |

---

## Directus 9.x Architecture (orq-dev)

### Permission Structure

```
User
  └── role (single, UUID)
        └── Permissions (direct attachment)
              ├── collection: "product"
              ├── action: "read"
              ├── permissions: {"orq": {"_eq": 63}}
              └── fields: ["*"]
```

### API Query Examples

```bash
# Get user's role
curl "$DIRECTUS_URL/users/me?fields=role" -H "Authorization: Bearer $TOKEN"

# Get role details
curl "$DIRECTUS_URL/roles/$ROLE_ID" -H "Authorization: Bearer $TOKEN"

# Get permissions for a role (CRITICAL: use limit=-1)
curl "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE_ID&limit=-1" \
  -H "Authorization: Bearer $TOKEN"

# Check specific collection permission
curl "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE_ID&filter[collection][_eq]=product&filter[action][_eq]=read" \
  -H "Authorization: Bearer $TOKEN"
```

### Permission Object (Directus 9)

```json
{
  "id": 6917,
  "role": "7f7b79e1-0ee0-4b95-bc0d-d75b54232c64",
  "collection": "product",
  "action": "read",
  "permissions": {
    "orq": { "_eq": "$CURRENT_USER.orq" }
  },
  "validation": null,
  "presets": null,
  "fields": ["*"]
}
```

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `role` | UUID | Direct link to role (NOT policy!) |
| `collection` | string | Target collection name |
| `action` | string | `create`, `read`, `update`, `delete` |
| `permissions` | object | Row-level filter rules |
| `fields` | array | Allowed fields (`["*"]` = all) |

---

## Directus 11.x Architecture (d11 — Target)

### Permission Structure

```
User
  ├── role (single, UUID)
  │     └── directus_access (junction) → policies (many-to-many)
  │           └── Permissions (per policy)
  └── directus_access (junction) → policies (direct, many-to-many)
        └── Permissions (per policy)

Effective permissions = UNION of all policy permissions (additive/OR)
```

### Key Table: `directus_access`

The `directus_access` table is the **junction** that links policies to users or roles:

```json
{
  "id": "uuid",
  "policy": "<policy-uuid>",
  "user": "<user-uuid>",    // Direct user assignment (OR)
  "role": "<role-uuid>",    // Role-level assignment
  "sort": null
}
```

### New API Endpoints

```bash
# Get policies (NEW in v11)
curl "$DIRECTUS_URL/policies" -H "Authorization: Bearer $TOKEN"

# Get user's policies (direct + via role)
curl "$DIRECTUS_URL/users/me?fields=role.policies.*,policies.policy.*" \
  -H "Authorization: Bearer $TOKEN"

# List access records (policy ↔ user/role junction)
curl "$DIRECTUS_URL/access?limit=-1" -H "Authorization: Bearer $TOKEN"

# Assign policy to user
curl -X POST "$DIRECTUS_URL/access" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"policy": "<policy-uuid>", "user": "<user-uuid>"}'

# Assign policy to role
curl -X POST "$DIRECTUS_URL/access" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"policy": "<policy-uuid>", "role": "<role-uuid>"}'

# Permissions now link to policy, not role
curl "$DIRECTUS_URL/permissions?filter[policy][_eq]=$POLICY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Permission Object (Directus 11)

```json
{
  "id": 6917,
  "policy": "abc123-policy-uuid",
  "collection": "product",
  "action": "read",
  "permissions": {
    "orq": { "_eq": "$CURRENT_USER.orq" }
  },
  "validation": null,
  "presets": null,
  "fields": ["*"]
}
```

### Key Changes from v9

| Change | Impact |
|--------|--------|
| `role` → `policy` | Permission queries must filter by `policy`, not `role` |
| Multiple policies | Users accumulate permissions additively |
| Role hierarchy | Roles can have `children` roles |
| Admin/App access | Moved from role to policy |

---

## Policy Architecture for Multi-Org (`orq` Field)

### The Problem (Directus 9)

In orq-dev (v9), multi-tenancy uses `$CURRENT_USER.orq` — a single `orq` field on the user:

```
User (orq = 63)
  └── role: "operator"
        └── Permission: { "orq": { "_eq": "$CURRENT_USER.orq" } }
              → User sees only orq=63 data
```

**Limitation**: One user = one org. To access multiple orgs, we built `users_multi` table as a workaround.

### The Solution (Directus 11 Policies)

D11 policies are **additive** (union/OR logic). This maps perfectly to multi-org access:

```
User
  ├── role: "operator"
  ├── policy: "ORQ-63-Access"   → { "orq": { "_eq": 63 } }
  ├── policy: "ORQ-75-Access"   → { "orq": { "_eq": 75 } }
  └── policy: "Base-Read-Only"  → { fields: ["id", "name"] }
```

**Result**: User sees `orq=63 OR orq=75` data — no custom field needed on `directus_users`.

### Policy Design Pattern

#### Per-Organization Policies

Each organization gets a dedicated policy:

```bash
# Create org-specific policy
curl -X POST "$D11_URL/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "ORQ-63-WantWant",
    "description": "Access to WantWant organization data (orq=63)",
    "admin_access": false,
    "app_access": true
  }'

# Add CRUD permissions to that policy
for ACTION in create read update delete; do
  curl -X POST "$D11_URL/permissions" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"policy\": \"$POLICY_UUID\",
      \"collection\": \"product\",
      \"action\": \"$ACTION\",
      \"fields\": [\"*\"],
      \"permissions\": { \"orq\": { \"_eq\": 63 } }
    }"
done
```

#### Functional Role Policies

Separate from org access, role-based capabilities:

| Policy Name | Purpose | Example Permissions |
|-------------|---------|---------------------|
| `Base-Operator` | Standard CRUD | All collections, basic fields |
| `Admin-Elevated` | Admin operations | User management, settings |
| `Read-Only-Viewer` | View only | Read on all collections |
| `Report-Access` | Reporting | Read on aggregate views |

#### Composing User Access

```
User "alice@company.com"
  ├── role: "operator"
  │     └── policies (via role):
  │           └── "Base-Operator" (CRUD on standard collections)
  └── policies (direct):
        ├── "ORQ-63-WantWant"  (sees orq=63 data)
        └── "ORQ-75-Partner"   (sees orq=75 data)

Effective access = Base-Operator ∪ ORQ-63 ∪ ORQ-75
```

### How This Replaces `users_multi`

| Aspect | v9 (orq-dev) | v11 (d11) |
|--------|-------------|-----------|
| Multi-org mapping | `users_multi` junction table | Direct policy assignment |
| User ↔ Org link | `users_multi.user_id` + `users_multi.orq_id` | User has `[ORQ-63, ORQ-75]` policies |
| Org switching | Frontend switches + re-fetches | Automatic — policies are additive |
| Permission filter | `{"orq": {"_eq": "$CURRENT_USER.orq"}}` | `{"orq": {"_eq": 63}}` per policy |
| Adding new org access | Insert into `users_multi` | Assign additional policy to user |

**Note**: The `users_multi` table exists in d11 (Migration 004) but serves a **different purpose** than permissions.

### Two Tables, Two Purposes

With D11 policies verified, we now have clarity on the architecture:

| Table | Purpose | What it stores |
|-------|---------|----------------|
| **`users_multi`** | **Org membership registry** | Who belongs to which orgs, invite metadata, role-in-org |
| **`directus_access`** | **Permission grants** | Which policies are assigned to users/roles |

**Key insight**: `users_multi` is NOT for permissions — it's for **membership metadata** that policies can't capture:
- Who invited the user
- When they joined
- Their role within the org (member/admin/owner)
- Membership status (pending/active/revoked)

### OAuth Extension Flow (D11)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User authenticates via OAuth (Google, LINE, etc.)                │
├─────────────────────────────────────────────────────────────────────┤
│ 2. Extension: Discover org membership                               │
│    ├─ Check `users_multi` for existing membership                   │
│    ├─ OR check `organizations.domain` for email domain match        │
│    └─ OR use invite token's `orq_id`                                │
├─────────────────────────────────────────────────────────────────────┤
│ 3. Extension: Create/update `directus_users` record                 │
├─────────────────────────────────────────────────────────────────────┤
│ 4. Extension: Sync membership → policies                            │
│    FOR EACH org in user's memberships:                              │
│      - Find or create `ORQ-{orq_id}` policy                         │
│      - Create `directus_access` record: { policy, user }            │
├─────────────────────────────────────────────────────────────────────┤
│ 5. User now has additive access to all their orgs                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Org Membership Discovery Methods

| Method | Trigger | Implementation |
|--------|---------|----------------|
| **Domain-based** | Email `@company.com` | Query `organizations WHERE domain = 'company.com'` |
| **Invite-based** | Invite link clicked | Invite token contains `orq_id`, create `users_multi` + `directus_access` |
| **Existing member** | Returning user | Query `users_multi WHERE user_id = X AND status = 'active'` |
| **Default org** | New user, no match | Assign to default public org if configured |

### Why Keep `users_multi`?

Even though `directus_access` handles permissions, `users_multi` captures **business logic** that policies don't:

```typescript
// users_multi record
{
  user_id: "user-uuid",
  orq_id: 63,                    // → maps to ORQ-63 policy
  invited_by: "admin-uuid",      // Who invited them
  invited_at: "2026-01-28",      // When
  accepted_at: "2026-01-28",     // When they accepted
  status: "active",              // pending | active | revoked
  role_in_org: "member"          // member | admin | owner (business role, not Directus role)
}
```

This enables:
- **Audit trail**: Who invited whom, when
- **Pending invites**: User invited but hasn't accepted yet (no `directus_access` yet)
- **Revocation**: Mark `status = 'revoked'`, remove `directus_access`, user loses access
- **Org admin UI**: Show "Members" list with join dates, roles, invite status

### `directus_users` Strategy (d11)

The d11 `directus_users` table is currently **fresh** (no custom fields). Design decisions:

- **No `orq` field on user** — org access is determined by policies, not a user field
- **No custom role fields** — capabilities come from policy composition
- **Custom fields for profile only** — display_name, avatar, preferences (if needed)
- Organization context comes from **which policies are assigned**, not user fields

---

## D11 Design Standard: Roles vs Policies

### The Three Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                     D11 ACCESS CONTROL LAYERS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  directus_roles (Job Function)                                      │
│  ├── Organizational grouping: Operator, Admin, Viewer               │
│  ├── User gets ONE role                                             │
│  ├── Role can have child roles (hierarchy)                          │
│  └── Role → Policies (via directus_access)                          │
│                                                                     │
│  directus_policies (Capability Bundles)                             │
│  ├── Reusable permission sets                                       │
│  ├── Contains: admin_access, app_access, enforce_tfa                │
│  ├── Attached to: Roles OR Users directly                           │
│  └── Policy → Permissions                                           │
│                                                                     │
│  directus_permissions (CRUD Rules)                                  │
│  ├── Actual collection-level rules                                  │
│  ├── Links to ONE policy (not role!)                                │
│  └── Contains: collection, action, fields, filter                   │
│                                                                     │
│  directus_access (Junction Table)                                   │
│  ├── Links policy ↔ role (role-level assignment)                    │
│  └── Links policy ↔ user (direct user assignment)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### When to Use Roles vs Policies

| Scenario | Use Role | Use Policy |
|----------|----------|------------|
| Job function (Operator, Admin) | ✅ | |
| Org structure (Manager, Team Lead) | ✅ | |
| Capability bundle (CRUD on products) | | ✅ |
| Org access (ORQ-63, ORQ-75) | | ✅ |
| Feature access (Reports, Admin panel) | | ✅ |
| "All operators need X" | Attach policy to role | |
| "This user needs special access" | | Assign policy directly |

### D11 Design Standard

```
Roles (job functions — one per user):
├── Administrator       → policies: [Admin-Full-Access]
├── Operator            → policies: [Base-Operator, App-Access]
├── Viewer              → policies: [Read-Only]
└── PRD-Editor          → policies: [PRD-CRUD, App-Access]

Policies (capability bundles — reusable):
├── Admin-Full-Access   → admin_access: true, app_access: true
├── Base-Operator       → CRUD on business collections
├── App-Access          → app_access: true (Directus UI access)
├── Read-Only           → read on all collections
├── PRD-CRUD            → CRUD on prd, story, card
└── (auto-created per org)

Org Policies (one per organization — data filtering):
├── ORQ-63-WantWant     → filter: { orq: 63 } on all collections
├── ORQ-75-Partner      → filter: { orq: 75 } on all collections
└── ORQ-{id}-{name}     → auto-created when org is created

User Composition Example:
├── alice@company.com
│   ├── role: Operator              ← job function (one role)
│   ├── role policies:              ← inherited from role
│   │   ├── Base-Operator
│   │   └── App-Access
│   ├── direct policies:            ← org access (assigned per user)
│   │   ├── ORQ-63-WantWant
│   │   └── ORQ-75-Partner
│   └── effective = Base-Operator ∪ App-Access ∪ ORQ-63 ∪ ORQ-75
```

### OAuth Extension: Role + Policy Assignment

```typescript
// OAuth extension pseudo-code
async function onOAuthLogin(user, discoveredOrgs) {
  // 1. Assign role based on business logic (one role per user)
  const role = await determineRole(user);  // e.g., "Operator"
  await directus.users.update(user.id, { role: role.id });

  // 2. Record membership in users_multi (business metadata)
  for (const org of discoveredOrgs) {
    await directus.items('users_multi').create({
      user_id: user.id,
      orq_id: org.id,
      status: 'active',
      role_in_org: 'member',
      invited_at: new Date()
    });
  }

  // 3. Grant org policies via directus_access (permissions)
  for (const org of discoveredOrgs) {
    const policy = await findOrCreateOrgPolicy(org.id, org.name);
    await directus.items('directus_access').create({
      policy: policy.id,
      user: user.id
    });
  }

  // Result:
  // - Role provides: base capabilities (via role's attached policies)
  // - Direct policies provide: org-specific data access
  // - users_multi provides: membership audit trail
}
```

### Summary: Three Tables, Three Purposes

| Table | Purpose | Managed By | Contains |
|-------|---------|------------|----------|
| **`directus_roles`** | Job function | Admin UI | Role name, icon, child roles |
| **`directus_access`** | Permission grants | OAuth ext + Admin | policy ↔ user/role links |
| **`users_multi`** | Membership registry | OAuth ext + Invite system | who, when, invited_by, status, role_in_org |

**Key Principle**:
- `directus_roles` = WHAT you can do (job function)
- `directus_access` (via policies) = WHERE you can do it (org filter)
- `users_multi` = WHY you have access (invite history, membership metadata)

### Integration with OAuth (PRD-SOCIAL-OAUTH)

The OAuth extension (`/Users/mac/projects/d11/extensions/directus-extension-oauth/`) works with this architecture:

1. User authenticates via OAuth (Google, LINE, etc.)
2. Extension queries `organizations` table to detect org membership
3. Extension assigns org-specific policies to the user
4. `role.pages` and `role.page_actions` control navigation visibility
5. Policies control data-level access via `orq` filter

**Related PRDs**:
- `docs/prds/PRD-SOCIAL-OAUTH.md` — OAuth extension architecture
- `docs/prds/PRD-AUTH.md` — Current auth system (v9-based, transitioning)

### Verified: Live Testing Results (2026-01-28)

All theories were **verified against live D11 instance** (Directus 11.14.1, localhost:8055).

#### Test Setup

- Created `policy_test` collection with `id`, `name`, `orq` fields
- Inserted 5 items: 2x orq=63, 2x orq=75, 1x orq=99
- Created role: `Test-Operator` (no policies)
- Created policies: `ORQ-63-WantWant` (read where orq=63), `ORQ-75-Partner` (read where orq=75)
- Created user: `test-policy@synque.io` with Test-Operator role

#### Test Results

| Test | Setup | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| **A: No policies** | User with role, no policies | 403 Forbidden | 403 Forbidden | PASS |
| **B: ORQ-63 only** | Direct policy: ORQ-63 | 2 items (orq=63) | 2 items (orq=63) | PASS |
| **C: ORQ-63 + ORQ-75** | Direct policies: both | 4 items (orq=63,75) | 4 items (orq=63,75) | PASS |
| **D: Remove ORQ-75** | Removed ORQ-75 access | 2 items (orq=63) | 2 items (orq=63) | PASS |
| **E: Mixed assignment** | ORQ-63 direct + ORQ-75 via role | 4 items (orq=63,75) | 4 items (orq=63,75) | PASS |

#### Key Findings

1. **Policies ARE additive** — confirmed union/OR behavior
2. **`directus_access` table** is the junction — links policy to user OR role
3. **Direct + Role policies combine** — user gets union of both
4. **Removing access record** immediately removes access (no cache delay)
5. **`app_access: true`** on policy is required for API access (not just on role)
6. **No `orq` field on user needed** — the policy filter handles it: `{"orq": {"_eq": 63}}`

#### API Pattern: Assign Policy to User

```bash
# Via directus_access table (NOT via user.policies directly)
POST /access
{
  "policy": "<policy-uuid>",
  "user": "<user-uuid>"       ← for direct user assignment
  # OR
  "role": "<role-uuid>"       ← for role-level assignment
}
```

#### Test Artifacts (kept in D11)

- Collection: `policy_test` (5 items with orq 63/75/99)
- Role: `Test-Operator`
- Policies: `ORQ-63-WantWant`, `ORQ-75-Partner`
- User: `test-policy@synque.io` (password: test1234)

---

## Testing Approach by Version

### Directus 9.x Testing

#### 1. Permission Debugging

```bash
# Step 1: Login and get token
TOKEN=$(curl -s "$DIRECTUS_URL/auth/login" \
  -d '{"email":"user@example.com","password":"pass"}' | \
  jq -r '.data.access_token')

# Step 2: Get user's role
ROLE=$(curl -s "$DIRECTUS_URL/users/me?fields=role" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.role')

# Step 3: Check permissions (ALWAYS use limit=-1)
curl -s "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE&limit=-1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
# Should return count > 0

# Step 4: Check specific collection
curl -s "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE&filter[collection][_eq]=product" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'
```

#### 2. Newman Test Patterns

```javascript
// Pre-request: Validate token exists
const token = pm.environment.get('access_token');
if (!token) {
  console.error('No access token - login may have failed');
  pm.execution.skipRequest();
}

// Pre-request: Check specific permission (optional)
pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/permissions?filter[collection][_eq]=product&filter[action][_eq]=create&limit=1',
  method: 'GET',
  header: { 'Authorization': 'Bearer ' + token }
}, function(err, res) {
  if (res.json().data.length === 0) {
    console.log('WARNING: No create permission for product collection');
  }
});
```

### Directus 11.x Testing

#### 1. Permission Debugging

```bash
# Step 1: Login and get token
TOKEN=$(curl -s "$DIRECTUS_URL/auth/login" \
  -d '{"email":"user@example.com","password":"pass"}' | \
  jq -r '.data.access_token')

# Step 2: Get user's policies (direct + via role)
curl -s "$DIRECTUS_URL/users/me?fields=id,role.policies.id,policies.id" \
  -H "Authorization: Bearer $TOKEN"

# Step 3: List all policies for debugging
curl -s "$DIRECTUS_URL/policies" -H "Authorization: Bearer $TOKEN"

# Step 4: Check permissions by policy
POLICY_ID="abc123"
curl -s "$DIRECTUS_URL/permissions?filter[policy][_eq]=$POLICY_ID&limit=-1" \
  -H "Authorization: Bearer $TOKEN"
```

#### 2. Newman Test Patterns (v11)

```javascript
// Pre-request: Check user has necessary policy
pm.sendRequest({
  url: pm.environment.get('baseUrl') + '/users/me?fields=role.policies.name,policies.name',
  method: 'GET',
  header: { 'Authorization': 'Bearer ' + token }
}, function(err, res) {
  const user = res.json().data;
  const policies = [
    ...(user.policies || []),
    ...(user.role?.policies || [])
  ].map(p => p.name);
  console.log('User policies:', policies.join(', '));
});
```

---

## Collection Creation by Version

### Directus 9.x

#### Creating Collections with Permissions

```bash
# 1. Create collection
curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "collection": "my_collection",
    "meta": { "icon": "box" },
    "schema": {}
  }'

# 2. Add permissions for a role
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "role": "7f7b79e1-0ee0-4b95-bc0d-d75b54232c64",
    "collection": "my_collection",
    "action": "read",
    "fields": ["*"],
    "permissions": { "orq": { "_eq": "$CURRENT_USER.orq" } }
  }'

# 3. Repeat for create, update, delete as needed
```

### Directus 11.x

#### Creating Collections with Policies

```bash
# 1. Create collection (same as v9)
curl -X POST "$DIRECTUS_URL/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "collection": "my_collection",
    "meta": { "icon": "box" },
    "schema": {}
  }'

# 2. Create or identify a policy
curl -X POST "$DIRECTUS_URL/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Product Editors",
    "admin_access": false,
    "app_access": true
  }'
# Returns: { "data": { "id": "policy-uuid" } }

# 3. Add permissions to the policy (NOT role)
curl -X POST "$DIRECTUS_URL/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "policy": "policy-uuid",
    "collection": "my_collection",
    "action": "read",
    "fields": ["*"],
    "permissions": { "orq": { "_eq": "$CURRENT_USER.orq" } }
  }'

# 4. Assign policy to role or user
curl -X PATCH "$DIRECTUS_URL/roles/$ROLE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "policies": ["policy-uuid"] }'
```

---

## Migration: v9 → v11

### What Happens Automatically

When upgrading from v9 to v11:
1. Existing role permissions are converted to a single policy per role
2. Policy is named after the role
3. `admin_access`, `app_access`, `enforce_tfa`, `ip_access` move from role to policy

### What You Need to Update

| Before (v9) | After (v11) |
|-------------|-------------|
| `filter[role][_eq]=X` | `filter[policy][_eq]=Y` |
| `role.admin_access` | `policy.admin_access` |
| Single role per user | Multiple policies possible |

### Testing Scripts to Update

```javascript
// v9 pattern
const roleId = user.role;
const perms = await fetch(`/permissions?filter[role][_eq]=${roleId}`);

// v11 pattern
const policyIds = [...user.policies, ...user.role.policies].map(p => p.id);
const perms = await Promise.all(
  policyIds.map(id => fetch(`/permissions?filter[policy][_eq]=${id}`))
);
```

---

## Schema Snapshot Differences

### orq-dev Snapshot (Directus 9.24.0)

```yaml
# File: snapshots/orq-dev/001-orq-dev-full.yaml (2MB)
version: 1
directus: 9.24.0
vendor: mysql
collections:
  - collection: Companies    # Note: uppercase collection names in orq-dev
  - collection: product
  - collection: order
  # ... full production schema with orq field on collections
```

### d11 Snapshots (Directus 11.14.1)

```yaml
# File: snapshots/001-baseline.yaml (117KB)
version: 1
directus: 11.14.1
vendor: mysql
collections:
  - collection: card          # v2.0 schema, 38 fields
  - collection: story         # v2.0 schema, 27 fields
  - collection: prd           # Complete PRD schema
  - collection: webhook_events
# System collections include: directus_access, directus_policies, etc.
# Policies are in directus_policies table
# Permissions reference policy instead of role
```

### Migration History (d11)

| Migration | Snapshot Files | What Changed |
|-----------|---------------|--------------|
| 001 | `001-baseline.yaml` | Initial: card, story, prd + card↔story relation |
| 004 | `004-users-multi-*.yaml` | Added `users_multi` table |
| 005 | `005-organizations-*.yaml` | Added `organizations` table |
| 006 | `006-pages-*.yaml` | Added `pages` table |
| 007 | `007-page-actions-*.yaml` | Added `page_actions` table |

---

## Debugging Checklist

### When API Returns 403 Forbidden

#### Directus 9.x

1. **Check token is valid**
   ```bash
   curl "$DIRECTUS_URL/users/me" -H "Authorization: Bearer $TOKEN"
   ```

2. **Get user's role**
   ```bash
   curl "$DIRECTUS_URL/users/me?fields=role" -H "Authorization: Bearer $TOKEN"
   ```

3. **Check role has permission (use limit=-1!)**
   ```bash
   curl "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE&filter[collection][_eq]=COLLECTION&filter[action][_eq]=ACTION&limit=-1"
   ```

4. **Check permission filter matches data**
   - If permission has `{"orq": {"_eq": 63}}`, user must access items with `orq=63`

#### Directus 11.x

1. **Check token is valid** (same as v9)

2. **Get user's policies**
   ```bash
   curl "$DIRECTUS_URL/users/me?fields=role.policies.*,policies.*" -H "Authorization: Bearer $TOKEN"
   ```

3. **Check each policy for permission**
   ```bash
   for policy in $POLICY_IDS; do
     curl "$DIRECTUS_URL/permissions?filter[policy][_eq]=$policy&filter[collection][_eq]=COLLECTION&limit=-1"
   done
   ```

4. **Remember: Policies are additive**
   - User gets UNION of all policy permissions
   - If ANY policy allows, user can access

---

## Quick Reference Table

| Task | Directus 9.x | Directus 11.x |
|------|--------------|---------------|
| Get user permissions | Via `role` field | Via `policies` + `role.policies` |
| Query permissions | `?filter[role][_eq]=X` | `?filter[policy][_eq]=Y` |
| Admin access | `role.admin_access` | `policy.admin_access` |
| Create permission | POST with `role` field | POST with `policy` field |
| User can have | 1 role | 1 role + N policies |
| Permission inheritance | None | Via role.children |

---

## Related Files

- [api-testing.md](./api-testing.md) - Newman testing patterns
- [directus-relations.md](./directus-relations.md) - M2O/O2M relation patterns
- [collection-driven.md](./collection-driven.md) - Collection-driven development
- `docs/prds/PRD-SOCIAL-OAUTH.md` - OAuth extension architecture (d11)
- `docs/prds/PRD-AUTH.md` - Current auth system (orq-dev → d11 transition)
- **`docs/architecture/D11-MULTI-TENANT-RBAC.md`** - Complete RBAC architecture reference (50+ pages)
- **`docs/prds/PRD-RBAC-MULTI-TENANT.md`** - RBAC implementation guide with user stories

---

**Environment Check**:
```bash
# Always verify which environment you're working with

# orq-dev (Directus 9.24.0)
head -3 snapshots/orq-dev/*.yaml | grep directus

# d11 (Directus 11.14.1)
head -3 snapshots/001-baseline.yaml | grep directus

# d11 project location
# /Users/mac/projects/d11
```
