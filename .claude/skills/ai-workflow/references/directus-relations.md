# Directus Relations - Complete Reference

**Pattern**: M2O/O2M Relations with Dual-Field Strategy
**Last Updated**: 2026-01-26

---

## ⚠️ CRITICAL WARNING

**Creating a relational field requires TWO separate API calls:**

1. **POST /fields/{collection}** - Creates the database column
2. **POST /relations** - Creates the relation metadata

**DO NOT assume** that setting `interface: 'select-dropdown-m2o'` creates the relation. It only sets the UI interface. You **MUST** call `/relations` API separately.

**See "CRITICAL: Creating Relations in Directus" section below for complete examples.**

---

## Overview

This reference explains how Directus relations work and how to implement them properly for PRD/Story/Card hierarchy.

---

## Core Concepts

### 1. The Two Sides of a Relation

Every Directus M2O/O2M relation has **two sides**:

```
PRD (id=3)  ←──────────  Story (id=1)
   ↑                        ↓
   │                   business_requirement_id = 3
   │                   (M2O - Foreign Key in database)
   │
 stories = [1, 2, 3]
 (O2M - Virtual field, computed)
```

**M2O side** (Many-to-One):
- Field: `story.business_requirement_id`
- Type: Integer
- Stores: The actual FK value (3)
- Location: Database column
- **Where data lives**

**O2M side** (One-to-Many):
- Field: `prd.stories`
- Type: Virtual/Alias
- Stores: Nothing (computed on-the-fly)
- Location: Directus metadata only
- **Computed from M2O FKs**

### 2. How O2M Fields Work

O2M fields don't store data - they're **computed** by Directus:

```sql
-- When you query prd.stories, Directus runs:
SELECT id FROM story WHERE business_requirement_id = 3
-- Returns: [1, 2, 3]
```

The O2M field is a **reverse lookup** - it finds all items that point to this item.

---

## Dual-Field Strategy

To support both Directus relations and markdown compatibility, we use **two fields**:

### Example: Story → PRD Relation

**Slug field** (for markdown):
- Field: `story.business_requirement`
- Type: String
- Value: `"PRD-001"` (slug)
- Purpose: YAML frontmatter compatibility

**ID field** (for Directus):
- Field: `story.business_requirement_id`
- Type: Integer
- Value: `3` (prd.id)
- Purpose: Proper database FK relation

Both fields coexist and are kept in sync:
- Migration scripts populate both fields
- `sync-slug-to-id.ts` resolves slugs to IDs
- Markdown files use slugs, Directus uses IDs

---

## Field Configuration

### M2O Field (Many-to-One)

**Database**: Integer column with FK constraint

**Metadata**:
```typescript
{
  type: 'integer',
  meta: {
    interface: 'select-dropdown-m2o',  // Dropdown UI
    special: ['m2o'],                   // Mark as M2O relation
    options: {
      template: '{{slug}} - {{title}}'  // How items display in dropdown
    },
    display: 'related-values',
    display_options: {
      template: '{{slug}} - {{title}}'
    }
  },
  schema: {
    foreign_key_table: 'prd',
    foreign_key_column: 'id'
  }
}
```

**UI Behavior**: Shows dropdown to select related item

### O2M Field (One-to-Many)

**Database**: No column (virtual/alias field only)

**Metadata**:
```typescript
{
  type: 'alias',
  meta: {
    interface: 'list-o2m',              // List UI component
    special: ['o2m'],                    // Mark as O2M relation
    options: {
      template: '{{slug}} - {{title}}',  // How items display
      enableCreate: true,                // ✅ Allow creating new items
      enableSelect: true                 // ✅ Allow linking existing items
    },
    display: 'related-values',
    display_options: {
      template: '{{slug}} - {{title}}'
    },
    readonly: false,                     // ✅ Make editable (not read-only)
    hidden: false
  },
  schema: null  // No database schema for virtual fields
}
```

**UI Behavior**: Shows list with +/- buttons to create/link items

---

## Making O2M Fields Editable

By default, O2M fields are **read-only**. To make them editable:

### Required Options

```typescript
{
  options: {
    enableCreate: true,  // Allow creating new related items
    enableSelect: true   // Allow linking existing items
  },
  readonly: false        // Make field editable
}
```

### What This Enables

**From PRD detail page**:
1. Click on `stories` field
2. Click **"+ Create New"** → Opens Story form, sets `business_requirement_id` automatically
3. Click **"+ Select Existing"** → Choose from dropdown, links it to this PRD

**From Story detail page**:
1. Click on `cards_relation` field
2. Click **"+ Create New"** → Opens Card form, sets `story_id` automatically
3. Click **"+ Select Existing"** → Choose from dropdown, links it to this Story

### Behind the Scenes

When you create/link from O2M field:
- Directus opens the related item's form (Story/Card)
- User fills in fields
- Directus **automatically sets the FK field** (M2O side)
- Saves the item
- O2M field updates automatically (it's computed)

You're not actually editing the O2M field - you're editing the M2O FK, but Directus makes it feel like you're editing from the "one" side.

---

## API Query Syntax

### Basic Queries (IDs only)

```bash
# Get PRD with Story IDs
curl "http://localhost:8055/items/prd/3?fields=id,slug,stories"
# Returns: {"stories": [1, 2, 3]}

# Get Story with Card IDs
curl "http://localhost:8055/items/story/1?fields=id,slug,cards_relation"
# Returns: {"cards_relation": [1, 2]}
```

### Expanded Queries (Full objects)

```bash
# Get PRD with full Story objects
curl "http://localhost:8055/items/prd/3?fields=id,slug,stories.*"
# Returns: {"stories": [{"id": 1, "slug": "US-002", "title": "...", ...}]}

# Get Story with specific Card fields
curl "http://localhost:8055/items/story/1?fields=id,slug,cards_relation.id,cards_relation.slug,cards_relation.title"
# Returns: {"cards_relation": [{"id": 1, "slug": "...", "title": "..."}]}
```

### Deep Expansion (Multi-level)

```bash
# Get full chain: PRD → Stories → Cards
curl "http://localhost:8055/items/prd/3?fields=slug,title,stories.slug,stories.title,stories.cards_relation.slug,stories.cards_relation.title"

# Returns:
{
  "slug": "PRD-001",
  "title": "Create Order",
  "stories": [
    {
      "slug": "US-002",
      "title": "Story Analysis Template",
      "cards_relation": [
        {
          "slug": "order-create-page",
          "title": "Order Creation Page Layout & Routing"
        }
      ]
    }
  ]
}
```

### Syntax Rules

- `fields=*` - All fields of current item
- `fields=field1,field2` - Specific fields
- `fields=relation_field.*` - Expand relation with all fields
- `fields=relation_field.field1,relation_field.field2` - Expand with specific fields
- Can chain: `fields=rel1.rel2.field` for deep expansion

---

## CRITICAL: Creating Relations in Directus

### The Two-Step Process

**⚠️ IMPORTANT**: Creating a relational field requires TWO API calls:

#### Step 1: Create the Field (Database Column)
```typescript
// POST /fields/{collection}
await fetch(`${DIRECTUS_URL}/fields/card`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    field: 'story_id',
    type: 'integer',
    schema: { is_nullable: true },
    meta: {
      interface: 'select-dropdown-m2o',
      options: { template: '{{slug}} - {{title}}' },
      note: 'Foreign key to story.id'
    }
  })
});
```

This creates the MySQL column but **does NOT create the relation**.

#### Step 2: Create the Relation (Metadata)
```typescript
// POST /relations
await fetch(`${DIRECTUS_URL}/relations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    collection: 'card',           // Many side
    field: 'story_id',            // FK field
    related_collection: 'story',  // One side
    meta: {
      many_collection: 'card',
      many_field: 'story_id',
      one_collection: 'story',
      one_field: null,            // Set this later for O2M
      one_deselect_action: 'nullify'
    },
    schema: {
      constraint_name: 'card_story_id_foreign',
      table: 'card',
      column: 'story_id',
      foreign_key_table: 'story',
      foreign_key_column: 'id',
      on_update: 'NO ACTION',
      on_delete: 'SET NULL'
    }
  })
});
```

This creates the Directus relation metadata and FK constraint.

#### Step 3: Add O2M Field (Reverse Side)
```typescript
// POST /fields/story
await fetch(`${DIRECTUS_URL}/fields/story`, {
  method: 'POST',
  body: JSON.stringify({
    field: 'cards',
    type: 'alias',
    meta: {
      interface: 'list-o2m',
      special: ['o2m'],
      options: {
        template: '{{slug}} - {{title}}'
      },
      readonly: false
    }
  })
});
```

#### Step 4: Update Relation with O2M Field
```typescript
// PATCH /relations/card/story_id
await fetch(`${DIRECTUS_URL}/relations/card/story_id`, {
  method: 'PATCH',
  body: JSON.stringify({
    meta: {
      many_collection: 'card',
      many_field: 'story_id',
      one_collection: 'story',
      one_field: 'cards',  // ✅ Now includes reverse O2M field
      one_deselect_action: 'nullify'
    }
  })
});
```

### Why This Matters

**❌ Common Mistake:**
```typescript
// Only creating the field
await fetch(`${DIRECTUS_URL}/fields/card`, {
  method: 'POST',
  body: JSON.stringify({
    field: 'story_id',
    type: 'integer',
    meta: { interface: 'select-dropdown-m2o' }  // ❌ This doesn't create relation!
  })
});
// Result: Field exists but no relation, can't expand story_id.*
```

**✅ Correct Approach:**
```typescript
// Step 1: Create field
await fetch(`${DIRECTUS_URL}/fields/card`, { ... });

// Step 2: Create relation
await fetch(`${DIRECTUS_URL}/relations`, { ... });

// Step 3: Add O2M field (optional but recommended)
await fetch(`${DIRECTUS_URL}/fields/story`, { ... });

// Step 4: Update relation with O2M field
await fetch(`${DIRECTUS_URL}/relations/card/story_id`, { method: 'PATCH', ... });
```

---

## Implementation Scripts

### 1. Create FK Fields

**Script**: `scripts/add-fk-fields.ts`

Creates integer FK fields alongside slug fields:
```typescript
story.business_requirement_id (integer, nullable)
card.story_id (integer, nullable)
```

**⚠️ Must follow with Step 2** (create relation via `/relations` API)

### 2. Create Relations

**Script**: `scripts/create-card-story-relation.ts`

Creates M2O relation via `/relations` API:
```typescript
POST /relations
{
  collection: 'card',
  field: 'story_id',
  related_collection: 'story'
}
```

### 3. Create O2M Virtual Fields

**Script**: `scripts/create-story-cards-o2m.ts`

Creates O2M alias field and updates relation:
```typescript
// Step 1: Create O2M field
POST /fields/story { field: 'cards', type: 'alias', ... }

// Step 2: Update relation
PATCH /relations/card/story_id { one_field: 'cards' }
```

### 4. Sync Slugs to IDs

**Script**: `scripts/sync-slug-to-id.ts`

Populates FK IDs by looking up slugs:
```typescript
// Story with business_requirement = "PRD-001"
// Looks up PRD with slug "PRD-001" → id = 3
// Sets business_requirement_id = 3
```

### 5. Make O2M Fields Editable

**Script**: `scripts/make-o2m-fields-editable.ts`

Enables create/link from O2M side:
```typescript
meta: {
  options: {
    enableCreate: true,
    enableSelect: true
  },
  readonly: false
}
```

---

## Current Implementation

### PRD → Story → Card Hierarchy

```
PRD Collection
├── business_requirement (string) - Slug for markdown
├── business_requirement_id (integer FK) - Never used (PRD has no parent)
└── stories (O2M virtual, editable) - Stories linked to this PRD

Story Collection
├── business_requirement (string) - PRD slug for markdown
├── business_requirement_id (integer FK) - Foreign key to prd.id
├── depends_on (JSON array) - Story slugs (self-referential)
├── enhances (JSON array) - Story slugs (self-referential)
└── cards_relation (O2M virtual, editable) - Cards linked to this Story

Card Collection
├── story (string) - Story slug for markdown
├── story_id (integer FK) - Foreign key to story.id
├── depends_on (JSON array) - Card slugs (self-referential)
├── triggers (JSON array) - Card slugs
└── enhanced_by (JSON array) - Card slugs
```

### Relations in directus_relations Table

```sql
story.business_requirement_id → prd (reverse: prd.stories)
card.story_id → story (reverse: story.cards_relation)
```

---

## Best Practices

### 1. Always Use Dual Fields for Parent Relations

**Good**:
```typescript
{
  business_requirement: "PRD-001",      // Slug for markdown
  business_requirement_id: 3             // ID for Directus
}
```

**Bad**:
```typescript
{
  business_requirement: "PRD-001",      // Only slug, no FK
  // Missing: business_requirement_id
}
```

### 2. Keep Self-Referential Relations as JSON Arrays

For same-collection relations (Story → Story, Card → Card), use JSON arrays:
```typescript
{
  depends_on: ["US-001", "US-005"],  // JSON array of slugs
  enhances: ["US-010"]
}
```

Converting to M2M would require junction tables (`story_dependencies`). JSON arrays are simpler and match markdown structure.

### 3. Migration Order Matters

Always migrate in hierarchy order:
1. **PRD first** (no dependencies)
2. **Story second** (depends on PRD)
3. **Card third** (depends on Story)

This ensures FK references exist when you set them.

### 4. Sync After Bulk Operations

After bulk markdown imports or manual edits:
```bash
npx tsx scripts/sync-slug-to-id.ts
```

This resolves any missing `_id` fields.

### 5. Query from the "One" Side for Efficiency

**Efficient**:
```bash
# Get PRD with all Stories (1 query)
curl "items/prd/3?fields=*,stories.*"
```

**Less Efficient**:
```bash
# Get all Stories, then filter by PRD (N queries)
curl "items/story?filter[business_requirement_id][_eq]=3"
```

---

## Common Issues

### Issue: Can't Edit O2M Field in UI

**Symptom**: O2M field shows items but no +/- buttons

**Cause**: Field is `readonly: true` or missing `enableCreate`/`enableSelect`

**Fix**:
```bash
npx tsx scripts/make-o2m-fields-editable.ts
```

### Issue: M2O Expansion Returns Null

**Symptom**: `business_requirement_id: null` when slug exists

**Cause**: FK ID not populated

**Fix**:
```bash
npx tsx scripts/sync-slug-to-id.ts
```

### Issue: O2M Field Returns Empty Array

**Symptom**: `stories: []` when Stories exist

**Cause**: Stories have slug set but not `_id` field

**Fix**:
```bash
npx tsx scripts/sync-slug-to-id.ts
```

### Issue: Cannot Create Relation (Type Mismatch)

**Symptom**: Error about incompatible FK types

**Cause**: Trying to create FK constraint between string and integer

**Fix**: Use dual-field strategy - keep slug field as string, add separate `_id` integer field

---

## Migration Pattern

### For New Story

```typescript
// 1. Look up PRD by slug
const prdResponse = await fetch(
  `${DIRECTUS_URL}/items/prd?filter[slug][_eq]=${businessRequirement}&fields=id`
);
const prd = prdData.data?.[0];

// 2. Create Story with both fields
const storyData = {
  slug: "US-002",
  title: "Story Title",
  business_requirement: "PRD-001",      // Slug for markdown
  business_requirement_id: prd?.id,     // ID for Directus (null if not found)
  // ... other fields
};

// 3. POST to Directus
await fetch(`${DIRECTUS_URL}/items/story`, {
  method: 'POST',
  body: JSON.stringify(storyData)
});
```

### For New Card

```typescript
// 1. Look up Story by slug
const storyResponse = await fetch(
  `${DIRECTUS_URL}/items/story?filter[slug][_eq]=${story}&fields=id`
);
const storyRecord = storyData.data?.[0];

// 2. Create Card with both fields
const cardData = {
  slug: "order-create-page",
  title: "Card Title",
  story: "US-002",                      // Slug for markdown
  story_id: storyRecord?.id,            // ID for Directus
  // ... other fields
};

// 3. POST to Directus
await fetch(`${DIRECTUS_URL}/items/card`, {
  method: 'POST',
  body: JSON.stringify(cardData)
});
```

---

## Quick Checklist: Adding a Relational Field

When adding a M2O field (e.g., `card.story_id`):

- [ ] **Step 1**: Create the field via `/fields` API
  - Set type: 'integer'
  - Set interface: 'select-dropdown-m2o'
  - Set note describing the relation

- [ ] **Step 2**: Create the relation via `/relations` API
  - Set collection, field, related_collection
  - Include schema.foreign_key_table and foreign_key_column
  - Set on_delete action (CASCADE or SET NULL)

- [ ] **Step 3**: (Optional) Add O2M field on parent via `/fields` API
  - Set type: 'alias'
  - Set special: ['o2m']
  - Set interface: 'list-o2m'

- [ ] **Step 4**: (Optional) Update relation to include O2M field
  - PATCH `/relations/{collection}/{field}`
  - Set meta.one_field to O2M field name

- [ ] **Step 5**: Test the relation
  - Query with expansion: `?fields=*,field_name.*`
  - Verify FK constraint in database
  - Check UI shows dropdown/list

## Key Learnings

1. **Two APIs, not one** - `/fields` creates column, `/relations` creates constraint
2. **O2M fields are virtual** - They don't store data, they compute it from M2O FKs
3. **You can edit from either side** - O2M if configured as editable, or M2O directly
4. **Dual fields bridge systems** - Slug for markdown, ID for Directus relations
5. **Migration order matters** - Parent must exist before child FK can be set
6. **Standard Directus pattern** - `enableCreate`/`enableSelect` is built-in, not custom
7. **Always verify** - Test relation expansion after creation to ensure it works

---

## Related Files

- **Scripts**: `scripts/add-fk-fields.ts`, `scripts/sync-slug-to-id.ts`, `scripts/make-o2m-fields-editable.ts`
- **Migration**: `scripts/migrate-story.ts`, `scripts/migrate-card.ts`
- **Documentation**: `scripts/README-DIRECTUS-RELATIONS.md`

---

**Created**: 2026-01-26
**Pattern**: Dual-Field Strategy with Editable O2M Relations
**Repository**: saas-sales-order
