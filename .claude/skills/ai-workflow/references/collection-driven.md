# Collection-Driven Development

## Overview

Collection-Driven Development is the **recommended first step** for any feature that interacts with existing database collections. It uses the Collection Viewer tool to get instant schema discovery.

## Why Collection-Driven?

| Without Collection Viewer | With Collection Viewer |
|---------------------------|------------------------|
| Manually test endpoints with Postman/curl | Navigate to `/collection/[name]` |
| Guess field structures from docs | Click "Copy Collection Data" |
| Multiple rounds of trial and error | Get complete JSON schema |
| 20+ exchanges with AI to get working code | Get working code immediately |

**Result: 70% faster API integration**

## Process

### Step 1: Navigate to Collection Viewer

```
/collection/{collection-name}
```

Examples:
- `/collection/order`
- `/collection/tags`
- `/collection/user_groups`

### Step 2: Click "Copy Collection Data"

This copies a complete JSON structure to your clipboard:

```json
{
  "collection": "name",
  "fieldInspector": {
    "fieldDetails": [...],        // All fields with types, requirements
    "requiredFields": [...],      // Fields needed for POST
    "relationalFields": [...]     // M2O, O2M, M2M relationships
  },
  "apiIntegration": {
    "mainCollection": {
      "POST": {...},              // Exact API patterns
      "requiredFields": [...],    // Mandatory fields
      "excludeFromPost": [...]    // Auto-increment, computed fields
    },
    "relationships": {...}        // Junction table patterns for M2M
  },
  "sampleData": [...]             // Real data examples
}
```

### Step 3: Use in Development

Share this JSON with Claude or use it directly:

```
I need to implement [feature] for the [collection] collection.

Here's the collection schema:
[paste JSON]

Please implement [specific requirement].
```

## Key Schema Elements

### Field Details

```json
{
  "field": "company",
  "type": "alias",
  "schema": null,
  "meta": {
    "interface": "list-m2m",
    "special": ["m2m"]
  }
}
```

### Required Fields

Fields that must be provided for POST/PATCH:

```json
{
  "requiredFields": ["name", "type", "orq"]
}
```

### Relational Fields

Understanding relationships:

| Type | Example | Pattern |
|------|---------|---------|
| M2O (Many-to-One) | `order.customer` | `fields=*,customer.*` |
| O2M (One-to-Many) | `customer.orders` | `fields=*,orders.*` |
| M2M (Many-to-Many) | `tags.company` | Junction table: `tags_company` |

## API Field Expansion Patterns

**Critical**: Different field parameter values return different data structures.

### Pattern 1: Simple Fields (`fields=*`)

Returns M2M relationships as ID arrays:

```json
{
  "company": [10, 11, 12, 13]
}
```

### Pattern 2: Expanded Fields (`fields=*,company.company_id.*`)

Returns M2M relationships as nested objects:

```json
{
  "company": [
    { "company_id": { "id": 10, "name": "Company A", ... } },
    { "company_id": null },
    ...
  ]
}
```

**Rule**: Always check existing API calls in the codebase to match the field expansion pattern.

## M2M Relationship Patterns

For Many-to-Many relationships using junction tables:

### Create Relationship

```typescript
// Add company to group via junction table
POST /items/tags_company
{
  "tags_id": groupId,
  "company_id": companyId
}
```

### Delete Relationship

```typescript
// Remove company from group
DELETE /items/tags_company?filter[tags_id][_eq]=X&filter[company_id][_eq]=Y
```

### Fetch with M2M Expansion

```typescript
GET /items/tags?fields=*,company.company_id.*&filter[type][_eq]=customer_group
```

## Organization-Aware Queries

Always include organization filter:

```typescript
import { useOrgStore } from '@/stores/org-store'

function getCurrentOrq(): number {
  return useOrgStore.getState().getSelectedOrq()
}

// Use in API calls
const orqId = getCurrentOrq()
const url = `${apiUrl}/items/${collection}?filter[orq][_eq]=${orqId}`
```

## When to Use Collection-Driven

| Scenario | Use Collection-Driven? |
|----------|------------------------|
| Working with existing database | ✅ Yes, always |
| Creating new collection | ❌ No, design schema first |
| AI-assisted development | ✅ Yes, provides complete context |
| Bug fixing in existing feature | ✅ Yes, verify actual structure |
| Pure frontend changes | ⚠️ Maybe, if data structure matters |

## Common Pitfalls

### "No Data Found" Despite Valid API Response

**Cause**: Mismatch between expected and actual API response structure

**Solution**:
1. Use Collection Viewer to see actual structure
2. Check field expansion pattern in existing code
3. Update interfaces to match actual nested structure

### Wrong Field Expansion

```typescript
// ❌ Wrong: Assuming ID array
company: number[]

// ✅ Correct: Matching actual nested structure (after expansion)
company: Array<{ company_id: { id: number; name: string; ... } | null }>
```

## Directus PRD Collection (Optional Feature)

The project supports storing PRDs in Directus database instead of markdown files.

### Environment Configuration

Add to `.env.local` to enable:

```bash
# Enable Directus PRD collection creation
DIRECTUS_PRD_ENDPOINT=http://localhost:8055  # For localhost testing
# DIRECTUS_PRD_ENDPOINT=https://orq-dev.synque.ca  # For production

# Admin token for schema creation (generate in Directus Admin: Settings → Access Tokens)
# CRITICAL: Token MUST have "Administrator" role to create collections
DIRECTUS_ADMIN_TOKEN=your_admin_static_token_here
```

### Exercise Complete! ✅

The PRD collection creation exercise was successfully completed on **2026-01-21** using localhost:8055.

**What Was Created:**
- ✅ PRD collection with 20 fields total
- ✅ 14 custom fields (slug, title, description, etc.)
- ✅ 6 system fields (status, sort, user_created, etc.)
- ✅ Test PRD item (ID: 1, slug: "test-exercise")

**Scripts Created:**
- `scripts/create-prd-collection.ts` - Creates collection and custom fields
- `scripts/add-prd-system-fields.ts` - Adds system fields (required!)

**Key Lesson Learned:**
Directus does NOT auto-create all system fields when creating collections via API. You must add them separately using `add-prd-system-fields.ts`.

### When Enabled

- Scripts can create `prd`, `story`, `card` collections via Directus API
- Migration scripts populate Directus from markdown files
- Frontend can query `/items/prd` for documentation
- Multi-user editing with permissions enabled
- Version history tracking available

### When Disabled (Default)

- PRDs stored as markdown files in `docs/prds/*.md`
- YAML frontmatter is source of truth
- `prd-parser.ts` loads PRDs from filesystem
- Git-based version control

### Documentation

Complete schema design and migration guide:
- **Progress Doc**: `docs/PROGRESS-DIRECTUS-PRD.md`
- **Schema Design**: Full field definitions and API examples
- **Migration Scripts**: TypeScript collection creator and data migrator
- **Authentication**: How to generate Directus admin tokens

### Collection Schema

The `prd` collection includes:
- Standard Directus system fields (id, status, user_created, date_created, etc.)
- PRD metadata (slug, title, description, pattern, project)
- Content storage (content_markdown, key_learning)
- Verification tracking (code_exists, prd_accurate, tests_exist)
- Git sync fields (file_path, last_synced)

### Usage in Collection Viewer

Once created, you can use Collection Viewer to explore the PRD collection:
```
/collection/prd
```

Click "Copy Collection Data" to get the complete schema for AI-assisted development.

---

## Reference

- Collection Viewer: `/collection/[name]`
- CSV Import: `/import`
- Collection PRD: `docs/PRD-collection.md`
- Directus PRD Migration: `docs/PROGRESS-DIRECTUS-PRD.md`
