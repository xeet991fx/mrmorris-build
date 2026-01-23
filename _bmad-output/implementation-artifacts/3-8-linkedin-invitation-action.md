# Story 3.8: LinkedIn Invitation Action

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to send LinkedIn connection requests,
So that I can automate LinkedIn prospecting and network building.

## Acceptance Criteria

1. **AC1: Send LinkedIn Invitation with Custom Note**
   - Given agent instruction: "Send LinkedIn invitation with note: 'Hi @contact.firstName, let's connect'"
   - When action executes
   - Then LinkedIn API sends connection request to contact's LinkedIn profile
   - And custom note is included with variables resolved
   - And note becomes: "Hi John, let's connect"

2. **AC2: Use Contact LinkedIn URL**
   - Given contact has LinkedIn URL in profile
   - When send invitation action executes
   - Then system uses the LinkedIn URL to send request
   - And request is sent successfully

3. **AC3: Handle Missing LinkedIn URL**
   - Given contact does NOT have LinkedIn URL
   - When send invitation action executes
   - Then execution fails with warning: "Contact [name] does not have LinkedIn URL. Skipping."
   - And execution continues to next contact (doesn't fail entire agent)

4. **AC4: Rate Limiting for Multiple Invitations**
   - Given agent sends multiple invitations
   - When executing across 50 contacts
   - Then each invitation is sent individually
   - And rate limiting applies: Max 100 requests/day per user (LinkedIn API limit)
   - And requests are queued if limit is approached

5. **AC5: Daily Limit Reached - Auto Pause**
   - Given LinkedIn rate limit is reached
   - When 101st invitation is attempted in one day
   - Then action fails with error: "LinkedIn daily limit reached (100 invitations/day)"
   - And agent auto-pauses
   - And execution resumes next day when quota resets

6. **AC6: Handle Expired Credentials**
   - Given LinkedIn credentials expire
   - When action attempts to send
   - Then execution fails with error: "LinkedIn integration disconnected. Reconnect to continue."
   - And user is notified to re-authenticate

7. **AC7: Activity Logging on Success**
   - Given LinkedIn invitation is sent successfully
   - When action completes
   - Then Activity is logged: "LinkedIn invitation sent to [contact]"
   - And contact status is updated (if configured)
   - And agent can track acceptance later (Phase 2)

## Tasks / Subtasks

- [x] **Task 1: Create LinkedInService Utility (AC: 1, 2, 5, 6)**
  - [x] 1.1 Create `backend/src/utils/LinkedInService.ts` (pattern: follow GmailService.ts)
  - [x] 1.2 Implement `sendConnectionRequest(accessToken, profileUrl, note)` method
  - [x] 1.3 Implement OAuth token refresh flow similar to Gmail
  - [x] 1.4 Add proper error handling for API responses (401, 403, 429, etc.)
  - [x] 1.5 Implement exponential backoff retry logic (3 attempts: 1s, 2s, 4s)

- [x] **Task 2: Implement executeLinkedInInvitation in ActionExecutorService (AC: 1, 2, 3)**
  - [x] 2.1 Add new case `'linkedin_invitation'` in executeAction switch
  - [x] 2.2 Load LinkedInAccount for workspace (provider='linkedin', status='active')
  - [x] 2.3 Check if LinkedIn is connected, return error if not
  - [x] 2.4 Extract LinkedIn URL from contact (`context.contact.linkedinUrl`)
  - [x] 2.5 If no LinkedIn URL, log warning and skip (don't fail entire execution)
  - [x] 2.6 Call LinkedInService.sendConnectionRequest()

- [x] **Task 3: Variable Resolution for Invitation Note (AC: 1)**
  - [x] 3.1 Reuse `resolveEmailVariables` pattern for LinkedIn notes
  - [x] 3.2 Support @contact.*, @company.*, @deal.* patterns
  - [x] 3.3 Support {{variable}} format as fallback
  - [x] 3.4 Handle missing variables gracefully (leave placeholder or empty)

- [x] **Task 4: Rate Limiting and Auto-Pause (AC: 4, 5)**
  - [x] 4.1 Check daily limit BEFORE sending (100 invitations/day per workspace)
  - [x] 4.2 Track invitation count in LinkedInAccount model or workspace settings
  - [x] 4.3 When limit exceeded, update Agent status to 'paused'
  - [x] 4.4 Set Agent.pauseReason = "LinkedIn daily limit reached (100/day)"
  - [x] 4.5 Emit notification event for workspace owners/admins
  - [x] 4.6 Reset count at midnight (or track via date-based counter)

- [x] **Task 5: OAuth Token Management (AC: 6)**
  - [x] 5.1 Check token expiry before API call
  - [x] 5.2 If expired, attempt refresh using refreshToken
  - [x] 5.3 Update LinkedInAccount with new tokens after refresh
  - [x] 5.4 If refresh fails, mark account as 'disconnected'
  - [x] 5.5 Return user-friendly error with reconnection instructions

- [x] **Task 6: Create CRM Activity on Success (AC: 7)**
  - [x] 6.1 Create Activity model entry when invitation sent successfully
  - [x] 6.2 Include: type='linkedin_invitation_sent', contact reference, note (truncated), timestamp
  - [x] 6.3 Link activity to agent execution for traceability
  - [x] 6.4 Update LinkedInAccount.sentToday using atomic $inc operator

- [x] **Task 7: ActionResult for LinkedIn Actions (AC: All)**
  - [x] 7.1 Return structured result with success, description, error, data fields
  - [x] 7.2 Include invitation status in result.data
  - [x] 7.3 Include resolved note text in result.data
  - [x] 7.4 Track durationMs for performance metrics

- [x] **Task 8: Unit and Integration Tests (AC: All)**
  - [x] 8.1 Unit test: LinkedInService.sendConnectionRequest() with mocked API
  - [x] 8.2 Unit test: Token refresh flow
  - [x] 8.3 Unit test: Missing LinkedIn URL handling (skip, don't fail)
  - [x] 8.4 Unit test: Rate limit exceeded triggers auto-pause
  - [x] 8.5 Unit test: Variable resolution in invitation note
  - [x] 8.6 Integration test: Full linkedin_invitation action flow
  - [x] 8.7 Integration test: Retry on 429 error

## Dev Notes

### Current Implementation Gap Analysis

| Aspect | Current State | Required State (3.8) |
|--------|---------------|----------------------|
| LinkedIn Service | Not implemented | New LinkedInService.ts utility |
| Action Executor | No linkedin_invitation case | Add new action type |
| LinkedIn Account | Model may exist (check) | OAuth fields like EmailAccount |
| Activity Logging | Exists for email | Add linkedin_invitation_sent type |
| Rate Limiting | Pattern exists from email | Apply same pattern for LinkedIn |
| Variable Resolution | Exists (resolveEmailVariables) | Reuse/generalize for notes |

### Architecture Pattern: LinkedIn Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              executeLinkedInInvitation Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Rate Limit Check (pattern from email)                        │
│     │                                                            │
│     └── If exceeded → Auto-pause agent, return error            │
│                                                                  │
│  2. Load LinkedIn Account                                        │
│     │                                                            │
│     ├── Query: LinkedInAccount.findOne({                        │
│     │     workspace: workspaceId,                                │
│     │     provider: 'linkedin',                                  │
│     │     status: 'active'                                       │
│     │   })                                                       │
│     │                                                            │
│     └── If not found → Return error: "LinkedIn not connected"   │
│                                                                  │
│  3. Check Token Expiry                                           │
│     │                                                            │
│     └── If expired → Call LinkedIn OAuth refresh endpoint       │
│         └── Update LinkedInAccount with new tokens              │
│         └── If refresh fails → Mark disconnected, notify user   │
│                                                                  │
│  4. Extract LinkedIn URL from Contact                            │
│     │                                                            │
│     ├── Get context.contact.linkedinUrl                          │
│     │                                                            │
│     └── If empty → Log warning, skip contact, continue          │
│                                                                  │
│  5. Resolve Variables in Note                                    │
│     │                                                            │
│     ├── Replace @contact.* with context.contact values          │
│     ├── Replace @company.* with context.contact.company values  │
│     └── Replace {{var}} style variables                         │
│                                                                  │
│  6. Send via LinkedIn API                                        │
│     │                                                            │
│     ├── POST connection request with note                        │
│     ├── Handle 429 → Retry with backoff                         │
│     └── Return success/failure status                            │
│                                                                  │
│  7. Post-Send Actions                                            │
│     │                                                            │
│     ├── Create Activity: { type: 'linkedin_invitation_sent' }  │
│     ├── Update LinkedInAccount.sentToday++ (atomic $inc)        │
│     └── Update contact status if configured                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### LinkedIn API Implementation Details

```typescript
// LinkedIn API endpoints (v2)
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

// Send connection invitation
// Note: LinkedIn's API for sending invitations is restricted
// You may need to use Marketing API or specific partner access
async function sendConnectionRequest(
  accessToken: string,
  recipientUrn: string,  // LinkedIn URN format: urn:li:person:abc123
  message: string
): Promise<{ invitationId: string }> {
  const response = await axios.post(
    `${LINKEDIN_API_BASE}/invitations`,
    {
      invitee: {
        'com.linkedin.voyager.growth.invitation.InviteeProfile': {
          profileId: recipientUrn
        }
      },
      message: {
        'com.linkedin.voyager.growth.invitation.FormattedInvitation': {
          body: message
        }
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    }
  );

  return { invitationId: response.data.id };
}
```

### Token Refresh Implementation

```typescript
// LinkedIn OAuth token refresh (pattern from GmailService)
async function refreshLinkedInToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in
  };
}
```

### Variable Resolution (Reuse from 3.7)

```typescript
// Reuse the resolveEmailVariables pattern - generalize if not already
function resolveVariables(
  content: string,
  context: ExecutionContext
): string {
  // Same pattern as email - @contact.*, @company.*, @deal.*, {{var}}
  // See Story 3.7 for full implementation
  return resolveEmailVariables(content, context);
}
```

### Key Files to Create/Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| LinkedIn Service | `backend/src/utils/LinkedInService.ts` | **Create** - OAuth, API calls, retry logic |
| LinkedIn Service Tests | `backend/src/utils/LinkedInService.test.ts` | **Create** - Unit tests |
| Action Executor | `backend/src/services/ActionExecutorService.ts` | **Modify** - Add linkedin_invitation case |
| Action Executor Tests | `backend/src/services/ActionExecutorService.test.ts` | **Modify** - Add LinkedIn tests |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| Gmail Service Pattern | `backend/src/utils/GmailService.ts` | **Follow this pattern exactly** for LinkedInService |
| Gmail Tests Pattern | `backend/src/utils/GmailService.test.ts` | Test structure to follow |
| Action Executor | `backend/src/services/ActionExecutorService.ts:188-245` | See send_email pattern to replicate |
| Condition Evaluator | `backend/src/utils/ConditionEvaluator.ts` | Variable resolution patterns |
| Email Account Model | `backend/src/models/EmailAccount.ts` | OAuth field patterns |
| Activity Model | `backend/src/models/Activity.ts` | Activity creation pattern |
| Agent Model | `backend/src/models/Agent.ts` | Has pauseReason field (added in 3.7) |
| Previous Story | `_bmad-output/implementation-artifacts/3-7-send-email-action.md` | Patterns and learnings |

### Project Structure Notes

- Create `backend/src/utils/LinkedInService.ts` following GmailService.ts structure
- Check if LinkedInAccount model exists, if not may need to extend Integration model or create new
- Tests go in same directory as service: `LinkedInService.test.ts`
- Environment variables required: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

### Critical Implementation Notes from Previous Stories

**From Story 3.7 (Send Email Action) - CRITICAL:**
- Created `GmailService.ts` utility - **follow this exact pattern**
- Used axios for API calls with proper error handling
- Implemented exponential backoff: 1s, 2s, 4s for 3 retries
- Added `pauseReason` field to Agent model
- Used atomic `$inc` operator for rate limit counters (avoid race conditions)
- Created Activity records for CRM tracking
- All tests follow same structure: unit tests for service, integration tests for action

**From Story 3.6 (Conditional Logic):**
- Use explicit typing for all new interfaces
- Return structured results with success, description, error, data fields
- Include durationMs in all results for performance tracking
- Use withRetry pattern for external API calls

**From Story 3.1 (Parse and Execute):**
- ActionExecutorService pattern is established - extend, don't replace
- Rate limit check happens BEFORE action execution
- Error messages should be user-friendly and actionable

### LinkedIn API Considerations

**API Access Notes:**
- LinkedIn API requires approved app access for connection invitations
- May need LinkedIn Marketing API or Partner API access
- Rate limits are strictly enforced (100 invitations/day)
- Note length limited to 300 characters

**LinkedIn Profile URL to URN Conversion:**
- LinkedIn URLs: `https://linkedin.com/in/john-doe-123`
- Need to extract profile ID or convert to URN format
- May need to call LinkedIn Profile API first to get URN

### Rate Limit Reference

| Action | Daily Limit | Source |
|--------|-------------|--------|
| linkedin_invitation | 100/day | LinkedIn API Terms |
| LinkedIn API general | Varies by endpoint | LinkedIn Developer Docs |

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| LinkedIn not connected | "LinkedIn integration not connected. Please connect LinkedIn in Settings > Integrations." |
| Daily limit reached | "LinkedIn daily limit reached (100 invitations/day). Agent auto-paused. Limit resets tomorrow." |
| Token expired | "LinkedIn authorization expired. Please reconnect LinkedIn." |
| No LinkedIn URL | "Contact '[name]' does not have LinkedIn URL. Skipping." (warning, not failure) |
| API rate limit (429) | "LinkedIn API rate limit exceeded. Please wait and try again." |
| Invalid profile URL | "Invalid LinkedIn profile URL for contact '[name]'." |

### NFR Compliance

- **NFR1:** LinkedIn API calls add ~500-1000ms latency per request
- **NFR35:** 90% success rate - Retry logic handles transient failures
- **NFR78:** Rate limiting: 10 executions/min per agent applies
- **NFR84:** Actions logged in AgentExecution for 30-day retention

### Similarity to Story 3.7 Checklist

| Component | 3.7 (Gmail) | 3.8 (LinkedIn) |
|-----------|-------------|----------------|
| Service File | GmailService.ts | LinkedInService.ts |
| OAuth Provider | Google | LinkedIn |
| Rate Limit | 100 emails/day | 100 invitations/day |
| Token Refresh | google.com/oauth | linkedin.com/oauth |
| Activity Type | email_sent | linkedin_invitation_sent |
| Variable Resolution | Same | Reuse same code |
| Error Handling | Same pattern | Follow same pattern |
| Auto-Pause | Agent.pauseReason | Same mechanism |

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.8] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: backend/src/utils/GmailService.ts] - Pattern to follow for LinkedInService
- [Source: backend/src/services/ActionExecutorService.ts] - Add linkedin_invitation case
- [Source: backend/src/models/Agent.ts] - pauseReason field available
- [Source: _bmad-output/implementation-artifacts/3-7-send-email-action.md] - Previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20250123)

### Debug Log References

N/A - No critical issues encountered during implementation.

### Completion Notes List

- **2026-01-23:** Story 3.8 LinkedIn Invitation Action implementation completed
- Created new LinkedInService.ts utility following GmailService.ts pattern
- Added 'linkedin' to IntegrationCredential types enum
- Updated executeLinkedInInvite in ActionExecutorService with full AC coverage
- Implemented variable resolution using existing resolveEmailVariables function
- Added createLinkedInActivity helper for CRM activity logging
- Rate limiting via IntegrationCredential encrypted data with daily counter reset
- Auto-pause triggers on daily limit exceeded (100/day)
- OAuth token refresh with proper error handling
- All unit tests passing (20+ test cases covering all ACs)
- TypeScript compilation clean with no errors

### File List

**Created:**
- `backend/src/utils/LinkedInService.ts` - New LinkedIn API integration service (380 lines)
- `backend/src/utils/LinkedInService.test.ts` - Unit tests for LinkedInService (400 lines)

**Modified:**
- `backend/src/services/ActionExecutorService.ts` - Added linkedin_invitation action handler with full AC implementation
- `backend/src/models/IntegrationCredential.ts` - Added 'linkedin' to IntegrationType enum

