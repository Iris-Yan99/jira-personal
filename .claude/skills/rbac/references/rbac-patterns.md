# RBAC Policy Patterns

Reusable policy templates for common multi-tenant access control scenarios.

## Policy Template: Sales Manager

Full CRUD access to sales collections within organization.

```json
{
  "name": "ORQ-{id} Sales Manager",
  "description": "Full sales access for organization {id}",
  "admin_access": false,
  "app_access": true,
  "permissions": [
    {
      "action": "create",
      "collection": "orders",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}},
      "validation": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "orders",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "orders",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "delete",
      "collection": "orders",
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "create",
      "collection": "customers",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}},
      "validation": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "customers",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "customers",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "delete",
      "collection": "customers",
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    }
  ]
}
```

## Policy Template: Support Agent (Read-Only)

View-only access to customer data for support purposes.

```json
{
  "name": "ORQ-{id} Support Read-Only",
  "description": "Read-only support access for organization {id}",
  "admin_access": false,
  "app_access": true,
  "permissions": [
    {
      "action": "read",
      "collection": "orders",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "customers",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "products",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    }
  ]
}
```

## Policy Template: Finance Team

Limited update access to payment-related fields only.

```json
{
  "name": "ORQ-{id} Finance Access",
  "description": "Payment field access for finance team",
  "admin_access": false,
  "app_access": true,
  "permissions": [
    {
      "action": "read",
      "collection": "orders",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "orders",
      "fields": ["payment_status", "payment_notes", "invoice_url", "payment_date"],
      "permissions": {
        "_and": [
          {"orq": {"_eq": "{orq_id}"}},
          {"status": {"_in": ["completed", "processing"]}}
        ]
      }
    },
    {
      "action": "read",
      "collection": "invoices",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "create",
      "collection": "invoices",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}},
      "validation": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "invoices",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    }
  ]
}
```

## Policy Template: Warehouse Manager

Collection-specific access without customer payment data.

```json
{
  "name": "ORQ-{id} Warehouse Access",
  "description": "Inventory and shipment management",
  "admin_access": false,
  "app_access": true,
  "permissions": [
    {
      "action": "create",
      "collection": "shipments",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}},
      "validation": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "shipments",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "shipments",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "delete",
      "collection": "shipments",
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "orders",
      "fields": ["id", "items", "customer", "status", "shipping_address"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "products",
      "fields": ["*"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "products",
      "fields": ["stock_quantity", "warehouse_location"],
      "permissions": {"orq": {"_eq": "{orq_id}"}}
    }
  ]
}
```

## Policy Template: Org Admin

Full access within organization including user management.

```json
{
  "name": "ORQ-{id} Org Admin",
  "description": "Organization administrator - full access",
  "admin_access": false,
  "app_access": true,
  "permissions": [
    {
      "action": "create",
      "collection": "users_multi",
      "fields": ["*"],
      "permissions": {"orq_id": {"_eq": "{orq_id}"}},
      "validation": {"orq_id": {"_eq": "{orq_id}"}}
    },
    {
      "action": "read",
      "collection": "users_multi",
      "fields": ["*"],
      "permissions": {"orq_id": {"_eq": "{orq_id}"}}
    },
    {
      "action": "update",
      "collection": "users_multi",
      "fields": ["*"],
      "permissions": {"orq_id": {"_eq": "{orq_id}"}}
    },
    {
      "action": "delete",
      "collection": "users_multi",
      "permissions": {"orq_id": {"_eq": "{orq_id}"}}
    }
  ]
}
```

**Note**: Org Admin typically combines this policy with Sales Manager or other functional policies.

## API Script: Create Policy from Template

```bash
#!/bin/bash
# create-policy.sh - Create policy from template

ORQ_ID=$1
POLICY_NAME=$2
ADMIN_TOKEN=$3
DIRECTUS_URL=${4:-http://localhost:8055}

if [ -z "$ORQ_ID" ] || [ -z "$POLICY_NAME" ]; then
  echo "Usage: ./create-policy.sh <orq_id> <policy_name> <admin_token> [directus_url]"
  exit 1
fi

# Create policy
POLICY_ID=$(curl -s -X POST "$DIRECTUS_URL/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"ORQ-$ORQ_ID $POLICY_NAME\",
    \"admin_access\": false,
    \"app_access\": true
  }" | jq -r '.data.id')

echo "Created policy: $POLICY_ID"

# Add CRUD permissions for orders
for ACTION in create read update delete; do
  PAYLOAD="{
    \"action\": \"$ACTION\",
    \"collection\": \"orders\",
    \"fields\": [\"*\"],
    \"permissions\": {\"orq\": {\"_eq\": $ORQ_ID}},
    \"policy\": \"$POLICY_ID\"
  }"

  # Add validation for CREATE
  if [ "$ACTION" = "create" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq '. + {validation: {orq: {_eq: '$ORQ_ID'}}}')
  fi

  curl -s -X POST "$DIRECTUS_URL/permissions" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" > /dev/null

  echo "Added $ACTION permission for orders"
done

echo "Policy ORQ-$ORQ_ID $POLICY_NAME created with UUID: $POLICY_ID"
```

## Multi-Org Assignment Pattern

For users who need access to multiple organizations:

```bash
# User gets additive access via multiple directus_access records
USER_ID="user-uuid-here"

# Assign ORQ-63 policy
curl -X POST "$DIRECTUS_URL/access" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user\": \"$USER_ID\", \"role\": null, \"policy\": \"$ORQ_63_POLICY_ID\"}"

# Assign ORQ-75 policy
curl -X POST "$DIRECTUS_URL/access" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user\": \"$USER_ID\", \"role\": null, \"policy\": \"$ORQ_75_POLICY_ID\"}"

# Result: User sees data from BOTH organizations (policies union together)
```

## Removing Access

```bash
# Find the access record
ACCESS_ID=$(curl -s "$DIRECTUS_URL/access?filter[user][_eq]=$USER_ID&filter[policy][_eq]=$POLICY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Delete the access record
curl -X DELETE "$DIRECTUS_URL/access/$ACCESS_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Validation Testing Checklist

For each policy, verify:

| Test | Expected | Command |
|------|----------|---------|
| READ own org | 200 + data | `GET /items/orders` |
| READ other org | 200 + empty | `GET /items/orders?filter[orq]=75` |
| CREATE own org | 200 | `POST /items/orders {"orq":63}` |
| CREATE other org | 403 | `POST /items/orders {"orq":75}` |
| UPDATE own org | 200 | `PATCH /items/orders/1 {"name":"x"}` |
| UPDATE other org | 403 | `PATCH /items/orders/99 {"name":"x"}` |
| DELETE own org | 204 | `DELETE /items/orders/1` |
| DELETE other org | 403 | `DELETE /items/orders/99` |

---

**Last Updated**: 2026-02-15
