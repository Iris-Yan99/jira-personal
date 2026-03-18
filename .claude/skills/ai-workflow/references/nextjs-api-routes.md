# Next.js API Routes Development (App Router)

**Last Updated**: 2026-02-01
**Next.js Version**: 15.x
**Pattern**: App Router API Routes (`app/api/*/route.ts`)

---

## When to Use Next.js vs Directus Backend

| Backend Type | When to Use | Database Access | Examples in This Repo |
|--------------|-------------|-----------------|----------------------|
| **Next.js API Routes** (This Repo) | - Same repo as frontend<br>- Business logic in Next.js<br>- Can call Directus SDK/API<br>- AI/external API proxies<br>- Data aggregation | ✅ **Via Directus SDK** (recommended)<br>or REST API (fetch) | `/api/ai-context` (file system)<br>`/api/prds` (YAML parsing)<br>`/api/payment/txn` (future: Directus SDK)<br>`/api/ai/gemini` (AI proxy) |
| **Directus Extensions** (Separate Repo) | - Complex auth logic<br>- Multi-step DB operations<br>- Need direct Knex for transactions<br>- Performance-critical queries | ✅ **Direct Database Access**<br>(Knex.js, SQL)<br>**OR** Direct DB if needed | OAuth endpoints<br>User management<br>Organization detection<br>Policy assignment |

### Key Decision Factors

**Use Next.js API Routes when:**
- ✅ Logic belongs in same repo as frontend (easier to maintain)
- ✅ Simple CRUD via Directus API is sufficient
- ✅ Need file system access (YAML parsing, markdown reading)
- ✅ Proxying external APIs (Gemini, Stripe, etc.)
- ✅ No complex multi-collection transactions needed

**Use Directus Extensions when:**
- ✅ Need direct database access (Knex.js) for performance
- ✅ Complex multi-step transactions across collections
- ✅ Custom authentication logic (OAuth, SSO)
- ✅ Business rules that span multiple collections
- ✅ Need to leverage Directus services (UsersService, etc.)

### Directus SDK vs REST API vs Direct DB Connection

| Approach | Setup | Type Safety | Performance | Use Case |
|----------|-------|-------------|-------------|----------|
| **Directus SDK** | `npm i @directus/sdk`<br>Initialize client | ✅ Full TypeScript support | ⚡ Good (HTTP) | **Recommended** for Next.js API routes |
| **REST API** (fetch) | No install needed | ❌ Manual typing | ⚡ Good (HTTP) | Simple cases, no SDK overhead |
| **Direct DB** (Knex/Prisma) | Complex setup<br>Separate connection pool | ✅ TypeScript support | ⚡⚡ Best (direct) | **Only if needed** - requires separate DB credentials |

**Recommendation Hierarchy:**
1. **Directus SDK** (best for most cases) - Type-safe, auto-completion, handles auth
2. **REST API** (fetch) - Simple cases, already shown in examples above
3. **Direct DB Connection** - Only if absolutely needed (see below)

### Can Next.js API Routes Use Direct DB Connection?

**Yes, but consider the trade-offs:**

**✅ Pros:**
- Faster performance (no HTTP overhead)
- Can use database transactions
- Can join across tables efficiently
- Familiar SQL/Knex/Prisma patterns

**❌ Cons:**
- **Security**: Need to manage DB credentials in Next.js repo
- **Permissions Bypass**: Skips Directus permission system (can access any data!)
- **Maintenance**: Two codebases accessing same DB schema
- **Schema Drift**: Next.js code can break if Directus schema changes
- **Connection Pooling**: Need separate connection pool management
- **Directus Features Lost**: No hooks, flows, permissions, validation

**When Direct DB is Acceptable:**
- ✅ Performance-critical queries (reads AND writes)
- ✅ Batch operations on thousands of records
- ✅ Complex joins that would require many API calls
- ✅ You control both Next.js and Directus codebases
- ✅ **You implement your own permission checks** in Next.js code

**When to Avoid Direct DB:**
- ❌ You want Directus to handle permissions automatically
- ❌ You want Directus validation/hooks/flows to run
- ❌ You don't control Directus schema (schema drift risk)
- ❌ You want centralized data access control

### The Real Trade-off: Permissions, Not Security

**The concern isn't "client vs server" - your Next.js API route is server-side and secure.**

**The concern is: Who manages data access control?**

| Approach | Permission Logic | Validation | Hooks/Flows |
|----------|-----------------|------------|-------------|
| **Directus SDK** | Directus handles it | Directus validates | Directus runs hooks |
| **Direct DB** | **You must implement it** | You must validate | No hooks run |

**Example: User tries to access another org's data**

**With Directus SDK:**
```typescript
// Directus automatically filters by user's policies
const orders = await directus.request(
  readItems('orders', {
    filter: { orq: { _eq: userOrq } }  // Directus enforces this via policies
  })
)
// Directus checks: Does this user have ORQ-12-Access policy?
// If no → 403 Forbidden (even if you request orq=12)
```

**With Direct DB:**
```typescript
// YOU must implement permission checks!
const userOrgs = await db('users_multi')
  .where('directus_user', userId)
  .pluck('organization_id')

if (!userOrgs.includes(requestedOrq)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const orders = await db('orders').where('orq', requestedOrq)
// ⚠️ If you forget the permission check above, user can access any org's data!
```

### Direct DB for Writes: Totally Valid (with caveats)

**✅ You CAN use direct DB for writes** - it's server-side, so it's secure from client attacks.

**But you lose:**
1. **Automatic permissions** - Must implement yourself
2. **Validation** - Must implement yourself
3. **Hooks/Flows** - Won't trigger (e.g., "send email on order create")
4. **Audit logs** - Directus won't track the change

**Example: Direct DB Write (Valid Pattern)**

```typescript
// app/api/bulk-import/route.ts
import { db } from '@/lib/database'  // Direct Knex connection

export async function POST(request: NextRequest) {
  const { userId, orders } = await request.json()

  // 1. Permission check (YOU must implement)
  const userOrgs = await db('users_multi')
    .where('directus_user', userId)
    .pluck('organization_id')

  // 2. Validation (YOU must implement)
  for (const order of orders) {
    if (!userOrgs.includes(order.orq)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (order.amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
  }

  // 3. Bulk insert (FAST! - this is why you use direct DB)
  await db('orders').insert(orders)

  // 4. Manual audit log (Directus won't do this automatically)
  await db('audit_log').insert({
    user_id: userId,
    action: 'bulk_import',
    count: orders.length,
    timestamp: new Date()
  })

  return NextResponse.json({ status: true, imported: orders.length })
}
```

**This is totally valid!** You're just taking on the responsibility of:
- Permission checks
- Validation
- Audit logging
- No Directus hooks/flows

### Updated Recommendation

**Use Read-Only DB User ONLY IF:**
- You don't trust your own code to handle permissions correctly
- You want an extra safety layer against bugs

**Use Full DB Access IF:**
- You're confident in implementing permissions yourself
- You need performance (batch operations, complex transactions)
- You understand you're bypassing Directus features

**Security Pattern with Full DB Access:**
```typescript
// Next.js .env (server-side only)
DATABASE_URL=postgresql://nextjs_app:xxx@localhost/directus  // Full access

// But ALWAYS implement permission checks in your code!
```

**Example: Payment Order Creation**

**Option A: Next.js API Route with Directus SDK** (Recommended)
```typescript
// app/api/payment/txn/route.ts
import { createDirectus, rest, createItem } from '@directus/sdk'

const directus = createDirectus(process.env.DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN!))

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate business rules
  if (body.payment_method !== 'rentsmart') {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  }

  // Use Directus SDK - type-safe and clean
  const order = await directus.request(
    createItem('orders', {
      amount: body.amount_total,
      customer: body.customer,
      orq: body.orq
    })
  )

  return NextResponse.json({ status: true, data: order })
}
```

**Option A2: Next.js API Route with REST API** (Alternative)
```typescript
// app/api/payment/txn/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate business rules
  if (body.payment_method !== 'rentsmart') {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  }

  // Call Directus REST API with fetch
  const response = await fetch(`${DIRECTUS_URL}/items/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: body.amount_total,
      customer: body.customer,
      orq: body.orq
    })
  })

  return NextResponse.json(await response.json())
}
```

**Option B: Directus Extension** (Use if you need direct DB access)
```typescript
// /Users/mac/projects/d11/extensions/payment-endpoint.ts
export default defineEndpoint((router, { database }) => {
  router.post('/payment/create', async (req, res) => {
    // Direct database access with Knex
    const orderId = await database('orders').insert({
      amount: req.body.amount,
      customer: req.body.customer
    }).returning('id')

    // Create transaction in same DB transaction
    await database('transactions').insert({
      order_id: orderId,
      status: 'pending'
    })

    res.json({ orderId })
  })
})
```

**Recommendation**: Use Next.js API Route for this case - calling Directus API is sufficient and keeps code in same repo.

See [backend-extensions.md](./backend-extensions.md) for Directus extension patterns.

---

## Why Server-Side API Routes?

When integrating external APIs (like Gemini, OpenAI, Stripe), **always use server-side API routes** instead of calling directly from the client.

### Security Benefits

| Approach | API Key Location | Security |
|----------|------------------|----------|
| **Server-side route** | `process.env.API_KEY` | Secure - never exposed |
| **Client-side direct** | `process.env.NEXT_PUBLIC_API_KEY` | Exposed - visible in browser JS |

### The `NEXT_PUBLIC_` Rule

```bash
# Server-only (secure) - NEVER sent to browser
GEMINI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk-xxx
DATABASE_URL=postgres://...

# Client-accessible (exposed) - bundled into browser JS
NEXT_PUBLIC_APP_URL=https://myapp.com
NEXT_PUBLIC_ANALYTICS_ID=UA-xxx
```

**Rule**: Variables WITHOUT `NEXT_PUBLIC_` prefix are **server-only**.

---

## Standard API Route Pattern

### File Location

```
app/api/[service]/[action]/route.ts
```

Examples:
- `app/api/ai/gemini/route.ts`
- `app/api/payment/checkout/route.ts`
- `app/api/email/send/route.ts`

### Template

```typescript
import { NextRequest, NextResponse } from "next/server";

// Types
interface RequestBody {
  // Define expected input
  prompt: string;
}

interface ResponseBody {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ResponseBody>> {
  try {
    // 1. Parse request
    const body: RequestBody = await request.json();

    // 2. Validate input
    if (!body.prompt) {
      return NextResponse.json(
        { success: false, error: "Missing required field: prompt" },
        { status: 400 }
      );
    }

    // 3. Check API key (server-side, secure)
    const apiKey = process.env.EXTERNAL_API_KEY;
    if (!apiKey) {
      console.error("API key not configured");
      return NextResponse.json(
        { success: false, error: "Service not configured" },
        { status: 503 }
      );
    }

    // 4. Call external API
    const response = await fetch("https://api.external.com/endpoint", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: body.prompt }),
    });

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    const data = await response.json();

    // 5. Return success
    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 }
    );
  }
}

// Optional: Health check endpoint
export async function GET(): Promise<NextResponse> {
  const isConfigured = !!process.env.EXTERNAL_API_KEY;

  return NextResponse.json({
    service: "External API",
    configured: isConfigured,
  });
}
```

---

## Client-Side Usage

### Calling the API Route

```typescript
// In a client component ('use client')
const callApi = async (prompt: string) => {
  const response = await fetch('/api/ai/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
};
```

### With React Hook

```typescript
// lib/hooks/use-ai.ts
import { useState } from 'react';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        return null;
      }

      return data.response;
    } catch (err) {
      setError('Failed to generate response');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
```

---

## Lazy Initialization Pattern

For SDKs that throw errors at module load time (like `@google/genai`), use lazy initialization:

```typescript
// services/gemini.ts
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Only initialize if API key exists - prevents Lambda crashes
const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

export const generateContent = async (prompt: string) => {
  // Guard against missing initialization
  if (!ai) {
    return {
      success: false,
      error: "Gemini API not configured"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return { success: true, data: response.text };
  } catch (error) {
    console.error("Gemini error:", error);
    return { success: false, error: "Generation failed" };
  }
};
```

---

## Common Mistakes to Avoid

### Wrong: Client-side API key

```typescript
// app/page.tsx (client component)
'use client';

// EXPOSED! Anyone can see this in browser DevTools
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const response = await fetch(`https://api.google.com?key=${apiKey}`);
```

### Correct: Server-side API route

```typescript
// app/api/ai/route.ts (server-side)
// SECURE! This runs on the server, key never sent to browser
const apiKey = process.env.GEMINI_API_KEY;

const response = await fetch(`https://api.google.com?key=${apiKey}`);
```

---

## Environment Variables Checklist

### For Production (Vercel)

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add server-side keys WITHOUT `NEXT_PUBLIC_` prefix
3. Redeploy for changes to take effect

### For Local Development

```bash
# .env.local
GEMINI_API_KEY=your-key-here
STRIPE_SECRET_KEY=sk_test_xxx
```

### Validation Pattern

```typescript
// At application startup or in API route
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'DATABASE_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Missing environment variable: ${envVar}`);
  }
}
```

---

## Example: Complete Gemini Integration

### 1. Service Layer

```typescript
// services/lms/geminiService.ts
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export const getGeminiResponse = async (prompt: string) => {
  if (!ai) {
    return "Gemini API is not configured.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini error:", error);
    return "Failed to generate response.";
  }
};
```

### 2. API Route

```typescript
// app/api/ai/gemini/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGeminiResponse } from "@/services/lms/geminiService";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: "Missing prompt" },
      { status: 400 }
    );
  }

  const response = await getGeminiResponse(prompt);

  return NextResponse.json({ success: true, response });
}
```

### 3. Client Hook

```typescript
// lib/hooks/use-gemini.ts
'use client';
import { useState } from 'react';

export function useGemini() {
  const [loading, setLoading] = useState(false);

  const generate = async (prompt: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      return data.response;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading };
}
```

### 4. Component Usage

```typescript
// app/chat/page.tsx
'use client';
import { useGemini } from '@/lib/hooks/use-gemini';

export default function ChatPage() {
  const { generate, loading } = useGemini();
  const [response, setResponse] = useState('');

  const handleSubmit = async (prompt: string) => {
    const result = await generate(prompt);
    setResponse(result);
  };

  return (
    <div>
      <button onClick={() => handleSubmit('Hello!')} disabled={loading}>
        {loading ? 'Generating...' : 'Ask AI'}
      </button>
      <p>{response}</p>
    </div>
  );
}
```

---

## Repository-Specific API Patterns

This repository uses several established API route patterns:

### Pattern 1: Data Aggregation (File System)

**File**: `app/api/ai-context/route.ts`

**Purpose**: Aggregate project context for AI assistants (no database needed)

**Key Features**:
- Recursive markdown file discovery
- YAML frontmatter parsing
- Aggregates PRDs, progress, documentation
- Pure file system operations (no Directus)

**Code Example**:
```typescript
import { readdir, readFile } from 'fs/promises'
import { loadAllPRDs } from '@/lib/prd-loader'

export async function GET() {
  const docsPath = join(process.cwd(), 'docs')
  const entries = await readdir(docsPath, { withFileTypes: true })

  const allPRDs = loadAllPRDs()  // Server-side YAML parsing
  const progress = getKnowledgeProgress()

  return NextResponse.json({
    project: { name: "SaaS Sales Order" },
    knowledge_sources: { prds: allPRDs },
    knowledge_progress: progress
  })
}
```

**Use Case**: AI recovery endpoint - provides complete context in one request

---

### Pattern 2: Payment/Transaction API (Validation-Heavy)

**File**: `app/api/payment/txn/route.ts`

**Purpose**: Create and retrieve payment orders (future DB integration)

**Key Features**:
- Multi-level validation (required fields, nested objects, business rules)
- POST: Create order
- GET: Retrieve by nonce
- TODO comments for database integration

**Code Example**:
```typescript
interface OrderData {
  amount_total: number
  order_nonce: string
  payment_method: string
  customer: {
    email: string
    renter_first_name: string
  }
}

export async function POST(request: NextRequest) {
  const body: OrderData = await request.json()

  // Validation 1: Required fields
  const requiredFields = ['amount_total', 'order_nonce', 'payment_method']
  for (const field of requiredFields) {
    if (!body[field as keyof OrderData]) {
      return NextResponse.json(
        { status: false, message: `Missing ${field}` },
        { status: 400 }
      )
    }
  }

  // Validation 2: Nested objects
  if (!body.customer?.email) {
    return NextResponse.json(
      { status: false, message: 'Missing customer email' },
      { status: 400 }
    )
  }

  // Validation 3: Business rules
  if (body.payment_method !== 'rentsmart') {
    return NextResponse.json(
      { status: false, message: 'Invalid payment method' },
      { status: 400 }
    )
  }

  // TODO: Insert into database
  console.log('Creating order:', body)

  return NextResponse.json({ status: true, data: { order_id: 'xxx' } }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderNonce = searchParams.get('order_nonce')

  // TODO: Query database
  return NextResponse.json({ status: true, data: { /* mock */ } })
}
```

**Use Case**: Payment processing API with strict validation

**Future Enhancement**: Call Directus API to persist order
```typescript
// After validation, call Directus to create order
const directusResponse = await fetch(`${process.env.DIRECTUS_URL}/items/orders`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DIRECTUS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount_total: body.amount_total,
    order_nonce: body.order_nonce,
    customer_id: body.customer.id,
    orq: body.orq
  })
})

const order = await directusResponse.json()
return NextResponse.json({ status: true, data: order.data }, { status: 201 })
```

---

### Pattern 3: Dynamic Routes (PRD Loader)

**File**: `app/api/prd/[id]/route.ts`

**Purpose**: Load individual PRD by ID (server-side helper for client components)

**Key Features**:
- Dynamic route parameter (`[id]`)
- YAML frontmatter parsing
- 404 handling
- Next.js 15 async params pattern

**Code Example**:
```typescript
interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // IMPORTANT: In Next.js 15+, context.params is a Promise
  const { id } = await context.params

  const prd = loadPRDById(id)  // Server-side file reading

  if (!prd) {
    return NextResponse.json(
      { status: false, message: 'PRD not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ status: true, data: prd })
}
```

**Use Case**: Server Component data loading for client children

---

### Pattern 4: Calling Directus from Next.js (SDK or REST API)

**Purpose**: Use Next.js API route as business logic layer, call Directus for data persistence

**Key Benefit**: Keep business logic in same repo as frontend, use Directus as database API

**Approach A: Using Directus SDK (Recommended)**

```typescript
// lib/directus.ts - Initialize SDK once
import { createDirectus, rest, staticToken } from '@directus/sdk'

export const directus = createDirectus(process.env.DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_TOKEN!))
```

```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createItem, readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Step 1: Business logic validation (Next.js layer)
    if (body.amount_total <= 0) {
      return NextResponse.json(
        { status: false, message: 'Amount must be positive' },
        { status: 400 }
      )
    }

    // Step 2: Use Directus SDK - type-safe!
    const order = await directus.request(
      createItem('orders', {
        amount_total: body.amount_total,
        order_nonce: body.order_nonce,
        customer_id: body.customer_id,
        orq: body.orq,
        status: 'pending'
      })
    )

    // Step 3: Additional business logic
    await sendOrderConfirmation(order.id)

    return NextResponse.json({ status: true, data: order }, { status: 201 })

  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { status: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orq = searchParams.get('orq')

  // Use Directus SDK to get orders
  const orders = await directus.request(
    readItems('orders', {
      filter: { orq: { _eq: orq } }
    })
  )

  return NextResponse.json({ status: true, data: orders })
}
```

**Benefits of SDK:**
- ✅ Type-safe queries with TypeScript
- ✅ Auto-completion in IDE
- ✅ Cleaner syntax than raw fetch
- ✅ Handles errors consistently

**Approach B: Using REST API (fetch) - Alternative**

**Code Example**:
```typescript
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://orq-dev.synque.ca'
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN  // Server-side only

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Step 1: Business logic validation (Next.js layer)
    if (body.amount_total <= 0) {
      return NextResponse.json(
        { status: false, message: 'Amount must be positive' },
        { status: 400 }
      )
    }

    // Step 2: Call Directus API to create order (Database layer)
    const directusResponse = await fetch(`${DIRECTUS_URL}/items/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount_total: body.amount_total,
        order_nonce: body.order_nonce,
        customer_id: body.customer_id,
        orq: body.orq,
        status: 'pending'
      })
    })

    if (!directusResponse.ok) {
      const error = await directusResponse.json()
      return NextResponse.json(
        { status: false, message: error.errors?.[0]?.message || 'Database error' },
        { status: directusResponse.status }
      )
    }

    const order = await directusResponse.json()

    // Step 3: Additional business logic (e.g., send notification)
    await sendOrderConfirmation(order.data.id)

    return NextResponse.json({ status: true, data: order.data }, { status: 201 })

  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { status: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orq = searchParams.get('orq')

  // Call Directus API to get orders
  const directusResponse = await fetch(
    `${DIRECTUS_URL}/items/orders?filter[orq][_eq]=${orq}`,
    {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`
      }
    }
  )

  const result = await directusResponse.json()
  return NextResponse.json({ status: true, data: result.data })
}
```

**Why This Pattern?**
- ✅ **Business logic in same repo** as frontend (easier to maintain)
- ✅ **Secure**: Directus token never exposed to browser
- ✅ **Flexible**: Can call multiple Directus collections in one endpoint
- ✅ **Simple**: No need for separate Directus extension deployment

**When NOT to use this pattern:**
- ❌ Need complex multi-step transactions (use Directus extension with Knex)
- ❌ Need direct database queries for performance (use Directus extension)
- ❌ Custom authentication logic (use Directus extension)

---

## Next.js 15 Breaking Changes

### Context Params are Now Async

**Before (Next.js 14)**:
```typescript
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params  // ✅ Works in v14
}
```

**After (Next.js 15)**:
```typescript
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params  // ✅ Required in v15
}
```

**Migration**: Add `await` to all `context.params` access in dynamic routes

---

## Related Files

- [backend-extensions.md](./backend-extensions.md) - Directus extension patterns
- [api-testing.md](./api-testing.md) - Newman testing patterns
- **Examples in This Repo**:
  - `app/api/ai-context/route.ts` - Data aggregation pattern
  - `app/api/payment/txn/route.ts` - Validation pattern
  - `app/api/prd/[id]/route.ts` - Dynamic route pattern
  - `app/api/ai/gemini/route.ts` - External API proxy pattern

---

**Created**: 2026-02-01
**Pattern Source**: Existing API routes in this repository
**Next.js Version**: 15.x (App Router)
