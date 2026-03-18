---
name: landing-page
description: Create landing pages with domain routing, CSS isolation, and navigation control. Use when adding new landing pages, setting up domain-to-page mappings, or configuring branded marketing pages.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Landing Page Management

Specialized skill for creating and managing branded landing pages with proper CSS isolation and domain routing.

## When to Use This Skill

This skill is automatically invoked when:
- Creating new landing pages
- Setting up domain-to-page routing (e.g., `example.com` → landing page)
- Configuring environment variable overrides for homepages
- Implementing CSS isolation for branded pages
- Adding pages to the landing showcase

**Triggers:**
- "Create landing page"
- "Add domain routing"
- "Map domain to page"
- "Landing page for [domain]"
- "Homepage routing"
- "CSS isolation"
- "Brand page"

## Quick Reference

### Current Domain Mappings

| Domain | Landing Page | Env Override |
|--------|--------------|--------------|
| `synque.hk` | synque-group-v2 | `synque-group-v2` |
| `homemiles.com` | haven | `haven` |
| `aticonsultant.com` | synque-ai | `synque-ai` |

### Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Domain detection & env variable routing |
| `app/layout-content.tsx` | Navigation visibility control |
| `app/landing/page.tsx` | Landing page showcase |
| `docs/LANDING_PAGES.md` | **Full documentation** |

## Creating a New Landing Page

### Step 1: Create Page Files

```bash
mkdir app/[landing-name]
touch app/[landing-name]/page.tsx
touch app/[landing-name]/[landing-name].css
```

### Step 2: Page Component Template

```tsx
'use client';
import { useEffect } from 'react';
import './[landing-name].css';

export default function LandingPage() {
  return (
    <div className="[landing-name]-container">
      {/* All content scoped within container */}
    </div>
  );
}
```

### Step 3: CSS Scoping (CRITICAL)

```css
/* All variables scoped to container - NEVER use :root */
.[landing-name]-container {
  --brand-primary: #your-color;
  --brand-secondary: #your-color;
  width: 100%;
  overflow-x: hidden;
}

/* Scoped utilities */
.[landing-name]-container .text-primary {
  color: var(--brand-primary);
}

/* Body styles only with :has() */
body:has(.[landing-name]-container) {
  background: var(--brand-background);
}
```

### Step 4: Add Domain Routing

Edit `app/page.tsx`:

```tsx
// 1. Add import
import YourLandingPage from "./[landing-name]/page"

// 2. Add domain detection (in !homepageType block)
if (domain === 'yourdomain.com' || domain.endsWith('.yourdomain.com')) {
  return <YourLandingPage />
}

// 3. Add env override
if (homepageType === '[landing-name]') {
  return <YourLandingPage />
}
```

### Step 5: Hide Navigation

Edit `app/layout-content.tsx`:

```tsx
const isYourLandingPage = pathname === '/[landing-name]'
// OR for multiple variants:
const isYourLandingPage = pathname?.startsWith('/[landing-name]')

if (isYourLandingPage) {
  return <>{children}</> // No global navigation
}
```

### Step 6: Add to Showcase

Edit `app/landing/page.tsx`:

```tsx
{
  id: '[landing-name]',
  name: 'Your Landing',
  description: 'Description here',
  path: '/[landing-name]',
  envValue: '[landing-name]',
  category: 'tech', // or 'travel', 'brand'
  color: 'from-blue-500 to-cyan-500',
  tags: ['Tag1', 'Tag2']
}
```

### Step 7: Update Documentation

Update these files:
- `docs/LANDING_PAGES.md` - Add to portfolio table
- `CLAUDE.md` - Add to domain mappings table (if domain routing added)

### Step 8: Create Brand README (REQUIRED)

Every landing page **must** have a corresponding `docs/[brand]/README.md`.
This is non-negotiable — the audit skill checks for it.

Required sections (copy from template below):
- `## Context` — Purpose, target audience, key value proposition
- `## Overview` — Table with Client, Brand, Domain, Route, Status, Tagline
- `## SEO` — Meta title (≤60 chars), meta description (≤160 chars), keywords, OG image, domain config status, layout.tsx status
- `## File Structure` — Directory tree
- `## Tech Stack & Notable Features` — Table
- `## Page Sections` — Table
- `## Styling Notes` — CSS isolation details
- `## Changelog` — Date-ordered table with card references
- `*Last Updated:*` — Footer line

**Template:**
```markdown
# [Brand] - Landing Page

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
| **Status** | Active |
| **Tagline** | "[tagline]" |

## SEO

| Field | Value |
|-------|-------|
| **Meta Title** | "[≤60 chars]" |
| **Meta Description** | "[≤160 chars]" |
| **Keywords** | keyword1, keyword2 |
| **OG Image** | TBD or `/public/[brand]/og.png` |
| **Domain Config** | `lib/domain-site-config.ts` ✓/✗ |
| **Runtime Metadata** | `app/[route]/layout.tsx` ✓/✗ |

## File Structure

\`\`\`
app/[route]/
├── page.tsx
├── layout.tsx
└── [route].css
\`\`\`

## Tech Stack & Notable Features

| Feature | Implementation |
|---------|---------------|

## Page Sections

| Section | Content |
|---------|---------|

## Styling Notes

## Changelog

| Date | Change | Card |
|------|--------|------|
| YYYY-MM-DD | Initial creation | CARD-XXX |

## Related

- [LANDING_PAGES.md](../LANDING_PAGES.md)

---

*Last Updated: YYYY-MM-DD*
```

> **Audit:** Run `/landing audit` to verify all 5 canonical brands comply.

## CSS Isolation Rules

### DO's
- Scope ALL variables to container class
- Use unique variable names with page prefix
- Use `:has()` for body styles
- Test other pages after changes

### DON'Ts
- NEVER use `:root` for page variables
- NEVER create global utility classes
- NEVER use generic names like `--primary`
- NEVER apply body styles without `:has()`

## Testing Checklist

- [ ] Landing page displays correctly at `/[landing-name]`
- [ ] Environment variable routing works (`NEXT_PUBLIC_HOMEPAGE_TYPE=[landing-name]`)
- [ ] Domain routing works (if configured)
- [ ] Global navigation is hidden
- [ ] No CSS conflicts with `/app` or other pages
- [ ] Page appears in `/landing` showcase
- [ ] Mobile responsive

## Full Documentation

For comprehensive details including:
- Migration workflows
- Context provider patterns
- Troubleshooting guide
- Performance optimization

**See:** `docs/LANDING_PAGES.md`
