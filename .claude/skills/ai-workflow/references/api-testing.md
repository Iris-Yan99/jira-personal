# API Testing Reference

## Overview

This reference covers Newman/Postman API testing patterns for PRD acceptance criteria validation.

---

## Lessons Learned (PRD-002 Debugging - 2026-01-27)

### Critical Bug: Variable Scoping

**Problem**: Newman environment variables SHADOW collection variables.

```javascript
// ❌ WRONG: Only storing in collection variables
pm.collectionVariables.set('access_token', json.data.access_token);

// ✅ CORRECT: Store in BOTH scopes
pm.environment.set('access_token', json.data.access_token);
pm.collectionVariables.set('access_token', json.data.access_token);
```

**Why this matters**:
1. Newman checks **environment** variables first
2. Falls back to **collection** variables second
3. If environment file has empty `access_token`, empty string is used
4. Result: All authenticated requests get 403 Forbidden

### Test Isolation for CRUD Operations

**Problem**: Delete/Update tests fail when Create test fails first.

**Pattern**: Each destructive test should create its own test data.

```javascript
// Pre-request script for Delete test
const createUrl = pm.environment.get('baseUrl') + '/items/product';
pm.sendRequest({
    url: createUrl,
    method: 'POST',
    header: {
        'Authorization': 'Bearer ' + pm.environment.get('access_token'),
        'Content-Type': 'application/json'
    },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            name: 'DELETE-TEST-' + Date.now(),
            code: 'DEL-' + Date.now(),
            price: 1,
            status: 'draft',
            orq: parseInt(pm.environment.get('orq_id'))
        })
    }
}, function(err, res) {
    if (!err && res.code === 200) {
        const product = res.json().data;
        pm.environment.set('delete_product_id', product.id);
        console.log('Created product for deletion:', product.id);
    }
});
```

### Variable Validation Pattern

**Problem**: Tests fail silently when required variables are empty.

```javascript
// Pre-request script
const requiredVars = ['access_token', 'product_id'];
const missing = requiredVars.filter(v => !pm.environment.get(v));

if (missing.length > 0) {
    console.error('Missing required variables:', missing.join(', '));
    // Option 1: Skip request
    pm.execution.skipRequest();
    // Option 2: Throw error
    throw new Error('Missing: ' + missing.join(', '));
}
```

### Empty Filter Value Detection

**Problem**: `filter[field][_eq]=` with empty value causes 400 errors.

```
GET /items/product?filter[category][_eq]=&fields=*
→ 400 Bad Request (invalid filter syntax)
```

**Solution**: Validate before request.

```javascript
// Pre-request script
const categoryId = pm.environment.get('category_id');
if (!categoryId) {
    console.log('Skipping: category_id not set');
    pm.execution.skipRequest();
}
```

### Debugging Tips

1. **Check token storage** - Add console log in login test:
   ```javascript
   console.log('Token:', json.data.access_token.substring(0, 30) + '...');
   ```

2. **Verify token before request** - Pre-request script:
   ```javascript
   const token = pm.environment.get('access_token');
   console.log('Token available:', token ? 'YES' : 'NO');
   ```

3. **Compare manual vs Newman** - If Newman fails but curl works:
   ```bash
   TOKEN=$(curl -s 'URL/auth/login' -d '{"email":"...","password":"..."}' | \
     python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
   curl -s 'URL/items/collection' -H "Authorization: Bearer $TOKEN"
   ```

---

## Testing Workflow

### When to Create Tests

| Trigger | Action |
|---------|--------|
| New PRD completed | Create AC mapping + Postman collection |
| New API endpoints | Add tests to existing collection |
| Bug fix on API | Add regression test |
| Phase 4 (Testing) in PRD | Run full test suite |

### Test Artifacts Structure

```
docs/test-coverage/
├── prd-{NNN}-ac-mapping.yaml      ← AC to Test mapping
└── prd-{NNN}-test-report.md       ← Test results summary

tests/postman/
├── {feature}.postman_collection.json     ← Newman collection
├── {feature}.postman_environment.json    ← Environment vars
└── {feature}-report.json                 ← Raw JSON report
```

---

## Step 1: Create AC Mapping

**File:** `docs/test-coverage/prd-{NNN}-ac-mapping.yaml`

```yaml
# PRD-{NNN} Acceptance Criteria Mapping
# {Feature Name}

prd_id: PRD-{NNN}
title: {Feature Name}
last_updated: YYYY-MM-DD
coverage_principle: "Coverage % = (有测试的AC数 / 总AC数) × 100"

# ===== SUMMARY =====
# Total ACs: XX
# Tested: XX
# Skipped: X
# Coverage: XX%

# ===== ACCEPTANCE CRITERIA =====

acceptance_criteria:

  # === 1. Feature Area (CARD-XXX) ===
  feature_area:
    - ac_id: AC-FEATURE-1
      description: "中文描述"
      description_en: "English description"
      prd_source: "PRD-{NNN} > Section X.X"
      test_id: "F1.1"
      status: tested  # tested | skipped | pending

    - ac_id: AC-FEATURE-2
      description: "中文描述"
      description_en: "English description"
      prd_source: "PRD-{NNN} > Section X.X"
      test_id: "F1.2"
      status: tested

# ===== TEST STRUCTURE =====

test_structure:
  - folder: "0. Authentication"
    tests:
      - "F0.1 Login - Success"

  - folder: "1. Feature Area (CARD-XXX)"
    tests:
      - "F1.1 Test Name [AC-FEATURE-1]"
      - "F1.2 Test Name [AC-FEATURE-2]"

# ===== USER JOURNEY =====

user_journey:
  sequence:
    - page: "login"
      action: "用户登录系统"
      tests: ["F0.1"]

    - page: "feature-list"
      action: "用户浏览功能"
      tests: ["F1.1", "F1.2"]
```

---

## Step 2: Create Postman Collection

**File:** `tests/postman/{feature}.postman_collection.json`

### Collection Structure with x-flow Metadata

```json
{
  "info": {
    "_postman_id": "{feature}-collection",
    "name": "PRD-{NNN} {Feature Name} API Tests",
    "description": "Newman E2E tests for {Feature} (PRD-{NNN})",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "x-prd": {
      "id": "PRD-{NNN}",
      "title": "{Feature Name}",
      "title_zh": "{功能名稱}",
      "coverage": "100%",
      "total_acs": 24,
      "tested_acs": 24
    }
  },
  "variable": [
    { "key": "baseUrl", "value": "https://orq-dev.synque.ca" },
    { "key": "access_token", "value": "" },
    { "key": "orq_id", "value": "63" }
  ],
  "item": [...]
}
```

### Request with x-flow and x-ac Metadata

```json
{
  "name": "F1.1 Fetch All Items [AC-FEATURE-1] | 查詢所有項目",
  "request": {
    "method": "GET",
    "header": [
      { "key": "Authorization", "value": "Bearer {{access_token}}" }
    ],
    "url": {
      "raw": "{{baseUrl}}/items/{collection}?filter[orq][_eq]={{orq_id}}",
      "host": ["{{baseUrl}}"],
      "path": ["items", "{collection}"],
      "query": [
        { "key": "filter[orq][_eq]", "value": "{{orq_id}}" }
      ]
    }
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "pm.test('Status code is 200', function () {",
          "    pm.response.to.have.status(200);",
          "});",
          "",
          "pm.test('Returns array', function () {",
          "    const json = pm.response.json();",
          "    pm.expect(json.data).to.be.an('array');",
          "});"
        ],
        "type": "text/javascript"
      }
    }
  ],
  "x-flow": {
    "sequence": 1,
    "page": "feature-list",
    "trigger": "auto:page-load",
    "produces": ["item_id"],
    "consumes": ["access_token"]
  },
  "x-ac": {
    "id": "AC-FEATURE-1",
    "description": "查詢所有項目",
    "description_en": "Fetch all items",
    "prd_source": "PRD-{NNN} > Section X.X"
  }
}
```

### x-flow Metadata Explained

| Field | Purpose | Examples |
|-------|---------|----------|
| `sequence` | Order in user journey | 0, 1, 2, ... |
| `page` | UI page context | login, product-list, order-detail |
| `trigger` | What triggers this API | auto:page-load, button:提交, click:row |
| `produces` | Variables this request creates | ["product_id", "access_token"] |
| `consumes` | Variables this request needs | ["access_token", "orq_id"] |

---

## Step 3: Create Environment File

**File:** `tests/postman/{feature}.postman_environment.json`

```json
{
  "id": "{feature}-env",
  "name": "{Feature} Test Environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "https://orq-dev.synque.ca",
      "type": "default",
      "enabled": true
    },
    {
      "key": "orq_id",
      "value": "63",
      "type": "default",
      "enabled": true
    },
    {
      "key": "test_email",
      "value": "",
      "type": "secret",
      "enabled": true
    },
    {
      "key": "test_password",
      "value": "",
      "type": "secret",
      "enabled": true
    },
    {
      "key": "access_token",
      "value": "",
      "type": "default",
      "enabled": true
    }
  ],
  "_postman_variable_scope": "environment"
}
```

---

## Step 4: Add npm Script

**File:** `package.json`

```json
{
  "scripts": {
    "test:{feature}": "newman run tests/postman/{feature}.postman_collection.json -e tests/postman/{feature}.postman_environment.json --reporters cli,json --reporter-json-export tests/postman/{feature}-report.json",
    "test:api": "npm run test:product-catalog && npm run test:order-create && npm run test:customer-view"
  }
}
```

**⚠️ Security Note:**
- Report JSON files (`*-report.json`) contain credentials and full request/response data
- Size: Can be 10MB+ for comprehensive test suites
- **These are runtime artifacts** - not source code
- Already excluded via `.gitignore`: `tests/postman/*-report.json`
- Extract summary stats for PRDs, don't commit full reports

---

## Step 5: Run Tests

### With Credentials

```bash
# Via environment variables
npm run test:{feature} -- \
  --env-var "test_email=YOUR_EMAIL" \
  --env-var "test_password=YOUR_PASSWORD"

# Or using npx directly
npx newman run tests/postman/{feature}.postman_collection.json \
  -e tests/postman/{feature}.postman_environment.json \
  --env-var "test_email=YOUR_EMAIL" \
  --env-var "test_password=YOUR_PASSWORD"
```

### Node Version Note

```bash
# Newman requires Node 18+ (nvm use 22 recommended)
source ~/.nvm/nvm.sh && nvm use 22 && npm run test:{feature}
```

---

## Step 6: Run Tests & Extract Results

### Standard Workflow (Recommended)

```bash
# 1. Run Newman with JSON output (temporary file)
npx newman run tests/postman/{feature}.postman_collection.json \
  -e tests/postman/{feature}.postman_environment.json \
  --env-var "test_email=YOUR_EMAIL" \
  --env-var "test_password=YOUR_PASSWORD" \
  -r json \
  --reporter-json-export tests/postman/{feature}-report.json

# 2. Extract summary stats from JSON
# Parse the JSON to get:
# - run.stats.requests.total (totalRequests)
# - run.stats.assertions.total (totalAssertions)
# - run.stats.assertions.passed (passed)
# - run.stats.assertions.failed (failed)

# 3. Update PRD frontmatter with inline YAML
# Edit docs/prds/PRD-{ID}.md:
---
testCoverage:
  lastTestRun: '2026-02-01'
  summary:
    totalRequests: 31
    totalAssertions: 68
    passed: 38
    failed: 30
    passRate: 56
    verdict: partial  # passing (≥90%) | partial (≥50%) | failing (<50%)
---

# 4. Create human-readable markdown report (optional)
# See "Create Test Report" section below

# 5. Delete JSON report (security + size)
rm tests/postman/{feature}-report.json
```

### Newman JSON Report Structure

**Extracting stats from Newman JSON output:**

```json
{
  "run": {
    "stats": {
      "requests": {
        "total": 31,
        "pending": 0,
        "failed": 0
      },
      "assertions": {
        "total": 68,
        "pending": 0,
        "failed": 30
      }
    }
  }
}
```

**Calculation formulas:**
```javascript
totalRequests = run.stats.requests.total
totalAssertions = run.stats.assertions.total
passed = run.stats.assertions.total - run.stats.assertions.failed
failed = run.stats.assertions.failed
passRate = Math.round((passed / totalAssertions) * 100)
verdict = passRate >= 90 ? 'passing' : passRate >= 50 ? 'partial' : 'failing'
```

### Automated Extraction Script (Future Enhancement)

**Planned:** `scripts/extract-newman-stats.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');

// Read Newman JSON report
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

// Extract stats
const stats = report.run.stats;
const totalRequests = stats.requests.total;
const totalAssertions = stats.assertions.total;
const passed = totalAssertions - stats.assertions.failed;
const failed = stats.assertions.failed;
const passRate = Math.round((passed / totalAssertions) * 100);
const verdict = passRate >= 90 ? 'passing' : passRate >= 50 ? 'partial' : 'failing';

// Output YAML for PRD frontmatter
console.log(`testCoverage:
  lastTestRun: '${new Date().toISOString().split('T')[0]}'
  summary:
    totalRequests: ${totalRequests}
    totalAssertions: ${totalAssertions}
    passed: ${passed}
    failed: ${failed}
    passRate: ${passRate}
    verdict: ${verdict}`);
```

**Usage:**
```bash
node scripts/extract-newman-stats.js tests/postman/{feature}-report.json
```

---

## Step 7: Create Test Report (Optional)

**File:** `docs/test-coverage/prd-{NNN}-test-report.md`

```markdown
# PRD-{NNN} {Feature} - Test Report

> Generated: YYYY-MM-DD
> Environment: `https://orq-dev.synque.ca` (orq_id: 63)
> Test User: `user@example.com`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Requests** | XX |
| **Total Assertions** | XX |
| **Passed** | XX (XX%) |
| **Failed** | XX (XX%) |
| **Root Cause** | Permission restrictions / API issues |

### Verdict: ✅ API Functional | ⚠️ Partial | ❌ Failing

---

## Test Results by Category

### ✅ Passed Tests

| Test ID | Name | AC | Status |
|---------|------|----|--------|
| F1.1 | Test Name | AC-XXX | ✅ Pass |

### ❌ Failed Tests

| Test ID | Name | AC | Error |
|---------|------|----|-------|
| F2.1 | Test Name | AC-XXX | 403 Forbidden |

---

## Coverage Summary

| Category | Total ACs | Passed | Coverage |
|----------|-----------|--------|----------|
| Feature 1 | X | X | XX% |
| **Total** | **XX** | **XX** | **XX%** |

---

## Test Artifacts

| File | Purpose |
|------|---------|
| [collection.json](../../tests/postman/{feature}.postman_collection.json) | Postman collection |
| [environment.json](../../tests/postman/{feature}.postman_environment.json) | Environment vars |
| [report.json](../../tests/postman/{feature}-report.json) | Raw Newman report |
| [ac-mapping.yaml](./prd-{NNN}-ac-mapping.yaml) | AC mapping |

---

*PRD: [PRD-{NNN}](../prds/PRD-{NNN}-{feature}.md)*
```

---

## Step 8: Update Card with AC References

**Add to Card frontmatter:**

```yaml
---
# Test tracking (use markdown summary, not JSON artifacts)
test_report: "docs/test-coverage/card-{NNN}-test-report.md"  # Human-readable summary
ac_mapping: "docs/test-coverage/card-{NNN}-ac-mapping.yaml"  # AC → Test mapping
newman_collection: "tests/postman/{feature}.postman_collection.json"  # Test definitions
acceptance_criteria:
  - AC-FEATURE-1
  - AC-FEATURE-2
  - AC-FEATURE-3
---
```

**Note:** Don't reference `*-report.json` files in Cards - they're runtime artifacts with credentials, not tracked in git.

**Add to Card body:**

```markdown
## Acceptance Criteria

### From AC Mapping (prd-{NNN}-ac-mapping.yaml)

| AC ID | Description | Test ID | Status |
|-------|-------------|---------|--------|
| AC-FEATURE-1 | 查詢功能列表 | F1.1 | ✅ Tested |
| AC-FEATURE-2 | 創建新項目 | F1.2 | ✅ Tested |

### Implementation Checklist
- [x] Feature 1 implemented
- [x] Feature 2 implemented
```

---

## Common Test Patterns

### Authentication Test

```javascript
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response has access token', function () {
    const json = pm.response.json();
    pm.expect(json.data).to.have.property('access_token');
    pm.collectionVariables.set('access_token', json.data.access_token);
});
```

### List Fetch Test

```javascript
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns array', function () {
    const json = pm.response.json();
    pm.expect(json.data).to.be.an('array');
    console.log('Found', json.data.length, 'items');
});

pm.test('Items have required fields', function () {
    const json = pm.response.json();
    if (json.data.length > 0) {
        pm.expect(json.data[0]).to.have.property('id');
        pm.expect(json.data[0]).to.have.property('name');
    }
});

// Store first item for subsequent tests
const json = pm.response.json();
if (json.data && json.data.length > 0) {
    pm.collectionVariables.set('item_id', json.data[0].id);
}
```

### Validation Error Test

```javascript
pm.test('Status code indicates error', function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 422, 500]);
});

pm.test('Error response received', function () {
    const json = pm.response.json();
    pm.expect(json).to.satisfy(function(res) {
        return res.errors || res.error || !res.data;
    });
});
```

### Permission Handling Test

```javascript
pm.test('Status code is 200 or 403 (permission)', function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 403]);
    if (pm.response.code === 403) {
        console.log('Operation not permitted (expected for limited permissions)');
    }
});
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 400 Bad Request on login | Check `test_email` and `test_password` are set |
| 403 Forbidden on CRUD | Test user lacks permissions |
| Empty `product_id` variable | Previous test didn't store ID |
| Newman command not found | Use `npx newman` or install globally |
| Node version error | Use `nvm use 22` before running |

### Permission Analysis

When tests fail with 403:

1. **Identify blocked collections** from test output
2. **Check Directus permissions** for test user role
3. **Options:**
   - Use admin user for full testing
   - Update test expectations to accept 403
   - Grant permissions in Directus Admin

**For detailed permission debugging by Directus version, see:** `references/directus-versions.md`

### Version-Specific Debugging

**Directus 9.x** (current orq-dev):
```bash
# Permissions are directly on roles
curl "$DIRECTUS_URL/permissions?filter[role][_eq]=$ROLE_ID&limit=-1"
```

**Directus 11.x** (future):
```bash
# Permissions are on policies, not roles
curl "$DIRECTUS_URL/permissions?filter[policy][_eq]=$POLICY_ID&limit=-1"
```

**Always check version first:**
```bash
head -3 snapshots/orq-dev/*.yaml | grep directus
```

---

## Reference Examples

| PRD | AC Mapping | Collection | Report |
|-----|------------|------------|--------|
| PRD-002 | [prd-002-ac-mapping.yaml](../../docs/test-coverage/prd-002-ac-mapping.yaml) | [product-catalog.postman_collection.json](../../tests/postman/product-catalog.postman_collection.json) | [prd-002-test-report.md](../../docs/test-coverage/prd-002-test-report.md) |

---

## Checklist for New Test Collections

### Setup
- [ ] Environment file has empty placeholders (not stale values)
- [ ] Login test stores token in `pm.environment.set()` (not just `collectionVariables`)
- [ ] Collection variables defined for dynamic IDs

### Test Isolation
- [ ] CRUD tests are self-contained (create own data)
- [ ] Delete tests create their own items to delete
- [ ] Update tests create their own items to update
- [ ] No cascade dependencies between test folders

### Variable Handling
- [ ] Pre-request scripts validate required variables
- [ ] Empty filter values are checked before request
- [ ] Console logs added for debugging

### Node/Newman
- [ ] Node 18+ used (recommend `nvm use 22`)
- [ ] `--env-var` overrides for credentials
- [ ] JSON reporter enabled for CI/CD
