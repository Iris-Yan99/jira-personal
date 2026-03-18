---
name: e2e-test
description: Run E2E + integration tests with Playwright, clean test data, generate combined report, and view results at /test-report. Triggers on "run e2e", "e2e test", "playwright test", "clean and test", "full pipeline test", "run integration test".
user-invocable: true
allowed-tools: Bash(node *), Bash(npx playwright *), Bash(mkdir *), Bash(cp *), Bash(cat *), Read, Write, Edit
---

# E2E Test Skill

Full workflow: **pre-clean → run Playwright → generate report → view at /test-report**

## Triggers

- "run e2e"
- "e2e test"
- "playwright test"
- "clean and test"
- "full pipeline test"
- "run integration test"
- "跑 e2e"
- "清空再跑"
- "测试流水线"

---

## Step 0: Understand Context

Before running, ask or confirm:
1. **Which spec file?** (default: `e2e/upload-d11-flow.spec.ts` for D11 pipeline)
2. **Clean data first?** (default: yes for integration tests, no for UI-only tests)
3. **Fixture file?** Check `e2e/fixtures/` for `.xls` files, or ask for `E2E_XLS_FIXTURE` path

---

## Step 1: Clean Test Data (if integration test)

Use the Node.js cleanup script to delete all business data from D11 in dependency order:

```bash
# Create cleanup script (if not exists)
cat > /tmp/clear-d11-data.mjs << 'EOF'
const BASE = 'http://localhost:8056'
const TOKEN = 'Bearer etl-admin-token-9ced77718d8418770e781f54275efd51'

async function getAllIds(collection) {
  let ids = [], offset = 0
  while (true) {
    const res = await fetch(`${BASE}/items/${collection}?limit=500&offset=${offset}&fields=id`, {
      headers: { Authorization: TOKEN }
    })
    const data = await res.json()
    const items = data.data || []
    ids = ids.concat(items.map(i => i.id))
    if (items.length < 500) break
    offset += 500
  }
  return ids
}

async function deleteAll(collection) {
  const ids = await getAllIds(collection)
  if (ids.length === 0) { console.log(`  ${collection}: already empty`); return 0 }
  let deleted = 0
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const res = await fetch(`${BASE}/items/${collection}`, {
      method: 'DELETE',
      headers: { Authorization: TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    if (res.status === 204) deleted += batch.length
    else console.log(`  ${collection}: batch error ${res.status}`)
  }
  console.log(`  ${collection}: deleted ${deleted}/${ids.length}`)
  return deleted
}

// Delete in dependency order (junction tables first)
const collections = [
  'order_line_source',
  'source_record',
  'order_line',
  'order',
  'record',
  'ww_order_key',
  'job',
]

console.log('🗑️  Clearing all business data from D11...\n')
for (const col of collections) await deleteAll(col)
console.log('\n✅ Done. All business data cleared.')
EOF

node /tmp/clear-d11-data.mjs
```

> **D11 access note:** curl/node uses system proxy by default.
> To bypass proxy for localhost: `export NO_PROXY=localhost,127.0.0.1` before curl commands.
> Node.js `fetch()` respects `NO_PROXY` env var.

### D11 Connection Info

| Item | Value |
|------|-------|
| Base URL | `http://localhost:8056` |
| Admin token | `Bearer etl-admin-token-9ced77718d8418770e781f54275efd51` |
| Excel folder UUID | `644b0692-b898-45eb-b50f-245af1bd71bc` |
| D9 folder (hardcoded in UI) | `638a1e8c-68e4-4d83-ac7a-72432b1f413d` |

### Collections (deletion order)

```
order_line_source → source_record → order_line → order → record → ww_order_key → job
```

---

## Step 2: Run Playwright Tests

### Prerequisites

```bash
# Must be in dev-wantwant directory
cd /Users/Zhuanz/Desktop/synque/saas-order-creation
nvm use 22
```

### Mode Overview

| Mode | Spec | Capture → | Report Tab | Use when |
|------|------|-----------|------------|----------|
| `frontend` | `upload.spec.ts` | `frontend-capture.json` | Frontend tab | Testing UI only |
| `backend` | `upload-d11-flow.spec.ts` | `backend-capture.json` | Backend tab | Testing ETL/API only |
| `pipeline` | both | both files | All 3 tabs | Full integration |

Each mode independently updates its own section in the report — running `frontend` won't overwrite the `backend` section and vice versa.

### Frontend Test (UI only — no fixture needed)

```bash
npx playwright test e2e/upload.spec.ts --reporter=line
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode frontend
```

→ Updates **Frontend tab** only at `/test-report/wantwant`

### Backend Test (ETL/D11 pipeline)

```bash
export NO_PROXY=localhost,127.0.0.1
E2E_XLS_FIXTURE=e2e/fixtures/2025-08-04W.xls \
  npx playwright test e2e/upload-d11-flow.spec.ts \
  --timeout=1200000 --reporter=line
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode backend
```

→ Updates **Backend tab** only at `/test-report/wantwant`

### Full Pipeline Test (default, updates all tabs)

```bash
export NO_PROXY=localhost,127.0.0.1
E2E_XLS_FIXTURE=e2e/fixtures/2025-08-04W.xls \
  npx playwright test e2e/upload.spec.ts e2e/upload-d11-flow.spec.ts \
  --timeout=1200000 --reporter=line
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode pipeline
```

→ Updates **all 3 tabs** (Frontend + Backend + Pipeline view)

### Timeout Guidelines

| Test type | Expected duration | Recommended timeout |
|-----------|------------------|---------------------|
| UI tests only | 1–2 min | 60000 |
| D11 pipeline (warm, data exists) | 2–4 min | 360000 |
| D11 pipeline (clean env, first run) | 8–12 min | 1200000 |

### Common Failures & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `capturedFileId is null` | D11 upload returned 500 | D11 was unhealthy, retry |
| `convert timeout` | Clean env, creating 96+ companies | Increase timeout to 1200000 |
| `502 Bad Gateway` on curl | Proxy routing localhost | `export NO_PROXY=localhost,127.0.0.1` |
| `period_type FORBIDDEN` | Token lacks field access | Remove `period_type` from fields query |
| `raw.source_job_id FORBIDDEN` | Nested JSON field blocked | Use `sort=-date_created` instead |
| `test.afterAll() not expected` | Wrong cwd, no playwright.config found | `cd dev-wantwant` first |

### Key Implementation Details

- **D11 CORS bypass**: `page.route('http://localhost:8056/files', handler)` intercepts before CORS check
- **Multipart folder replacement**: Latin1 string replace to swap D9→D11 folder UUID in raw body
- **All D11 API calls**: Use `page.request.fetch()` (server-side, no CORS) not browser fetch
- **Polling**: Max 55 × 5s = 275s for ETL job completion
- **Convert timeout**: Set `{ timeout: 900000 }` on the convert call — first clean run ~8 min

---

## Step 3: Generate Report

```bash
cd /Users/Zhuanz/Desktop/synque/saas-order-creation
node scripts/generate-combined-report.js \
  --project wantwant \
  --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 \
  --card CARD-WW-UPLOAD-002 \
  --mode pipeline
```

Add `--mode frontend` or `--mode backend` to update only that section.

This outputs to `test-results/wantwant/` and generates:
- `manifest.json` — metadata + structured files[] with type labels
- `frontend-capture.json` — UI screenshots + browser requests
- `backend-capture.json` — ETL/API network log
- `combined-report.html` — static HTML report

### For Other Projects

```bash
node scripts/generate-combined-report.js \
  --project vec \
  --name "VEC WooCommerce" \
  --story US-VEC-001 \
  --card CARD-VEC-001 \
  --mode pipeline
```

---

## Step 4: View Results

### Dynamic viewer (recommended)

```
http://localhost:3000/test-report
```
→ Shows all projects' latest test status
→ Click project card → timeline detail at `/test-report/wantwant`

### Static HTML

```bash
open test-results/wantwant/combined-report.html
```

---

## Step 5: Check Report API

```bash
export NO_PROXY=localhost
curl -s http://localhost:3000/api/test-report | python3 -m json.tool
curl -s http://localhost:3000/api/test-report/wantwant | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['timeline']), 'timeline items')"
```

---

## Spec File Reference

| File | Purpose | Timeout |
|------|---------|---------|
| `e2e/upload.spec.ts` | UI tests: auth gate, dialog, file picker | 60s |
| `e2e/upload-d11-flow.spec.ts` | Full D11 ETL pipeline integration test | 20 min |

### Fixture Files

```
e2e/fixtures/
  2025-08-04W.xls    ← Real weekly report (real data required for ETL)
  test-weekly.xls    ← Symlink/copy of same file
  .gitignore         ← *.xls ignored (may contain real data)
```

### Playwright Config

```
playwright.config.ts:
  baseURL: http://localhost:3000
  workers: 1, fullyParallel: false
  screenshot: 'on'
```

---

## Report Architecture

```
test-results/
  {project}/
    manifest.json          ← Generated by generate-combined-report.js
    frontend-capture.json  ← From frontend spec (--mode frontend)
    backend-capture.json   ← From backend spec (--mode backend)
    combined-report.html   ← Static HTML (dark theme)

app/test-report/         ← Dynamic viewer
  page.tsx               → Dashboard (all projects)
  [project]/page.tsx     → Timeline detail (3 tabs: Frontend / Backend / ⇄ Pipeline)

app/api/test-report/     ← API routes
  route.ts               → GET: list all manifests
  [project]/route.ts     → GET: merged timeline, auto-classify by URL + type

components/test-report/
  Dashboard.tsx          ← Project cards (light/black-white style)
  ProjectDetail.tsx      ← 3-tab: Frontend / Backend / Pipeline
  PipelineSplitView.tsx  ← Side-by-side split view (Frontend left, Backend right)
  TimelineItem.tsx       ← Screenshot (click to zoom) / network (expand body)
```

---

## New Project Setup (Zero Test Scripts)

For any new project (Rs, Vec, etc.) with no existing test scripts, use these templates.

### Capture JSON Format

Both capture files share this schema:
```json
{
  "summary": { "totalRequests": 5, "screenshots": 3 },
  "networkLog": [
    {
      "timestamp": "2026-03-09T12:00:00.000Z",
      "method": "POST",
      "url": "http://api.example.com/endpoint",
      "requestBody": "{ ... } or label string",
      "status": 200,
      "responseBody": "{ ... }",
      "duration": 123
    }
  ],
  "screenshotLog": [
    {
      "timestamp": "2026-03-09T12:00:00.000Z",
      "testName": "My test name",
      "step": "Step description shown in UI",
      "dataUrl": "data:image/png;base64,..."
    }
  ]
}
```

### Frontend Spec Template

Copy to `e2e/{project}-frontend.spec.ts`. Auto-captures all page network requests.

```typescript
/**
 * Frontend E2E: {Project Name}
 * Tests UI flows and captures screenshots + network requests.
 *
 * Run: npx playwright test e2e/{project}-frontend.spec.ts --reporter=line
 * Output: test-results/network-capture.json
 */
import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'

// ── Capture store ─────────────────────────────────────────────────────────────
const networkLog: any[] = []
const screenshotLog: any[] = []
const OUTPUT = process.env.CAPTURE_OUTPUT || 'test-results/network-capture.json'

function saveCapture() {
  fs.mkdirSync('test-results', { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify({
    summary: { totalRequests: networkLog.length, screenshots: screenshotLog.length },
    networkLog,
    screenshotLog,
  }, null, 2))
  console.log(`Capture saved: ${OUTPUT} (${networkLog.length} requests, ${screenshotLog.length} screenshots)`)
}

async function shot(page: Page, step: string, testName = 'Frontend') {
  const buf = await page.screenshot({ fullPage: false })
  screenshotLog.push({
    timestamp: new Date().toISOString(),
    testName,
    step,
    dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
  })
}

// Auto-capture all network requests (including XHR/fetch)
async function setupNetworkCapture(page: Page) {
  const pending = new Map<any, { start: number; method: string; url: string; body: string | null }>()
  page.on('request', req => {
    if (['document', 'stylesheet', 'image', 'font', 'media'].includes(req.resourceType())) return
    pending.set(req, { start: Date.now(), method: req.method(), url: req.url(), body: req.postData() })
  })
  page.on('response', async res => {
    const req = res.request()
    const meta = pending.get(req)
    if (!meta) return
    pending.delete(req)
    let responseBody: string | null = null
    try { responseBody = await res.text() } catch {}
    networkLog.push({
      timestamp: new Date().toISOString(),
      method: meta.method,
      url: meta.url,
      requestBody: meta.body,
      status: res.status(),
      responseBody: responseBody && responseBody.length < 3000 ? responseBody : null,
      duration: Date.now() - meta.start,
    })
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────
test.describe('{Project} Frontend', () => {
  test.afterAll(() => { saveCapture() })

  test('Core user flow', async ({ page }) => {
    test.setTimeout(120_000)
    await setupNetworkCapture(page)

    // ── Replace the steps below with your actual test flow ──
    await page.goto('/')
    await shot(page, 'Home page loaded')

    // Example: navigate, fill form, submit
    await page.click('text=Get Started')
    await shot(page, 'After clicking Get Started')

    // Example: verify something
    await expect(page.locator('h1')).toBeVisible()
    await shot(page, 'Verified heading visible')
  })
})
```

### Backend Spec Template

Copy to `e2e/{project}-backend.spec.ts`. Explicit API call capture (no auto-capture overhead).

```typescript
/**
 * Backend Integration: {Project Name}
 * Tests API endpoints directly via page.request (bypasses CORS).
 *
 * Run: API_BASE=http://localhost:8080 npx playwright test e2e/{project}-backend.spec.ts
 * Output: test-results/backend-capture.json (default, or set CAPTURE_OUTPUT)
 */
import { test, type Page } from '@playwright/test'
import fs from 'fs'

// ── Config (override via env vars) ───────────────────────────────────────────
const API_BASE = process.env.API_BASE || 'http://localhost:8080'
const API_TOKEN = process.env.API_TOKEN || ''
const OUTPUT = process.env.CAPTURE_OUTPUT || 'test-results/backend-capture.json'

// ── Capture store ─────────────────────────────────────────────────────────────
const networkLog: any[] = []
const screenshotLog: any[] = []

function saveCapture() {
  fs.mkdirSync('test-results', { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify({
    summary: { totalRequests: networkLog.length, screenshots: screenshotLog.length },
    networkLog,
    screenshotLog,
  }, null, 2))
  console.log(`Capture saved: ${OUTPUT} (${networkLog.length} requests, ${screenshotLog.length} screenshots)`)
}

async function shot(page: Page, step: string, testName = 'Backend') {
  const buf = await page.screenshot({ fullPage: false })
  screenshotLog.push({
    timestamp: new Date().toISOString(),
    testName,
    step,
    dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
  })
}

// api() — explicit capture of a single API call
async function api(
  page: Page,
  method: string,
  path: string,
  opts: { data?: any; headers?: Record<string, string>; timeout?: number } = {},
  label?: string,
) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const start = Date.now()
  const res = await page.request.fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...opts.headers,
    },
    ...(opts.data ? { data: JSON.stringify(opts.data) } : {}),
    timeout: opts.timeout ?? 60_000,
  })
  let text = ''
  try { text = await res.text() } catch {}
  networkLog.push({
    timestamp: new Date().toISOString(),
    method,
    url,
    requestBody: label ?? (opts.data ? JSON.stringify(opts.data).slice(0, 500) : null),
    status: res.status(),
    responseBody: text.length < 3000 ? text : text.slice(0, 3000) + '…',
    duration: Date.now() - start,
  })
  let parsed: any = null
  try { parsed = JSON.parse(text) } catch {}
  return { status: res.status(), body: parsed, text }
}

// ── Tests ────────────────────────────────────────────────────────────────────
test.describe('{Project} Backend', () => {
  test.afterAll(() => { saveCapture() })

  test('API health + core flows', async ({ page }) => {
    test.setTimeout(300_000)

    // ── Replace the steps below with your actual API calls ──

    // Health check
    const health = await api(page, 'GET', '/health', {}, 'health check')
    console.log('health:', health.status, health.body)

    // Example: create resource
    const created = await api(page, 'POST', '/items/my_collection', {
      data: { name: 'test item', status: 'draft' },
    }, 'create item')
    console.log('created:', created.status, created.body?.data?.id)

    // Example: read back
    const id = created.body?.data?.id
    if (id) {
      await api(page, 'GET', `/items/my_collection/${id}`, {}, 'read item')
      await api(page, 'DELETE', `/items/my_collection/${id}`, {}, 'cleanup')
    }

    await shot(page, 'API test complete')
  })
})
```

### Wiring to Report (any project)

```bash
# 1. Run frontend test → capture → report
npx playwright test e2e/{project}-frontend.spec.ts --reporter=line
node /path/to/dev-wantwant/scripts/generate-combined-report.js \
  --project rs \
  --name "Rs Project" \
  --story US-RS-001 \
  --card CARD-RS-001 \
  --mode frontend

# 2. Run backend test → capture → report
API_BASE=http://localhost:8080 API_TOKEN=your-token \
  npx playwright test e2e/{project}-backend.spec.ts --reporter=line
node /path/to/dev-wantwant/scripts/generate-combined-report.js \
  --project rs \
  --name "Rs Project" \
  --story US-RS-001 \
  --card CARD-RS-001 \
  --mode backend

# 3. View
open http://localhost:3000/test-report/rs
```

### Playwright Config (minimal, for new project)

Add or create `playwright.config.ts` in the project root:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
})
```

### Key Points for New Projects

| Question | Answer |
|----------|--------|
| Where do spec files go? | `e2e/` folder in project root |
| What controls output file? | `CAPTURE_OUTPUT` env var (default: `network-capture.json` or `backend-capture.json`) |
| What controls API base? | `API_BASE` env var |
| What controls auth token? | `API_TOKEN` env var |
| How to skip CORS? | Use `page.request.fetch()` (server-side) not browser fetch |
| Which generate-report.js to use? | The one in `dev-wantwant/scripts/` — it's project-agnostic |
| Report will appear at? | `http://localhost:3000/test-report/{project}` |

---

## Full Command Sequences (Copy-Paste)

### Frontend only

```bash
cd /Users/Zhuanz/Desktop/synque/saas-order-creation
npx playwright test e2e/upload.spec.ts --reporter=line
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode frontend
open http://localhost:3000/test-report/wantwant
```

### Backend only

```bash
# 1. Clean data
node /tmp/clear-d11-data.mjs

# 2. Run backend test
cd /Users/Zhuanz/Desktop/synque/saas-order-creation
export NO_PROXY=localhost,127.0.0.1
E2E_XLS_FIXTURE=e2e/fixtures/2025-08-04W.xls \
  npx playwright test e2e/upload-d11-flow.spec.ts \
  --timeout=1200000 --reporter=line

# 3. Generate report (backend section only)
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode backend
open http://localhost:3000/test-report/wantwant
```

### Full Pipeline (all 3 tabs)

```bash
# 1. Clean data
node /tmp/clear-d11-data.mjs

# 2. Run both specs
cd /Users/Zhuanz/Desktop/synque/saas-order-creation
export NO_PROXY=localhost,127.0.0.1
E2E_XLS_FIXTURE=e2e/fixtures/2025-08-04W.xls \
  npx playwright test e2e/upload.spec.ts e2e/upload-d11-flow.spec.ts \
  --timeout=1200000 --reporter=line

# 3. Generate report (all sections)
node scripts/generate-combined-report.js \
  --project wantwant --name "WantWant Upload" \
  --story US-WW-UPLOAD-002 --card CARD-WW-UPLOAD-002 \
  --mode pipeline

# 4. View
open http://localhost:3000/test-report/wantwant
```
