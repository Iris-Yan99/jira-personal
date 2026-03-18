---
name: rbac
description: Directus 11 RBAC management - create roles, policies, permissions with four data ownership models (org-scoped, user-scoped, hybrid, system). Triggers on "rbac", "create policy", "create role", "assign role", "assign policy", "permissions", "multi-tenant access", "directus access", "orq filter", "data ownership", "user-scoped", "personal app".
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(curl *), Bash(node *), Read, Write, Grep
---

# RBAC - Role-Based Access Control

Specialized skill for managing Directus 11 RBAC. Covers four data ownership models: org-scoped (AND filter), user-scoped ($CURRENT_USER), hybrid (both), and system-level (open/admin).

## Purpose

Implement and manage **RBAC** using Directus 11's native policy architecture. Supports four data ownership models — choose the right one before writing any permissions.

## Data Ownership Decision Gate (START HERE)

**Before creating any policy or permission, determine the ownership model for each collection:**

```
Who owns the records in this collection?
│
├── A. ORGANIZATION → orq field + AND filter
│   "Orders belong to WantWant Corp, not to John personally"
│   Filter: { "_and": [{ "orq": { "_eq": N } }, { "orq": { "_eq": "$CURRENT_USER.active_orq" } }] }
│
├── B. USER → user_created or directus_user field + $CURRENT_USER filter
│   "Wallet transactions belong to me, not to any company"
│   Filter: { "user_created": { "_eq": "$CURRENT_USER" } }
│
├── C. BOTH → orq + user_created (hybrid)
│   "I created this order FOR my company — org owns it, I authored it"
│   Filter: AND filter for org scoping; add user_created for "My Items" view
│
└── D. NOBODY → shared reference data
    "Currency rates, payment gateway config — everyone reads the same data"
    Filter: {} (open read) or admin-only
```

| App Type | Primary Model | Needs `orq`? | Needs `active_orq`? |
|----------|--------------|-------------|-------------------|
| **B2B multi-tenant SaaS** (WW, Stripe) | A | Yes | Yes |
| **Personal app** (wallet, notes) | B | No | No |
| **B2B with "My Work" views** (Jira) | C | Yes | Yes |
| **Shared catalog / config** | D | No | No |

**A single app uses multiple models.** WantWant: Model A for orders, Model B for user preferences, Model D for payment gateways. Decide **per collection**.

**Reference**: [Data Ownership & Multi-Org Switching Guide](../../docs/reference/MULTI-ORG-SWITCHING.md)

## Capabilities

- Organization-scoped data access (Model A: `orq` field + AND filter)
- User-scoped data access (Model B: `$CURRENT_USER` filter)
- Hybrid org+user scoping (Model C)
- System/shared data access (Model D)
- Job function-based permissions (Sales Manager, Support Agent, etc.)
- Fine-grained CRUD control per collection
- Policy inheritance and additive behavior
- Multi-org user membership via `users_multi` + `directus_access`

## Auth Mode Gate

`active_orq`, AND filters, and D11 policies **only exist when `NEXT_PUBLIC_AUTH_POLICY=true`** (D11 Policy mode). The app has three mutually exclusive auth modes — code that touches `active_orq` or D11 permissions must self-guard against D9 modes.

**Any D11-specific function called from cross-cutting code (login, org switch) must self-guard:**
```typescript
if (process.env.NEXT_PUBLIC_AUTH_POLICY !== 'true') return
```

**Reference**: `docs/stories/US-WW-ENV-001.md` — three auth modes, env switching, active_orq lifecycle

## D11_DEV Hard Gate

**STOP before any D11 data work.** Check if `D11_DEV` is set:

```bash
grep D11_DEV .env.local
```

If missing, tell the user:
> "Set `D11_DEV` in `.env.local` to your Directus 11 user UUID. Find it: D11 Admin UI → Users → click your user → UUID in URL."

Without it, user-scoped queries (My Orders, RBAC testing) return nothing.

## No D9 Regression Rule

**D9 (port 8080) and D11 (port 8055) coexist.** When adding D11 support:

| Do | Don't |
|----|-------|
| Add D11 code paths alongside D9 | Remove or modify D9 API functions |
| Use `authenticatedFetch` for new D11 calls | Change `getApiOrqUrl()` routing for existing pages |
| Pass `orq: null` to let D11 policies handle scoping | Remove `orq` parameter support from shared functions |
| Keep `getAccessToken()` pattern for D9 callers | Break the axios interceptor in `lib/api.ts` |

**`getApiOrqUrl()` priority chain:** DB config → `localStorage.api_url` → env `NEXT_PUBLIC_API_ORQ` → org config → localhost. Changing this affects ALL existing pages.

**Token flow is shared:** Both `authenticatedFetch` and `getAccessToken()` read `localStorage.access_token`. When user logs into D11 via `/login/email`, the JWT contains D11 policies. When they log into D9, it's a D9 token. The routing is determined by which instance they authenticated against.

## Prerequisites

### Required Environment
| Requirement | Check Command | Purpose |
|-------------|---------------|---------|
| Directus 11 running | `curl http://localhost:8055/server/health` | Target instance |
| Admin token | Set in `.env.local` as `DIRECTUS_ADMIN_TOKEN` | API authentication |
| `D11_DEV` | Set in `.env.local` | Developer's D11 user UUID |
| `orq` field on collections | Check via Collection Viewer | Multi-tenant filtering |

### Key Files
| File | Purpose |
|------|---------|
| `docs/prds/PRD-RBAC-MULTI-TENANT.md` | Full PRD with user stories |
| `docs/prds/PRD-SOCIAL-OAUTH.md` | OAuth extension with multi-org support |
| `docs/architecture/D11-MULTI-TENANT-RBAC.md` | Architecture reference (50+ pages) |
| `tests/postman/rbac-crud-tests.postman_collection.json` | Newman test suite |

## Activation Triggers

- "rbac" / "RBAC"
- "create policy"
- "create role"
- "assign role"
- "assign policy"
- "multi-tenant access"
- "permissions"
- "directus access"
- "orq filter"
- "data ownership"
- "user-scoped" / "personal app"
- "who owns the data"

## Three-Layer Model

```
Roles (Job Functions)
  └─→ directus_access (junction table)
       └─→ Policies (Permission Sets per Org)
            └─→ Permissions (CRUD Rules with orq filters)
```

### Key Tables

| Table | Type | Purpose |
|-------|------|---------|
| `directus_roles` | System | Job function definitions |
| `directus_policies` | System | Named permission sets |
| `directus_permissions` | System | CRUD rules with filters |
| `directus_access` | **Junction** | Links roles/users to policies |

## Critical Rule: permissions vs validation (UPDATED 2026-03-10)

| Field | Evaluated How | Purpose |
|-------|---------------|---------|
| `permissions` | **OR across policies** — any passing policy allows | Filter which records user can access (READ/UPDATE/DELETE) AND authorize CREATE |
| `validation` | **AND across ALL policies** — all must pass | Validate submitted data schema (field format, required values) |
| `presets` | Per-policy, auto-fills fields | Auto-fill `orq` from `$CURRENT_USER.active_orq` on CREATE |

### Why NOT to use `validation` for org-scoping on CREATE

**`validation` is AND across ALL assigned policies.** If a user has ORQ-63-Sales + ORQ-12-Dev policies:
- ORQ-63 validation: `{ orq: { _eq: 63 } }` → passes when orq=63
- ORQ-12 validation: `{ orq: { _eq: 12 } }` → **FAILS** when orq=63
- Result: **ALL creates blocked** regardless of active_orq

**`permissions` is OR across policies.** Same user:
- ORQ-63 permissions: `{ _and: [{ orq: { _eq: 63 } }, { orq: { _eq: "$CURRENT_USER.active_orq" } }] }` → passes when active_orq=63
- ORQ-12 permissions: same with 12 → fails when active_orq=63
- Result: **CREATE succeeds** (one policy passed)

**Correct CREATE pattern (org-scoped):**
```json
{
  "action": "create",
  "collection": "order",
  "fields": ["*"],
  "permissions": { "_and": [{ "orq": { "_eq": 63 } }, { "orq": { "_eq": "$CURRENT_USER.active_orq" } }] },
  "presets": { "orq": "$CURRENT_USER.active_orq" },
  "validation": null,
  "policy": "POLICY_UUID"
}
```

**Use `validation` ONLY for:** data shape rules (field format, required fields) that don't conflict across policies.

### Blanket Policy Warning

**Any policy with `permissions: null` on a collection grants FULL unrestricted access to ALL records.** Since policies are OR-ed, one blanket policy defeats all org-scoped AND filters from other policies.

**Example:** User has ORQ-63-Sales-Policy (org-scoped) + Payment-Admin-Policy (`permissions: null` on orders). The admin policy grants access to ALL orders in ALL orgs, regardless of active_orq.

**Prevention:** Audit all policies assigned to a user. Remove or scope any blanket policies before testing org isolation.

```bash
# Find blanket permissions (permissions=null means full access)
curl -s "http://localhost:8055/permissions?filter[permissions][_null]=true&fields=id,collection,action,policy.name&limit=-1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[]'
```

## Workflow

### Step 1: Gather Requirements

Ask user:
```
0. What ownership model? (A: org-owned, B: user-owned, C: both, D: shared)
   → If B or D, skip orq/active_orq setup. Use $CURRENT_USER or {} filter.
   → If A or C, continue with org-scoped setup below.
1. What role/job function? (e.g., Sales Manager, Support Agent)
2. Which organization(s)? (e.g., ORQ-63, ORQ-75)
3. Which collections? (e.g., orders, customers, products)
4. What operations? (CREATE, READ, UPDATE, DELETE)
5. Any field restrictions? (e.g., no payment fields)
```

**If Model B (user-owned)**: Skip Steps 2-7. Jump to "Model B: User-Scoped Permissions" section below.
**If Model D (system/shared)**: Skip Steps 2-7. Jump to "Model D: System-Level Permissions" section below.

### Step 2: Check Existing Structure

```bash
# Check existing roles
curl -s "http://localhost:8055/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, name}'

# Check existing policies
curl -s "http://localhost:8055/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, name}'

# Check if orq field exists on target collection
curl -s "http://localhost:8055/fields/[collection]" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | select(.field=="orq")'
```

### Step 3: Create Role (if needed)

```bash
curl -X POST "http://localhost:8055/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Manager",
    "description": "Manages sales orders for organization",
    "icon": "sell"
  }'
# Note: Directus generates UUID - store the returned id
```

### Step 4: Create Policy

```bash
curl -X POST "http://localhost:8055/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ORQ-63 Sales Access",
    "description": "Sales CRUD access for WantWant (orq=63)",
    "admin_access": false,
    "app_access": true
  }'
# Note: Directus generates UUID - store the returned id
```

### Step 5: Add Permissions to Policy

**CREATE permission (with presets + AND filter, NO validation):**
```bash
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "collection": "order",
    "fields": ["*"],
    "permissions": {"_and": [{"orq": {"_eq": 63}}, {"orq": {"_eq": "$CURRENT_USER.active_orq"}}]},
    "presets": {"orq": "$CURRENT_USER.active_orq"},
    "validation": null,
    "policy": "POLICY_UUID_HERE"
  }'
```

> **Why no `validation`?** See "Critical Rule" section above. `validation` is AND across ALL policies — breaks multi-policy users. Use `permissions` (OR across policies) + `presets` (auto-fill) instead.

> **Why `presets`?** Frontend does NOT send `orq`. D11 preset auto-fills it from `$CURRENT_USER.active_orq`. Frontend only needs to call `syncActiveOrq(orgId)` on login/org-switch.

**READ/UPDATE/DELETE permissions (AND filter):**
```bash
# READ
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "read",
    "collection": "order",
    "fields": ["*"],
    "permissions": {"_and": [{"orq": {"_eq": 63}}, {"orq": {"_eq": "$CURRENT_USER.active_orq"}}]},
    "policy": "POLICY_UUID_HERE"
  }'

# UPDATE
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "collection": "order",
    "fields": ["*"],
    "permissions": {"_and": [{"orq": {"_eq": 63}}, {"orq": {"_eq": "$CURRENT_USER.active_orq"}}]},
    "policy": "POLICY_UUID_HERE"
  }'

# DELETE
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "collection": "order",
    "permissions": {"_and": [{"orq": {"_eq": 63}}, {"orq": {"_eq": "$CURRENT_USER.active_orq"}}]},
    "policy": "POLICY_UUID_HERE"
  }'
```

### Step 6: Link Policy to Role

```bash
curl -X POST "http://localhost:8055/access" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ROLE_UUID_HERE",
    "user": null,
    "policy": "POLICY_UUID_HERE"
  }'
```

### Step 7: Assign User to Role

```bash
curl -X PATCH "http://localhost:8055/users/USER_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ROLE_UUID_HERE"}'
```

### Step 8: Verify Access

```bash
# 0. Set active_orq (simulate login/org-switch)
ADMIN_TOKEN="your-admin-token"
USER_UUID="user-uuid-here"
curl -s -X PATCH "http://localhost:8055/users/$USER_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active_orq": 63}'

# 1. Login as the user
TOKEN=$(curl -s "http://localhost:8055/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.data.access_token')

# 2. Test READ (should see only orq=63, not orq=12)
curl -s "http://localhost:8055/items/order" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# 3. Test CREATE — do NOT send orq (preset fills it from active_orq)
curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8055/items/order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"SALE","status":"draft","nonce":"test-123"}'
# Expect: 200, created record has orq=63 from preset

# 4. Switch to different org and verify isolation
curl -s -X PATCH "http://localhost:8055/users/$USER_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active_orq": 12}'

# Re-login to get fresh token
TOKEN=$(curl -s "http://localhost:8055/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.data.access_token')

# Read the order created in step 3 by ID — should get 403
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8055/items/order/ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expect: 403 (active_orq=12 can't read orq=63 data)
```

> **Tip:** Use admin token to set `active_orq` for testing. In production, `syncActiveOrq()` handles this on login/org-switch.

## Multi-Org Architecture (users_multi + OAuth)

The RBAC system integrates with the OAuth extension (PRD-SOCIAL-OAUTH) for multi-org user management.

### Five Tables, One Chain

```
directus_users        → Core identity (1 per person)
    ↓
users_multi           → Org membership registry (N per user, tracks auth provider)
    ↓
organizations         → Org definitions (id, name, code like "ORQ-63", domain for email detection)
    ↓
directus_access       → User→Policy junction (1 per org per user)
    ↓
directus_policies     → Named capability bundles ("ORQ-63-Sales-Policy")
    ↓
directus_permissions  → CRUD rules with orq filter ({"orq": {"_eq": 63}})
```

### How a User Gets Access (Login Flow)

The OAuth extension at `/Users/mac/projects/d11/extensions/directus-extension-oauth/` handles this:

1. **Authenticate** — `POST /login/email` or `POST /login/google`
2. **Detect org** — `org-detector.ts`: email domain match → existing `users_multi` → default fallback
3. **Create membership** — `user-manager.ts`: inserts `users_multi` record `{directus_user, organization_id, auth_provider}`
4. **Assign policy** — `policy-manager.ts`: inserts `directus_access` record `{user, policy: 'ORQ-{code}-Access'}`
5. **Generate JWT** — Token carries user ID + role; D11 resolves policies at query time
6. **Return response** — Includes `user.policies[]`, `organization`, `organizations[]`

### Key Principle: Additive Policies (Ceiling + Selection)

User in ORQ-63 + ORQ-12 has TWO `directus_access` rows. D11 unions them:
- Query `/items/order` → returns orders where `orq=63 OR orq=12` (ALL orgs mixed)
- **Policies = CEILING** (what user CAN access across all orgs)
- **Session org = SELECTION** (what user WANTS to see right now)

**Consistency rule**: `users_multi` memberships must match `directus_access` policy grants. 3 orgs in users_multi = at minimum 3 org-scoped policies in directus_access. Membership without policy = user "belongs" but can't access data.

### AND Filter Pattern (CARD-WW-MIGRATE-020) — PROVEN

**Problem**: Additive policies mix ALL orgs' data. Frontend `filter[orq]=X` is fragile (client-side trust).

**Solution**: AND filter in each policy permission — server-side enforcement:

```json
{ "_and": [{ "orq": { "_eq": 63 } }, { "orq": { "_eq": "$CURRENT_USER.active_orq" } }] }
```

- **First condition**: hardcoded security ceiling (which org this policy grants)
- **Second condition**: must match user's `active_orq` field on `directus_users`
- **Both must match** for the policy to return data
- User PATCHes `active_orq` via `PATCH /users/me` to switch orgs

**How it works**:
```
User sets active_orq=63 → GET /items/order
  Policy ORQ-63: orq=63 AND active_orq=63 → MATCH → returns ORQ-63 data
  Policy ORQ-12: orq=12 AND active_orq=63 → NO MATCH → skipped
  Result: only ORQ-63 data (server-enforced)

User sets active_orq=99 (no policy) → GET /items/order
  No policy has orq=99 → zero data returned (escalation prevented)
```

**Two permission categories**:

| Category | Filter | Example | Why |
|----------|--------|---------|-----|
| Org-scoped data | AND filter | order, order_line, transaction | Data belongs to an org |
| User-scoped data | `$CURRENT_USER` | users_multi, directus_users | User must see ALL their data to switch orgs |

**Frontend integration — `syncActiveOrq` helper** (`lib/d11/sync-active-orq.ts`):
```typescript
import { syncActiveOrq } from '@/lib/d11/sync-active-orq'

// Call after login AND after org switching — sets active_orq on D11
await syncActiveOrq(orgId)  // PATCH /users/me { active_orq: orgId }
useOrgStore.getState().setSelectedOrq(orgId)
```

**Wired into all login paths:**
- `lib/auth-multi-provider.ts` → `storeTokens()` (central, fire-and-forget)
- `app/login/page.tsx` → email + phone handlers
- `components/org-login-modal.tsx` → org switch handler

**Frontend does NOT send `orq` in payloads.** D11 presets auto-fill it from `$CURRENT_USER.active_orq`.

**Reference**: `scripts/collections/migration-027-active-orq-trial.ts`, `docs/cards/CARD-WW-MIGRATE-020.md`

**Directus 11 gotchas discovered**:
- Omitting `fields` from permission = **no field access** (not all fields). Always set `fields: ['*']`.
- `$CURRENT_USER.field` only resolves fields directly on `directus_users`, not O2O extension tables.
- `PATCH /users/me` requires explicit `directus_users` update permission — `app_access: true` alone is insufficient.

### Organization Detection Priority

```typescript
// In org-detector.ts:
// 1. Existing users_multi record (returning user)
// 2. Email domain → organizations.domain match
// 3. Invitation code (future)
// 4. Default org fallback (first by ID)
```

### Current D11 Organizations

| ID | Code | Name | Domain | Policy |
|----|------|------|--------|--------|
| 12 | ORQ-12 | Synque Developers | synque.io | ORQ-12-Dev-Policy |
| 63 | ORQ-63 | WantWant Sales | — | ORQ-63-Sales-Policy |
| 75 | ORQ-75 | WantWant Support | — | ORQ-75-Support-Policy |
| 99 | ORQ-99 | NewStartup Inc | — | — |

### Creating a New Organization (Full Setup)

```bash
# 1. Create organization
curl -s -X POST "http://localhost:8055/items/organizations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","code":"ORQ-100","url":"http://localhost:8055","domain":"acme.com"}'

# 2. Create policy (generate UUID)
POLICY_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
curl -s -X POST "http://localhost:8055/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$POLICY_UUID\",\"name\":\"ORQ-100-Access\",\"icon\":\"business\",\"description\":\"Acme Corp access\"}"

# 3. Add permissions (repeat for each collection) — AND filter + presets, NO validation
curl -s -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "[
    {\"collection\":\"order\",\"action\":\"read\",\"permissions\":{\"_and\":[{\"orq\":{\"_eq\":100}},{\"orq\":{\"_eq\":\"\$CURRENT_USER.active_orq\"}}]},\"fields\":[\"*\"],\"policy\":\"$POLICY_UUID\"},
    {\"collection\":\"order\",\"action\":\"create\",\"permissions\":{\"_and\":[{\"orq\":{\"_eq\":100}},{\"orq\":{\"_eq\":\"\$CURRENT_USER.active_orq\"}}]},\"presets\":{\"orq\":\"\$CURRENT_USER.active_orq\"},\"validation\":null,\"fields\":[\"*\"],\"policy\":\"$POLICY_UUID\"},
    {\"collection\":\"order\",\"action\":\"update\",\"permissions\":{\"_and\":[{\"orq\":{\"_eq\":100}},{\"orq\":{\"_eq\":\"\$CURRENT_USER.active_orq\"}}]},\"fields\":[\"*\"],\"policy\":\"$POLICY_UUID\"},
    {\"collection\":\"order\",\"action\":\"delete\",\"permissions\":{\"_and\":[{\"orq\":{\"_eq\":100}},{\"orq\":{\"_eq\":\"\$CURRENT_USER.active_orq\"}}]},\"policy\":\"$POLICY_UUID\"}
  ]"

# 4. Assign policy to user via directus_access
ACCESS_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
curl -s -X POST "http://localhost:8055/access" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ACCESS_UUID\",\"user\":\"USER_UUID\",\"policy\":\"$POLICY_UUID\",\"sort\":1}"

# 5. Create users_multi membership
curl -s -X POST "http://localhost:8055/items/users_multi" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"directus_user\":\"USER_UUID\",\"auth_provider\":\"email\",\"provider_user_id\":\"manual\",\"organization_id\":100,\"is_active\":true}"
```

### Verifying a User's Full Access Picture

```bash
# Policies assigned
curl -s -g "http://localhost:8055/access?fields=id,sort,policy.id,policy.name&filter[user][_eq]=USER_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Org memberships
curl -s -g "http://localhost:8055/items/users_multi?fields=id,organization_id,auth_provider,is_active&filter[directus_user][_eq]=USER_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Permissions on a specific policy
curl -s -g "http://localhost:8055/permissions?fields=id,collection,action,permissions&filter[policy][_eq]=POLICY_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Model B: User-Scoped Permissions

For collections where **data belongs to a person**, not an organization. No `orq` field, no AND filter, no org switching.

**When to use**: Personal wallet, user notes, saved preferences, any B2C app where the user IS the owner.

### Creating User-Scoped Permissions

```bash
# READ — user sees only their own records
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "read",
    "collection": "wallet_transactions",
    "fields": ["*"],
    "permissions": {"user_created": {"_eq": "$CURRENT_USER"}},
    "policy": "POLICY_UUID"
  }'

# CREATE — user can only create records owned by themselves
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "collection": "wallet_transactions",
    "fields": ["*"],
    "permissions": {},
    "validation": {"user_created": {"_eq": "$CURRENT_USER"}},
    "policy": "POLICY_UUID"
  }'

# UPDATE/DELETE — same user_created filter
```

**Key differences from Model A:**
- No `orq` field needed on the collection
- No `active_orq` on the user
- No org switching UI needed
- Filter uses `user_created` or `directus_user`, not `orq`
- Signup → works immediately (no org initialization gap)

### Model B: users_multi as User-Scoped Example

`users_multi` is already Model B in our codebase:
```json
{ "directus_user": { "_eq": "$CURRENT_USER" } }
```
User sees ALL their own memberships, regardless of org. This is why the org switcher works — it reads user-scoped data to show all options.

---

## Model D: System-Level Permissions

For collections with **no ownership** — shared config, lookup tables, reference data.

**When to use**: Payment gateways, currency rates, product catalogs (public), organization directory.

### Creating System-Level Permissions

```bash
# Open read — all authenticated users can read
curl -X POST "http://localhost:8055/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "read",
    "collection": "payment_gateway",
    "fields": ["*"],
    "permissions": {},
    "policy": "POLICY_UUID"
  }'

# Admin-only write — don't add create/update/delete to regular policies
# Only admin_access: true policies can modify system data
```

**Key differences:**
- `permissions: {}` means "no filter" — all records visible
- No `orq` field, no `user_created` field
- Only admins should have write access
- Often added to a shared "Base-Access" policy that all users inherit

---

## Common Patterns

### Pattern 1: Single-Org Full CRUD

User belongs to one organization with full access:

```json
{
  "role": "Sales Manager",
  "policies": ["ORQ-63-Sales-Access"],
  "permissions": {
    "orders": ["create", "read", "update", "delete"],
    "customers": ["create", "read", "update", "delete"]
  }
}
```

### Pattern 2: Multi-Org Access (Additive Policies)

Account Manager serving multiple organizations:

```json
{
  "role": "Account Manager",
  "policies": ["ORQ-63-Access", "ORQ-75-Access"],
  "effective": "orq=63 OR orq=75"
}
```

### Pattern 3: Read-Only Support

Support agent with view-only access:

```json
{
  "role": "Support Agent",
  "policies": ["ORQ-63-Support-Read-Only"],
  "permissions": {
    "orders": ["read"],
    "customers": ["read"]
  }
}
```

### Pattern 4: Field-Level Restrictions

Finance team can only update payment fields:

```json
{
  "action": "update",
  "collection": "orders",
  "fields": ["payment_status", "payment_notes", "invoice_url"],
  "permissions": {
    "_and": [
      {"orq": {"_eq": 63}},
      {"status": {"_in": ["completed", "processing"]}}
    ]
  }
}
```

## AI Instructions

### IMPORTANT Rules

1. **NEVER use `validation` for org-scoping on CREATE** — Use `permissions` (OR across policies) + `presets` instead. `validation` is AND across ALL policies and breaks multi-policy users.
2. **Use `presets` to auto-fill `orq`** — Frontend should NOT send `orq`. Preset: `{ "orq": "$CURRENT_USER.active_orq" }`
3. **Audit for blanket policies** — Any `permissions: null` on any assigned policy grants full access, bypassing all org filters
4. **Let Directus generate UUIDs** - Don't pass custom IDs to system tables (403 error)
5. **Use `directus_access` for policy linking** - Not direct user.policies field
6. **Test both positive and negative cases** - Verify 200 OK AND 403 Forbidden
7. **Check for duplicate permissions** — Migration scripts can create duplicates. Query by policy+collection+action to find them.

### UUID Storage Pattern

```bash
# Create policy and capture UUID
POLICY_ID=$(curl -s -X POST "http://localhost:8055/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"ORQ-63 Access","app_access":true}' | jq -r '.data.id')

# Use in subsequent calls
curl -X POST "http://localhost:8055/permissions" \
  -d "{\"policy\":\"$POLICY_ID\", ...}"
```

### Debugging 403 Errors

```bash
# 1. Verify token is valid
curl "http://localhost:8055/users/me" -H "Authorization: Bearer $TOKEN"

# 2. Get user's policies
curl "http://localhost:8055/users/me?fields=role.policies.*,policies.*" \
  -H "Authorization: Bearer $TOKEN"

# 3. Check permissions for specific policy
curl "http://localhost:8055/permissions?filter[policy][_eq]=$POLICY_ID&limit=-1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. Verify orq filter matches data
curl "http://localhost:8055/items/orders?filter[orq][_eq]=63" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length'
```

### Full Chain Debug (403 on Comments/Cards)

When user gets 403 despite policy having permissions, check the **full chain**:

```
User → Role → directus_access → Policy → Permissions
```

```bash
# 1. Get user's role from JWT or API
curl "https://DIRECTUS_URL/users/USER_ID?fields=id,email,role.id,role.name" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Check if role is linked to policy via directus_access (CRITICAL!)
curl "https://DIRECTUS_URL/access?filter%5Brole%5D%5B_eq%5D=ROLE_ID&fields=id,policy.id,policy.name" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. If empty, link role to policy:
curl -X POST "https://DIRECTUS_URL/access" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ROLE_ID", "policy": "POLICY_ID"}'

# 4. User must re-login to get new token with updated permissions
```

**Common 403 Causes:**
| Symptom | Cause | Fix |
|---------|-------|-----|
| Role not linked to policy | Missing `directus_access` | Link via POST /access |
| Token expired (401) | JWT exp passed | User re-login |
| Wrong role in token | Role changed after login | User re-login |

### Comments Permissions

For commenting on PRD/Story/Card, policy needs:

| Collection | Actions | Why |
|------------|---------|-----|
| `directus_comments` | read, create | Core comment access |
| `directus_users` | read | **User name expansion** (without this, comments show "System") |
| `cards` | read | Item validation |
| `stories` | read | Item validation |
| `prd_documents` | read | Item validation |

**Reference Policy:** PRD-Agent-Policy (`654cb185-a20d-4678-b202-2b459a8a2433`)

### Frontend Session Handling (401/403)

**Standard Pattern** - Use `authenticatedFetch` wrapper:

```typescript
import { authenticatedFetch } from "@/lib/authenticated-fetch"

// 401 is auto-handled (logout + reload → PRDAuthGate shows login)
const response = await authenticatedFetch('/api/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// Only handle 403 at component level
if (response.status === 403) {
  setError('Permission denied. Ask admin to fix RBAC.')
}
```

**How it works:**
1. `authenticatedFetch` adds `Authorization: Bearer <token>` automatically
2. On 401 → calls `logout()` from `lib/auth.ts` → reloads page
3. PRDAuthGate detects missing token → shows login UI
4. User gets fresh JWT with current permissions

**Key Files:**
| File | Purpose |
|------|---------|
| `lib/authenticated-fetch.ts` | **Standard** - Centralized fetch wrapper |
| `lib/auth.ts` | `logout()` clears tokens |
| `components/prd-auth-gate.tsx` | Shows login when no token |

**Current State Warning:**

There are inconsistent patterns in the codebase:

| Pattern | Files Using | Issue |
|---------|-------------|-------|
| `lib/authenticated-fetch.ts` | `directus-sync-panel` | **Standard** |
| `lib/auth-handler.ts` | `rentals-api`, `users-api`, `promotions-api` | Duplicate - shows login modal instead |
| Manual `getAccessToken()` + fetch | `use-collection-data`, many hooks | No 401 handling |

**Recommendation:** Migrate all API calls to use `lib/authenticated-fetch.ts` for consistent 401 handling with PRDAuthGate.

**403 Handling** (permission denied):
- Show red error banner with admin guidance
- User cannot self-fix - needs admin to update RBAC
- Example: "Ask admin to link your role to PRD-Agent-Policy"

### Token TTL Configuration

Directus JWT tokens are configured via environment variables in d11:

| Token | Env Variable | Default | Current (d11) |
|-------|--------------|---------|---------------|
| Access Token | `ACCESS_TOKEN_TTL` | 15m | 15m |
| Refresh Token | `REFRESH_TOKEN_TTL` | 7d | 7d (default) |

**To increase session duration** (reduce re-logins):
```bash
# In /Users/mac/projects/d11/.env
ACCESS_TOKEN_TTL="7d"    # Change from "15m" to "7d"
```

**Related Card**: [CARD-AUTH-001](../../docs/cards/CARD-AUTH-001-token-expiration-investigation.md) - Token TTL investigation

## Permission Deduplication (CARD-WW-ORD2-007)

Migration scripts can create **duplicate permissions** if run multiple times. Found 56 duplicates in production (72 → 16 after cleanup).

**Detect duplicates:**
```bash
# Get all permissions for a policy, check for duplicate collection+action combos
curl -s "http://localhost:8055/permissions?filter[policy][_eq]=POLICY_UUID&fields=id,collection,action&limit=-1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '[.data[] | {collection, action}] | group_by(.collection + .action) | map(select(length > 1))'
```

**Delete duplicates** (keep lowest ID, delete rest):
```bash
# Delete a specific duplicate permission
curl -s -X DELETE "http://localhost:8055/permissions/PERMISSION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Prevention:** Before creating permissions, always check if one already exists for that policy+collection+action combo.

---

## Running RBAC Tests

```bash
# Quick test
./tests/run-rbac-tests.sh

# Or with Newman directly
npx newman run tests/postman/rbac-crud-tests.postman_collection.json \
  -e tests/postman/rbac-test.postman_environment.json
```

## References

| File | Purpose |
|------|---------|
| `references/rbac-patterns.md` | Policy template examples |
| `../directus-schema/references/directus-versions.md` | Dual environment, multi-org, OAuth, RBAC architecture |
| `../directus-schema/references/directus-relations.md` | Two-step API flow for M2O/O2M/M2M |

## Related Documentation

- **Data Ownership Guide**: [MULTI-ORG-SWITCHING.md](../../docs/reference/MULTI-ORG-SWITCHING.md) — 4 ownership models, decision flowchart, lifecycle gaps
- **PRD**: [PRD-RBAC-MULTI-TENANT.md](../../docs/prds/PRD-RBAC-MULTI-TENANT.md)
- **AND Filter Trial**: [CARD-WW-MIGRATE-020.md](../../docs/cards/CARD-WW-MIGRATE-020.md) — 22 assertions, proven pattern
- **Architecture**: [D11-MULTI-TENANT-RBAC.md](../../docs/architecture/D11-MULTI-TENANT-RBAC.md)
- **OAuth Integration**: [PRD-SOCIAL-OAUTH.md](../../docs/prds/PRD-SOCIAL-OAUTH.md)
- **Directus Versions**: [directus-versions.md](../directus-schema/references/directus-versions.md)

## Checklist

Before completing RBAC setup:

- [ ] Role exists in `directus_roles`
- [ ] Policy exists in `directus_policies` with `app_access: true`
- [ ] CREATE permission has `permissions` (AND filter) + `presets` (auto-fill orq) + `validation: null`
- [ ] READ/UPDATE/DELETE have `permissions` field with AND filter (`orq=N AND orq=$CURRENT_USER.active_orq`)
- [ ] No duplicate permissions (query by policy+collection+action)
- [ ] No blanket policies (`permissions: null`) assigned to user that could bypass org filters
- [ ] Policy linked to role via `directus_access`
- [ ] User assigned to role
- [ ] User's `active_orq` is set (via `syncActiveOrq()` or manual PATCH)
- [ ] Tested: READ returns only active org data
- [ ] Tested: CREATE succeeds WITHOUT orq in body (preset fills it)
- [ ] Tested: Switch active_orq → can't read other org's data (403)

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-07 | Claude | **CRITICAL FIX**: Corrected "Frontend should NOT pass orq filter" — WRONG for multi-org users. Policies = ceiling, session org = selection. Added consistency rule (users_multi ↔ directus_access). |
| 2026-03-06 | Claude | Added Multi-Org Architecture section (users_multi, OAuth integration, org detection) |
| 2026-03-06 | Claude | Added D11_DEV Hard Gate and No D9 Regression Rule |
| 2026-03-06 | Claude | Added current D11 organizations table (ORQ-12, 63, 75, 99) |
| 2026-03-06 | Claude | Added full org setup recipe and user access verification commands |
| 2026-02-16 | Claude | Added warning about inconsistent fetch patterns in codebase |
| 2026-02-16 | Claude | Added token TTL configuration section |
| 2026-02-16 | Claude | Added full chain debug, comments permissions section |
| 2026-03-10 | Claude | **CRITICAL FIX**: `validation` is AND across ALL policies — breaks multi-policy users. Replaced with `permissions` (OR) + `presets` pattern. Added: Blanket Policy Warning, Permission Dedup, syncActiveOrq integration, updated all examples + checklist. |
| 2026-03-08 | Claude | Added Data Ownership Decision Gate (4 models: A/B/C/D), Model B + Model D sections, updated triggers |
| 2026-02-15 | Claude | Initial skill created from PRD-RBAC-MULTI-TENANT |
