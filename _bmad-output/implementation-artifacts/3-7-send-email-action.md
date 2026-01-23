# Story 3.7: Send Email Action

Status: done

<!-- Note: Code review completed with all issues fixed. -->

## Story

As a workspace owner,
I want agents to send emails via Gmail integration,
So that I can automate email outreach and follow-ups.

## Acceptance Criteria

1. **AC1: Send Email Using Template**
   - Given agent instruction: "Send email using template 'Outbound v2'"
   - When action executes
   - Then email template is loaded from EmailTemplate model
   - And variables in template are resolved (@contact.firstName, @company.name)
   - And email is sent via Gmail API using connected EmailAccount

2. **AC2: Variable Resolution in Template**
   - Given email template has subject: "Hi @contact.firstName, question about @company.name"
   - When sending to contact John Doe at Acme Corp
   - Then subject is resolved to: "Hi John, question about Acme Corp"
   - And email body variables are also resolved

3. **AC3: Email Sent Successfully - Log and Activity**
   - Given agent sends email successfully
   - When Gmail API returns success
   - Then email is logged in execution results
   - And Activity is created in CRM: "Email sent to [contact]"
   - And email count for agent is incremented

4. **AC4: Gmail Not Connected Error**
   - Given agent tries to send email without Gmail connected
   - When action executes
   - Then execution fails with error: "Gmail integration not connected"
   - And user is notified to connect Gmail

5. **AC5: Email Limit Reached (100/day)**
   - Given agent hits email limit (100 emails/day)
   - When 101st email is attempted
   - Then email is not sent
   - And execution fails with error: "Email limit reached (100/day)"
   - And agent auto-pauses
   - And user receives notification

6. **AC6: Gmail API Rate Limit Handling**
   - Given Gmail API rate limit is hit
   - When API returns 429 Too Many Requests
   - Then action retries with exponential backoff (3 attempts)
   - And if all retries fail, execution fails with error: "Gmail rate limit exceeded"

## Tasks / Subtasks

- [x] **Task 1: Update executeSendEmail to Use Gmail API (AC: 1, 4, 6)**
  - [x] 1.1 Load EmailAccount for workspace using connected Gmail account
  - [x] 1.2 Check if Gmail is connected (`provider === 'gmail'` and `status === 'active'`)
  - [x] 1.3 Use Google Gmail API to send email via access token
  - [x] 1.4 Handle token refresh if access token is expired
  - [x] 1.5 Return clear error if Gmail not connected

- [x] **Task 2: Implement Template Loading and Variable Resolution (AC: 1, 2)**
  - [x] 2.1 Load EmailTemplate by name from workspace
  - [x] 2.2 Extract template subject and body (use htmlContent or body)
  - [x] 2.3 Implement variable resolver for @contact.*, @company.*, @deal.* patterns
  - [x] 2.4 Resolve variables in both subject and body
  - [x] 2.5 Support template variables in format @variable and {{variable}}
  - [x] 2.6 Handle missing variables gracefully (leave placeholder or empty)

- [x] **Task 3: Create CRM Activity on Email Send (AC: 3)**
  - [x] 3.1 Create Activity model entry when email sent successfully
  - [x] 3.2 Include: type='email_sent', contact reference, email subject, timestamp
  - [x] 3.3 Link activity to agent execution for traceability
  - [x] 3.4 Update template usageCount and lastUsedAt

- [x] **Task 4: Email Limit and Auto-Pause (AC: 5)**
  - [x] 4.1 Check rate limit BEFORE sending (already exists, verify works correctly)
  - [x] 4.2 When limit exceeded, update Agent status to 'paused'
  - [x] 4.3 Set Agent.pauseReason = "Email limit reached (100/day)"
  - [x] 4.4 Emit notification event for workspace owners/admins

- [x] **Task 5: Gmail API Rate Limit Handling (AC: 6)**
  - [x] 5.1 Detect 429 response from Gmail API
  - [x] 5.2 Implement exponential backoff: 1s, 2s, 4s
  - [x] 5.3 Log retry attempts in execution step result
  - [x] 5.4 After 3 failed retries, return clear error

- [x] **Task 6: Integration with EmailAccount OAuth (AC: 1, 4)**
  - [x] 6.1 Query EmailAccount by workspace where provider='gmail' and status='active'
  - [x] 6.2 Use accessToken for Gmail API authentication
  - [x] 6.3 If tokenExpiry passed, use refreshToken to get new access token
  - [x] 6.4 Update EmailAccount with new tokens after refresh
  - [x] 6.5 Handle refresh token failure (mark account as 'disconnected')

- [x] **Task 7: Update ActionResult for Email Actions (AC: 3)**
  - [x] 7.1 Include messageId from Gmail API response in result.data
  - [x] 7.2 Include resolved subject and recipient in result
  - [x] 7.3 Track template name used (if any) in result.data

- [x] **Task 8: Unit and Integration Tests (AC: All)**
  - [x] 8.1 Unit test: Template loading by name
  - [x] 8.2 Unit test: Variable resolution with contact/company context
  - [x] 8.3 Unit test: Gmail not connected error
  - [x] 8.4 Unit test: Rate limit exceeded triggers auto-pause
  - [x] 8.5 Integration test: Send email via Gmail API (mocked)
  - [x] 8.6 Integration test: Retry on 429 error

## Dev Notes

### Current Implementation Gap Analysis

| Aspect | Current State (3.1) | Required State (3.7) |
|--------|---------------------|----------------------|
| Email Service | Generic `emailService.sendEmail()` | Gmail API via EmailAccount |
| Template Loading | None - uses action.template as string | Load from EmailTemplate model |
| Variable Resolution | None in email action | Full @contact/@company/@deal resolution |
| Activity Logging | None | Create Activity entry in CRM |
| OAuth Integration | Not used | Use EmailAccount accessToken/refreshToken |
| Token Refresh | Not handled | Auto-refresh expired tokens |

### Architecture Pattern: Gmail Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   executeSendEmail Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Rate Limit Check (existing)                                  │
│     │                                                            │
│     └── If exceeded → Auto-pause agent, return error            │
│                                                                  │
│  2. Load Gmail Account                                           │
│     │                                                            │
│     ├── Query: EmailAccount.findOne({                           │
│     │     workspace: workspaceId,                                │
│     │     provider: 'gmail',                                     │
│     │     status: 'active'                                       │
│     │   })                                                       │
│     │                                                            │
│     └── If not found → Return error: "Gmail not connected"      │
│                                                                  │
│  3. Check Token Expiry                                           │
│     │                                                            │
│     └── If expired → Call Google OAuth refresh endpoint         │
│         └── Update EmailAccount with new tokens                  │
│                                                                  │
│  4. Load Email Template (if template name provided)              │
│     │                                                            │
│     ├── Query: EmailTemplate.findOne({                          │
│     │     workspaceId,                                           │
│     │     name: templateName                                     │
│     │   })                                                       │
│     │                                                            │
│     └── Extract subject and body (htmlContent || body)          │
│                                                                  │
│  5. Resolve Variables                                            │
│     │                                                            │
│     ├── Replace @contact.* with context.contact values          │
│     ├── Replace @company.* with context.contact.company values  │
│     ├── Replace @deal.* with context.deal values                │
│     └── Replace {{var}} style variables                         │
│                                                                  │
│  6. Send via Gmail API                                           │
│     │                                                            │
│     ├── Build MIME message                                       │
│     ├── POST to gmail.googleapis.com/gmail/v1/users/me/messages │
│     ├── Handle 429 → Retry with backoff                         │
│     └── Return messageId on success                              │
│                                                                  │
│  7. Post-Send Actions                                            │
│     │                                                            │
│     ├── Create Activity: { type: 'email_sent', contact, ... }  │
│     ├── Update template usageCount and lastUsedAt               │
│     └── Update EmailAccount.sentToday++                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gmail API Implementation Details

```typescript
// Gmail API endpoint for sending emails
const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// Build MIME message for Gmail API
function buildMimeMessage(to: string, from: string, subject: string, body: string): string {
  const boundary = 'boundary_' + Date.now();
  const mimeMessage = [
    'MIME-Version: 1.0',
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body
  ].join('\r\n');

  // Gmail API requires base64url encoding
  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send via Gmail API
async function sendViaGmail(
  accessToken: string,
  to: string,
  from: string,
  subject: string,
  body: string
): Promise<{ messageId: string }> {
  const raw = buildMimeMessage(to, from, subject, body);

  const response = await axios.post(
    GMAIL_SEND_ENDPOINT,
    { raw },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { messageId: response.data.id };
}
```

### Token Refresh Implementation

```typescript
// Google OAuth token refresh
async function refreshGmailToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}
```

### Variable Resolution Pattern

```typescript
// Reuse pattern from ConditionEvaluator for consistency
function resolveEmailVariables(
  content: string,
  context: ExecutionContext
): string {
  // Replace @contact.* variables
  content = content.replace(/@contact\.(\w+)/g, (match, field) => {
    return context.contact?.[field] ?? match;
  });

  // Replace @company.* variables (from contact.company)
  content = content.replace(/@company\.(\w+)/g, (match, field) => {
    const company = context.contact?.company;
    if (typeof company === 'object' && company !== null) {
      return company[field] ?? match;
    }
    return match;
  });

  // Replace @deal.* variables
  content = content.replace(/@deal\.(\w+)/g, (match, field) => {
    return context.deal?.[field] ?? match;
  });

  // Also support {{variable}} format from templates
  content = content.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    // Check contact first, then deal
    return context.contact?.[field]
      ?? context.deal?.[field]
      ?? match;
  });

  return content;
}
```

### Key Files to Modify

| Purpose | File Path | Changes Required |
|---------|-----------|------------------|
| Action Executor | `backend/src/services/ActionExecutorService.ts:188-245` | Replace emailService with Gmail API |
| Email Account Model | `backend/src/models/EmailAccount.ts` | No changes (has OAuth fields) |
| Email Template Model | `backend/src/models/EmailTemplate.ts` | No changes (has template fields) |
| Activity Model | `backend/src/models/Activity.ts` | Use existing model |
| Agent Model | `backend/src/models/Agent.ts` | May need pauseReason field |
| Environment | `.env` | Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET set |

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Current Email Action | `backend/src/services/ActionExecutorService.ts:188-245` |
| Email Account Schema | `backend/src/models/EmailAccount.ts` |
| Email Template Schema | `backend/src/models/EmailTemplate.ts` |
| Condition Evaluator (for resolver pattern) | `backend/src/utils/ConditionEvaluator.ts` |
| Execution Context | `backend/src/services/AgentExecutionService.ts:ExecutionContext` |
| Existing Email Service | `backend/src/services/email.ts` |
| Gmail Integration Routes | `backend/src/routes/emailIntegration.ts` |
| Email Account Service | `backend/src/services/EmailAccountService.ts` |
| Previous Story | `_bmad-output/implementation-artifacts/3-6-conditional-logic-execution.md` |

### Project Structure Notes

- Modify existing `executeSendEmail()` in ActionExecutorService.ts
- Add new helper functions in same file or create `backend/src/utils/GmailService.ts`
- Tests in `backend/src/services/ActionExecutorService.test.ts` (extend existing)
- Environment variables required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Critical Implementation Notes from Previous Stories

From Story 3.6 learnings:
- Use explicit typing for all new interfaces
- Return structured results with success, description, error, data fields
- Include durationMs in all results for performance tracking
- Use withRetry pattern for external API calls

From Story 3.1 learnings:
- ActionExecutorService pattern is established - extend, don't replace
- Rate limit check happens BEFORE action execution
- Credit cost for `send_email` is 0 (using user's Gmail quota)
- Error messages should be sanitized before returning

### Rate Limit Reference

| Action | Daily Limit | Source |
|--------|-------------|--------|
| send_email | 100/day | Epic 3.7 AC5 |
| Gmail API | 250 quota units/sec | Google Workspace limits |

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Gmail not connected | "Gmail integration not connected. Please connect Gmail in Settings > Integrations." |
| Daily limit reached | "Email limit reached (100/day). Agent auto-paused. Limit resets at midnight." |
| Gmail rate limit | "Gmail rate limit exceeded. Please wait and try again." |
| Template not found | "Email template '{name}' not found in workspace." |
| Token refresh failed | "Gmail authorization expired. Please reconnect Gmail." |

### NFR Compliance

- **NFR1:** Email sending adds ~500-1000ms latency (Gmail API call)
- **NFR35:** 90% success rate - Retry logic handles transient failures
- **NFR84:** Email actions logged in AgentExecution for 30-day retention

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: backend/src/services/ActionExecutorService.ts:188-245] - Current email implementation
- [Source: backend/src/models/EmailAccount.ts] - Gmail OAuth storage
- [Source: backend/src/models/EmailTemplate.ts] - Template structure
- [Source: _bmad-output/implementation-artifacts/3-6-conditional-logic-execution.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-thinking

### Debug Log References

### Completion Notes List

- Created `GmailService.ts` utility at `backend/src/utils/GmailService.ts` with full Gmail API integration
- Updated `ActionExecutorService.ts` to use GmailService instead of generic emailService
- Added helper functions: `resolveEmailVariables`, `loadEmailTemplate`, `updateTemplateUsage`, `createEmailActivity`, `autoPauseAgent`
- Implemented MIME message building with base64url encoding for Gmail API
- Implemented OAuth token refresh flow with proper error handling
- Added Activity creation for email tracking in CRM
- Added comprehensive unit tests for both GmailService and ActionExecutorService
- All 49 tests pass (18 GmailService + 31 ActionExecutorService)

**Code Review Fixes Applied:**
- Added `pauseReason` field to Agent model (Task 4.3)
- Implemented notification queue for agent auto-pause events (Task 4.4, AC5)
- Added email address validation before sending (AC7/security)
- Fixed race condition in sentToday increment using atomic $inc operator
- Added empty template body warning
- Added tests for email validation

### File List

| File | Action | Description |
|------|--------|-------------|
| `backend/src/utils/GmailService.ts` | Created | Gmail API integration service with OAuth, token refresh, MIME building, email validation |
| `backend/src/utils/GmailService.test.ts` | Created | Unit tests for GmailService (18 tests) |
| `backend/src/services/ActionExecutorService.ts` | Modified | Updated send_email action to use GmailService, added template loading, variable resolution, activity creation, notifications |
| `backend/src/services/ActionExecutorService.test.ts` | Modified | Added tests for Gmail integration, template loading, variable resolution, activity creation, email validation (31 tests) |
| `backend/src/models/Agent.ts` | Modified | Added `pauseReason` field for tracking auto-pause reasons |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modified | Updated story status |

