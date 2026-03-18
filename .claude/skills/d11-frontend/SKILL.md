---
name: d11-frontend
description: D11 frontend integration standard — how to write Next.js pages and API modules that talk to Directus 11 using authenticatedFetch + PRDAuthGate. Triggers on "d11 api", "d11 frontend", "new d11 module", "authenticatedFetch pattern", "d11 page", "migrate to d11".
user-invocable: true
disable-model-invocation: false
---

# D11 Frontend Integration Standard

## Purpose

Teaches the **new standard** for building Next.js frontend pages that read/write data from Directus 11. Replaces the legacy D9 patterns (`lib/api.ts`, axios, `getApiOrqUrl()`, `SalesOrder` types) with a clean, policy-aware architecture.

**Core principle**: D11 policies set the **ceiling** of what a user can access. For multi-org users, the frontend must also pass an org filter to scope to the **current session org**. Single-org users get automatic scoping; multi-org users need `useOrgStore.selectedOrq` as a filter.

## When This Skill Applies

- Building a new page that reads D11 data
- Creating a new `lib/d11/*.ts` API module
- Migrating an existing D9 page to D11
- Debugging auth/token issues on D11 pages
- Understanding the D9 vs D11 boundary

## Architecture

```
PRDAuthGate (wraps page)
  └─ User logs in → localStorage: access_token, api_url
       └─ Page component calls lib/d11/{collection}.ts directly (no uid parsing needed)
            └─ authenticatedFetch(url, options)
                 └─ Reads access_token from localStorage
                 └─ Attaches Authorization: Bearer {token}
                 └─ Sends request to D11
                 └─ 401 → logout() + reload (PRDAuthGate catches it)
                 └─ 200 → returns raw Directus JSON

User scoping: Use Directus $CURRENT_USER dynamic variable in filters.
  Directus resolves it server-side from JWT — no client-side uid needed.
  Example: filter[user_created][_eq]=$CURRENT_USER
```

## The Three Layers

| Layer | File | Responsibility |
|-------|------|----------------|
| **Auth wrapper** | `components/prd-auth-gate.tsx` | Login UI, stores token in localStorage |
| **Fetch utility** | `lib/authenticated-fetch.ts` | Attaches Bearer token, handles 401 |
| **API module** | `lib/d11/{collection}.ts` | Collection-specific queries, types, filters |

## D9 vs D11 Comparison

| Aspect | D9 (Legacy) | D11 (New Standard) |
|--------|-------------|---------------------|
| **Fetch** | `axios` via `api` instance | `authenticatedFetch` (native fetch) |
| **Token** | `getAccessToken()` | `localStorage.access_token` (via authenticatedFetch) |
| **URL routing** | `getApiOrqUrl()` priority chain | `localStorage.api_url` or env fallback |
| **Org scoping** | Client sends `orq` filter param | Policies = ceiling; client adds `org` filter for multi-org users |
| **Types** | Transformed types (`SalesOrder`) | Raw Directus records (`D11Order`) |
| **Auth gate** | Various (some pages have none) | `PRDAuthGate` always |
| **401 handling** | Mixed (some retry, some ignore) | `logout()` + `reload()` always |
| **User scoping** | Client parses uid from localStorage | `$CURRENT_USER` dynamic variable (server-side) |
| **Location** | `lib/api.ts`, `lib/api-*.ts` | `lib/d11/{collection}.ts` |

## Do NOT

| Don't | Why | Do Instead |
|-------|-----|------------|
| Import from `lib/api.ts` in new D11 pages | D9 patterns, axios, wrong URL routing | Import from `lib/d11/{collection}.ts` |
| Hardcode org filter in every query | Fragile, easy to forget | Use `withOrgScope()` helper (see Session-Level Org Context) |
| Use `getApiOrqUrl()` for D11 | Complex priority chain, D9-specific | Use `getD11BaseUrl()` (localStorage.api_url) |
| Transform into `SalesOrder` type | Couples to D9 field mapping | Use raw Directus types (`D11Order`) |
| Use `getAccessToken()` directly | Inconsistent 401 handling | Use `authenticatedFetch` (handles 401) |
| Skip PRDAuthGate wrapper | No login UI, no token in localStorage | Always wrap D11 pages with PRDAuthGate |
| Modify `lib/api.ts` for D11 | Risks D9 regression for WW | Create new module in `lib/d11/` |
| Parse `user_uid` from localStorage | Fragile, not always stored | Use `$CURRENT_USER` in filters (resolved from JWT server-side) |

---

## Auth Mode Boundary

D11 pages are guarded by `layout-content.tsx` (`AUTH_POLICY=true` → bare `{children}`, no D9 Navigation). But **cross-cutting code** (login, org switch, token handling) runs in **all three auth modes**.

| Code layer | Mode-guarded by | Safe to call D11 functions? |
|------------|----------------|---------------------------|
| D11 pages (`app/order/`, etc.) | `layout-content.tsx:206` | Yes — only renders in D11 mode |
| Login/auth (`auth-multi-provider.ts`, `login/page.tsx`) | **Nothing** — runs in all modes | No — D11 functions must self-guard |
| OAuth callback (`auth/callback/page.tsx`) | **Nothing** | No — same issue |

**Rule**: Any `lib/d11/*.ts` function called from login/auth code must include:
```typescript
if (process.env.NEXT_PUBLIC_AUTH_POLICY !== 'true') return
```

**Reference**: `docs/stories/US-WW-ENV-001.md` — three auth modes, navigation behavior, active_orq lifecycle

---

## Workflow: Creating a New D11 API Module

### Step 1: Identify the Collection

Check what collection you're targeting on D11. Use `/collection/{name}` in the browser or:
```bash
curl -s http://localhost:8055/items/{collection}?limit=1 -H "Authorization: Bearer $TOKEN" | jq '.data[0] | keys'
```

### Step 2: Create the Module File

Create `lib/d11/{collection}.ts` following this template:

```typescript
/**
 * D11 {Collection} API — using authenticatedFetch + PRDAuthGate
 *
 * @card CARD-XXX
 * @purpose D11-native {collection} queries. No D9 dependencies.
 *
 * Pattern:
 *   PRDAuthGate (login) → localStorage.access_token → authenticatedFetch (auto-attach token)
 *   → D11 policies filter by orq server-side → frontend renders what comes back
 */

import { authenticatedFetch } from '@/lib/authenticated-fetch'

/**
 * Get the D11 API base URL.
 * Reads from localStorage (set during login) or falls back to env.
 */
function getD11BaseUrl(): string {
  if (typeof window !== 'undefined') {
    const apiUrl = localStorage.getItem('api_url')
    if (apiUrl) return apiUrl
  }
  return process.env.NEXT_PUBLIC_API_ORQ || 'http://localhost:8055'
}

/** Raw Directus {collection} record — no transformation */
export interface D11{Name} {
  id: number
  // ... fields from collection schema
  orq: number
  user_created: string
  date_created: string
  [key: string]: any  // Allow expanded relations
}

export interface Fetch{Name}sResult {
  items: D11{Name}[]
  totalCount: number
}

export interface Fetch{Name}sParams {
  /** Pass '$CURRENT_USER' to filter by logged-in user. Directus resolves server-side from JWT. */
  createdBy?: string
  limit?: number
  page?: number
  sort?: string
  filters?: Record<string, string | number>
}

export async function fetchD11{Name}s(params: Fetch{Name}sParams = {}): Promise<Fetch{Name}sResult> {
  const base = getD11BaseUrl()

  const query = new URLSearchParams()
  query.set('meta', 'filter_count')
  query.set('fields', '*')  // Add relations: '*,relation.*'
  query.set('sort', params.sort || '-date_created')
  query.set('limit', String(params.limit || 200))
  query.set('page', String(params.page || 1))

  if (params.createdBy) {
    query.set('filter[user_created][_eq]', params.createdBy)
  }

  // Forward additional filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      query.set(key, String(value))
    }
  }

  const response = await authenticatedFetch(`${base}/items/{collection}?${query.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.errors?.[0]?.message || `Failed to fetch: ${response.status}`)
  }

  const data = await response.json()

  return {
    items: data.data || [],
    totalCount: data.meta?.filter_count || data.data?.length || 0,
  }
}
```

### Step 3: Create the Page

Create `app/{route}/page.tsx` following this pattern:

```typescript
"use client"

/**
 * @card CARD-XXX
 */

import { useState, useEffect, useCallback } from 'react'
import { PRDAuthGate } from '@/components/prd-auth-gate'
import { fetchD11{Name}s, type D11{Name} } from '@/lib/d11/{collection}'

export default function MyPage() {
  return (
    <PRDAuthGate>
      <PageContent />
    </PRDAuthGate>
  )
}

function PageContent() {
  const [items, setItems] = useState<D11{Name}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Two layers of server-side filtering:
      // 1. D11 policies scope by org (e.g., ORQ-12-Dev-Policy → only orq=12)
      // 2. $CURRENT_USER scopes by creator (Directus resolves from JWT)
      const result = await fetchD11{Name}s({ createdBy: '$CURRENT_USER', limit: 200 })
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ... render with CollectionViewer or custom UI
}
```

**Key: No localStorage parsing needed.** PRDAuthGate ensures the user is logged in (token in localStorage). `authenticatedFetch` attaches the token. `$CURRENT_USER` tells Directus to resolve the user ID from that token server-side. Two components, not three.

### Step 4: Wire Up CollectionViewer (Optional)

If using CollectionViewer, create `lib/collection-viewer/configs/{collection}.ts` and export from `lib/collection-viewer/index.ts`. See `lib/collection-viewer/configs/orders.ts` as the reference implementation.

---

## Pattern: Mutations (POST/PATCH/DELETE)

For write operations, use the same `authenticatedFetch` with method + JSON body:

```typescript
import { authenticatedFetch } from '@/lib/authenticated-fetch'

// CREATE
const response = await authenticatedFetch(`${base}/items/{collection}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})
const created = (await response.json()).data

// UPDATE (partial)
await authenticatedFetch(`${base}/items/{collection}/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'paid' }),
})

// DELETE
await authenticatedFetch(`${base}/items/{collection}/${id}`, { method: 'DELETE' })

// BATCH CREATE (Directus supports POST with array body)
await authenticatedFetch(`${base}/items/{collection}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([item1, item2, item3]),
})
```

**Key difference from D9**: D9 used custom `/orders/create` endpoint. D11 uses standard Directus `/items/{collection}` CRUD. Policies control who can CREATE/UPDATE/DELETE — no custom endpoint needed.

Reference implementation: `lib/d11/order-mutations.ts`

---

## Pattern: Multi-Module Composition

When a component needs data from multiple D11 collections, fetch in parallel:

```typescript
// Parallel fetch from multiple D11 modules
const [lines, transactions] = await Promise.all([
  fetchD11OrderLinesByOrderId(orderId).catch(() => []),
  fetchD11TransactionsByOrder(orderId).catch(() => []),
])
```

**In a React component** (useEffect with cleanup):

```typescript
useEffect(() => {
  if (!orderId) return
  let cancelled = false

  Promise.all([
    fetchD11OrderLinesByOrderId(orderId).catch(() => []),
    fetchD11TransactionsByOrder(orderId).catch(() => []),
  ]).then(([lines, txns]) => {
    if (!cancelled) {
      setOrderLines(lines)
      setTransactions(txns)
    }
  })

  return () => { cancelled = true }
}, [orderId])
```

**Rules:**
- Each `.catch(() => [])` prevents one failing module from breaking the others
- Use `cancelled` flag to prevent state updates after unmount
- Pass the parent record's ID (not nonce) for relation queries

Reference implementation: `OrderDetailSheet` in `app/order/my-orders/page.tsx`

---

## Session-Level Org Context (Multi-Org Users)

### The Problem

Directus OR's all a user's policies. A user with policies for ORQ-12 + ORQ-63 + ORQ-75 querying `/items/orders` gets orders from **all 3 orgs** mixed together.

```
Policies = what you CAN access (permission ceiling)
Session org = what you WANT to see right now (selection within ceiling)
```

### The Three Tables

```
┌─ users_multi ──────────────────────────────────────┐
│  "Which orgs does this user belong to?"             │
│  Membership records — for UI display, org picker    │
│  dev@synque.io → [ORQ-12, ORQ-63, ORQ-75]         │
└────────────────────────────────────────────────────┘
                         ↕ must match
┌─ directus_access (policies) ──────────────────────┐
│  "What can this user DO in each org?"              │
│  1 policy per org minimum. 3 orgs = 3 policies.   │
│  Directus enforces these server-side.              │
└────────────────────────────────────────────────────┘
                         ↕ filtered by
┌─ useOrgStore.selectedOrq ─────────────────────────┐
│  "Which org is the user looking at RIGHT NOW?"     │
│  Session-level, persisted to localStorage.         │
│  All D11 queries for org-scoped data must filter.  │
└────────────────────────────────────────────────────┘
```

### How Org Filter Works

Policy says: `orders:read WHERE organization_id IN (12, 63, 75)` (OR'd across policies)
Client adds: `filter[organization_id][_eq]=63` (session org)
Directus intersects: returns orders WHERE (org=12 OR org=63 OR org=75) AND org=63 → only ORQ-63

### Using useOrgStore in D11 Modules

```typescript
import { useOrgStore } from '@/stores/org-store'

// In a React component:
const orqId = useOrgStore.getState().getSelectedOrq()
const result = await fetchD11Orders({
  filters: { 'filter[organization_id][_eq]': String(orqId) }
})
```

### When to Filter by Org

| Collection type | Filter needed? | Example |
|----------------|---------------|---------|
| Org-scoped data (orders, inventory) | **YES** — `filter[organization_id][_eq]` | `/items/orders` |
| User-scoped data (my memberships) | **NO** — `$CURRENT_USER` is sufficient | `/items/users_multi` |
| Global data (products catalog) | **NO** — visible to all | `/items/products` |

### Login Flow Gap (Current State)

D11 `/login/email` returns `{ access_token, user, policies }` but **NOT** `organizations[]`.
- `auth-multi-provider.ts:266` falls to "No organization data" fallback
- `useOrgStore.selectedOrq` defaults to 63 (config fallback) — may be wrong for multi-org users
- **Fix needed**: After login, fetch `users_multi` to discover user's orgs, then set correct default

### Profile Page + Org Switching

`/profile` page shows live org memberships from D11 (`fetchD11MyMemberships()`).
"Switch" button: `useOrgStore.setSelectedOrq(orgId)` + `localStorage.current_organization` + full page reload.
Current org highlighted in PRDAuthGate header bar (orange ORQ badge).

### Server-Side Org Scoping — Research Findings (2026-03-07)

**Directus 11 has NO native multi-tenancy.** Three approaches available:

| Approach | Effort | Server-Enforced | Best For |
|----------|--------|----------------|----------|
| **Hook + AsyncLocalStorage** | D11 extension | YES | Long-term: `X-Organization` header → `items.query` injects filter |
| **`$CURRENT_USER.active_orq`** | Migration only | YES (native) | Quick win: PATCH user on switch → policies use `$CURRENT_USER.active_orq` |
| **Client filter** (current) | Already done | NO | Working now — fragile for multi-org |

**Key finding**: `items.query` filter hook CAN inject org filters server-side, but can't read HTTP headers directly. AsyncLocalStorage bridges this gap: `routes.before` middleware stashes org context → `items.query` hook reads it.

**Simplest quick win**: Add `active_orq` field to `directus_users`. On org switch: `PATCH /users/me {active_orq: 63}`. Change policy filters from `{orq: {_eq: 63}}` to `{orq: {_eq: "$CURRENT_USER.active_orq"}}`. Then one policy covers all orgs.

See: `CARD-WW-RBAC-008` for open design decisions that align with this research.

---

## Reference Implementation

**The proven pattern** — use these as copy-paste sources:

| File | What it demonstrates |
|------|---------------------|
| `lib/d11/orders.ts` | D11 API module template — GET with filters |
| `lib/d11/order-lines.ts` | Relation query — filter by parent order_id |
| `lib/d11/transactions.ts` | Relation query — filter by parent order |
| `lib/d11/payment-gateways.ts` | Multi-collection module — gateway + route |
| `lib/d11/order-mutations.ts` | POST/PATCH/DELETE + batch create + composite operation |
| `lib/d11/index.ts` | Barrel export — `import { ... } from '@/lib/d11'` |
| `lib/authenticated-fetch.ts` | Token attachment + 401 handling |
| `app/order/my-orders/page.tsx` | PRDAuthGate + multi-module Sheet + CollectionViewer |
| `lib/collection-viewer/configs/orders.ts` | CollectionViewer config for D11 data |

## Migration Tracker

D9 modules that may eventually need D11 equivalents:

| D9 Module | D11 Collection | D11 Module | Status |
|-----------|----------------|------------|--------|
| `lib/api.ts` (fetchOrders) | `order` | `lib/d11/orders.ts` | Done |
| `lib/api-order.ts` | `order_line` | `lib/d11/order-lines.ts` | Done (read) |
| `lib/api-payment.ts` | `transaction` | `lib/d11/transactions.ts` | Done (read) |
| `lib/api-payment-client.ts` | `payment_gateway`, `gateway_route` | `lib/d11/payment-gateways.ts` | Done (read) |
| `lib/api-order.ts` (mutations) | `order`, `order_line` | `lib/d11/order-mutations.ts` | Done |
| `lib/api-products.ts` | `product` (not yet on D11) | — | Not started |
| `lib/api-stock.ts` | `inventory` (not yet on D11) | — | Not started |
| `lib/api-promotions.ts` | `promotion` (not yet on D11) | — | Not started |
| `lib/api-activity.ts` | `directus_activity` | — | Not started |
| `lib/api-app-user.ts` | `directus_users` | — | Not started |
| — (new) | `users_multi` | `lib/d11/users-multi.ts` | Done |
| `lib/api-product-variants.ts` | `product_variant` (not yet on D11) | — | Not started |
| `lib/api-product-variant-options.ts` | `product_variant_option` (not yet on D11) | — | Not started |
| `lib/api-public.ts` | Various (public) | — | Not started |
| `lib/api-push-notifications.ts` | `push_notification` (not yet on D11) | — | Not started |

**Barrel export**: `lib/d11/index.ts` — import everything from `@/lib/d11`

**Update this table as modules are migrated.**

## Token Flow Detail

```
1. User visits /order/my-orders
2. PRDAuthGate checks localStorage.access_token
3. If missing → shows login form (email/password or OAuth)
4. Login POST to D11 /login/email (policy-auth extension)
5. D11 returns: { access_token, user, policies } — NOTE: does NOT return organizations[]
6. PRDAuthGate stores token + user_info in localStorage
7. (Gap) useOrgStore.selectedOrq falls back to config default (63) if not already set
8. Page renders → calls fetchD11Orders({ createdBy: '$CURRENT_USER' })
9. authenticatedFetch reads localStorage.access_token
10. Sends GET /items/order?filter[user_created][_eq]=$CURRENT_USER with Authorization: Bearer {token}
11. D11 resolves $CURRENT_USER from JWT → replaces with user's UUID server-side
12. D11 evaluates ALL user's policies (OR'd) → returns records from ALL allowed orgs
13. For org-scoped data: frontend must also pass filter[organization_id][_eq]={selectedOrq}
14. For user-scoped data ($CURRENT_USER): no org filter needed — already scoped to user
```

### Directus Dynamic Variables

| Variable | Resolves to | Use case |
|----------|-------------|----------|
| `$CURRENT_USER` | Authenticated user's UUID | Filter by creator: `filter[user_created][_eq]=$CURRENT_USER` |
| `$CURRENT_ROLE` | User's primary role ID | Filter by role |
| `$CURRENT_ROLES` | All user role IDs (array) | Filter by any role |
| `$NOW` | Current timestamp | Date comparisons |

**These are resolved server-side from the JWT token.** No client-side state needed — no localStorage parsing, no uid passing between components.

## Debugging

### "No data returned" but user has orders
1. Check `localStorage.access_token` exists (DevTools → Application → Local Storage)
2. Check `localStorage.api_url` points to correct D11 instance
3. Verify user has policy in `directus_access` for the target collection
4. Test directly: `curl -s "$API_URL/items/order?limit=1" -H "Authorization: Bearer $TOKEN"`

### 401 on every request
1. Token may be expired — D11 tokens have a TTL
2. PRDAuthGate should auto-redirect to login on 401
3. Check if `logout()` is clearing the token correctly

### "Failed to fetch" network error
1. Check if D11 is running: `curl -s http://localhost:8055/server/health`
2. Check CORS — D11 must allow the frontend origin
3. Check `api_url` in localStorage — might point to wrong instance

## Related Skills

- **rbac** — Setting up policies and permissions on D11 (server-side)
- **migration** — Creating collections and fields on D11
- **directus-schema** — Understanding D11 schema, relations, seed data
- **backend-extension** — Custom D11 endpoints (e.g., /login/email OAuth extension)

## Changelog

| Date | Change |
|------|--------|
| 2026-03-06 | Created skill. Reference: `lib/d11/orders.ts`, `app/order/my-orders/page.tsx` |
| 2026-03-06 | Added order-lines, transactions, payment-gateways modules. Barrel export at `lib/d11/index.ts` |
| 2026-03-06 | Added mutations module (CREATE/PATCH/DELETE). Multi-module composition pattern in OrderDetailSheet |
| 2026-03-07 | Replaced `user_uid` localStorage pattern with `$CURRENT_USER` dynamic variable. Simplified page template from 3 components to 2. Added Directus dynamic variables reference. |
| 2026-03-07 | **CRITICAL FIX**: Corrected "frontend never passes orq filter" — WRONG for multi-org users. Added Session-Level Org Context section. Fixed token flow to show D11 login does NOT return organizations[]. Added users_multi to migration tracker. |
