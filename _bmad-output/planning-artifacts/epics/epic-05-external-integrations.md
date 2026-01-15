## Epic 5: External Integrations

Agents can connect to external services (Gmail, LinkedIn, Slack, Apollo.io, Google Calendar, Google Sheets) to perform real actions.

### Story 5.1: OAuth Authentication Flow

As a workspace owner,
I want to securely connect third-party integrations using OAuth,
So that agents can access external services without exposing my passwords.

**Acceptance Criteria:**

**Given** I navigate to Settings > Integrations
**When** I click "Connect Gmail"
**Then** OAuth flow initiates with Google consent screen
**And** I'm redirected to Google to authorize access
**And** Requested scopes are displayed: "Read and send emails"

**Given** I authorize access on Google
**When** OAuth callback returns with authorization code
**Then** Backend exchanges code for access token and refresh token
**And** Tokens are encrypted using AES-256-GCM (NFR12)
**And** Tokens are stored in IntegrationCredential model
**And** I'm redirected back to Settings with success message: "Gmail connected ✓"

**Given** Gmail integration is connected
**When** I view integrations page
**Then** I see: "Gmail - Connected as john@gmail.com"
**And** I see last sync timestamp
**And** I see "Disconnect" button

**Given** I connect LinkedIn
**When** OAuth flow completes
**Then** Integration is saved with provider: 'linkedin'
**And** Tokens are encrypted and stored
**And** LinkedIn profile info is displayed

**Given** I connect multiple integrations
**When** Viewing integrations page
**Then** Each integration shows:
  - Provider name and icon
  - Connected account (email/username)
  - Connection status (Connected, Expired, Error)
  - Last used timestamp

**Given** OAuth flow fails
**When** User denies access
**Then** I'm redirected back with error message: "Authorization canceled. Integration not connected."
**And** No credentials are stored

**Given** OAuth callback has invalid state parameter
**When** Security validation fails
**Then** Request is rejected with error: "Invalid OAuth state"
**And** No credentials are stored (CSRF protection)

**Technical Requirements:**
- OAuth 2.0 implementation for each provider:
  - Gmail: googleapis OAuth client
  - LinkedIn: LinkedIn OAuth 2.0
  - Slack: Slack OAuth 2.0
  - Google Calendar/Sheets: Google APIs
- Extend existing IntegrationCredential model: provider, accessToken (encrypted), refreshToken (encrypted), expiresAt, scopes
- Encryption: AES-256-GCM with workspace-specific keys
- Backend routes:
  - GET `/api/auth/oauth/:provider/authorize` (initiate)
  - GET `/api/auth/oauth/:provider/callback` (handle callback)
- Frontend: Integration cards with connect buttons
- CSRF protection: State parameter validation
- Store minimal data: Only tokens and profile identifier

---

### Story 5.2: Automatic Token Refresh

As a workspace owner,
I want OAuth tokens to refresh automatically,
So that integrations stay connected without manual intervention.

**Acceptance Criteria:**

**Given** Access token expires in 1 hour
**When** Agent tries to use Gmail integration
**Then** Backend detects token expiration (expiresAt < now)
**And** Refresh token is used to get new access token
**And** New access token is encrypted and stored
**And** Agent action proceeds with new token

**Given** Token refresh succeeds
**When** New access token is obtained
**Then** expiresAt is updated (now + 3600s)
**And** Integration status remains "Connected"
**And** No user notification (silent refresh)
**And** 99.9% success rate (NFR14, NFR44)

**Given** Refresh token is invalid/expired
**When** Refresh attempt fails
**Then** Integration status changes to "Expired"
**And** User receives notification: "Gmail integration expired. Reconnect to continue."
**And** Agents using this integration are paused
**And** Email/in-app notification sent

**Given** Multiple agents use same integration
**When** Token refresh occurs
**Then** All agents benefit from new token
**And** No duplicate refresh requests (use locking mechanism)

**Given** Token refresh fails with network error
**When** Temporary failure occurs
**Then** Retry with exponential backoff (3 attempts)
**And** If all attempts fail, mark as "Error" and notify user

**Given** User has 5 integrations
**When** Tokens are near expiration
**Then** Each integration refreshes independently
**And** No cascading failures across integrations

**Given** Refresh token is about to expire (7 days before)
**When** System checks token expiration
**Then** User receives warning: "LinkedIn integration expires in 7 days. Reconnect to avoid disruption."
**And** Warning displayed on integrations page (NFR45)

**Technical Requirements:**
- Token refresh middleware: Check expiresAt before API calls
- OAuth refresh flow per provider
- Exponential backoff: 1s, 2s, 4s (NFR51)
- Mutex locking to prevent duplicate refresh requests
- Background job: Check token expiration daily, send warnings 7 days before
- Update IntegrationCredential on successful refresh
- Notification service integration for expiration warnings
- Error handling: Log failures, update integration status

---

### Story 5.3: Integration Expiration Notifications

As a workspace owner,
I want to be notified when integrations expire,
So that I can reconnect them before agents fail.

**Acceptance Criteria:**

**Given** Integration will expire in 7 days
**When** Daily check job runs
**Then** I receive email notification:
```
Subject: LinkedIn integration expires soon

Your LinkedIn integration will expire in 7 days.
Reconnect now to avoid disruption to your agents.

[Reconnect LinkedIn]
```
**And** In-app notification appears in notification center

**Given** Integration expires
**When** expiresAt timestamp passes
**Then** Integration status changes to "Expired"
**And** I receive immediate notification:
```
Gmail integration has expired.

Agents using Gmail are paused:
- Outbound Campaign
- Follow-up Agent

[Reconnect Gmail Now]
```

**Given** Agent execution fails due to expired integration
**When** Agent tries to use expired Gmail
**Then** Execution fails with error: "Gmail integration expired"
**And** Notification is sent: "Agent [name] failed: Gmail integration expired"
**And** Agent auto-pauses (NFR86)

**Given** Multiple agents use expired integration
**When** Integration expires
**Then** All affected agents are listed in notification
**And** User can reconnect once to fix all agents

**Given** I reconnect expired integration
**When** OAuth flow completes successfully
**Then** Integration status changes to "Connected"
**And** Paused agents can be resumed manually
**And** I see confirmation: "Gmail reconnected. Resume paused agents to continue."

**Given** Integration fails due to revoked access
**When** User revokes access on provider side (Google, LinkedIn)
**Then** Next API call fails with 401 Unauthorized
**And** Integration status changes to "Revoked"
**And** Notification: "Gmail access was revoked. Reconnect to continue."
**And** Clear re-authentication instructions provided (NFR46)

**Given** Integration has temporary error
**When** API returns 5xx server error
**Then** Integration status changes to "Error"
**And** System retries automatically (exponential backoff)
**And** If error persists >1 hour, notify user

**Technical Requirements:**
- Background job: `check-integration-expiration` (daily via BullMQ)
- Calculate days until expiration: expiresAt - now
- Send notifications at: 7 days, 3 days, 1 day, expired
- Notification channels: Email + in-app
- Email template with reconnect CTA button
- Frontend: Integration status badges (Connected, Expired, Error, Revoked)
- Auto-pause affected agents when integration expires
- List affected agents in notification

---

### Story 5.4: Gmail Integration for Emails

As a workspace owner,
I want agents to send emails via my Gmail account,
So that outreach appears from my real email address.

**Acceptance Criteria:**

**Given** Gmail is connected
**When** Agent executes "Send email" action
**Then** Email is sent via Gmail API using connected account
**And** Email appears in Gmail Sent folder
**And** Recipients see email from my Gmail address

**Given** Email template has variables
**When** Agent sends email to contact John Doe
**Then** Variables are resolved before sending:
  - @contact.firstName → John
  - @company.name → Acme Corp
**And** Subject: "Hi John, question about Acme Corp"
**And** Body contains resolved variables

**Given** Agent sends 50 emails in one execution
**When** Execution runs
**Then** Each email is sent individually via Gmail API
**And** Rate limiting applies: 250 units/sec/user (NFR47)
**And** Emails are sent without hitting rate limit

**Given** Gmail rate limit is approached
**When** API returns 429 Too Many Requests
**Then** Agent pauses for 1 second
**And** Retries with exponential backoff (3 attempts, NFR51)
**And** If all retries fail, execution fails with clear error

**Given** Email send fails with invalid recipient
**When** Recipient email is malformed
**Then** Gmail API returns error
**And** Execution logs: "Failed to send to invalid@: Invalid email format"
**And** Execution continues to next contact (doesn't fail entire agent)

**Given** Email send succeeds
**When** Gmail API returns success
**Then** Activity is created in CRM: "Email sent to john@acme.com"
**And** Email tracking (opens/clicks) is initialized (if enabled)
**And** Agent execution log records success

**Given** Gmail integration expires mid-execution
**When** Access token is invalid
**Then** Token refresh is attempted automatically
**And** If refresh succeeds, email send retries
**And** If refresh fails, execution fails with: "Gmail integration expired"

**Technical Requirements:**
- Use Gmail API (googleapis package): `gmail.users.messages.send()`
- Integrate with existing EmailAccount and EmailTemplate models
- Variable resolution before sending
- Rate limiting: Track API units, respect 250 units/sec/user quota
- Retry logic with exponential backoff
- Create Activity after successful send
- Error handling: Invalid recipient, rate limit, expired token
- Log all sends in execution results

---

### Story 5.5: LinkedIn Integration for Connection Requests

As a workspace owner,
I want agents to send LinkedIn connection requests,
So that I can automate LinkedIn prospecting.

**Acceptance Criteria:**

**Given** LinkedIn is connected
**When** Agent executes "Send LinkedIn invitation" action
**Then** Connection request is sent via LinkedIn API
**And** Custom note is included with request
**And** Request appears in my LinkedIn "Sent Invitations"

**Given** Contact has LinkedIn URL
**When** Agent sends invitation to contact
**Then** LinkedIn profile URL is extracted from Contact.linkedinUrl
**And** Connection request is sent to that profile
**And** Custom note includes personalized variables

**Given** Agent sends invitation with note: "Hi @contact.firstName, let's connect"
**When** Sending to John Doe
**Then** Note becomes: "Hi John, let's connect"
**And** LinkedIn API receives personalized note

**Given** Contact does NOT have LinkedIn URL
**When** Agent tries to send invitation
**Then** Action is skipped with warning: "Contact [name] has no LinkedIn URL"
**And** Execution continues to next contact
**And** Warning is logged in execution results

**Given** Agent sends 50 invitations
**When** Execution runs
**Then** Rate limiting applies: Max 100 invitations/day per user (LinkedIn API limit)
**And** Invitations are tracked: 50 of 100 daily quota used
**And** Agent respects rate limit

**Given** Daily limit is reached (100 invitations)
**When** 101st invitation is attempted
**Then** Action fails with error: "LinkedIn daily limit reached (100/day)"
**And** Agent auto-pauses (NFR86)
**And** Notification sent: "Agent paused: LinkedIn daily limit reached"
**And** Quota resets at midnight UTC

**Given** LinkedIn API returns error (profile not found)
**When** LinkedIn URL is invalid
**Then** Error is logged: "LinkedIn profile not found for URL: [url]"
**And** Execution continues to next contact

**Given** Invitation is sent successfully
**When** API returns success
**Then** Activity is created: "LinkedIn invitation sent to [contact]"
**And** Contact can be marked with tag: "LinkedIn Invited" (if configured)

**Technical Requirements:**
- LinkedIn API integration: Connection requests endpoint
- OAuth scope: `w_member_social` for connection requests
- Load LinkedIn URL from Contact.linkedinUrl field
- Variable resolution in custom notes
- Rate limiting: 100 invitations/day per user (strict enforcement)
- Track daily invitation count in Redis (reset at midnight UTC)
- Circuit breaker: Auto-pause agent at quota
- Create Activity after successful send
- Handle errors: Profile not found, no LinkedIn URL, rate limit

---

### Story 5.6: Slack Integration for Notifications

As a workspace owner,
I want agents to send Slack messages,
So that I can notify my team about important events.

**Acceptance Criteria:**

**Given** Slack is connected
**When** Agent executes "Send Slack message" action
**Then** Message is sent to specified Slack channel
**And** Message appears in Slack immediately

**Given** Agent instruction: "Send Slack message to #sales: 'New lead from @company.name'"
**When** Execution runs for Acme Corp
**Then** Message sent to #sales channel:
```
New lead from Acme Corp
```
**And** Variables are resolved before sending

**Given** Agent sends notification about warm lead
**When** Contact replies positively
**Then** Slack message sent:
```
🔥 Warm Lead Alert
Contact: John Doe (john@acme.com)
Company: Acme Corp
Status: Replied positively to outreach

[View in CRM]
```
**And** Message includes link to contact in CRM

**Given** Multiple agents send Slack messages
**When** High volume of notifications
**Then** Rate limiting applies: 1 request/sec (NFR47, NFR52)
**And** Messages are queued if rate limit is approached
**And** Messages deliver within 5 seconds

**Given** Slack rate limit is hit
**When** API returns 429 Too Many Requests
**Then** Agent pauses for 1 second
**And** Retries with exponential backoff (3 attempts)
**And** If all retries fail, execution fails with error

**Given** Slack channel doesn't exist
**When** Agent tries to send to #nonexistent
**Then** Slack API returns error: "Channel not found"
**And** Execution fails with clear error message
**And** Suggestion: "Create channel #nonexistent or update agent instruction"

**Given** Agent sends 100 messages in one day
**When** Execution runs
**Then** All messages are sent successfully
**And** No daily quota limit (Slack workspace quota applies)

**Given** Slack integration expires
**When** Access token is invalid
**Then** Automatic refresh is attempted
**And** If refresh fails, notification sent to reconnect

**Technical Requirements:**
- Slack API integration: `chat.postMessage` endpoint
- OAuth scope: `chat:write` for sending messages
- Variable resolution in messages
- Rate limiting: 1 request/sec per workspace (NFR47)
- Queue messages if rate limit approached
- Retry logic with exponential backoff
- Support channels and direct messages
- Error handling: Channel not found, rate limit, expired token
- Include CRM links in messages (deep links to contacts/deals)

---

### Story 5.7: Apollo.io Integration for Enrichment

As a workspace owner,
I want agents to enrich contact data using Apollo.io,
So that I have complete information before outreach.

**Acceptance Criteria:**

**Given** Apollo.io is connected
**When** Agent executes "Enrich contact using Apollo" action
**Then** Apollo API is called with contact email
**And** Enriched data is returned: job title, company info, phone, social links
**And** Contact fields are updated with enriched data

**Given** Contact has email: john@acme.com
**When** Enrichment runs
**Then** Apollo API returns:
  - Job title: VP of Sales
  - Company: Acme Corp
  - Phone: +1-555-0100
  - LinkedIn: linkedin.com/in/johndoe
**And** Contact fields are updated:
  - Contact.title = "VP of Sales"
  - Contact.phone = "+1-555-0100"
  - Contact.linkedinUrl = "linkedin.com/in/johndoe"

**Given** Apollo returns company data
**When** Company info is enriched
**Then** Company record is created/updated:
  - Company.industry
  - Company.employeeCount
  - Company.revenue
**And** Contact is linked to enriched company

**Given** Apollo enrichment finds no data
**When** Email is not in Apollo database
**Then** API returns empty result
**And** Action completes without error
**And** Log: "No enrichment data available for john@acme.com"
**And** Execution continues

**Given** Agent enriches 50 contacts
**When** Execution runs
**Then** 50 API calls are made to Apollo
**And** Rate limiting applies based on Apollo plan
**And** Usage is tracked in ApolloUsage model

**Given** Apollo API rate limit is reached
**When** Plan quota is exhausted
**Then** API returns 429 Too Many Requests
**And** Agent auto-pauses (NFR86)
**And** Notification: "Agent paused: Apollo rate limit reached"
**And** Quota resets monthly (based on Apollo plan)

**Given** Enrichment succeeds
**When** Data is updated
**Then** Activity is logged: "Contact enriched via Apollo.io"
**And** Updated fields are shown in activity: "Updated: title, phone, LinkedIn"

**Given** Apollo API key is invalid
**When** Authentication fails
**Then** Error: "Apollo integration error: Invalid API key"
**And** Agent execution fails
**And** User notified to reconnect integration

**Technical Requirements:**
- Apollo.io API integration: Person enrichment endpoint
- API authentication via API key (not OAuth)
- Store API key in IntegrationCredential (encrypted)
- Update Contact and Company models with enriched data
- Track API usage in ApolloUsage model
- Rate limiting: Respect plan limits (e.g., 1000 enrichments/month)
- Retry logic for temporary failures
- Create Activity after successful enrichment
- Error handling: No data, rate limit, invalid key

---

### Story 5.8: Google Calendar Integration

As a workspace owner,
I want agents to check calendar availability,
So that meetings are scheduled at appropriate times.

**Acceptance Criteria:**

**Given** Google Calendar is connected
**When** Agent executes "Check calendar availability" action
**Then** Google Calendar API returns free/busy data for date range
**And** Agent can determine available time slots

**Given** Agent instruction: "If calendar is free tomorrow at 2 PM, schedule demo"
**When** Availability check runs
**Then** API checks calendar for tomorrow 2-3 PM
**And** If free, conditional evaluates to TRUE
**And** If busy, conditional evaluates to FALSE

**Given** Agent creates calendar event
**When** Instruction: "Create calendar event: Demo with @contact.firstName"
**Then** Event is created via Calendar API:
  - Title: "Demo with John"
  - Date/time: Based on availability
  - Attendees: Contact email
**And** Event appears in Google Calendar
**And** Calendar invitation sent to contact

**Given** Multiple calendar events are created
**When** Agent schedules 10 demos
**Then** Each event is created individually
**And** No conflicts (availability checked first)

**Given** Calendar integration expires
**When** Access token is invalid
**Then** Automatic refresh is attempted
**And** If refresh succeeds, action continues
**And** If refresh fails, execution fails with error

**Given** Contact has no email address
**When** Agent tries to add contact to calendar event
**Then** Event is created without attendee
**And** Warning logged: "Cannot add attendee: No email for contact [name]"

**Technical Requirements:**
- Google Calendar API integration
- OAuth scope: `calendar.readonly` + `calendar.events`
- FreeBusy query for availability checks
- Create events via `calendar.events.insert()`
- Variable resolution in event titles/descriptions
- Error handling: Expired token, no availability, invalid date

---

### Story 5.9: Google Sheets Integration for Data Export

As a workspace owner,
I want agents to export data to Google Sheets,
So that I can analyze results in spreadsheets.

**Acceptance Criteria:**

**Given** Google Sheets is connected
**When** Agent executes "Export contacts to Google Sheet" action
**Then** Google Sheets API creates new sheet
**And** Contact data is written to sheet in rows

**Given** Agent exports 50 contacts
**When** Execution runs
**Then** Sheet is created with headers:
  - Name, Email, Company, Title, Status
**And** 50 rows of contact data are written
**And** Sheet is formatted (headers bold, frozen row)

**Given** Sheet already exists
**When** Agent instruction specifies sheet ID
**Then** Data is appended to existing sheet
**And** Headers are not duplicated

**Given** Agent exports execution results
**When** Instruction: "Export execution summary to Sheet"
**Then** Sheet contains:
  - Execution date
  - Contacts processed
  - Emails sent
  - Success/failure count
**And** Each execution creates new row

**Given** Google Sheets rate limit is hit
**When** API returns 429
**Then** Agent pauses and retries
**And** If all retries fail, execution fails

**Given** Export completes successfully
**When** Sheet is created
**Then** Share link is generated
**And** Activity logged: "Data exported to Google Sheet: [link]"
**And** User can click link to view sheet

**Technical Requirements:**
- Google Sheets API integration
- OAuth scope: `spreadsheets`
- Create sheet via `spreadsheets.create()`
- Write data via `spreadsheets.values.update()`
- Format sheet (bold headers, freeze row)
- Generate shareable link
- Error handling: Rate limit, permission denied

---

### Story 5.10: Access Internal CRM Data

As a workspace owner,
I want agents to access CRM data (contacts, deals, tasks, tags),
So that workflows can query and manipulate internal data.

**Acceptance Criteria:**

**Given** Agent instruction: "Find contacts where title contains 'CEO'"
**When** Execution runs
**Then** Contact.find({ workspace, title: /CEO/i }) query executes
**And** Results are returned to agent context
**And** Agent can iterate over contacts

**Given** Agent filters by custom field
**When** Instruction: "Find contacts where leadScore is 'A'"
**Then** Query uses CustomFieldDefinition to validate field exists
**And** Contacts with leadScore='A' are returned

**Given** Agent updates deal value
**When** Instruction: "Update deal value to $50,000"
**Then** Deal.updateOne({ _id, workspace }, { value: 50000 }) executes
**And** Deal is updated in database
**And** updatedAt timestamp is set

**Given** Agent creates task
**When** Instruction: "Create task for follow-up"
**Then** Task document is created with workspace isolation
**And** Task.create({ workspace, title, assignedTo, dueDate })
**And** Task appears in user's task list

**Given** Agent adds tag to contact
**When** Instruction: "Add tag 'Interested'"
**Then** Tag is added to Contact.tags array
**And** Contact.updateOne({ $addToSet: { tags: 'Interested' } })
**And** Tag is created if doesn't exist

**Given** Agent queries across workspaces (security test)
**When** Malicious query attempts: Contact.find({})
**Then** Workspace filter is enforced: Contact.find({ workspace })
**And** Only current workspace data is returned (NFR13, NFR22)

**Given** Agent accesses 1000 contacts
**When** Large dataset query runs
**Then** Query is limited to 100 records in Test Mode
**And** In Live mode, processes all contacts with pagination

**Technical Requirements:**
- Direct database access via Mongoose models
- Workspace isolation enforced on ALL queries (NFR13, NFR22)
- CRUD operations: Contact, Company, Opportunity, Task
- Tag management: Add/remove tags via $addToSet/$pull
- Custom field support via CustomFieldDefinition
- Query optimization: Indexes on workspace + common fields
- Pagination for large datasets
- Security: Workspace ID injected automatically, cannot be overridden

---

### Story 5.11: Per-Integration Rate Limiting

As a workspace owner,
I want rate limits enforced per integration,
So that agents don't exhaust API quotas.

**Acceptance Criteria:**

**Given** Gmail has rate limit: 250 units/sec/user
**When** Agent sends 100 emails rapidly
**Then** Rate limiter tracks API usage
**And** Requests are throttled to stay under 250 units/sec
**And** All emails are sent without hitting rate limit

**Given** LinkedIn has rate limit: 100 invitations/day
**When** Agent sends 50 invitations
**Then** Counter increments: 50 of 100 used
**And** Remaining quota: 50 invitations
**And** Counter resets at midnight UTC

**Given** Slack has rate limit: 1 request/sec
**When** Agent sends 10 messages
**Then** Messages are queued
**And** Sent at rate of 1/sec
**And** All messages deliver successfully

**Given** Apollo has rate limit: 1000 enrichments/month
**When** Agent enriches 100 contacts
**Then** Usage tracked: 100 of 1000 used
**And** Remaining quota: 900 enrichments
**And** Counter resets monthly

**Given** Agent exceeds rate limit
**When** Quota is exhausted
**Then** Agent auto-pauses (NFR48, NFR86)
**And** Circuit breaker triggered
**And** Notification: "Agent paused: [Integration] rate limit reached"
**And** Agent resumes when quota resets

**Given** Multiple agents use same integration
**When** Combined usage approaches limit
**Then** Rate limiter is shared across agents
**And** Total workspace usage is tracked
**And** All agents respect combined limit

**Given** Quota resets (daily, monthly)
**When** Reset time arrives
**Then** Counter resets to 0
**And** Paused agents can resume automatically
**And** Notification: "Rate limit reset. Agents can resume."

**Given** I view integration health
**When** Opening integrations page
**Then** I see quota usage per integration:
  - Gmail: 15 of 250 units/sec (peak usage)
  - LinkedIn: 45 of 100 invitations/day
  - Apollo: 200 of 1000 enrichments/month
**And** Usage bars show visual representation (NFR52, NFR53)

**Technical Requirements:**
- Rate limiter per integration using Redis
- Track usage: Increment on each API call
- Enforce limits before API calls
- TTL on rate limit keys (1 day, 1 month based on limit type)
- Circuit breakers: Auto-pause agents at quota (NFR48)
- Queue requests if approaching limit
- Shared rate limiting across workspace
- Real-time quota display on integrations page (NFR52)
- Reset logic based on provider's reset schedule

---

### Story 5.12: Integration Health Monitoring

As a workspace owner,
I want to see integration health status,
So that I know if connections are working properly.

**Acceptance Criteria:**

**Given** I navigate to Settings > Integrations
**When** Page loads
**Then** I see health status for each integration:
  - ✅ Connected - Working normally
  - ⚠️ Warning - Approaching quota
  - ❌ Error - Connection issue
  - ⏸️ Expired - Needs reconnection

**Given** Integration is healthy
**When** Last API call succeeded
**Then** Status shows: "✅ Connected"
**And** Last sync: "2 minutes ago"
**And** Quota usage: "15 of 100 (15%)"

**Given** Integration is approaching quota limit
**When** Usage > 80% of quota
**Then** Status shows: "⚠️ Warning - 85 of 100 used"
**And** Warning color (yellow/orange)
**And** Message: "Approaching daily limit. Agent may pause soon."

**Given** Integration has error
**When** Last API call failed
**Then** Status shows: "❌ Error"
**And** Error message: "Connection failed: Invalid credentials"
**And** Timestamp of last failure

**Given** Integration is expired
**When** expiresAt < now
**Then** Status shows: "⏸️ Expired"
**And** Message: "Token expired. Reconnect to continue."
**And** List of affected agents

**Given** I click on integration health details
**When** Expanding integration card
**Then** I see detailed metrics:
  - Total API calls today: 245
  - Success rate: 98% (240 success, 5 failed)
  - Average response time: 320ms
  - Quota usage by agent:
    - Outbound Campaign: 150 calls
    - Follow-up Agent: 95 calls
**And** Recent errors (last 5) with timestamps

**Given** Integration fails repeatedly
**When** 5+ consecutive failures occur
**Then** System detects degradation (NFR50)
**And** Alert sent: "Gmail integration health degraded. Check connection."
**And** Health status changes to "Error"

**Given** Integration quota is exceeded
**When** Daily limit reached
**Then** Status shows quota exhausted
**And** Next reset time displayed: "Quota resets in 8 hours"
**And** Affected agents listed

**Given** All integrations are healthy
**When** Viewing dashboard
**Then** I see summary: "All integrations connected (5 of 5)"
**And** Green checkmark indicator

**Technical Requirements:**
- IntegrationHealth monitoring service
- Track per integration:
  - Last API call timestamp
  - Success/failure count
  - Response times (average, p95, p99)
  - Quota usage (current / limit)
  - Error history (last 10 errors)
- Background job: Check integration health every 5 minutes
- Detect failures: 5+ consecutive failures = degraded (NFR50)
- Frontend: Integration health dashboard with status cards
- Real-time quota display with <5 second lag (NFR52)
- Color-coded status badges
- Detailed metrics panel (expandable)
- Alert system for degraded integrations

---

**Epic 5 Summary:**
- ✅ 12 stories created
- ✅ All FRs covered (FR42-FR53)
- ✅ Complete acceptance criteria for each story
- ✅ OAuth authentication for all integrations
- ✅ Automatic token refresh with 99.9% success rate
- ✅ Per-integration rate limiting and circuit breakers
- ✅ Integration health monitoring with real-time status
- ✅ Support for Gmail, LinkedIn, Slack, Apollo.io, Google Calendar, Google Sheets, and internal CRM data
- ✅ No future dependencies (each story builds on previous)
- ✅ NFRs addressed (NFR12: encryption, NFR14: 99.9% token refresh, NFR44-55: rate limiting and performance)

Shall I proceed to Epic 6: Agent Templates & Quick Start?

---
