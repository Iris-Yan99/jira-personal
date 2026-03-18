# Directus SDK Best Practices

**Last Updated**: 2026-02-02
**SDK Version**: @directus/sdk v18.0.3
**Pattern**: Server-side API routes only
**Reference Implementation**: `app/api/example-directus-sdk/route.ts`

---

## Quick Decision: Which Pattern to Use?

| Pattern | When to Use | Complexity | Example File |
|---------|-------------|------------|--------------|
| **Static Token** | Most API routes, single token | ⭐ Simple | `app/api/example-directus-sdk/route.ts` |
| **Authentication** | Need dynamic tokens, user-based auth | ⭐⭐ Medium | `lib/api-prd-directus.ts` |

**Recommendation**: Start with Static Token pattern unless you need flexibility.

---

## Pattern A: Static Token (Recommended)

**Best for**: Simple API routes, read-only operations, single environment token

```typescript
import { createDirectus, rest, staticToken, readItems, createItem } from '@directus/sdk'

// ✅ Singleton pattern - create once at module level
const directus = createDirectus(process.env.DIRECTUS_URL || 'https://orq-dev.synque.ca')
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN || ''))

// Use directly in route handlers
export async function GET(request: NextRequest) {
  const orders = await directus.request(
    readItems('orders', {
      filter: { orq: { _eq: 12 } },
      limit: 10,
      sort: ['-created_at']
    })
  )
  return NextResponse.json({ status: true, data: orders })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const order = await directus.request(
    createItem('orders', {
      amount_total: body.amount_total,
      customer_id: body.customer_id,
      status: 'pending'
    })
  )

  return NextResponse.json({ status: true, data: order }, { status: 201 })
}
```

**Key Points**:
- ✅ Simplest approach
- ✅ Client created once at module load
- ✅ Use plain env vars (NO `NEXT_PUBLIC_` prefix)
- ✅ Can add TypeScript schema for type safety

---

## Pattern B: Authentication (Advanced)

**Best for**: Dynamic token management, user-based authentication, flexible auth

```typescript
import { createDirectus, rest, authentication, readItems, createItem } from '@directus/sdk'

// Define schema for type safety
interface DirectusSchema {
  orders: Order[]
  prd: PRD[]
}

// Client factory (not singleton)
function createClient() {
  return createDirectus<DirectusSchema>(process.env.DIRECTUS_URL!)
    .with(rest())
    .with(authentication())  // No token yet
}

// Get authenticated client (for write operations)
async function getAuthenticatedClient() {
  const client = createClient()
  await client.setToken(process.env.DIRECTUS_TOKEN!)
  return client
}

// Public operations (no auth)
export async function getOrders() {
  const client = createClient()
  return await client.request(readItems('orders', { limit: 10 }))
}

// Write operations (need auth)
export async function createOrder(data: Order) {
  const client = await getAuthenticatedClient()
  return await client.request(createItem('orders', data))
}
```

**Key Points**:
- ✅ Flexible token management
- ✅ Separate public vs authenticated operations
- ✅ TypeScript schema for auto-completion
- ⚠️ More complex - manage client lifecycle

---

## TypeScript Type Safety

### Define Collection Schema

```typescript
// Define collection types
interface Order {
  id?: number
  amount_total: number
  order_nonce: string
  customer_id: number
  orq: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at?: string
}

// Map collections to types
interface DirectusSchema {
  orders: Order[]
  prd: PRD[]
  users: User[]
}

// Pass schema for type safety
const client = createDirectus<DirectusSchema>(DIRECTUS_URL)
  .with(rest())
```

**Benefits**:
- ✅ Auto-completion in IDE
- ✅ Type checking for fields
- ✅ Compile-time errors

---

## CRUD Operations

### Read

```typescript
import { readItems } from '@directus/sdk'

// Get all
const items = await directus.request(
  readItems('orders', { limit: -1 })  // -1 = get all
)

// With filters, pagination, sorting
const items = await directus.request(
  readItems('orders', {
    filter: {
      orq: { _eq: 12 },
      status: { _eq: 'active' }
    },
    limit: 10,
    offset: 0,
    sort: ['-created_at'],  // Descending
    fields: ['*', 'customer.name']  // Include relations
  })
)

// Get single by filter
const items = await directus.request(
  readItems('prd', {
    filter: { slug: { _eq: 'collection' } },
    limit: 1
  })
)
const item = items.length > 0 ? items[0] : null
```

### Create

```typescript
import { createItem } from '@directus/sdk'

const order = await directus.request(
  createItem('orders', {
    amount_total: 100,
    order_nonce: 'abc123',
    customer_id: 1,
    status: 'pending'
  })
)
```

### Update

```typescript
import { updateItem } from '@directus/sdk'

const updated = await directus.request(
  updateItem('orders', 123, {
    status: 'paid'
  })
)
```

### Delete

```typescript
import { deleteItem } from '@directus/sdk'

await directus.request(deleteItem('orders', 123))
```

---

## Filtering Patterns

### Basic Filters

```typescript
// Exact match
filter: { orq: { _eq: 12 } }

// Not equal
filter: { status: { _neq: 'archived' } }

// Contains (string search)
filter: { title: { _contains: 'auth' } }

// Greater/less than
filter: {
  amount: { _gte: 100 },
  created_at: { _lt: '2025-01-01' }
}
```

### Complex Filters

```typescript
// OR condition
filter: {
  _or: [
    { title: { _contains: 'auth' } },
    { description: { _contains: 'auth' } }
  ]
}

// AND condition (default)
filter: {
  orq: { _eq: 12 },
  status: { _eq: 'active' }
}
```

### Dynamic Filter Building

```typescript
// Build filter based on query params
const filter: any = {}

if (orq) filter.orq = { _eq: parseInt(orq) }
if (status) filter.status = { _eq: status }

// Exclude archived by default
if (!filter.status) {
  filter.status = { _neq: 'archived' }
}

const orders = await directus.request(
  readItems('orders', { filter })
)
```

---

## Pagination & Sorting

### Pagination with Total Count

```typescript
// ✅ CORRECT - Get total count from meta
const result = await directus.request(
  readItems('orders', {
    limit: 10,
    offset: 0,
    meta: 'total_count'  // Request total count
  })
)

return NextResponse.json({
  data: result.data,
  pagination: {
    page: 1,
    limit: 10,
    total: result.meta.total_count  // ✅ Actual total
  }
})
```

### Sorting

```typescript
// Single field
sort: ['-created_at']  // Descending (newest first)
sort: ['created_at']   // Ascending

// Multiple fields
sort: ['-priority', 'title']  // Priority desc, then title asc
```

---

## Error Handling

### Standard Pattern

```typescript
try {
  const order = await directus.request(createItem('orders', data))
  return NextResponse.json({ status: true, data: order }, { status: 201 })

} catch (error: any) {
  console.error('Order creation error:', error)

  // ✅ Handle Directus error format
  if (error.errors) {
    return NextResponse.json(
      {
        status: false,
        message: error.errors[0]?.message || 'Database error',
        errors: error.errors
      },
      { status: error.status || 400 }
    )
  }

  // Generic fallback
  return NextResponse.json(
    { status: false, message: error.message || 'Internal error' },
    { status: 500 }
  )
}
```

**Key Points**:
- ✅ Check `error.errors` array (Directus validation errors)
- ✅ Extract first error: `error.errors[0]?.message`
- ✅ Use `error.status` for HTTP code
- ✅ Always log with `console.error()`

---

## Environment Variables

### Required Setup

```bash
# .env.local (server-side only)
DIRECTUS_URL=https://orq-dev.synque.ca
DIRECTUS_TOKEN=your-admin-token-here
```

**Critical Rules**:
- ❌ NEVER use `NEXT_PUBLIC_` prefix for tokens
- ✅ ALWAYS use plain env vars (server-only)
- ✅ ONLY use `NEXT_PUBLIC_` for non-sensitive URLs

---

## Common Pitfalls

### ❌ Pitfall 1: Using SDK in Client Components

```typescript
// ❌ WRONG - Exposes credentials
'use client'
import { createDirectus } from '@directus/sdk'

export default function MyComponent() {
  const client = createDirectus(process.env.DIRECTUS_URL)  // ❌ Security risk
}
```

**✅ Solution**: Use Next.js API routes

```typescript
// ✅ CORRECT - Server-side API route
// app/api/orders/route.ts
const directus = createDirectus(process.env.DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN!))

export async function GET() {
  const orders = await directus.request(readItems('orders'))
  return NextResponse.json({ data: orders })
}

// ✅ Client component calls API route
'use client'
export default function MyComponent() {
  useEffect(() => {
    fetch('/api/orders').then(res => res.json())
  }, [])
}
```

---

### ❌ Pitfall 2: Creating Client Per Request

```typescript
// ❌ WRONG - Creates new client every request
export async function GET() {
  const client = createDirectus(process.env.DIRECTUS_URL!)
    .with(rest())
    .with(staticToken(process.env.DIRECTUS_TOKEN!))

  const orders = await client.request(readItems('orders'))
}
```

**✅ Solution**: Singleton pattern

```typescript
// ✅ CORRECT - Create once at module level
const directus = createDirectus(process.env.DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN!))

export async function GET() {
  const orders = await directus.request(readItems('orders'))
}
```

---

### ❌ Pitfall 3: Not Handling Directus Error Format

```typescript
// ❌ WRONG - Generic error handling
catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

**✅ Solution**: Check `error.errors` array

```typescript
// ✅ CORRECT
catch (error: any) {
  if (error.errors) {
    return NextResponse.json(
      {
        status: false,
        message: error.errors[0]?.message || 'Database error',
        errors: error.errors
      },
      { status: error.status || 400 }
    )
  }

  return NextResponse.json(
    { status: false, message: error.message },
    { status: 500 }
  )
}
```

---

### ❌ Pitfall 4: Forgetting to Exclude Archived

```typescript
// ❌ WRONG - Returns archived items
const items = await directus.request(readItems('prd', { limit: -1 }))
```

**✅ Solution**: Filter archived by default

```typescript
// ✅ CORRECT - Exclude archived
const filter: any = {}

if (!filters?.status) {
  filter.status = { _neq: 'archived' }
}

const items = await directus.request(readItems('prd', { filter, limit: -1 }))
```

---

### ❌ Pitfall 5: Wrong Total Count for Pagination

```typescript
// ❌ WRONG - Returns page size, not total
const orders = await directus.request(readItems('orders', { limit: 10 }))

return NextResponse.json({
  total: orders.length  // ❌ Will always be 10
})
```

**✅ Solution**: Request `meta: 'total_count'`

```typescript
// ✅ CORRECT
const result = await directus.request(
  readItems('orders', {
    limit: 10,
    meta: 'total_count'
  })
)

return NextResponse.json({
  data: result.data,
  total: result.meta.total_count  // ✅ Actual total
})
```

---

## Best Practices Summary

### ✅ DO

1. **Singleton Pattern** - Create client once at module level
2. **TypeScript Schema** - Define interfaces for type safety
3. **Handle Directus Errors** - Check `error.errors` array
4. **Filter Archived** - Exclude soft-deleted by default
5. **Server-Side Only** - Never expose SDK in client
6. **Request Total Count** - Use `meta: 'total_count'`
7. **Dynamic Filters** - Build conditionally
8. **Log Errors** - Use `console.error()`
9. **Consistent Response** - `{ status, data?, message? }`
10. **Environment Variables** - Server-only, no `NEXT_PUBLIC_`

### ❌ DON'T

1. **Client Components** - Security risk
2. **Per-Request Client** - Use singleton
3. **Expose Tokens** - No `NEXT_PUBLIC_` prefix
4. **Ignore `error.errors`** - Directus structured errors
5. **Forget Archived Filter** - Exclude by default
6. **Use `orders.length`** - Request `meta.total_count`
7. **Mix Auth Methods** - Choose one pattern
8. **Skip Types** - Define TypeScript interfaces
9. **Hardcode Values** - Use env variables
10. **Skip Validation** - Validate before Directus call

---

## Complete Example

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItems, createItem, updateItem, deleteItem } from '@directus/sdk'

// TypeScript interface
interface Order {
  id?: number
  amount_total: number
  order_nonce: string
  customer_id: number
  orq: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at?: string
}

// Singleton client
const directus = createDirectus(process.env.DIRECTUS_URL || 'https://orq-dev.synque.ca')
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN || ''))

// GET - Read with filtering, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orq = searchParams.get('orq')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const filter: any = {}
    if (orq) filter.orq = { _eq: parseInt(orq) }

    const result = await directus.request(
      readItems('orders', {
        filter,
        limit,
        offset: (page - 1) * limit,
        sort: ['-created_at'],
        fields: ['*', 'customer.name'],
        meta: 'total_count'
      })
    )

    return NextResponse.json({
      status: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.meta.total_count
      }
    })

  } catch (error: any) {
    console.error('GET error:', error)

    if (error.errors) {
      return NextResponse.json(
        {
          status: false,
          message: error.errors[0]?.message || 'Database error',
          errors: error.errors
        },
        { status: error.status || 400 }
      )
    }

    return NextResponse.json(
      { status: false, message: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}

// POST - Create with validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Business logic validation
    if (body.amount_total <= 0) {
      return NextResponse.json(
        { status: false, message: 'Amount must be positive' },
        { status: 400 }
      )
    }

    // Create via Directus SDK
    const order = await directus.request(
      createItem('orders', {
        amount_total: body.amount_total,
        order_nonce: body.order_nonce,
        customer_id: body.customer_id,
        orq: body.orq,
        status: 'pending'
      } as Order)
    )

    return NextResponse.json({ status: true, data: order }, { status: 201 })

  } catch (error: any) {
    console.error('POST error:', error)

    if (error.errors) {
      return NextResponse.json(
        {
          status: false,
          message: error.errors[0]?.message || 'Database error',
          errors: error.errors
        },
        { status: error.status || 400 }
      )
    }

    return NextResponse.json(
      { status: false, message: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { status: false, message: 'Order ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const updated = await directus.request(
      updateItem('orders', parseInt(id), body as Partial<Order>)
    )

    return NextResponse.json({ status: true, data: updated })

  } catch (error: any) {
    console.error('PATCH error:', error)
    return NextResponse.json(
      { status: false, message: error.errors?.[0]?.message || error.message },
      { status: error.status || 500 }
    )
  }
}

// DELETE - Remove
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { status: false, message: 'Order ID required' },
        { status: 400 }
      )
    }

    await directus.request(deleteItem('orders', parseInt(id)))

    return NextResponse.json({ status: true, message: 'Order deleted' })

  } catch (error: any) {
    console.error('DELETE error:', error)
    return NextResponse.json(
      { status: false, message: error.errors?.[0]?.message || error.message },
      { status: error.status || 500 }
    )
  }
}
```

---

## Related Files

- [app/api/example-directus-sdk/route.ts](../../../app/api/example-directus-sdk/route.ts) - Complete CRUD example
- [lib/api-prd-directus.ts](../../../lib/api-prd-directus.ts) - Advanced authentication pattern
- [nextjs-api-routes.md](./nextjs-api-routes.md) - Next.js API routes guide
- [backend-extensions.md](./backend-extensions.md) - Directus extension patterns

---

**Created**: 2026-02-02
**Research Source**: Real codebase patterns from OAuth and PRD implementations
**SDK Version**: @directus/sdk v18.0.3
