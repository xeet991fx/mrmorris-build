# Clianta - Third-Party Integrations

## Overview

Clianta integrates with 8+ third-party services for CRM sync, email, calendar, communication, productivity, and data enrichment.

**Integration Models**: `backend/src/models/` (SalesforceIntegration, EmailAccount, CalendarIntegration, etc.)
**Integration Services**: `backend/src/services/` (SalesforceService, ApolloService, EmailService, etc.)
**Integration Routes**: `backend/src/routes/integrations/` + dedicated routes

---

## 1. Email Integrations

### Gmail (OAuth)
**Type**: Email sync + sending
**Package**: `googleapis@^167.0.0`
**Authentication**: OAuth 2.0

**Features**:
- Read emails via Gmail API
- Send emails via Gmail API
- Real-time sync every 5 minutes
- Automatic threading (reply detection)

**Configuration** (`backend/src/models/EmailAccount.ts`):
```typescript
{
  workspace: ObjectId,
  provider: 'gmail',
  email: String,
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  lastSyncAt: Date,
  syncEnabled: Boolean
}
```

### Outlook (OAuth)
**Type**: Email sync + sending
**Package**: `googleapis` (Microsoft Graph via REST)
**Authentication**: OAuth 2.0

**Features**: Same as Gmail

### SMTP/IMAP (Generic)
**Type**: Email sync + sending
**Authentication**: Username/password

**Configuration**:
```typescript
{
  provider: 'smtp',
  email: String,
  imapHost: String,
  imapPort: Number,
  smtpHost: String,
  smtpPort: Number,
  username: String,
  password: String (encrypted)
}
```

**Service** (`backend/src/services/EmailAccountService.ts`):
- `connectGmail()` - Gmail OAuth
- `connectOutlook()` - Outlook OAuth
- `connectSMTP()` - SMTP/IMAP setup
- `syncEmails(accountId)` - Fetch new emails
- `sendEmail(accountId, to, subject, body)` - Send via account

**Routes**:
- `POST /api/email-accounts` - Add email account
- `GET /api/email-accounts` - List accounts
- `POST /api/email-accounts/:id/sync` - Trigger sync
- `DELETE /api/email-accounts/:id` - Remove account

---

## 2. Calendar Integration

### Google Calendar
**Type**: Event sync + booking
**Package**: `googleapis@^167.0.0`
**Authentication**: OAuth 2.0

**Features**:
- Sync calendar events to CalendarEvent model
- Check availability for meeting scheduling
- Create events via Clianta UI
- Sync every 15 minutes

**Configuration** (`backend/src/models/CalendarIntegration.ts`):
```typescript
{
  workspace: ObjectId,
  user: ObjectId,
  provider: 'google',
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  calendarId: String,
  syncEnabled: Boolean
}
```

**Service** (`backend/src/services/CalendarService.ts`):
- `connect()` - OAuth flow
- `syncEvents()` - Pull calendar events
- `createEvent(title, start, end, attendees)` - Create event
- `checkAvailability(start, end)` - Check free/busy

**Routes**:
- `POST /api/calendar/connect` - OAuth initiation
- `GET /api/calendar/events` - List synced events
- `POST /api/calendar/events` - Create event

---

## 3. Communication Integrations

### Slack
**Type**: Notifications + 2-way messaging
**Package**: `@slack/web-api@^7.13.0`
**Authentication**: OAuth 2.0 + Webhook

**Features**:
- Send notifications to Slack channels
- Receive Slack messages via webhook
- Post updates on deal/contact changes
- Slash commands (future)

**Configuration** (`backend/src/models/SlackIntegration.ts`):
```typescript
{
  workspace: ObjectId,
  teamId: String,
  accessToken: String (encrypted),
  channel: String,
  webhookUrl: String
}
```

**Service** (`backend/src/services/SlackService.ts`):
- `connect()` - OAuth flow
- `postMessage(channel, text)` - Send message
- `postNotification(event)` - CRM event → Slack notification

**Routes**:
- `POST /api/integrations/slack/oauth` - OAuth callback
- `POST /api/integrations/slack/webhook` - Receive Slack events
- `POST /api/workspaces/:id/slack/test` - Test connection

**Use Cases**:
- "New lead captured" → Post to #sales channel
- "Deal won" → Post to #celebrations channel
- "/clianta find contact john@acme.com" → Slack slash command

### Twilio (SMS/Voice)
**Type**: SMS sending + voice calls
**Package**: `twilio@^5.11.1`
**Authentication**: Account SID + Auth Token

**Features**:
- Send SMS messages
- Ringless voicemail (VoiceDrop model)
- Receive SMS via webhook
- Call recording integration

**Configuration** (Environment variables):
```typescript
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Service** (`backend/src/services/SMSService.ts`):
- `sendSMS(to, message)` - Send SMS
- `sendVoiceDrop(to, audioUrl)` - Ringless voicemail

**Routes**:
- `POST /api/workspaces/:id/sms/send` - Send SMS
- `POST /api/voice-drops` - Create voice drop campaign
- `POST /api/webhooks/twilio/sms` - Receive SMS (webhook)

---

## 4. Productivity Integrations

### Google Sheets
**Type**: Data import/export
**Package**: `googleapis@^167.0.0`
**Authentication**: OAuth 2.0

**Features**:
- Import contacts from Google Sheets
- Export reports to Google Sheets
- Sync data bidirectionally (future)

**Routes**:
- `POST /api/integrations/google-sheets/import` - Import contacts
- `POST /api/integrations/google-sheets/export` - Export report

**Service**:
- `importFromSheet(sheetId, workspace)` - Parse sheet → create contacts
- `exportToSheet(data, sheetId)` - Write data to sheet

### Notion
**Type**: Knowledge base sync
**Package**: `@notionhq/client@^5.6.0`
**Authentication**: OAuth 2.0 / Internal Integration Token

**Features**:
- Sync meeting notes to Notion
- Pull Notion pages into AI Memory
- Export reports to Notion database

**Routes**:
- `POST /api/integrations/notion/connect` - OAuth flow
- `POST /api/integrations/notion/sync` - Sync pages
- `POST /api/integrations/notion/export` - Export to Notion

**Service** (`backend/src/services/NotionService.ts`):
- `connect()` - OAuth flow
- `syncPages()` - Pull Notion pages
- `createPage(title, content)` - Create Notion page

---

## 5. Data Enrichment Integration

### Apollo.io
**Type**: Contact data enrichment
**Package**: `axios` (REST API)
**Authentication**: API Key

**Features**:
- Enrich contacts with firmographic/demographic data
- Find email addresses by name + company
- Company lookup by domain
- Usage tracking (ApolloUsage model for rate limiting)

**Configuration**:
```typescript
// Environment variable
APOLLO_API_KEY=your_apollo_api_key
APOLLO_BASE_URL=https://api.apollo.io/v1

// Usage tracking
ApolloUsage: {
  workspace: ObjectId,
  creditsUsed: Number,
  creditsLimit: Number,
  resetDate: Date
}
```

**Service** (`backend/src/services/ApolloService.ts`):
- `enrichContact(email)` - Get contact details
- `findEmail(name, domain)` - Email finder
- `companyLookup(domain)` - Company data
- `checkCredits()` - Usage limits

**Routes**:
- `POST /api/workspaces/:id/apollo/enrich` - Enrich contact
- `GET /api/workspaces/:id/apollo/usage` - Check credits

---

## 6. Payment Integration (Planned)

### Stripe
**Status**: Planned (not yet implemented)
**Package**: `stripe@^x.x.x`

**Planned Features**:
- Subscription billing for Clianta
- Customer payment tracking
- Invoice generation

---

## 7. Legacy Integrations (Not in Active Use)

### Salesforce
**Status**: Legacy code exists but not in active use
**Location**: `backend/src/services/SalesforceService.ts`, `backend/src/routes/salesforceIntegration.ts`

**Note**: Salesforce integration code, models (SalesforceIntegration, FieldMapping, SyncLog), and routes exist in codebase but are not actively maintained or used in production.

---

## 8. Authentication Patterns

### OAuth 2.0 Flow

**Standard Implementation**:
```typescript
// 1. Initiate OAuth
router.get('/connect', (req, res) => {
  const authUrl = oauthClient.generateAuthUrl({
    scope: ['read', 'write'],
    redirectUri: `${BACKEND_URL}/callback`
  });
  res.redirect(authUrl);
});

// 2. Handle Callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const tokens = await oauthClient.getToken(code);

  // Store tokens encrypted
  await IntegrationCredential.create({
    workspace,
    provider: 'salesforce',
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token)
  });

  res.redirect('/settings/integrations?success=true');
});
```

### API Key Authentication

**Implementation**:
```typescript
// Store API key encrypted
const credential = await IntegrationCredential.create({
  workspace,
  provider: 'apollo',
  apiKey: encrypt(apiKey)
});

// Use in requests
const apiKey = decrypt(credential.apiKey);
axios.get('https://api.apollo.io/contacts', {
  headers: { 'X-Api-Key': apiKey }
});
```

---

## 9. Credential Storage & Security

### Encryption (`backend/src/models/IntegrationCredential.ts`)

```typescript
{
  workspace: ObjectId,
  provider: String,          // 'salesforce', 'gmail', 'apollo', etc.
  accessToken: String,       // Encrypted
  refreshToken: String,      // Encrypted
  apiKey: String,            // Encrypted
  expiresAt: Date,
  metadata: Mixed
}
```

**Encryption**: Uses `crypto` module with `AES-256-GCM`:
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte key
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Token Refresh

**Auto-refresh for OAuth integrations**:
```typescript
async function refreshAccessToken(credentialId) {
  const credential = await IntegrationCredential.findById(credentialId);

  if (credential.expiresAt < new Date()) {
    const newTokens = await oauthClient.refreshAccessToken(
      decrypt(credential.refreshToken)
    );

    credential.accessToken = encrypt(newTokens.access_token);
    credential.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
    await credential.save();
  }

  return decrypt(credential.accessToken);
}
```

---

## 10. Webhook System

### Webhook Subscription Model

```typescript
{
  workspace: ObjectId,
  provider: String,          // 'slack', 'twilio', 'salesforce'
  url: String,               // Webhook URL
  secret: String,            // Verification secret
  events: [String],          // ['message.received', 'sms.inbound']
  active: Boolean
}
```

### Webhook Verification

```typescript
// Verify Slack webhook signature
function verifySlackSignature(req) {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  const body = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
  hmac.update(`v0:${timestamp}:${body}`);
  const computedSignature = 'v0=' + hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

---

## 11. Rate Limiting & Error Handling

### Rate Limit Strategies

**Per-Integration Limits**:
- **Apollo.io**: Credits-based → Track in ApolloUsage model
- **Gmail API**: 1 billion quota units/day → Rarely hit
- **Twilio**: Pay-per-use → No hard limit

**Implementation**:
```typescript
// Check Apollo credits before enrichment
const usage = await ApolloUsage.findOne({ workspace });
if (usage.creditsUsed >= usage.creditsLimit) {
  throw new Error('Apollo credit limit exceeded');
}

// Increment after successful call
usage.creditsUsed += 1;
await usage.save();
```

### Error Handling

**Retry Logic** (via BullMQ for background syncs):
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s → 5s → 30s
  }
}
```

**User-Facing Errors**:
```typescript
try {
  await IntegrationService.sync(workspace);
} catch (error) {
  if (error.code === 'INVALID_TOKEN') {
    // Prompt user to reconnect
    return res.status(401).json({
      error: 'Integration token expired. Please reconnect.'
    });
  }

  // Log to Sentry
  Sentry.captureException(error);

  return res.status(500).json({
    error: 'Sync failed. Our team has been notified.'
  });
}
```

---

## Summary

Clianta integrates with:
- **Email**: Gmail, Outlook, SMTP/IMAP (sync + send)
- **Calendar**: Google Calendar (event sync)
- **Communication**: Slack (notifications), Twilio (SMS/voice)
- **Productivity**: Google Sheets, Notion
- **Enrichment**: Apollo.io (contact data)

**Legacy**: Salesforce integration code exists but not in active use

**Security**: All credentials encrypted at rest with AES-256-GCM
**Reliability**: Background sync jobs with retry logic
**Scalability**: Rate limiting and usage tracking per integration

For related documentation, see:
- [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) - Integration sync jobs
- [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) - API keys & credentials
- [MODELS_AND_SCHEMAS.md](./MODELS_AND_SCHEMAS.md) - Integration models
