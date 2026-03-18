---
name: api-testing
description: Run Newman/Postman API tests for PRD validation. Use when testing endpoints, verifying acceptance criteria, or updating test coverage in PRD frontmatter.
user-invocable: true
disable-model-invocation: false
allowed-tools: Bash(npx newman *), Bash(node scripts/*), Read, Write, Edit
---

# API Testing & Validation

Specialized skill for running Newman/Postman API tests and updating PRD test coverage.

## When to Use This Skill

This skill is automatically invoked when:
- Running Newman/Postman tests
- Verifying API acceptance criteria
- Updating PRD test coverage
- Phase 4 (Testing) of PRD lifecycle
- Validating API endpoints

**Triggers:**
- "Run tests"
- "Test API"
- "Newman test"
- "Phase 4"
- "Test coverage"
- "Update test results"
- "Run Postman collection"

## API Testing Workflow (Phase 4 PRD Validation)

### When to Run Tests

- PRD Phase 4 begins
- New API endpoint completed
- Bug fix requiring regression testing
- Acceptance criteria validation needed

### Standard Testing Flow

**Goal**: Every test run automatically updates PRD with pass rate and verdict.

```bash
# Step 1: Run Newman test (generate JSON report)
npx newman run tests/postman/{feature}.postman_collection.json \
  -e tests/postman/{feature}.postman_environment.json \
  --env-var "test_email=YOUR_EMAIL" \
  --env-var "test_password=YOUR_PASSWORD" \
  -r json \
  --reporter-json-export tests/postman/{feature}-report.json

# Step 2: Extract summary statistics from JSON
# Manual extraction or use automation script:
# - run.stats.requests.total → totalRequests
# - run.stats.assertions.total → totalAssertions
# - run.stats.assertions.failed → failed
# - (total - failed) → passed
# - passRate = (passed / total) * 100
# - verdict = passRate >= 90 ? 'passing' : passRate >= 50 ? 'partial' : 'failing'

# Step 3: Update PRD frontmatter (inline YAML)
# Edit docs/prds/PRD-{ID}.md:
# ---
# testCoverage:
#   lastTestRun: '2026-02-01'
#   summary:
#     totalRequests: 31
#     totalAssertions: 68
#     passed: 38
#     failed: 30
#     passRate: 56
#     verdict: partial
# ---

# Step 4: (Optional) Create detailed markdown report
# docs/test-coverage/prd-{NNN}-test-report.md

# Step 5: Delete JSON report (security + file size)
rm tests/postman/{feature}-report.json
```

**Future Enhancement**: `scripts/extract-newman-stats.js` for automatic YAML generation

### Test Artifacts

| File | Location | Git Tracked | Purpose |
|------|----------|-------------|---------|
| AC Mapping | `docs/test-coverage/prd-{NNN}-ac-mapping.yaml` | ✅ Yes | AC to test mapping |
| Postman Collection | `tests/postman/{feature}.postman_collection.json` | ✅ Yes | Newman test definition |
| Environment | `tests/postman/{feature}.postman_environment.json` | ✅ Yes | Env variables (no passwords) |
| Test Report (MD) | `docs/test-coverage/prd-{NNN}-test-report.md` | ✅ Yes | Test results summary |
| Newman Report (JSON) | `tests/postman/{feature}-report.json` | ❌ No | Runtime artifact (contains credentials) |

### Card Association

Link test results to Cards via frontmatter:

```yaml
# Card frontmatter
test_report: "docs/test-coverage/card-{NNN}-test-report.md"  # Git tracked
ac_mapping: "docs/test-coverage/card-{NNN}-ac-mapping.yaml"
newman_collection: "tests/postman/{feature}.postman_collection.json"
# ❌ Do NOT reference *-report.json (contains credentials, not tracked)
acceptance_criteria:
  - AC-FEATURE-1
  - AC-FEATURE-2
```

## PRD Test Coverage Format

### Frontmatter Structure

```yaml
---
id: PRD-XXX
title: "Feature Name"
testCoverage:
  lastTestRun: '2026-02-07'  # ISO date format
  summary:
    totalRequests: 31         # Total API requests tested
    totalAssertions: 68       # Total test assertions
    passed: 38                # Passed assertions
    failed: 30                # Failed assertions
    passRate: 56              # Percentage (passed / total * 100)
    verdict: partial          # passing (≥90%) | partial (50-89%) | failing (<50%)
  acMapping: 'docs/test-coverage/prd-{NNN}-ac-mapping.yaml'
  detailedReport: 'docs/test-coverage/prd-{NNN}-test-report.md'
---
```

### Verdict Calculation

```javascript
const passRate = (passed / totalAssertions) * 100

if (passRate >= 90) return 'passing'
if (passRate >= 50) return 'partial'
return 'failing'
```

## Newman Test Patterns

### Basic Test Execution

```bash
# Run collection with environment
npx newman run tests/postman/collection.json \
  -e tests/postman/environment.json \
  --env-var "test_email=user@example.com" \
  --env-var "test_password=secret"
```

### With JSON Reporter

```bash
# Generate JSON report for parsing
npx newman run tests/postman/collection.json \
  -e tests/postman/environment.json \
  -r json \
  --reporter-json-export tests/postman/report.json
```

### Environment Variables

**Security**: Never commit credentials to environment files.

```json
// tests/postman/feature.postman_environment.json
{
  "values": [
    {"key": "base_url", "value": "https://api.example.com"},
    {"key": "test_email", "value": ""},  // ← Pass via --env-var
    {"key": "test_password", "value": ""}  // ← Pass via --env-var
  ]
}
```

## AC Mapping Format

Link acceptance criteria to test cases:

```yaml
# docs/test-coverage/prd-{NNN}-ac-mapping.yaml
prd: PRD-XXX
title: "Feature Name"
mapping:
  - ac: AC-FEATURE-1
    description: "User can view order list"
    tests:
      - request: "GET /items/orders"
        assertions:
          - "Status code is 200"
          - "Response has orders array"
    status: passing

  - ac: AC-FEATURE-2
    description: "User can filter by status"
    tests:
      - request: "GET /items/orders?filter[status][_eq]=pending"
        assertions:
          - "Status code is 200"
          - "All orders have status=pending"
    status: failing
```

## Test Report Format

```markdown
# Test Report: PRD-XXX - Feature Name

**Test Date**: 2026-02-07
**Collection**: tests/postman/feature.postman_collection.json
**Environment**: Directus 11 (d11)

## Summary

| Metric | Value |
|--------|-------|
| Total Requests | 31 |
| Total Assertions | 68 |
| Passed | 38 |
| Failed | 30 |
| Pass Rate | 56% |
| **Verdict** | **Partial** |

## Test Results by Endpoint

### GET /items/orders
- Status: ✅ Passing
- Assertions: 5/5 passed
- Details: All basic retrieval tests passed

### POST /items/orders
- Status: ❌ Failing
- Assertions: 2/5 passed
- Issues:
  - Missing required field validation
  - Incorrect error response format

## Action Items

- [ ] Fix POST validation error handling
- [ ] Add required field checks
- [ ] Re-run tests after fixes
```

## References

| File | Purpose |
|------|---------|
| `references/newman-testing.md` | Complete Newman/Postman workflow |
| `references/api-testing.md` | API testing best practices |

## Full Testing Guide

**Complete documentation**: See ai-workflow skill references for detailed API testing patterns
