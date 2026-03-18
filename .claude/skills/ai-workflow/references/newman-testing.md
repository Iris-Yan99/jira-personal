# Newman Testing - Dynamic API Architecture

**New Pattern (2026-02-05)**: UI displays tests dynamically from Newman collection JSON via API endpoints

**Old Pattern (Legacy)**: Run Newman tests → Parse results → Update PRD frontmatter manually

**Trigger**: User says "run tests", "test the API", "run Newman", or visits `/prd/[id]` Testing tab

---

## ⚡ New Architecture (Recommended)

### Overview

Tests are now displayed dynamically in the UI without manual PRD updates:

```
Newman Collection JSON (Single Source of Truth)
    ↓
API Endpoint (/api/newman/structure)
    ↓
Newman Parser (lib/newman-parser.ts)
    ↓
React Component (components/newman-test-display.tsx)
    ↓
UI Display with "Run Tests" Button
```

### When to Use Dynamic Display

| User Request | Action |
|--------------|--------|
| "Run Newman tests for PRD-SOCIAL-OAUTH" | User clicks "Run Tests" in UI |
| "Test the OAuth API" | Navigate to Testing tab → Click "Run Tests" |
| "Show me test results" | Navigate to Testing tab (results load automatically) |
| "Add tests to PRD" | Update PRD frontmatter `collections[]` array |
| After completing API development | Navigate to Testing tab to run tests |

---

## Dynamic Workflow: Setup Multi-Collection PRD

### Step 1: Update PRD Frontmatter with Collections Array

**NEW FORMAT** - PRD stores references only, not test data:

```yaml
testCoverage:
  collections:
    - id: oauth-generic
      path: tests/postman/oauth-tests.postman_collection.json
      environment: tests/postman/oauth-test.postman_environment.json
      purpose: "Generic OAuth flows (reusable for all providers)"
      primary: true  # Display this tab first

    - id: d11-wantwant-migration
      path: tests/postman/d11-wantwant-migration.postman_collection.json
      environment: tests/postman/d11-wantwant-migration.postman_environment.json
      purpose: "WantWant D9→D11 migration validation"

  lastTestRun: '2026-02-05'
  readme: tests/postman/README-OAUTH.md
```

**What PRD Does NOT Store:**
- ❌ Test names (loaded dynamically from collection JSON)
- ❌ Folder structure (loaded dynamically)
- ❌ AC codes (extracted from test scripts)
- ❌ Pass/fail counts (loaded from cache or pending)

### Step 2: UI Automatically Displays Tests

Navigate to: `http://localhost:3000/prd/PRD-SOCIAL-OAUTH`

Click **Testing** tab → UI:
1. Calls `/api/newman/structure?collection=oauth-generic`
2. Calls `/api/newman/results?collection=oauth-generic`
3. Displays test structure dynamically
4. Shows "Run Tests" button

### Step 3: Run Tests from UI

User clicks **"Run Tests"** button → UI:
1. Calls `POST /api/newman/run` with collection info
2. Newman executes in background
3. UI polls `GET /api/newman/run/:jobId` for status
4. Results cached in `.newman-cache/`
5. UI refreshes with new results

**Alternative: Run manually**
```bash
# Run Newman manually and cache results
npx newman run tests/postman/oauth-tests.postman_collection.json \
  --reporters json \
  --reporter-json-export .newman-cache/oauth-tests-latest.json

# UI will automatically display cached results on next visit
```

### Step 4: Verify Dynamic Updates

**Proof that UI reads from Newman JSON:**

1. Edit collection file:
   ```bash
   # Change test name in collection JSON
   code tests/postman/oauth-tests.postman_collection.json
   ```

2. Refresh browser (no rebuild needed)

3. Test name updates immediately! ✨

This proves data comes from Newman JSON, not PRD frontmatter.

---

## Collection Structure = Test Sequence

**Key Insight**: The sequence comes from the `item` array order in the Postman collection JSON.

```json
{
  "item": [
    {"name": "Setup & Prerequisites", "item": [...]},     // Sequence 1
    {"name": "Google OAuth Flow", "item": [...]},         // Sequence 2
    {"name": "Account Linking", "item": [...]},           // Sequence 3
    {"name": "Multi-Org Access", "item": [...]}           // Sequence 4
  ]
}
```

**Each folder = 1 test group in PRD**

---

## Folder vs PRD Clarification

**User Concern**: "I can't have 100 folders for 100 PRDs"

**Answer**: You don't! Structure is:

```
100 PRDs → 100 separate collection files

Example:
- PRD-SOCIAL-OAUTH.md → oauth-tests.postman_collection.json (4 folders inside)
- PRD-ORDER-MGMT.md → order-tests.postman_collection.json (3 folders inside)
- PRD-PAYMENTS.md → payment-tests.postman_collection.json (5 folders inside)
```

**Each PRD has its own collection file. Inside each collection, you have multiple test folders (test groups).**

---

## Frontend Tests (Cannot Be Automated by Newman)

Newman tests **backend APIs only**. Frontend UI tests are **manual browser testing**:

```yaml
testDetails:
  # Backend tests (from Newman - automated)
  - name: "Setup & Prerequisites"
    testType: backend
    automated: true
    tool: "Newman (Postman CLI)"
    passed: 2
    failed: 0

  # Frontend tests (manual - not from Newman)
  - name: "OAuth Callback UI Flow"
    testType: frontend
    automated: false
    tool: "Manual Browser Testing"
    passed: 0
    failed: 0
    acceptanceCriteria:
      - "AC-OAUTH-FE-001: Extract code/state from URL"
      - "AC-OAUTH-FE-002: Call backend API with code"
      - "AC-OAUTH-FE-003: Store token in localStorage"
      - "AC-OAUTH-FE-004: Redirect to /app on success"
      - "AC-OAUTH-FE-005: Show error message on failure"
```

**Frontend AC codes (AC-OAUTH-FE-*) are NOT in Newman** - they test browser behavior that Newman cannot automate.

---

## Implementation Helper Script

The `update-prd-from-newman.js` script does the heavy lifting:

```bash
node scripts/update-prd-from-newman.js \
  docs/prds/PRD-SOCIAL-OAUTH.md \
  tests/postman/oauth-tests.postman_collection.json \
  /tmp/newman-results.json
```

**What it does:**
1. Parse Newman results for pass/fail counts
2. Read collection JSON for folder structure and AC codes
3. Match folder names with test results
4. Generate updated YAML
5. Replace `testCoverage` section in PRD
6. Clean up temp file

---

## Proactive AI Behavior

**When to suggest running tests:**

1. After implementing OAuth endpoints
2. After fixing bugs in tested APIs
3. When user asks "is it working?"
4. When user commits code changes to tested features

**Example dialogue:**

```
User: "I finished implementing Google OAuth"

Claude: "Great! Would you like me to run the Newman tests
to verify the implementation? I can automatically update
the PRD with the results.

Command: Run Newman tests for PRD-SOCIAL-OAUTH
```

---

## Error Handling

### Newman Test Failures

If tests fail, still update PRD with failed results:

```yaml
testCoverage:
  summary:
    passed: 12
    failed: 3
    passRate: 80
    verdict: failed  # ← Show failures
    testDetails:
      - name: "Google OAuth Flow"
        passed: 3
        failed: 2  # ← Failed tests visible
```

**Report to user:**
```
⚠️ Newman tests completed with failures
📊 Results: 12/15 assertions passed (80%)
❌ Failed tests:
   - Google OAuth Flow: 2 failed
📝 PRD updated with failed status
💡 Check Newman output above for error details
```

### Collection Not Found

```
❌ Error: Collection not found at tests/postman/oauth-tests.postman_collection.json
💡 Check PRD frontmatter: testCoverage.newmanCollectionPath
```

### PRD Not Found

```
❌ Error: PRD not found at docs/prds/PRD-SOCIAL-OAUTH.md
💡 Verify PRD ID is correct
```

---

## No Summary Files Stored

**Important**: We do NOT store summary files in git.

### What Newman Generates

```
/tmp/newman-results-12345.json  ← 11MB, temporary, deleted after parsing
```

### What Gets Stored

```
docs/prds/PRD-SOCIAL-OAUTH.md  ← PRD frontmatter updated (~3KB added)
```

**Benefit**: Git only tracks the essential test summary in PRD, not 11MB JSON files.

---

## Visual Test Sequence (For User)

After updating PRD, user can view results in UI:

```
http://localhost:3000/prd/PRD-SOCIAL-OAUTH

→ Testing tab shows:
   🔵 1. Setup & Prerequisites       [Backend] [Automated] ✅ 2/2 passed
   🔵 2. Google OAuth Flow           [Backend] [Automated] ✅ 2/2 passed
   🔵 3. Account Linking             [Backend] [Automated] ✅ 3/3 passed
   🔵 4. Multi-Org Access            [Backend] [Automated] ✅ 1/1 passed
   🟣 5. OAuth Callback UI Flow      [Frontend] [Manual] ⏸ 0/0 (not run)
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/newman/structure` | GET | Parse collection JSON and return test structure |
| `/api/newman/results` | GET | Return cached test results or pending state |
| `/api/newman/run` | POST | Execute Newman tests in background |
| `/api/newman/run/:jobId` | GET | Poll for test execution status |

**Example API Call:**
```bash
# Get test structure
curl http://localhost:3000/api/newman/structure?collection=oauth-generic | jq

# Response:
{
  "collections": [{
    "id": "oauth-generic",
    "name": "OAuth Tests",
    "folders": [
      {
        "name": "Setup & Prerequisites",
        "tests": [
          {
            "name": "Test A: Verify Extension",
            "method": "GET",
            "url": "{{baseUrl}}/health",
            "acCodes": ["AC-OAUTH-SETUP-001"]
          }
        ]
      }
    ],
    "totalTests": 8
  }]
}
```

---

## Related Files

### New Dynamic Architecture
| File | Purpose |
|------|---------|
| `lib/newman-parser.ts` | Parser library for collections and results |
| `app/api/newman/structure/route.ts` | GET test structure from JSON |
| `app/api/newman/results/route.ts` | GET cached test results |
| `app/api/newman/run/route.ts` | POST run tests with polling |
| `components/newman-test-display.tsx` | Dynamic test display component |
| `components/prd-detail-client.tsx` | Multi-collection tabs in Testing tab |
| `scripts/test-newman-parser.js` | Verification test script |
| `docs/NEWMAN-VERIFICATION.md` | Complete verification guide |

### Legacy Scripts (Still Available)
| File | Purpose |
|------|---------|
| `scripts/update-prd-from-newman.js` | Parse Newman + Update PRD (legacy) |
| `scripts/run-newman-and-update-prd.sh` | Automated test + update (legacy) |
| `scripts/visualize-test-sequence.js` | Visualize test sequence in terminal |

---

## Summary

**New Pattern (Dynamic)**: Collection JSON → API → UI → "Run Tests" Button

**AI Claude Should:**
1. Add collections to PRD frontmatter (not test data)
2. Direct users to Testing tab in UI
3. Let users run tests from browser
4. Verify setup with `node scripts/test-newman-parser.js`
5. Troubleshoot with API endpoint testing

**User Benefits:**
- ✅ Edit collection → UI updates immediately (no rebuild)
- ✅ Support multiple collections per PRD
- ✅ Run tests from browser with real-time polling
- ✅ No manual PRD updates needed
- ✅ Results cached in `.newman-cache/`
- ✅ Backwards compatible with legacy static summaries

**Verification:**
```bash
# Test the parser
node scripts/test-newman-parser.js

# View in browser
yarn dev
# Navigate to: http://localhost:3000/prd/PRD-SOCIAL-OAUTH
# Click Testing tab → See dynamic display
```

---

**Created**: 2026-02-02
**Updated**: 2026-02-05 (Added dynamic API architecture)
**Pattern**: Newman Dynamic Display
**Status**: Active
