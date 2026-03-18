---
name: backend-extension
description: Directus 11 backend extension development - custom API endpoints, OAuth providers, business logic modules. Triggers on "backend extension", "directus extension", "custom endpoint", "create extension", "oauth extension".
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(node *), Bash(npx *), Read, Write, Glob, Grep
---

# Backend Extension Development

Specialized skill for developing Directus 11 backend extensions: custom API endpoints, OAuth providers, and business logic modules.

## Purpose

Create custom Directus extensions following the modular architecture pattern proven in OAuth implementation:
- Custom API endpoints with database access
- OAuth provider integrations
- Business logic modules with clear separation of concerns
- Integration with existing schema migrations

## Prerequisites

### Required Environment
| Requirement | Check Command | Purpose |
|-------------|---------------|---------|
| Directus 11 running | `curl http://localhost:8055/server/health` | Target instance |
| Admin token | Set in `.env.local` as `DIRECTUS_ADMIN_TOKEN` | API authentication |
| Node.js 22+ | `node --version` | Extension build |
| Extension directory | `/Users/mac/projects/d11/extensions/` | Extension location |

### Related Skills
| Skill | Purpose |
|-------|---------|
| `directus-schema` | Schema migrations before extension development |
| `rbac` | Policy/permission setup for extension endpoints |
| `api-testing` | Newman tests for extension verification |

## Workflow

### Step 1: Create Card First

Before writing any code, document the extension:

```bash
# Create implementation Card
cp docs/cards/CARD-TEMPLATE.md docs/cards/CARD-EXT-NNN-description.md
```

**Card should include:**
- Objective: What the extension does
- Implementation Flow: Step-by-step algorithm
- Integration Points: What calls it, what it calls

### Step 2: Run Schema Migrations (if needed)

Use `directus-schema` skill to create any collections the extension needs:

```bash
/directus-schema  # Create collection for extension
```

### Step 3: Create Extension Structure

```bash
cd /Users/mac/projects/d11/extensions
npx create-directus-extension@latest directus-extension-{name}
# Choose: endpoint
```

**Recommended structure:**
```
directus-extension-{name}/
├── src/
│   ├── endpoints/                ← API routes
│   │   ├── feature-get.ts       ← GET /feature
│   │   └── feature-post.ts      ← POST /feature
│   ├── shared/                   ← Business logic modules
│   │   ├── module-a.ts          ← One function per file
│   │   └── module-b.ts
│   └── index.ts                  ← Extension entry point
├── package.json
└── README.md
```

### Step 4: Implement Extension

**Key Rules:**
1. **One function per file** for clarity
2. **Export async functions** (Directus uses async everywhere)
3. **Use `context.env` for env vars** — NEVER `process.env` (see Environment Variables below)
4. **No hardcoded fallbacks** — throw or warn if env var missing, never embed secrets/URLs in code
5. **Use `ItemsService` for custom tables** — respects Directus permissions, triggers, validation
6. **Use Directus services** for system tables: `new services.UsersService({ schema, knex })`
7. **Raw Knex only for transactions** — `database.transaction()` for multi-table atomic writes
8. **Choose the right `accountability`** — see Accountability Modes below

**Endpoint pattern:**
```typescript
// src/endpoints/feature.ts
import { defineEndpoint } from '@directus/extensions-sdk';

export default defineEndpoint({
  id: 'feature',
  handler: (router, context) => {
    // Access env vars via context.env — NOT process.env
    const apiKey = context.env['MY_API_KEY'];
    if (!apiKey) {
      context.logger.warn('[Feature] MY_API_KEY not set in .env');
    }

    router.get('/', async (req, res) => {
      const schema = await context.getSchema();
      const { ItemsService } = context.services;

      // Use ItemsService for custom collections (respects permissions + triggers)
      const itemsService = new ItemsService('my_collection', {
        schema,
        accountability: { admin: true },
      });
      const items = await itemsService.readByQuery({ limit: 10 });
      res.json({ data: items });
    });

    router.post('/', async (req, res) => {
      const { field1, field2 } = req.body;
      const schema = await context.getSchema();
      const { ItemsService } = context.services;

      const itemsService = new ItemsService('my_collection', {
        schema,
        accountability: { admin: true },
      });
      const id = await itemsService.createOne({ field1, field2 });
      res.json({ data: { id } });
    });
  }
});
```

### Accountability Modes (CRITICAL — CARD-PAY-020)

`accountability` tells Directus **who is performing the action**. It determines which RBAC policies apply.

| Mode | Code | RBAC Applied? | Use When |
|------|------|---------------|----------|
| **Service user** | `accountability: { admin: true }` | NO — bypasses all policies | Webhooks, cron jobs, system-to-system, background tasks |
| **Pass-through** | `accountability: req.accountability` | YES — user's policies apply | User-facing endpoints where D11 should scope data per-user |
| **Impersonate** | `accountability: { user: userId, admin: false }` | YES — target user's policies | Acting on behalf of a specific user from system context |

**Decision rule:**
- Does a human trigger this? → **Pass-through** (`req.accountability`)
- Does the system trigger this (webhook, cron)? → **Service user** (`{ admin: true }`)
- Need to act as a specific user without their session? → **Impersonate**

```typescript
// ✅ Webhook handler — no user session, use admin
const itemsService = new ItemsService('order', {
  schema, accountability: { admin: true }
});

// ✅ User-facing API — let D11 policies filter results
router.get('/my-data', async (req, res) => {
  const itemsService = new ItemsService('order', {
    schema, accountability: req.accountability  // user's policies apply
  });
  const items = await itemsService.readByQuery({ limit: 100 });
  // User only sees orders their policy allows
});

// ❌ WRONG — admin in user-facing endpoint bypasses RBAC
router.get('/my-data', async (req, res) => {
  const itemsService = new ItemsService('order', {
    schema, accountability: { admin: true }  // sees ALL orders!
  });
});
```

**Payment extension example:** `OrderStorage` uses `{ admin: true }` because webhooks from HASE have no user session. But if you add a `/payment-api/my-orders` endpoint for logged-in users, switch to `req.accountability` so D11 policies scope by org.

**Service class tip:** Pass accountability via constructor so the caller decides:
```typescript
class OrderStorage {
  constructor(services, schema, database, accountability = { admin: true }) {
    this.accountability = accountability;
  }
}

// Webhook context — admin
new OrderStorage(services, schema, database);

// User context — pass-through
new OrderStorage(services, schema, database, req.accountability);
```

---

**Service class pattern (recommended for complex extensions):**
```typescript
// src/services/my-storage.ts
export class MyStorage {
  private services: any;
  private schema: any;
  private database: any;

  constructor(services: any, schema: any, database: any) {
    this.services = services;
    this.schema = schema;
    this.database = database;
  }

  async createWithLines(data: any): Promise<number> {
    const { ItemsService } = this.services;

    // Multi-table writes use database.transaction() for atomicity
    return this.database.transaction(async (trx: any) => {
      const mainService = new ItemsService('main_table', {
        schema: this.schema,
        accountability: { admin: true },
        knex: trx
      });
      const lineService = new ItemsService('line_table', {
        schema: this.schema,
        accountability: { admin: true },
        knex: trx
      });

      const mainId = await mainService.createOne({ ...data });
      for (const line of data.lines) {
        await lineService.createOne({ main_id: mainId, ...line });
      }
      return mainId;
    });
  }
}
```

### Step 5: Build and Test

```bash
# Build extension
cd /Users/mac/projects/d11/extensions/directus-extension-{name}
npm run build

# Restart Directus to load extension
cd /Users/mac/projects/d11
npx directus start

# Test endpoint
curl http://localhost:8055/{endpoint-path}
```

### Step 6: Create Newman Tests

```bash
# Create test collection
cp tests/postman/template.postman_collection.json \
   tests/postman/{extension}-tests.postman_collection.json
```

Run with `api-testing` skill:
```bash
/api-testing  # Run Newman tests
```

### Step 7: Update Card and Commit

```bash
# Update Card with test results
# Commit extension + Card

git add /Users/mac/projects/d11/extensions/directus-extension-{name} \
        docs/cards/CARD-EXT-NNN-*.md

git commit -m "feat(extension): add {name} extension (CARD-EXT-NNN)

- Endpoints: /feature GET, POST
- Business logic: module-a, module-b
- Tests: Newman collection added

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Environment Variables (CRITICAL — CARD-PAY-020)

### `context.env` vs `process.env`

**Directus extensions MUST use `context.env`** to read `.env` vars. `process.env` does NOT include `.env` file values.

**Why:** Directus loads `.env` into its own env store (`@directus/env` → `useEnv()` → cached `createEnv()`), exposed to extensions via `context.env`. `process.env` only has shell environment variables (PATH, HOME, etc.), not your `.env` file contents.

```typescript
// ✅ CORRECT — reads from Directus env store
const apiKey = context.env['MY_API_KEY'];

// ❌ WRONG — .env values are NOT in process.env
const apiKey = process.env['MY_API_KEY']; // undefined!

// ❌ WRONG — hardcoded fallback masks the bug
const url = process.env['PUBLIC_URL'] || 'https://example.com'; // always uses fallback
```

### No Hardcoded Fallbacks

Never embed secrets, URLs, or API keys as fallback values. If the env var is required, **throw**. If optional, **warn**.

```typescript
// ✅ Required var — throw if missing
const publicUrl = context.env['PUBLIC_URL'];
if (!publicUrl) {
  throw new Error('PUBLIC_URL not configured. Set it in D11 .env');
}

// ✅ Optional var — warn if missing
const webhookSecret = context.env['WC_WEBHOOK_SECRET'];
if (!webhookSecret) {
  context.logger.warn('[Extension] WC_WEBHOOK_SECRET not set — webhooks will be unsigned');
}

// ❌ NEVER do this — hides configuration bugs
const url = context.env['PUBLIC_URL'] || 'https://dev-server.example.com';
```

### Passing Env Vars to Service Classes

Don't let service classes access `context.env` directly. Pass specific values via constructor.

```typescript
// index.ts — resolve env vars once, pass to constructors
const env = context.env;
const provider = new MyProvider(env['API_KEY'], env['API_SECRET']);
const notifier = new MyNotifier(context.logger, env);  // or pass full env if many vars needed
```

### Env Var Restart Behavior

- `EXTENSIONS_AUTO_RELOAD=true` reloads **code** on file change, NOT env vars
- **Must restart D11 process** for `.env` changes to take effect (kill + restart)
- Directus caches env at startup — no hot reload for env vars

### Document All Env Vars in Card

Every extension card should include a complete env var inventory table:

```markdown
| Env Var | Used By | Required? | Purpose |
|---------|---------|-----------|---------|
| `MY_API_KEY` | index.ts → MyProvider | Yes | API authentication |
| `MY_SECRET` | MyNotifier (via env) | For webhooks | Webhook signing |
```

Add audit trail: `Verified by grep -rn "env\[" src/ — Last audit: YYYY-MM-DD`

## Common Patterns

### Pattern 0: Webhook State Machine (CARD-PAY-021)

Payment gateways (HASE, Stripe, etc.) send **multiple callbacks per transaction**. Your handler must:

1. **Classify before processing** — detect callback family from payload shape:
```typescript
function classifyEvent(payload: any): string {
    if (payload.threeDSReferenceId) return '3ds_status';     // Log only, no order update
    if (payload.transactionAmount)  return 'point_redemption'; // Different schema
    switch (payload.responseCode) {
        case '00': return 'payment_success';
        case '02': return 'payment_pending';  // QR generated, skip update
        default:   return 'payment_failed';
    }
}
```

2. **State guard in storage layer** — terminal statuses cannot be overwritten:
```typescript
private static TERMINAL_STATUSES = ['paid', 'refund'];

async updateOrderStatus(txnId, newStatus, data) {
    const current = await ordersService.readOne(orderId, { fields: ['status'] });
    if (TERMINAL_STATUSES.includes(current.status)) {
        // Still log webhook data for audit trail, but DON'T change status
        return { updated: false, reason: `Already "${current.status}"` };
    }
    // ... proceed with update
}
```

3. **Log ALL webhooks before processing** — store in `webhook_events` for traceability:
```typescript
const eventId = await eventsService.createOne({
    idempotency_key: `provider_${txnId}_${responseCode}_${Date.now()}`,
    event_type: classifyEvent(payload),  // Accurate label, not just success/failed
    order_id: txnId,
    payload: payload,
    status: 'received',
});
// Later: update to 'processed' or 'failed'
```

4. **Only notify on actual status changes** — skip notification when state guard blocks:
```typescript
if (updateResult.updated) {
    await notifier.notifyAll(data, { webhookUrl, orderId });
}
```

**Key HASE-specific rules:**
- `responseCode: '02'` = pending (QR/wallet awaiting scan) — log, don't update
- `responseCode: '01'` = failed — BUT a later `'00'` may still arrive (don't finalize failure)
- `threeDSReferenceId` in payload = 3DS auth callback, NOT payment result — log only
- Same `transactionId` can produce multiple callbacks if customer retries payment method

### Pattern 1: OAuth Provider

See [backend-extensions.md](references/backend-extensions.md) for complete OAuth implementation pattern.

Key components:
- `/login/{provider}` - Initiate OAuth flow
- `/login/{provider}/callback` - Handle callback
- Organization detection
- User creation/linking
- Policy assignment

### Pattern 2: Dual-Token Response

For OAuth extensions, return both app and Directus tokens:

```typescript
return res.json({
  data: {
    access_token: directusToken,     // Primary - Directus API compatible
    app_token: appToken,             // Secondary - app-specific
    // ...
  }
});
```

### Pattern 3: System Table Access

Use Directus services for system tables:

```typescript
const { UsersService, RolesService } = services;

const usersService = new UsersService({
  schema: req.schema,
  knex: database,
});

const user = await usersService.readOne(userId);
```

## AI Instructions

### IMPORTANT Rules

1. **Create Card FIRST** - Document before implementing
2. **Schema before extension** - Run migrations for new tables first
3. **One module per file** - Keep business logic modular
4. **Use Directus services for system tables** - Don't use raw SQL for directus_* tables
5. **Test with Newman** - Verify endpoints before frontend integration

### Extension Location

Extensions live in the Directus 11 project, NOT in this repo:
- **Extension code**: `/Users/mac/projects/d11/extensions/directus-extension-{name}/`
- **Documentation**: `/Users/mac/Downloads/saas-sales-order/docs/cards/CARD-EXT-*.md`
- **Tests**: `/Users/mac/Downloads/saas-sales-order/tests/postman/{name}-tests.json`

## References

| File | Purpose |
|------|---------|
| `references/backend-extensions.md` | Detailed patterns from OAuth implementation |
| `../directus-schema/references/directus-versions.md` | Dual environment guide |
| `../api-testing/SKILL.md` | Newman testing workflow |

## Related Documentation

- **PRD**: [PRD-SOCIAL-OAUTH.md](../../docs/prds/PRD-SOCIAL-OAUTH.md) - OAuth extension example
- **Cards**: `docs/cards/CARD-OAUTH-*` - Implementation Cards
- **Architecture**: [D11-MULTI-TENANT-RBAC.md](../../docs/architecture/D11-MULTI-TENANT-RBAC.md)

## Checklist

Before completing extension development:

- [ ] Card created documenting extension purpose
- [ ] Schema migrations run (if new tables needed)
- [ ] Extension directory structure follows pattern
- [ ] Endpoints implemented with proper error handling
- [ ] All env vars use `context.env` — zero `process.env` usage
- [ ] No hardcoded fallback secrets or URLs in code
- [ ] Card includes complete env var inventory table
- [ ] Business logic modularized (one function per file)
- [ ] Custom tables use `ItemsService` (not raw Knex) for single-table ops
- [ ] Extension builds without errors
- [ ] Newman tests created and passing
- [ ] Card updated with test results
- [ ] Extension committed to d11 repo
- [ ] Documentation committed to this repo

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-02-15 | Claude | Initial skill created from backend-extensions.md reference |
| 2026-03-09 | Claude | Added Environment Variables section (context.env vs process.env, no hardcoded fallbacks), ItemsService pattern, service class pattern, env var checklist items — learned from CARD-PAY-020 |
| 2026-03-09 | Claude | Added Pattern 0: Webhook State Machine — state guard, event classification, log-before-process, conditional notification — learned from CARD-PAY-021 |
| 2026-03-09 | Claude | Added Accountability Modes section — admin vs pass-through vs impersonate, decision rule, service class tip — learned from CARD-PAY-020 |
