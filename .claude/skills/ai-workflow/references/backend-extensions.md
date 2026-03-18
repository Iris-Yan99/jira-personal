# Backend Extension Development (Directus 11)

**Last Updated**: 2026-02-01
**Reference Implementation**: `/Users/mac/projects/d11/extensions/directus-extension-oauth/`
**Related PRD**: [PRD-SOCIAL-OAUTH](../../../docs/prds/PRD-SOCIAL-OAUTH.md)

---

## Pattern: Modular Extension Architecture

Based on OAuth implementation experience, use this proven pattern:

```
/Users/mac/projects/d11/extensions/directus-extension-{name}/
├── src/
│   ├── endpoints/                    ← API routes
│   │   ├── google-login.ts          ← GET /login/google (initiate)
│   │   └── google-callback.ts       ← POST /login/google (callback)
│   ├── shared/                       ← Business logic modules
│   │   ├── organization-detector.ts  ← CARD-OAUTH-003
│   │   ├── user-manager.ts          ← CARD-OAUTH-004
│   │   ├── policy-manager.ts        ← CARD-OAUTH-005
│   │   └── account-linker.ts        ← CARD-OAUTH-006
│   └── index.ts                      ← Extension entry point
├── package.json
└── README.md
```

---

## Extension Development Flow

### 1. Create Card First (Schema + Implementation)

**Schema Cards** (CARD-SCHEMA-*): Document database tables needed
**Implementation Cards** (CARD-OAUTH-*): Document business logic modules

```markdown
# CARD-OAUTH-004: User Manager Implementation

**File**: `/Users/mac/projects/d11/extensions/directus-extension-oauth/src/shared/user-manager.ts`

## Objective
Create/update OAuth users with login tracking

## Implementation Flow
1. Check for existing user
2. Create directus_users + users_multi
3. Update login tracking (last_login, login_count)

## Integration Points
- Called by: google-callback.ts endpoint
- Calls: organization-detector.ts, policy-manager.ts
```

### 2. Run Migrations for Schema

```bash
# Create collections needed by extension
npx tsx scripts/collections/create-users-multi-collection.ts
npx tsx scripts/collections/create-organizations-collection.ts

# Take snapshots
cd /Users/mac/projects/d11
npx directus schema snapshot /path/to/snapshots/004-users-multi-after.yaml
```

### 3. Implement Extension Modules

**Modular Pattern** (one file per responsibility):

```typescript
// src/shared/user-manager.ts
export async function findOrCreateOAuthUser(
  profile: OAuthProfile,
  organization: Organization,
  database: Knex
): Promise<DirectusUser> {
  // Business logic here
}
```

**Key Rules**:
- One function per file for clarity
- Export async functions (Directus uses async everywhere)
- Pass `database: Knex` as parameter (Directus services provide this)
- Use Directus services for system tables: `new services.UsersService({ schema, knex })`
- Direct SQL for custom tables: `database('users_multi').insert(...)`

### 4. Create Endpoints

```typescript
// src/endpoints/google-login.ts
export default defineEndpoint({
  id: 'google-login',
  handler: async (router, { services, database }) => {
    // GET /login/google - Initiate OAuth
    router.get('/', async (req, res) => {
      const authUrl = generateGoogleAuthUrl();
      res.json({ authUrl });
    });

    // POST /login/google - Handle callback
    router.post('/', async (req, res) => {
      const { code, state } = req.body;

      // Call business logic modules
      const organization = await detectOrganization(profile, database);
      const user = await findOrCreateOAuthUser(profile, organization, database);
      await assignOrganizationPolicy(user.id, organization, database);

      res.json({ user, organization });
    });
  }
});
```

### 5. Document in PRD

**PRD Structure**:
- **Implementation**: Backend extension location, modules, endpoints
- **Architecture**: Sequence diagram, data flow
- **Test Coverage**: Links to Cards with test results
- **Environment Setup**: Required environment variables

Example: [PRD-SOCIAL-OAUTH.md](../../../docs/prds/PRD-SOCIAL-OAUTH.md)

### 6. Create Implementation Cards

One Card per module documenting:
- **Objective**: What the module does
- **Implementation Flow**: Step-by-step algorithm
- **Code Examples**: Key TypeScript snippets
- **Integration Points**: What calls it, what it calls
- **Testing Results**: Verification data

Example Cards:
- [CARD-OAUTH-003](../../../docs/cards/CARD-OAUTH-003-organization-detector.md) - Organization detection logic
- [CARD-OAUTH-004](../../../docs/cards/CARD-OAUTH-004-user-manager.md) - User creation and login tracking
- [CARD-OAUTH-005](../../../docs/cards/CARD-OAUTH-005-policy-manager.md) - Policy assignment
- [CARD-OAUTH-006](../../../docs/cards/CARD-OAUTH-006-account-linker.md) - Multi-provider account linking

---

## Testing Backend Extensions

### Newman API Tests (CARD-OAUTH-001)

```javascript
// tests/postman/oauth-tests.postman_collection.json
{
  "name": "OAuth Google Login",
  "request": {
    "method": "POST",
    "url": "{{baseUrl}}/login/google",
    "body": {
      "code": "{{authCode}}",
      "state": "{{oauthState}}"
    }
  },
  "tests": [
    "pm.test('Returns access token', () => {",
    "  pm.response.to.have.status(200);",
    "  pm.expect(response.data.access_token).to.exist;",
    "});"
  ]
}
```

Run tests:
```bash
npx newman run tests/postman/oauth-tests.postman_collection.json \
  --environment tests/postman/d11-env.json
```

---

## Environment Variables Pattern

### Extension .env (`/Users/mac/projects/d11/.env`)

```env
# OAuth Provider Credentials
OAUTH_GOOGLE_CLIENT_ID=your-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Directus Config
PUBLIC_URL=http://localhost:8055
```

### Frontend .env.local

```env
# Point to Directus 11 for OAuth endpoints
NEXT_PUBLIC_AUTH_SERVER_URL=http://localhost:8055
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Critical Compatibility Note**:
- `NEXT_PUBLIC_AUTH_SERVER_URL` is used by **all** auth methods (SMS, Email, OAuth)
- If pointing to Directus 9: SMS/Email work ✅, OAuth fails ❌ (no `/login/google` endpoint)
- If pointing to Directus 11: OAuth works ✅, SMS/Email may work differently
- See [PRD-AUTH.md](../../../docs/prds/PRD-AUTH.md) for Directus 9 auth setup

---

## Key Learnings from OAuth Implementation

1. **Separate Schema from Logic**: Create collections first (migrations), then implement business logic (extension)
2. **One Card per Module**: Don't put all implementation in PRD - use Cards for concrete logic
3. **Test Backend First**: Newman tests verify extension before frontend integration
4. **Document Integration Points**: Each Card notes what calls it and what it calls
5. **Use Directus Services**: For system tables like `directus_users`, use `UsersService` not raw SQL
6. **Modular Architecture**: One file per responsibility (organization-detector, user-manager, etc.)
7. **Environment Variable Sharing**: Frontend and backend share auth endpoint via `NEXT_PUBLIC_AUTH_SERVER_URL`

---

## Related Files

- [PRD-SOCIAL-OAUTH](../../../docs/prds/PRD-SOCIAL-OAUTH.md) - OAuth extension architecture and requirements
- [PRD-AUTH](../../../docs/prds/PRD-AUTH.md) - Directus 9 auth baseline (SMS/Email without OAuth)
- [CARD-OAUTH-001 through 006](../../../docs/cards/) - Implementation Cards
- [directus-relations.md](./directus-relations.md) - Relation creation patterns
- [api-testing.md](./api-testing.md) - Newman testing patterns
