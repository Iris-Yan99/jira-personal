---
name: landing-audit
description: Audit the 5 canonical landing pages for README compliance (context, changelog, SEO) and technical SEO hygiene. Triggers on "landing audit".
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

# Landing Page Audit

Systematic compliance audit for the 5 canonical landing pages.
Run when the user says **"landing audit"**.

---

## Canonical Pages

| Brand | Route | Domain | Docs README |
|-------|-------|--------|-------------|
| Capy Digital | `/capydigital` | `capydigital.com` | `docs/capydigital/README.md` |
| HomeMiles (Haven) | `/haven` | `homemiles.com` | `docs/homemiles/README.md` |
| RentSmart | `/rentsmart` | _(TBD)_ | `docs/rentsmart/README.md` |
| Synque | `/synque-group-v2` | `synque.hk` | `docs/synque/README.md` |
| Deep Travel | `/deeptravel` | `deeptravel.synque.app` | `docs/deeptravel/README.md` |

---

## Scoring Formula

**24 checks per brand. 1 point each. Maximum 24/24.**

| Category | Checks | Points |
|----------|--------|--------|
| README Compliance | 6 checks | 6 |
| Technical SEO | 5 checks | 5 |
| Content SEO | 6 checks | 6 |
| CSS Isolation | 2 checks | 2 |
| Routing | 1 check | 1 |
| CTA Alignment | 4 checks | 4 |
| **Total** | **24 checks** | **24** |

Score bands: 22–24 = Pass ✓ · 16–21 = Review · ≤15 = Fail ✗

---

## Audit Workflow

Run all phases for each of the 5 brands in sequence.

---

### Phase 0 — Baseline Extraction (before/after delta)

Before running any checks, record the last known score for each brand.

For each brand:
```
Grep pattern="\d+/2[04]" in docs/[brand]/README.md (output_mode=content)
→ Find all score mentions (e.g. "19/20", "18/24")
→ Take the LAST match found → this is "before score"
→ If no match → before score = "–" (first ever audit)
```

Record all 5 before-scores. They will be compared against after-scores in the Phase 7 report.

**Changelog update rule:** After the audit, only add a changelog entry to a brand README if its score changed (Δ ≠ 0). Skip if unchanged — avoid noise.

---

### Phase 1 — README Compliance (6 points)

Read `docs/[brand]/README.md`. Award 1 point per section present:

| # | Check | How to verify |
|---|-------|---------------|
| 1 | `## Context` section exists | Grep `"## Context"` in README |
| 2 | `## Overview` section exists | Grep `"## Overview"` in README |
| 3 | `## SEO` section exists | Grep `"## SEO"` in README |
| 4 | `## Changelog` section exists | Grep `"## Changelog"` in README |
| 5 | `## File Structure` section exists | Grep `"## File Structure"` in README |
| 6 | `*Last Updated:*` footer present | Grep `"Last Updated"` in README |

---

### Phase 2 — Technical SEO (5 points)

| # | Check | Tool | Pass condition |
|---|-------|------|----------------|
| 7 | Domain registered in `lib/domain-site-config.ts` | Grep `[brand-domain]` in `lib/domain-site-config.ts` | ≥1 match |
| 8 | `app/[route]/layout.tsx` exists | Glob `app/[route]/layout.tsx` | File found |
| 9 | `generateMetadata()` exported from layout | Grep `"generateMetadata"` in `app/[route]/layout.tsx` | ≥1 match |
| 10 | `openGraph` metadata block present | Grep `"openGraph"` in `app/[route]/layout.tsx` | ≥1 match |
| 11 | `alternates.canonical` set | Grep `"canonical"` in `app/[route]/layout.tsx` | ≥1 match |

**Bonus check (not scored):** Icon file exists in `public/`
```
Glob pattern="public/[icon-filename]"  → warn if not found, don't deduct
```
Reason: icon path comes from `domain-site-config.ts`. Use Grep to find the icon value, then Glob to confirm the file exists. Report as a warning if missing.

---

### Phase 3 — Content SEO (6 points)

Static analysis of `app/[route]/` directory (page.tsx and all component files).
Always grep the entire `app/[route]/` directory, not just `page.tsx`, because many pages split content into `components/`.

| # | Check | Tool | Pass condition |
|---|-------|------|----------------|
| 12 | Exactly one `<h1` tag across the whole route | Grep `"<h1\|motion\.h1"` path=`app/[route]/` | Count = 1 |
| 13 | No H3 without H2 (h2→h3 level skip) | Grep `"<h3"` count > 0 → Grep `"<h2"` must also be > 0 | H2 exists whenever H3 exists |
| 14 | No H4 without H3 (h3→h4 level skip) | Grep `"<h4"` count > 0 → Grep `"<h3"` must also be > 0 | H3 exists whenever H4 exists |
| 15 | `<img` tags have `alt=` attribute | Grep `"<img"` → each instance must have `alt=` | 0 violations |
| 16 | `<Image` (Next.js) tags have `alt=` | Grep `"<Image"` without `alt=` → count must be 0 | 0 violations |
| 17 | `noindex` NOT set | Grep `"noindex\|index: false"` in `app/[route]/layout.tsx` | 0 matches = pass |

**Checking `<img` alt (check 15):**
```
Grep pattern="<img(?![^>]*\balt=)" path="app/[route]/"
→ 0 matches = pass. Each match is a violation to report.
```
If the page uses no `<img>` tags at all (only `<Image>`), check 15 = pass by default.

**Checking `<Image>` alt (check 16):**
```
Grep pattern='<Image(?![^>]*\balt=)' path="app/[route]/"
→ 0 matches = pass.
```
Note: TypeScript enforces `alt` on Next.js `<Image>` as a required prop, so failures here indicate a pre-existing type error.

**Checking heading hierarchy (checks 13 + 14):**
```
Grep "<h2" path="app/[route]/" → n2
Grep "<h3" path="app/[route]/" → n3
Grep "<h4" path="app/[route]/" → n4

Check 13: if n3 > 0 and n2 = 0 → FAIL
Check 14: if n4 > 0 and n3 = 0 → FAIL
```
These are distinct checks. Do not merge them.

**Note on `<motion.h1>`:** Framer Motion `<motion.h1>` renders as a semantic `<h1>` in the DOM. Include it in the H1 count by searching for both `<h1` and `motion\.h1`.

---

### Phase 4 — CSS Isolation (2 points)

| # | Check | Tool | Pass condition |
|---|-------|------|----------------|
| 18 | No `:root` selector in brand CSS file | Grep `":root"` in `app/[route]/[route].css` | 0 matches |
| 19 | Body styles use `:has()` selector | Grep `":has("` in `app/[route]/[route].css` | ≥1 match (if page sets body styles) |

**N/A rule for check 19:** Grep `"body"` in the CSS file first.
- If 0 `body` selectors found → page has no body-level styles → award the point.
- If `body` selectors exist → they must use `:has()` → grep `:has(` → 0 matches = FAIL.

---

### Phase 5 — Routing (1 point)

| # | Check | Tool | Pass condition |
|---|-------|------|----------------|
| 20 | Brand routed in `app/page.tsx` | See below | ≥1 match |

**Per-brand routing check:**
- Capy Digital: Grep `capydigital` in `app/page.tsx`
- HomeMiles: Grep `homemiles` in `app/page.tsx`
- RentSmart: No domain registered (TBD) → grep env override `rentsmart` in `app/page.tsx` instead
- Synque: Grep `synque.hk` in `app/page.tsx`
- Deep Travel: Grep `deeptravel` in `app/page.tsx`

If the domain is listed as TBD in the Canonical Pages table, check only for the env override string (`homepageType === '[route]'`). A missing domain + missing env override = 0 points.

---

### Phase 6 — CTA Alignment (4 points)

Verify each brand's CTA is wired to the PRD-LEAD-ATTRIBUTION standard.
Reference: `docs/prds/PRD-LEAD-ATTRIBUTION.md` · Infrastructure: `/api/contact`, `/api/lead-clicks`, `lib/utm-capture.ts`

| # | Check | Grep target in `app/[route]/` | Pass condition |
|---|-------|-------------------------------|----------------|
| 21 | Primary CTA present | `href=\|onClick.*[Ss]ubmit\|wa\.me\|mailto:` | ≥1 real action link or submit handler found |
| 22 | Lead capture endpoint wired | `/api/contact\|/api/lead-clicks\|wa\.me` | ≥1 match |
| 23 | Brand `site:` tag in API call | `site.*[brand]\|["']site["']` | ≥1 match (e.g. `site: "capydigital"`) |
| 24 | UTM capture in place | `utm-capture\|utm_source\|useSearchParams` | ≥1 match |

**Check 21 detail:** Count only actionable CTAs. A `<button>` with no `href` and no `onClick` = fail. A `<button onClick={handleSubmit}>` or `<a href="...">` = pass.

**Check 22 per brand:**
- `/api/contact` in the route files → covers form submissions
- `wa.me` → covers WhatsApp CTA
- `/api/lead-clicks` → covers click tracking

**Check 23 detail:** Look for the brand name passed as a `site` field in API calls, e.g.:
```js
site: "capydigital"   // Capy Digital
site: "synque"        // Synque
site: "homemiles"     // HomeMiles
```

**Check 24 detail:** Look for:
- `import { ... } from '@/lib/utm-capture'` → UTM capture utility imported
- `utm_source` / `utm_medium` parameters read from URL
- `useSearchParams` hook used to capture UTMs at page load

**CTA checks are NOT auto-fixable.** Failures go to Phase 8 under "Requires product decision" with a recommendation linked to the specific PRD-LEAD-ATTRIBUTION pattern.

---

### Phase 7 — Report

Output this table (one row per brand). `Before` = score extracted in Phase 0. `Δ` = After − Before (normalized to /24 if Before was /20 — note scale change).

```
## Landing Audit Report — YYYY-MM-DD

| Brand        | README (6) | Tech SEO (5) | Content SEO (6) | CSS (2) | Routing (1) | CTA (4) | Total /24 | Before | Δ  | Status |
|--------------|------------|--------------|-----------------|---------|-------------|---------|-----------|--------|----|--------|
| Capy Digital | ?          | ?            | ?               | ?       | ?           | ?       | ?/24      | ?/20   | +? | …      |
| HomeMiles    | ?          | ?            | ?               | ?       | ?           | ?       | ?/24      | ?/20   | +? | …      |
| RentSmart    | ?          | ?            | ?               | ?       | ?           | ?       | ?/24      | ?/20   | +? | …      |
| Synque       | ?          | ?            | ?               | ?       | ?           | ?       | ?/24      | ?/20   | +? | …      |
| Deep Travel  | ?          | ?            | ?               | ?       | ?           | ?       | ?/24      | ?/20   | +? | …      |

> Note: Previous scores were /20 (before CTA category added). Δ reflects raw point change; scale now /24.

### Failures & Warnings

**[Brand]:**
- README: Missing `## Changelog` (-1)
- Technical SEO: No `alternates.canonical` in layout.tsx (-1)
- Content SEO: 3 `<img>` tags missing `alt=` (-1). H3 found without H2 (-1)
- CTA: No lead capture endpoint wired (-1). No UTM capture (-1)
- Warning: Icon `/haven-logo.png` not found in public/

### Recommended Actions (ordered by severity)

1. [Brand] — Fix X: [specific instruction]
2. ...
```

---

### Phase 8 — Auto-Fix (confirm with user first)

If the user asks to fix failures, apply in this order:

1. **README gaps** → Add missing sections using the README Standard template below
2. **Domain not registered** → Add entry to `lib/domain-site-config.ts`
3. **No layout.tsx** → Create with `generateMetadata()` template
4. **Missing openGraph / canonical** → Edit `layout.tsx` to add fields
5. **CSS :root leakage** → Move variables to container scope
6. **Routing missing** → Add domain detection + env override to `app/page.tsx`
7. **Alt text missing** → Add `alt=""` (decorative) or descriptive `alt="..."` to each `<img>`
8. **Heading hierarchy** → Do NOT auto-fix — report to user, requires content judgement
9. **CTA alignment (checks 21–24)** → Do NOT auto-fix — requires product decision. Link to `PRD-LEAD-ATTRIBUTION` and describe which check failed and the pattern needed.

**Template for `layout.tsx` (with canonical):**
```tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getSiteConfig } from '@/lib/domain-site-config'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const domain = headersList.get('host') || ''
  const config = getSiteConfig(domain)

  return {
    title: config.name,
    description: config.description,
    icons: { icon: config.icon },
    alternates: {
      canonical: `https://${domain}/`,
    },
    openGraph: {
      title: config.name,
      description: config.description,
      type: 'website',
      url: `https://${domain}/`,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.name,
      description: config.description,
    },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

## README Standard

Every `docs/[brand]/README.md` must follow this structure (required sections only — add others as needed):

```markdown
# [Brand Name] - Landing Page

## Context

[2-4 sentences: What is this product? Who is the target audience?
What is the core value proposition? Why does this landing page exist?]

## Overview

| Field | Value |
|-------|-------|
| **Client** | [Client name] |
| **Brand** | [Brand name] |
| **Domain** | `[domain.com]` |
| **Route** | `/[route]` |
| **Status** | Active / Draft / Archived |
| **Tagline** | "[tagline]" |

## SEO

| Field | Value |
|-------|-------|
| **Meta Title** | "[≤60 chars]" |
| **Meta Description** | "[≤160 chars]" |
| **Keywords** | keyword1, keyword2, keyword3 |
| **OG Image** | `/public/[brand]/og.png` or TBD |
| **Domain Config** | `lib/domain-site-config.ts` ✓/✗ |
| **Runtime Metadata** | `app/[route]/layout.tsx` ✓/✗ |
| **Canonical** | `https://[domain]/` ✓/✗ |

## CTA

| Field | Value |
|-------|-------|
| **Primary CTA** | "[Button text]" → [form / WhatsApp / email / page] |
| **Lead Endpoint** | `/api/contact` ✓/✗ · `/api/lead-clicks` ✓/✗ · `wa.me` ✓/✗ |
| **Brand Site Tag** | `site: "[brand]"` ✓/✗ |
| **UTM Capture** | `lib/utm-capture.ts` ✓/✗ |
| **PRD Reference** | [PRD-LEAD-ATTRIBUTION](../prds/PRD-LEAD-ATTRIBUTION.md) |

## File Structure

\`\`\`
app/[route]/
├── page.tsx
├── layout.tsx
├── [route].css
└── components/
\`\`\`

## Tech Stack & Notable Features

| Feature | Implementation |
|---------|---------------|
| ... | ... |

## Page Sections

| Section | Nav Anchor | Content |
|---------|-----------|---------|
| ... | ... | ... |

## Styling Notes

- CSS isolated via `[route].css` — does not inherit global styles
- [key design tokens, font, color palette]

## Changelog

| Date | Change | Card |
|------|--------|------|
| YYYY-MM-DD | Initial creation | CARD-XXX |

## Related

- [LANDING_PAGES.md](../LANDING_PAGES.md)
- [domain-site-config.ts](../../lib/domain-site-config.ts)

---

*Last Updated: YYYY-MM-DD*
```

---

## Enforcement in landing-page Skill

When the `landing-page` skill creates a new landing page, it **must** also create `docs/[brand]/README.md` following the README Standard above. This is Step 8 of the creation workflow.
