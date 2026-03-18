# Progress Tracking

## Overview

Progress tracking keeps management informed of documentation and development status via the `/prd` page (Progress tab).

**File:** `lib/progress-data.ts`
**UI:** `/prd` → Progress tab

## When to Update

| Action Completed | Update Required |
|------------------|-----------------|
| Created new PRD | Add to `PRD_STATUSES` |
| Completed documentation task | Mark item in `EVOLUTION_PHASES` |
| Created Story or Card | Add to `LAYER_DOCUMENTS` |
| Found unexpected issue | Add to `DISCOVERED_GAPS` |
| Resolved a gap | Update gap status to 'resolved' |
| Completed undocumented feature | Update `UNDOCUMENTED_FEATURES` status |

## Multi-Project Support

This codebase tracks documentation across **three projects**:

| Project | ID | Description | Status |
|---------|-----|------------|--------|
| **WW (WantWant)** | `ww` | Sales order management (this repo) | Active |
| **RK (RewardKoi)** | `rk` | B2B2C e-voucher platform (external repo) | Handover |
| **LMS (Loan Mgmt)** | `lms` | Post-lending servicing system (prd-lms branch) | Active |

### PROJECT_PROGRESS

Track overall progress per project:

```typescript
export const PROJECT_PROGRESS: ProjectProgress[] = [
  {
    id: 'ww',                             // ww | rk | lms
    name: 'WantWant (WW)',
    description: 'Sales order management system - this repo',
    repository: '/Users/mac/Downloads/saas-sales-order',
    docsPath: 'docs/prds/',
    status: 'active',                     // active | handover | completed (PROJECT lifecycle, NOT doc status)
    features: {
      undocumented: 4,                    // Auto-calculated from WW_UNDOCUMENTED_FEATURES
      documented: 3,
      verified: 0,
    },
    lastUpdated: '2026-01-20',
  },
]
```

**When to update:**
- Add new project when starting documentation for a new codebase
- Update `lastUpdated` when making significant progress
- Status changes: `active` → `handover` → `completed` (project lifecycle only)

## Data Structures

### PRD_STATUSES

Track accuracy and verification status of PRDs:

```typescript
// lib/progress-data.ts
export const PRD_STATUSES: PRDStatus[] = [
  // Add after creating a new PRD
  {
    id: 'my-feature',                    // Must match PRD frontmatter id
    title: 'My Feature',
    codeExists: true,                    // Does implementation exist?
    prdAccurate: 'accurate',             // accurate | partial | outdated | missing | unknown
    testsExist: false,                   // Are there tests?
    lastVerified: '2025-01'              // When was accuracy last checked?
  },
]
```

### EVOLUTION_PHASES

Track project documentation milestones across multiple projects:

```typescript
export const EVOLUTION_PHASES: EvolutionPhase[] = [
  {
    name: 'WW Phase 2: Consolidation',
    status: 'current',                   // current | completed | planned (PHASE lifecycle, NOT doc status)
    project: 'ww',                       // ww | rk | lms | shared
    items: [
      // Add new tasks as completed
      { task: 'AI Workflow skill created', completed: true, link: '/prd/ai-workflow' },
      { task: 'Verify Auth PRD accuracy', completed: false },
    ]
  },
  {
    name: 'LMS Phase 2: Implementation Planning',
    status: 'current',
    project: 'lms',
    items: [
      { task: 'Add LMS tracking to progress-data.ts', completed: true },
      { task: 'Verify PRDs appear in /api/ai-context', completed: true },
      { task: 'Update UI to support LMS project filtering', completed: true },
    ]
  },
]
```

### LAYER_DOCUMENTS

Track Story → Card → PRD relationships:

```typescript
export const LAYER_DOCUMENTS: LayerDocument[] = [
  // Stories
  {
    type: 'story',
    id: 'US-001',
    title: 'Developer Documentation Access',
    path: 'docs/stories/US-001.md',
    link: '/docs/stories/US-001',
    status: 'done',                      // Uses canonical doc status: draft | pending | in-progress | done | blocked | ready
  },
  // Cards (link to parent story)
  {
    type: 'card',
    id: 'CARD-001',
    title: 'Create Order Management PRD',
    path: 'docs/cards/CARD-001.md',
    link: '/docs/cards/CARD-001',
    status: 'done',                      // Canonical doc status
    parentId: 'US-001',                  // Links to story
  },
  // PRDs
  {
    type: 'prd',
    id: 'order-management',
    title: 'Order Management',
    path: 'docs/prds/PRD-ORDER-MANAGEMENT.md',
    link: '/prd/order-management',
    status: 'done',                      // Canonical doc status
  },
]
```

### DISCOVERED_GAPS

Track surprises found during development:

```typescript
export const DISCOVERED_GAPS: DiscoveredGap[] = [
  // Open gap (needs action)
  {
    id: 'gap-004',
    title: 'Payment System Undocumented',
    discovered: '2025-01',
    resolved: null,
    status: 'open',
    expected: 'Payment feature has PRD',
    reality: '/app/payment/ and /payments/ exist with NO documentation',
    actionRequired: 'Investigate and create Payment PRD',
  },
  // Resolved gap
  {
    id: 'gap-001',
    title: 'Order Management PRD Missing',
    discovered: '2024-01',
    resolved: '2024-01',
    status: 'resolved',
    expected: 'PRD-order.md covers order system',
    reality: 'It only covers public order viewing; 11 components had NO PRD',
    resolution: 'Created PRD-ORDER-MANAGEMENT.md',
  },
]
```

### UNDOCUMENTED_FEATURES

Track features needing documentation across multiple projects:

```typescript
// WW (WantWant) - This repo
export const WW_UNDOCUMENTED_FEATURES: UndocumentedFeature[] = [
  {
    feature: 'Order Management',
    codeLocation: '/app/order/, 11 components',
    complexity: 'HIGH',                  // HIGH | MEDIUM | LOW
    priority: 'CRITICAL',                // CRITICAL | HIGH | MEDIUM | LOW
    status: 'done',                      // pending | in-progress | done (FEATURE tracking, not doc status)
    project: 'ww'                        // ww | rk | lms
  },
]

// RK (RewardKoi) - External repo
export const RK_UNDOCUMENTED_FEATURES: UndocumentedFeature[] = [
  {
    feature: 'E-Voucher Management',
    codeLocation: '/e-voucher',
    complexity: 'HIGH',
    priority: 'HIGH',
    status: 'pending',                    // pending | in-progress | done (FEATURE tracking)
    project: 'rk'
  },
]

// LMS (Loan Management System) - This repo (prd-lms branch)
export const LMS_UNDOCUMENTED_FEATURES: UndocumentedFeature[] = [
  {
    feature: 'Application Intake',
    codeLocation: 'PRD-012-lms-application-intake.md',
    complexity: 'HIGH',
    priority: 'HIGH',
    status: 'done',                       // pending | in-progress | done (FEATURE tracking)
    project: 'lms'
  },
]

// Combined export
export const UNDOCUMENTED_FEATURES: UndocumentedFeature[] = [
  ...WW_UNDOCUMENTED_FEATURES,
  ...RK_UNDOCUMENTED_FEATURES,
  ...LMS_UNDOCUMENTED_FEATURES,
]
```

## Workflow: After Creating a PRD

1. **PRD file created** (auto-discovered via API)
   ```
   docs/prds/PRD-MY-FEATURE.md  ← YAML frontmatter = source of truth
   ```

2. **Update progress-data.ts**
   ```typescript
   // 1. Add to PRD_STATUSES
   { id: 'my-feature', title: 'My Feature', codeExists: true, prdAccurate: 'accurate', testsExist: false, lastVerified: '2025-01' },

   // 2. Add to LAYER_DOCUMENTS (if part of Story hierarchy)
   { type: 'prd', id: 'my-feature', title: 'My Feature', path: 'docs/prds/PRD-MY-FEATURE.md', link: '/prd/my-feature', status: 'done' },

   // 3. Mark Evolution task complete (if applicable)
   { task: 'Create My Feature PRD', completed: true, link: '/prd/my-feature' },
   ```

## Workflow: After Creating Story/Card

1. **Add to LAYER_DOCUMENTS**
   ```typescript
   // Story (filename = ID.md, no slug suffix)
   { type: 'story', id: 'US-XXX', title: 'Story Title', path: 'docs/stories/US-XXX.md', link: '/docs/stories/US-XXX', status: 'in-progress' },

   // Card (filename = ID.md, no slug suffix)
   { type: 'card', id: 'CARD-XXX', title: 'Card Title', path: 'docs/cards/CARD-XXX.md', link: '/docs/cards/CARD-XXX', status: 'in-progress', parentId: 'US-XXX' },
   ```

## Workflow: Found a Gap

When you discover something unexpected:

```typescript
// Add to DISCOVERED_GAPS
{
  id: 'gap-XXX',
  title: 'Short description of gap',
  discovered: '2025-01',
  resolved: null,
  status: 'open',
  expected: 'What you expected to find',
  reality: 'What you actually found',
  actionRequired: 'What needs to be done',
}
```

When you resolve it:
```typescript
{
  ...
  resolved: '2025-01',
  status: 'resolved',
  resolution: 'How it was fixed',
}
```

## What Displays Where

| Data | UI Location |
|------|-------------|
| `PRD_STATUSES` | Progress tab → PRD Status Matrix |
| `EVOLUTION_PHASES` | Progress tab → Evolution Timeline |
| `LAYER_DOCUMENTS` | Progress tab → Layer Structure |
| `DISCOVERED_GAPS` | Progress tab → Discovered Gaps |
| `UNDOCUMENTED_FEATURES` | Progress tab → Undocumented Features |
| `NEXT_ACTIONS` | Progress tab → Next Actions |
| `PROGRESS_METRICS` | Progress tab → Progress Metrics |

## Important Notes

### PRD Count Source of Truth

- **PRD list** comes from API (`/api/prd/list`) which reads YAML frontmatter
- **PRD_STATUSES** is for tracking accuracy, not for listing PRDs
- Creating a PRD = just create markdown file with YAML frontmatter

### No Need to Update prd-data.ts

The old `lib/prd-data.ts` is now a fallback only. PRDs are auto-discovered from:
```
docs/prds/*.md      ← Primary (YAML frontmatter)
docs/PRD-*.md       ← Legacy location
```

### Verification Checklist

After updating `progress-data.ts`:
- [ ] Visit `/prd` → Progress tab
- [ ] Verify Evolution Timeline shows your task
- [ ] Verify PRD Status Matrix is accurate
- [ ] Verify Layer Structure shows new docs
