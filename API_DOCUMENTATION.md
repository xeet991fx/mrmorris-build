# MrMorris CRM - Public API Documentation

**Version:** 1.0.0
**Base URL:** `https://your-domain.com/api`
**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Contacts](#contacts)
3. [Companies](#companies)
4. [Deals (Opportunities)](#deals)
5. [Proposals & Quotes](#proposals)
6. [Tasks](#tasks)
7. [Email](#email)
8. [Workflows](#workflows)
9. [Analytics](#analytics)
10. [Webhooks](#webhooks)
11. [Rate Limits](#rate-limits)
12. [Error Handling](#error-handling)

---

## Authentication

All API requests require a Bearer token in the `Authorization` header.

### Get API Token

**POST** `/auth/api-token`

```bash
curl -X POST https://your-domain.com/api/auth/api-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

### Using the Token

Include the token in all subsequent requests:

```bash
curl https://your-domain.com/api/workspaces/{workspaceId}/contacts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Contacts

### List Contacts

**GET** `/workspaces/:workspaceId/contacts`

**Query Parameters:**
- `status` (optional): Filter by status (lead, prospect, customer, inactive)
- `search` (optional): Search by name or email
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl "https://your-domain.com/api/workspaces/123/contacts?status=lead&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "_id": "contact123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "company": "Acme Corp",
        "status": "lead",
        "tags": ["enterprise", "demo-scheduled"],
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 156,
    "limit": 10,
    "offset": 0
  }
}
```

### Create Contact

**POST** `/workspaces/:workspaceId/contacts`

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1987654321",
  "company": "TechStart Inc",
  "jobTitle": "CTO",
  "status": "lead",
  "source": "website",
  "tags": ["technical", "high-priority"]
}
```

### Update Contact

**PUT** `/workspaces/:workspaceId/contacts/:contactId`

### Delete Contact

**DELETE** `/workspaces/:workspaceId/contacts/:contactId`

---

## Companies

### List Companies

**GET** `/workspaces/:workspaceId/companies`

### Create Company

**POST** `/workspaces/:workspaceId/companies`

**Body:**
```json
{
  "name": "Acme Corporation",
  "industry": "Technology",
  "website": "https://acme.com",
  "companySize": "51-200",
  "annualRevenue": 5000000,
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "zipCode": "94105"
  }
}
```

---

## Deals (Opportunities)

### List Deals

**GET** `/workspaces/:workspaceId/opportunities`

**Query Parameters:**
- `status`: open, won, lost
- `stage`: Pipeline stage name
- `pipelineId`: Filter by pipeline

### Create Deal

**POST** `/workspaces/:workspaceId/opportunities`

**Body:**
```json
{
  "name": "Acme Corp - Enterprise Plan",
  "value": 50000,
  "pipelineId": "pipeline123",
  "stage": "Proposal Sent",
  "probability": 75,
  "expectedCloseDate": "2024-12-31",
  "contactId": "contact123",
  "companyId": "company123",
  "notes": "High priority deal, decision maker engaged"
}
```

### Update Deal Stage

**PUT** `/workspaces/:workspaceId/opportunities/:dealId`

```json
{
  "stage": "Negotiation",
  "probability": 85
}
```

---

## Proposals & Quotes

### List Proposals

**GET** `/workspaces/:workspaceId/proposals`

### Create Proposal

**POST** `/workspaces/:workspaceId/proposals`

**Body:**
```json
{
  "opportunityId": "deal123",
  "title": "Q1 2025 Enterprise Services Proposal",
  "templateType": "enterprise",
  "executiveSummary": "This proposal outlines...",
  "pricing": {
    "items": [
      {
        "name": "Enterprise License",
        "description": "Annual subscription",
        "quantity": 100,
        "unitPrice": 99,
        "discount": 10
      },
      {
        "name": "Professional Services",
        "quantity": 40,
        "unitPrice": 150,
        "discount": 0
      }
    ],
    "discount": 0,
    "discountType": "fixed",
    "tax": 0,
    "currency": "USD"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "proposal123",
    "title": "Q1 2025 Enterprise Services Proposal",
    "status": "draft",
    "pricing": {
      "items": [...],
      "subtotal": 15810,
      "total": 15810,
      "currency": "USD"
    },
    "createdAt": "2024-12-26T10:00:00Z"
  }
}
```

---

## Tasks

### Create Task

**POST** `/workspaces/:workspaceId/tasks`

**Body:**
```json
{
  "title": "Follow up with Acme Corp",
  "description": "Discuss pricing and next steps",
  "dueDate": "2024-12-28T14:00:00Z",
  "priority": "high",
  "assignedTo": "user123",
  "relatedTo": {
    "type": "opportunity",
    "id": "deal123"
  },
  "status": "todo"
}
```

---

## Email

### Send Email

**POST** `/workspaces/:workspaceId/emails/send`

**Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Following up on our conversation",
  "body": "<p>Hi John,</p><p>Just wanted to follow up...</p>",
  "templateId": "template123",
  "trackOpens": true,
  "trackClicks": true,
  "contactId": "contact123"
}
```

---

## Workflows

### List Workflows

**GET** `/workspaces/:workspaceId/workflows`

### Enroll Contact in Workflow

**POST** `/workspaces/:workspaceId/workflows/:workflowId/enroll`

**Body:**
```json
{
  "contactId": "contact123",
  "startImmediately": true
}
```

---

## Analytics

### Pipeline Analytics

**GET** `/workspaces/:workspaceId/analytics/pipeline`

**Query Parameters:**
- `pipelineId` (optional)
- `dateFrom` (optional): ISO date
- `dateTo` (optional): ISO date

**Response:**
```json
{
  "success": true,
  "data": {
    "dealsByStage": [
      { "_id": "Proposal Sent", "count": 12, "totalValue": 145000 },
      { "_id": "Negotiation", "count": 8, "totalValue": 98000 }
    ],
    "winRate": "42.50",
    "totalDeals": 67,
    "totalValue": 892000
  }
}
```

### Revenue Trend

**GET** `/workspaces/:workspaceId/analytics/revenue-trend`

**Query Parameters:**
- `interval`: day, week, month (default: month)
- `dateFrom`, `dateTo`: Date range

### Email Performance

**GET** `/workspaces/:workspaceId/analytics/email-performance`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSent": 1250,
    "totalOpened": 487,
    "totalClicked": 142,
    "totalReplied": 89,
    "openRate": "38.96",
    "clickRate": "11.36",
    "replyRate": "7.12"
  }
}
```

---

## Webhooks

### Subscribe to Webhook

**POST** `/workspaces/:workspaceId/webhooks`

**Body:**
```json
{
  "url": "https://your-app.com/webhooks/mrmorris",
  "events": [
    "contact.created",
    "deal.won",
    "email.opened"
  ],
  "headers": {
    "X-Custom-Header": "your-value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "webhook123",
    "url": "https://your-app.com/webhooks/mrmorris",
    "events": ["contact.created", "deal.won", "email.opened"],
    "secret": "whsec_abc123...",
    "isActive": true
  }
}
```

### Webhook Payload Format

All webhooks send POST requests with this structure:

```json
{
  "event": "contact.created",
  "workspaceId": "workspace123",
  "timestamp": "2024-12-26T10:30:00Z",
  "data": {
    "_id": "contact123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "status": "lead"
  }
}
```

### Webhook Signature Verification

Verify webhooks using the `X-MrMorris-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}
```

### Available Events

- `contact.created`, `contact.updated`, `contact.deleted`
- `company.created`, `company.updated`
- `deal.created`, `deal.updated`, `deal.won`, `deal.lost`, `deal.stage_changed`
- `task.created`, `task.completed`
- `email.opened`, `email.clicked`, `email.replied`
- `workflow.enrolled`, `workflow.completed`
- `form.submitted`

---

## Rate Limits

**General API:** 100 requests per 15 minutes
**Authentication:** 5 requests per 15 minutes

Rate limit headers are included in all responses:

```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 2024-12-26T11:00:00Z
```

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```

---

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "error": "Resource not found"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Pagination

List endpoints support pagination:

**Request:**
```
GET /workspaces/123/contacts?limit=25&offset=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [...],
    "total": 156,
    "limit": 25,
    "offset": 50
  }
}
```

---

## Best Practices

1. **Use Webhooks** instead of polling for updates
2. **Respect rate limits** - implement exponential backoff
3. **Verify webhook signatures** for security
4. **Handle errors gracefully** with retry logic
5. **Cache responses** when appropriate
6. **Use pagination** for large datasets

---

## SDKs & Libraries

### JavaScript/Node.js

```javascript
const MrMorris = require('mrmorris-sdk');

const client = new MrMorris({
  apiKey: 'YOUR_API_KEY',
  workspaceId: 'workspace123'
});

// Create contact
const contact = await client.contacts.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

### Python

```python
from mrmorris import Client

client = Client(api_key='YOUR_API_KEY', workspace_id='workspace123')

# Create contact
contact = client.contacts.create(
    first_name='John',
    last_name='Doe',
    email='john@example.com'
)
```

---

## Zapier Integration

Connect MrMorris to 5000+ apps with Zapier:

1. Search for "MrMorris" in Zapier
2. Connect your account using API key
3. Choose triggers and actions

**Popular Zaps:**
- New contact → Add to Google Sheets
- Deal won → Send Slack notification
- Form submitted → Create contact
- Email opened → Update CRM status

---

## Support

- **API Status:** https://status.mrmorris.com
- **Support:** api@mrmorris.com
- **Documentation:** https://docs.mrmorris.com
- **GitHub:** https://github.com/mrmorris/api-examples

---

**Last Updated:** December 26, 2024
