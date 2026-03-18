---
paths:
  - "lib/auth-*.ts"
  - "app/login/**"
  - "app/auth/**"
  - "components/org-login-modal.tsx"
  - "lib/d11/sync-active-orq.ts"
---

# Auth Rules

## Three Mutually Exclusive Modes

| Mode | Env Flag | Login Endpoint | Org Source |
|------|----------|----------------|------------|
| **D11 Policy** (current) | `AUTH_POLICY=true` | `POST /login/email` | `user.policies` → orgs |
| **D9 Centralized** (default) | Neither flag set | `POST /shared/auth/email/login` | `response.organization` |
| **D9 Direct** | `DIRECTUS_ONLY=true` | `POST /auth/login` | Hardcoded org list |

**Code path:** `lib/auth-multi-provider.ts:93` — `usePolicyAuth` / `isNewEmailMechanism`

## active_orq is D11-Only

`syncActiveOrq()` in `lib/d11/sync-active-orq.ts` self-guards with:
```typescript
if (process.env.NEXT_PUBLIC_AUTH_POLICY !== 'true') return
```
Safe to call from any mode — no-op in D9 modes.

## Org State (Canonical Store)

**Write:** `useOrgStore.getState().setOrganization(code, metadata?)` — handles localStorage shim + syncActiveOrq + organizationChanged event.
**Read:** `getSelectedOrq()` (number), `getOrgMetadata()` (full object), `getOrgKey()` (OrganizationKey).

Never write `localStorage.setItem('current_organization', ...)` directly. The store's shim handles backward-compat writes.

**Key constraint:** Use `org.code` (stable business ID, same across envs), NOT `org.id` (auto-increment PK, differs per env).

| Method | Returns | Use for |
|--------|---------|---------|
| `getSelectedOrq()` | `number` (e.g., 63) | D11 API filtering, RBAC scoping |
| `getOrgMetadata()` | `Organization \| null` | Dashboard display (name, url, colors) |
| `getOrgKey()` | `OrganizationKey` (e.g., 'orq-ww') | ORGANIZATIONS config lookup |
| `getApiUrl()` | `string \| null` | Org-specific API URL |

**D9 Direct mode:** API returns no org object → `setOrganization(code)` with null metadata → `getOrgKey()` resolves via `ORGANIZATIONS_FROM_API` → callers fall back to hardcoded config.

## Reference

Full auth reference (env switching, localStorage, URL resolution, org map): `docs/stories/US-WW-ENV-001.md`
