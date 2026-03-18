# Card Template v2.0

**Based on**: Cross-repo synthesis (D11, Express, WW) + PRD v2.0 structure
**Date**: 2026-01-26
**Status**: Official template

---

## File Location

```
docs/cards/CARD-{ID}.md

Examples:
  docs/cards/CARD-AUTH-001.md
  docs/cards/CARD-OAUTH-003.md
  docs/cards/CARD-ANGLISS-WABA-001.md
```

### ID & Filename Rules

#### Recommended ID Patterns (Descriptive & Unique)
- **Project-specific**: `CARD-D11-SYNC-001`, `CARD-ANGLISS-WABA-001`
- **Feature-specific**: `CARD-OAUTH-LOGIN-001`, `CARD-RBAC-ADMIN-001`
- **Team-specific**: `CARD-DEVOPS-001`, `CARD-FRONTEND-NAV-001`
- **Avoid simple IDs**: `CARD-001` (too generic, collision-prone)

#### Format Rules
1. **ID Format**: `CARD-{CONTEXT}-{NUMBER}` (UPPERCASE, descriptive)
2. **Filename**: `{ID}.md` — filename = ID, no slug suffix
   - ✅ File: `CARD-AUTH-001.md` + ID: `CARD-AUTH-001`
   - ✅ File: `CARD-OAUTH-003.md` + ID: `CARD-OAUTH-003`
   - ❌ File: `CARD-AUTH-001-oauth-login.md` (old convention — no slug suffix)
3. **All IDs and references MUST be UPPERCASE** — enforced by prd-validator
   - ✅ `story: "US-AICHAT-002"`, `depends_on: ["CARD-AICHAT-016"]`
   - ❌ `story: "us-aichat-002"`, `depends_on: ["card-aichat-016"]`
   - Why: Code uses exact matching. Mixed case = broken relationships.
   - Defense: Code also uses `.toUpperCase()` comparisons as fallback, but don't rely on it.

#### Code Conventions for ID Handling
When writing code that compares IDs (card, story, PRD):
1. **Always case-insensitive**: Use `.toUpperCase()` for all ID comparisons — frontmatter data is inconsistent
2. **Never mutate inputs**: If enriching a docContext or frontmatter object, work on a local copy
3. **Normalize PRD IDs**: Use `normalizePrdId()` — safety net for legacy references (all new PRD IDs use `PRD-` prefix)

```typescript
// ✅ Good — case-insensitive
allCards.filter(c => c.frontmatter.id.toUpperCase() === targetId.toUpperCase())

// ❌ Bad — case-sensitive, breaks when data is inconsistent
allCards.filter(c => c.frontmatter.id === targetId)
```

---

## YAML Frontmatter (v2.0)

```yaml
---
# ============ SECTION 1: IDENTIFICATION ============
id: CARD-AUTH-001                           # REQUIRED: Descriptive ID (e.g., CARD-D11-SYNC-001, CARD-OAUTH-003)
slug: feature-name                          # Unique identifier (kebab-case)
title: Feature Name                         # Human-readable title
purpose: "One-line description"             # Optional, what this card does

# ============ SECTION 2: OWNERSHIP ============
team: "Frontend"                            # Frontend | Backend | A-Commerce | Infrastructure
author: "your-name"                         # RECOMMENDED: Who created/owns this card

# ============ SECTION 3: LIFECYCLE ============
status: "draft"                             # draft | pending | in-progress | done | blocked | ready
readiness: "design"                         # design | ready | implementation | testing (Express pattern)
created_date: "2026-01-26"
last_updated: "2026-01-26"
completed_date: null                        # Fill when status = done

# ============ SECTION 4: RELATIONSHIPS ============
story: "US-001"                             # Parent story ID — must match story's YAML id field exactly
business_requirement: "PRD-AI-CHAT"          # Parent PRD — must match PRD's YAML id field exactly
                                            #   All PRD IDs use PRD- prefix + UPPERCASE
                                            #   ✅ "PRD-AI-CHAT", "PRD-ORDER-MANAGEMENT", "PRD-001"
                                            #   ❌ "ai-chat" (old bare lowercase format — deprecated)
                                            #   Check: Directus prd_documents.code = the correct id
depends_on: []                              # Array of card slugs this depends on
triggers: []                                # Array of card slugs this triggers (WW pattern)
enhanced_by: []                             # Array of card slugs that enhance this (WW pattern)
data_dependencies: []                       # Array of collections/tables needed

# ============ SECTION 5: API & INTEGRATION ============
oas_paths: ["/api/feature"]                 # OpenAPI paths (Express pattern)
api_contract: null                          # YAML OpenAPI spec (see below)
integration_points:
  endpoints: ["/api/feature"]               # API endpoints
  data_stores: ["collection_name"]          # Directus collections or tables
  services: ["external-api"]                # External services

# ============ SECTION 6: DATABASE & MIGRATIONS ============
migrations: ["migrations/001_feature.sql"]  # Migration file paths (Express pattern)
data_model: null                            # SQL schema (see below)

# ============ SECTION 7: IMPLEMENTATION ============
implementation_files: []                    # Files to create/modify
error_codes: []                             # Error codes defined (see below)
estimated_effort: "4 hours"                 # Time estimate

# ============ SECTION 8: TESTING ============
testing_requirements: null                  # Testing checklist (markdown)
newman_report: null                         # Path to Postman collection JSON (legacy, use testCoverage instead)
testCoverage:                               # RECOMMENDED: Powers the test tab UI on /docs/cards/CARD-XXX
  newmanCollectionPath: "tests/postman/my-test.postman_collection.json"  # Path to Postman collection (not results)
  # IMPORTANT: Collection MUST use folder structure (item[].item[]) for "Test Execution Flow" to render.
  # Flat items are skipped by extractTestDetailsFromCollection(). Group tests into phase folders.
  # Also create docs/test-coverage/card-{id-slug}-test-report.md for "Full Test Report" tab.
  summary:
    totalRequests: 0
    totalAssertions: 0
    passed: 0
    failed: 0
    passRate: 0
    verdict: "not-run"                      # "passing" | "failing" | "not-run"
  lastTestRun: null                         # Date of last test run (e.g., "2026-03-09")

# ============ SECTION 9: GIT & CI/CD ============
branch: "feature/feature-name"              # Git branch (Express pattern)
pr: null                                    # Pull request URL (Express pattern)

# ============ SECTION 10: MULTI-PROJECT ============
project: "ww"                               # REQUIRED — ww | rk | vec | lr | lms | foundation | angliss | blue | ota | synque | d11 | capy | sl | expo | ks | rs

# ============ SECTION 11: METADATA ============
file_path: docs/cards/CARD-AUTH-001.md      # Git file path (filename = ID.md)
changelog:                                  # Versioned changelog (Express pattern)
  - version: "1.0.0"
    date: "2026-01-26"
    summary: "Initial implementation"
    breaking: false
    delta:
      added: ["Feature A"]
      modified: []
      removed: []
---
```

---

## API Contract Example (OpenAPI 3.0)

**When to include**: Card implements or modifies API endpoints

```yaml
api_contract: |
  paths:
    /api/feature:
      get:
        summary: Get feature items
        parameters:
          - name: orq
            in: query
            required: true
            schema:
              type: integer
        responses:
          '200':
            description: Success
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    data:
                      type: array
                      items:
                        $ref: '#/components/schemas/Feature'
      post:
        summary: Create feature item
        requestBody:
          required: true
          content:
            application/json:
              schema:
                type: object
                required: [name, type]
                properties:
                  name:
                    type: string
                  type:
                    type: string
        responses:
          '201':
            description: Created

  components:
    schemas:
      Feature:
        type: object
        properties:
          id:
            type: integer
          name:
            type: string
          created_at:
            type: string
            format: date-time
```

---

## Data Model Example (SQL)

**When to include**: Card creates or modifies database schema

```yaml
data_model: |
  CREATE TABLE feature_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    orq INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_orq (orq),
    INDEX idx_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Error Codes Example

```yaml
error_codes:
  - code: "FEATURE_NOT_FOUND"
    description: "Feature item not found"
  - code: "FEATURE_DUPLICATE"
    description: "Feature with same name already exists"
  - code: "FEATURE_INVALID_TYPE"
    description: "Invalid feature type provided"
```

---

## Markdown Content Template

```markdown
# {Card Title}

## Purpose

{What this card accomplishes - 2-3 sentences}

---

## Responsibilities
**Team:** {Team name}
**Domain:** {Domain area}

---

## Prerequisites

- [ ] Prerequisite 1
- [ ] Prerequisite 2

---

## Business Rules & Invariants

### Rule 1: {Rule Name}
- **Condition:** {When this applies}
- **Validation:** {How to validate}
- **Error Response:** {What error to return}

---

## Implementation Notes

### Module Structure
```
app/api/{feature}/
├── route.ts                    # API endpoint
└── [id]/route.ts               # Dynamic route

components/{feature}/
├── {feature}-list.tsx          # List component
├── {feature}-dialog.tsx        # Dialog component
└── {feature}-form.tsx          # Form component

lib/
├── api-{feature}.ts            # API client
└── hooks/use-{feature}.ts      # React hooks
```

### Mock Data Requirements
```typescript
// Example mock data structure
```

---

## Acceptance Criteria

### Normal Flow
#### AC-1: {Criterion Name}
- **Given** {context}
- **When** {action}
- **Then** {expected result}
- **And** {additional result}

### Error Handling
#### AC-2: {Error Case}
- **Given** {error context}
- **When** {error action}
- **Then** {error handling}

---

## Testing

### Manual Test (curl)
```bash
# Example API test
curl -X POST http://localhost:3000/api/feature \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "type": "example"}'
```

### Newman E2E Test

**Collection structure requirement**: Tests MUST be organized into folders (phases).
The test tab UI only renders "Test Execution Flow" for collections with nested `item[].item[]` structure.
Also create `docs/test-coverage/card-{id-slug}-test-report.md` for the "Full Test Report" section.

```json
{
  "item": [
    {
      "name": "Phase 1: Happy Path",
      "item": [
        { "name": "Test 1", "request": { "method": "POST", "url": "{{baseUrl}}/api/feature" } }
      ]
    }
  ]
}
```

---

## Observability

### Logging Events
```typescript
logger.info('feature.created', { id, name });
logger.error('feature.error', { error: error.message });
```

### Metrics to Track
- API response time
- Error rate
- Usage frequency

---

## Definition of Done Checklist

- [ ] Code matches card specification exactly
- [ ] Uses domain.ts types (no ad-hoc types)
- [ ] Error responses follow catalog format
- [ ] State transitions validated
- [ ] Logging with proper event names
- [ ] TypeScript compiles without errors
- [ ] API endpoints respond correctly
- [ ] Tests passing (unit, integration, E2E)
- [ ] Card status updated to "Done"
- [ ] Branch/PR info in frontmatter

---

## Related Documentation

- **Story**: [US-XXX](../stories/US-XXX.md)
- **PRD**: [PRD-XXX](../prds/PRD-XXX.md)
- **Related Cards**: [CARD-YYY](./CARD-YYY.md)

---

## Notes

{Additional context, gotchas, future improvements}

---

**Created**: {Date}
**Author**: {Name}
**Repository**: saas-sales-order
**Branch**: {branch-name}
```

---

## Field Comparison: v1.0 vs v2.0

| Field | v1.0 Template | v2.0 Template | Source |
|-------|---------------|---------------|--------|
| `id` | ✅ | ✅ (required) | All |
| `slug` | ❌ | ✅ | Express |
| `title` | ✅ | ✅ | All |
| `purpose` | ❌ | ✅ | New |
| `team` | ✅ (optional) | ✅ (required) | All |
| `author` | ❌ | ✅ (recommended) | New |
| `status` | ✅ | ✅ | All |
| `readiness` | ❌ | ✅ | Express |
| `created_date` | ❌ | ✅ | Express |
| `completed_date` | ❌ | ✅ | WW |
| `story` | ✅ | ✅ | All |
| `business_requirement` | ❌ | ✅ | New (for cards without stories) |
| `depends_on` | ✅ | ✅ | All |
| `triggers` | ❌ | ✅ | WW |
| `enhanced_by` | ❌ | ✅ | WW |
| `data_dependencies` | ❌ | ✅ | WW |
| `oas_paths` | ❌ | ✅ | Express |
| `api_contract` | ❌ | ✅ | WW |
| `integration_points` | ✅ | ✅ (enhanced) | WW |
| `migrations` | ❌ | ✅ | Express |
| `data_model` | ❌ | ✅ | Express |
| `implementation_files` | ❌ | ✅ | New |
| `error_codes` | ❌ | ✅ | WW |
| `estimated_effort` | ❌ | ✅ | New |
| `testing_requirements` | ❌ | ✅ | WW |
| `newman_report` | ✅ | ✅ (legacy) | Express |
| `testCoverage` | ❌ | ✅ (recommended) | WW — powers test tab UI |
| `branch` | ✅ | ✅ | Express |
| `pr` | ✅ | ✅ | Express |
| `project` | ❌ | ✅ | Multi-project |
| `file_path` | ❌ | ✅ | Metadata |
| `changelog` | ❌ | ✅ (versioned) | Express |

---

## When to Use Each Field

### Always Required
- `id`, `title`, `status` (minimum for sync to work)
- `project` (required for per-project reports — 25% of cards were invisible without it)

### Strongly Recommended
- `team` (identify ownership)
- `author` (track who created/owns the card)
- `created_date` (tracking when card was created)

### Usually Required
- `story` OR `business_requirement` (link to parent)
- `slug` (kebab-case identifier)
- `last_updated` (tracking changes)

### Backend Cards Should Have
- `oas_paths`, `api_contract`, `migrations`, `data_model`
- `error_codes`, `testCoverage` (preferred) or `newman_report` (legacy)

### Frontend Cards Should Have
- `integration_points`, `implementation_files`
- `testing_requirements`

### Infrastructure/Pattern Cards Should Have
- `business_requirement` (link to parent PRD)
- `changelog` (versioned)
- Comprehensive documentation in markdown body

---

**Template Version**: 2.0.0
**Created**: 2026-01-26
**Based On**: CARD-DIRECTUS-COLLECTION-CREATION-PATTERN.md
**Status**: Official
