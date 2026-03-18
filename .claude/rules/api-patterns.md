---
paths:
  - "app/api/**"
  - "lib/d11/**"
  - "lib/api*.ts"
  - "lib/authenticated-fetch.ts"
---

# API Patterns

## Collection-Driven (Rule 6)

Visit `/collection/[name]` first, click "Copy Collection Data", use JSON schema. 70% faster.

## Two Directus Instances

| Instance | Env Var | Purpose | Client |
|----------|---------|---------|--------|
| **D9** | `NEXT_PUBLIC_API_ORQ` | Main SaaS | `getApiOrqUrl()` |
| **D11** | `DIRECTUS_PRD_ENDPOINT` | Docs sync | `lib/sync/directus-client.ts` |

## Field Expansion

```typescript
?fields=*                         // → { "company": [10, 11] }
?fields=*,company.company_id.*    // → { "company": [{ "company_id": {...} }] }
```

Match existing patterns in codebase.

## External APIs

```
Client → API Route (server) → External API
```
Use server-side env vars (no `NEXT_PUBLIC_` prefix) for API keys.

## Preventing Infinite Re-Renders

Depend on **primitive values** in useEffect, not functions. Use a `loadingData` boolean guard to prevent duplicate calls. Function deps (e.g. `[refresh]`) cause infinite loops.
