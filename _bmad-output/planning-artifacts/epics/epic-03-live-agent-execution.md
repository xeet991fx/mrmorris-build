## Epic 3: Live Agent Execution

Users can run agents to automate sales workflows and track execution results in real-time.

### Story 3.1: Parse and Execute Instructions

As a workspace owner,
I want the system to parse my natural language instructions and execute them,
So that my agents can automate workflows without writing code.

**Acceptance Criteria:**

**Given** An agent has instructions: "Find contacts where title contains CEO and send email"
**When** The agent executes
**Then** InstructionParserService parses the instructions using Gemini 2.5 Pro + LangChain
**And** Instructions are converted to structured action array: [{ type: 'search_contacts', params: { field: 'title', operator: 'contains', value: 'CEO' } }, { type: 'send_email', params: {...} }]
**And** Each action is executed in sequence

**Given** Instructions include variables like @contact.firstName
**When** Execution runs
**Then** Variables are resolved to actual values from the context (contact data)
**And** "Hi @contact.firstName" becomes "Hi John"

**Given** Instructions have ambiguous phrasing
**When** Parsing occurs
**Then** The system uses sales-specific training to interpret correctly
**And** "email them" is recognized as send_email action
**And** Parsing achieves >90% accuracy on sales automation scenarios (NFR53)

**Given** Instructions cannot be parsed
**When** Execution attempts to start
**Then** Agent fails with error: "Unable to parse instructions. Please clarify."
**And** Execution log shows parsing error details
**And** User is notified to revise instructions

**Given** Parsed actions execute successfully
**When** Execution completes
**Then** 80% of executions complete within 30 seconds (NFR1)
**And** Execution status is updated to "completed"
**And** Results are logged in AgentExecution model

**Technical Requirements:**
- Create AgentExecutionService that orchestrates execution
- Use InstructionParserService (Gemini 2.5 Pro + LangChain Structured Output)
- Create AgentExecution model: workspace, agent, status, startedAt, completedAt, steps, results, error
- Action execution pipeline: parse → validate → execute → log
- Variable resolution engine for @contact.*, @deal.*, @memory.*
- Error handling with detailed logging
- POST `/api/workspaces/:workspaceId/agents/:agentId/execute` endpoint

---

### Story 3.2: Manual Trigger Execution

As a workspace owner,
I want to manually trigger agent execution on demand,
So that I can run agents when I need them without waiting for schedules.

**Acceptance Criteria:**

**Given** I have an agent in Live or Draft status
**When** I click "Run Now" button
**Then** The agent executes immediately
**And** I see a loading indicator: "Agent is running..."
**And** Execution starts within 2 seconds

**Given** Agent has manual trigger configured
**When** I trigger execution
**Then** The agent uses the trigger configuration
**And** If trigger has target filters (e.g., "contacts created today"), those are applied

**Given** Agent execution completes successfully
**When** Execution finishes
**Then** I see success message: "Agent completed successfully. Processed 5 contacts."
**And** I see a link to "View Execution Log"
**And** Execution appears in execution history

**Given** Agent execution fails
**When** Execution encounters error
**Then** I see error message: "Agent failed: [error details]"
**And** I see option to "View Error Log" and "Retry Execution"
**And** Agent status remains Live (doesn't auto-pause for manual failures)

**Given** I trigger an agent already running
**When** I click "Run Now"
**Then** I see message: "Agent is already running. Wait for current execution to complete."
**And** Current execution ID is shown
**And** New execution is not started (prevent duplicate runs)

**Given** I am a workspace member (not owner/admin)
**When** I try to trigger an agent
**Then** I can trigger agents with manual execution permission (FR57)
**And** I cannot trigger agents without permission (see error message)

**Technical Requirements:**
- Create POST `/api/workspaces/:workspaceId/agents/:agentId/trigger` endpoint
- Check agent status (must be Live or Draft)
- Prevent duplicate executions (check if agent is currently running)
- RBAC: Members can trigger manual runs, Viewers cannot
- Frontend: "Run Now" button with loading state
- Frontend: Execution status toast/notification
- Real-time status updates via Socket.io

---

### Story 3.3: Scheduled Trigger Execution

As a workspace owner,
I want agents to run automatically on schedules,
So that I can automate recurring workflows without manual intervention.

**Acceptance Criteria:**

**Given** An agent has scheduled trigger: Daily at 9 AM
**When** The system clock reaches 9 AM
**Then** A BullMQ job is created: `agent-scheduled-execution`
**And** The job executes the agent automatically
**And** Execution log records trigger type: "scheduled"

**Given** An agent has weekly schedule: Every Monday at 8 AM
**When** Monday 8 AM arrives
**Then** The agent executes automatically
**And** Does not execute on other days of the week

**Given** An agent has monthly schedule: 1st of month at 10 AM
**When** The 1st of the month at 10 AM arrives
**Then** The agent executes automatically
**And** Does not execute on other days

**Given** A scheduled execution is running when next schedule arrives
**When** Next execution time occurs
**Then** The new execution is queued (not skipped)
**And** Executes after current run completes
**And** I see notification: "Scheduled execution queued (previous run still active)"

**Given** An agent is Paused
**When** Scheduled time arrives
**Then** The agent does NOT execute
**And** Schedule remains configured but inactive
**And** Execution log shows: "Skipped: Agent paused"

**Given** Agent hits circuit breaker (100 executions/day)
**When** Scheduled time arrives
**Then** Execution is blocked
**And** Agent auto-pauses
**And** I receive notification: "Agent paused: execution limit reached"

**Given** Scheduled execution fails
**When** Error occurs
**Then** Error is logged with timestamp and details
**And** Next scheduled execution still runs (failure doesn't disable schedule)
**And** After 3 consecutive failures, I receive alert

**Technical Requirements:**
- BullMQ job type: `agent-scheduled-execution`
- Create job scheduler that registers/updates jobs when agent schedule changes
- Cron expressions for schedules (daily, weekly, monthly)
- Job queue with retry logic (3 attempts with exponential backoff)
- Cancel scheduled jobs when agent is deleted or paused
- Monitor job failures and send alerts after 3 consecutive failures
- Upstash Redis optimization: Minimize commands to stay within 10K/day limit

---

### Story 3.4: Event-Based Trigger Execution

As a workspace owner,
I want agents to execute automatically when CRM events occur,
So that I can respond to user actions in real-time.

**Acceptance Criteria:**

**Given** An agent has trigger: "Contact Created"
**When** A new contact is created in the workspace
**Then** The agent executes automatically with the new contact as context
**And** Contact data is available via @contact.* variables
**And** Execution log shows trigger type: "event: contact_created"

**Given** An agent has trigger: "Deal Stage Updated"
**When** A deal stage changes (e.g., from Proposal to Closed Won)
**Then** The agent executes automatically with the deal as context
**And** Deal data is available via @deal.* variables
**And** Previous and new stage values are available

**Given** An agent has trigger: "Form Submitted"
**When** A lead submits a form on the website
**Then** The agent executes automatically with form submission data
**And** Form fields are available as variables
**And** New contact is created if needed, then agent runs

**Given** Agent has event conditions: "when deal value > $10,000"
**When** Deal is updated with value $5,000
**Then** The agent does NOT execute (condition not met)
**When** Deal is updated with value $15,000
**Then** The agent executes (condition met)

**Given** Multiple agents have the same event trigger
**When** The event occurs
**Then** All matching agents execute (in parallel if possible)
**And** Each execution is independent
**And** One agent's failure doesn't affect others

**Given** Event-based agent is Paused
**When** Event occurs
**Then** Agent does NOT execute
**And** Event is logged but skipped

**Given** Agent event trigger fires rapidly (e.g., 50 contacts created in 1 minute)
**When** Events occur
**Then** Executions are queued via BullMQ
**And** Rate limiting applies (max 10 executions/min per agent)
**And** Circuit breaker prevents runaway execution

**Technical Requirements:**
- BullMQ job type: `agent-event-trigger`
- Event listeners for: Contact Created, Deal Stage Updated, Form Submitted
- Webhook/event system integration with existing CRM events
- Pass event context (contact, deal, form data) to execution
- Condition evaluation before execution
- Queue management for high-frequency events
- Rate limiting: 10 executions/min per agent (NFR78)
- Frontend: Event trigger configuration with condition builder

---

### Story 3.5: Sequential Multi-Step Workflows

As a workspace owner,
I want agents to execute multiple steps in sequence,
So that I can build complex workflows that accomplish complete tasks.

**Acceptance Criteria:**

**Given** Agent has instructions with 5 steps
**When** Execution runs
**Then** Steps execute in order: 1 → 2 → 3 → 4 → 5
**And** Each step completes before the next begins
**And** Context (variables, memory) flows between steps

**Given** Step 2 depends on Step 1 results
**When** Step 1 finds 10 contacts
**Then** Step 2 receives the contact list
**And** Step 2 can iterate over each contact
**And** Step 2 actions apply to all 10 contacts

**Given** Step 3 fails with error
**When** Error occurs
**Then** Steps 1 and 2 remain completed
**And** Steps 4 and 5 are not executed
**And** Execution status is "failed"
**And** Error is logged with step number and details

**Given** Agent uses memory between steps
**When** Step 1 saves data to memory: @memory.processedContacts = [contact1, contact2]
**Then** Step 3 can read from memory: "Skip contacts in @memory.processedContacts"
**And** Memory persists for the duration of execution

**Given** Agent has 20 steps
**When** Execution runs
**Then** All steps execute sequentially
**And** Total execution time is sum of all step durations
**And** Long-running executions show progress: "Step 12 of 20 completed"

**Given** Step 7 is a "Wait" action
**When** Wait step executes
**Then** Execution pauses (job is scheduled to resume after wait period)
**And** Steps 8-20 execute after wait completes
**And** Execution spans multiple job executions (resume capability)

**Technical Requirements:**
- AgentExecutionService maintains execution state across steps
- Each step result is stored in execution context
- Failed step marks execution as failed, logs error, stops subsequent steps
- Memory operations (read/write) during execution
- For "Wait" actions: Create resume job in BullMQ scheduled for future time
- Frontend: Real-time progress indicator showing current step
- Socket.io: Emit step completion events for real-time UI updates

---

### Story 3.6: Conditional Logic Execution

As a workspace owner,
I want agents to execute conditional logic (if/then),
So that workflows can adapt based on data and conditions.

**Acceptance Criteria:**

**Given** Agent has condition: "If contact.title contains 'CEO'"
**When** Contact title is "CEO of Sales"
**Then** Condition evaluates to TRUE
**And** Actions inside the if-block execute

**Given** Agent has condition: "If contact.title contains 'CEO'"
**When** Contact title is "Sales Manager"
**Then** Condition evaluates to FALSE
**And** Actions inside the if-block are skipped

**Given** Agent has if/else logic: "If deal.value > 50000, send urgent email, else send standard email"
**When** Deal value is $75,000
**Then** "Send urgent email" action executes
**And** "Send standard email" action is skipped

**Given** Agent has nested conditions: "If contact.replied == true, if contact.interested == true, schedule demo"
**When** Both conditions are true
**Then** Inner condition is evaluated
**And** "Schedule demo" action executes

**Given** Agent has multiple conditions (AND logic): "If title contains 'CEO' AND company.industry == 'SaaS'"
**When** Both conditions are true
**Then** Actions execute
**When** Only one condition is true
**Then** Actions are skipped

**Given** Agent has OR logic: "If contact.replied == true OR contact.opened_email == true"
**When** Either condition is true
**Then** Actions execute

**Given** Condition references non-existent field
**When** Condition evaluates
**Then** Condition fails gracefully with warning: "Field 'contact.customField99' not found. Defaulting to false."
**And** Execution continues (doesn't crash)

**Technical Requirements:**
- InstructionParserService recognizes if/then/else keywords
- Condition evaluation engine supports operators: ==, !=, >, <, >=, <=, contains, exists
- Support AND/OR/NOT logic
- Support nested conditions
- Variable resolution in conditions (resolve @contact.*, @deal.* before evaluation)
- Log condition results in execution logs for debugging
- Graceful handling of missing fields (default to false, log warning)

---

### Story 3.7: Send Email Action

As a workspace owner,
I want agents to send emails via Gmail integration,
So that I can automate email outreach and follow-ups.

**Acceptance Criteria:**

**Given** Agent instruction: "Send email using template 'Outbound v2'"
**When** Action executes
**Then** Email template is loaded from EmailTemplate model
**And** Variables in template are resolved (@contact.firstName, @company.name)
**And** Email is sent via Gmail API using connected EmailAccount

**Given** Email template has subject: "Hi @contact.firstName, question about @company.name"
**When** Sending to contact John Doe at Acme Corp
**Then** Subject is resolved to: "Hi John, question about Acme Corp"
**And** Email body variables are also resolved

**Given** Agent sends email successfully
**When** Gmail API returns success
**Then** Email is logged in execution results
**And** Activity is created in CRM: "Email sent to [contact]"
**And** Email count for agent is incremented

**Given** Agent tries to send email without Gmail connected
**When** Action executes
**Then** Execution fails with error: "Gmail integration not connected"
**And** User is notified to connect Gmail

**Given** Agent hits email limit (100 emails/day)
**When** 101st email is attempted
**Then** Email is not sent
**And** Execution fails with error: "Email limit reached (100/day)"
**And** Agent auto-pauses
**And** User receives notification

**Given** Gmail API rate limit is hit
**When** API returns 429 Too Many Requests
**Then** Action retries with exponential backoff (3 attempts)
**And** If all retries fail, execution fails with error: "Gmail rate limit exceeded"

**Given** Email recipient address is invalid
**When** Action attempts to send
**Then** Execution fails with error: "Invalid email address: [address]"
**And** Error is logged for debugging

**Technical Requirements:**
- Integrate with existing EmailAccount and EmailTemplate models
- Use Gmail API (googleapis package) for sending
- Variable resolution in subject and body
- Create Activity record after successful send
- Track email count per agent per day
- Enforce maxEmailsPerDay restriction (default 100)
- Rate limiting: Gmail 250 units/sec/user (NFR47)
- Retry logic with exponential backoff (3 attempts, NFR51)
- Frontend: Email template selector in agent builder

---

### Story 3.8: LinkedIn Invitation Action

As a workspace owner,
I want agents to send LinkedIn connection requests,
So that I can automate LinkedIn prospecting and network building.

**Acceptance Criteria:**

**Given** Agent instruction: "Send LinkedIn invitation with note: 'Hi @contact.firstName, let's connect'"
**When** Action executes
**Then** LinkedIn API sends connection request to contact's LinkedIn profile
**And** Custom note is included with variables resolved
**And** Note becomes: "Hi John, let's connect"

**Given** Contact has LinkedIn URL in profile
**When** Send invitation action executes
**Then** System uses the LinkedIn URL to send request
**And** Request is sent successfully

**Given** Contact does NOT have LinkedIn URL
**When** Send invitation action executes
**Then** Execution fails with warning: "Contact [name] does not have LinkedIn URL. Skipping."
**And** Execution continues to next contact (doesn't fail entire agent)

**Given** Agent sends multiple invitations
**When** Executing across 50 contacts
**Then** Each invitation is sent individually
**And** Rate limiting applies: Max 100 requests/day per user (LinkedIn API limit)
**And** Requests are queued if limit is approached

**Given** LinkedIn rate limit is reached
**When** 101st invitation is attempted in one day
**Then** Action fails with error: "LinkedIn daily limit reached (100 invitations/day)"
**And** Agent auto-pauses
**And** Execution resumes next day when quota resets

**Given** LinkedIn credentials expire
**When** Action attempts to send
**Then** Execution fails with error: "LinkedIn integration disconnected. Reconnect to continue."
**And** User is notified to re-authenticate

**Given** LinkedIn invitation is sent successfully
**When** Action completes
**Then** Activity is logged: "LinkedIn invitation sent to [contact]"
**And** Contact status is updated (if configured)
**And** Agent can track acceptance later (Phase 2)

**Technical Requirements:**
- Integrate with LinkedIn API (connection requests endpoint)
- Load LinkedIn URL from Contact.linkedinUrl field
- Custom note with variable resolution
- Rate limiting: 100 invitations/day per user (LinkedIn API terms)
- Create Activity record after successful send
- Track invitation count per agent per day
- Handle expired OAuth tokens (attempt refresh, notify user if refresh fails)
- Skip contacts without LinkedIn URL (log warning, continue execution)
- Compliance: Follow LinkedIn API Terms of Service

---

### Story 3.9: Web Search Action

As a workspace owner,
I want agents to perform web searches,
So that they can research companies and contacts before outreach.

**Acceptance Criteria:**

**Given** Agent instruction: "Search web for recent news about @company.name"
**When** Action executes for Acme Corp
**Then** Web search query is: "recent news about Acme Corp"
**And** Search is performed using web search API
**And** Top 3-5 results are returned with titles, snippets, URLs

**Given** Search results are returned
**When** Action completes
**Then** Results are stored in execution context
**And** Results are available to next steps via @search.results
**And** Agent can reference findings in email: "I saw @search.results[0].title"

**Given** Agent searches for company funding
**When** Instruction: "Search: Has @company.name raised funding recently?"
**Then** Query becomes: "Has Acme Corp raised funding recently?"
**And** Results include relevant articles about Series B, acquisitions, etc.

**Given** Web search returns no results
**When** Query yields 0 results
**Then** Action completes with empty results array
**And** Execution continues (doesn't fail)
**And** Agent can handle: "If search found nothing, skip email"

**Given** Web search API rate limit is hit
**When** API returns rate limit error
**Then** Action retries with exponential backoff (3 attempts)
**And** If all attempts fail, execution fails with error: "Web search unavailable"

**Given** Web search takes too long
**When** Search exceeds 10 seconds
**Then** Search times out
**And** Action fails with error: "Web search timed out"
**And** Empty results are returned

**Given** Search query contains special characters
**When** Instruction: "Search for @company.name's CEO profile"
**Then** Query is sanitized for safe search
**And** Special characters are escaped or removed

**Technical Requirements:**
- Integrate web search API (Google Custom Search API or similar)
- Variable resolution in search queries
- Return structured results: [{ title, snippet, url }]
- Store results in execution context for use in subsequent steps
- Timeout: 10 seconds (NFR55: 90% complete in <5s)
- Rate limiting: Track search count, respect API quotas
- Cost tracking: 1 AI credit per search
- Retry logic with exponential backoff (3 attempts)
- Frontend: Search action configuration with query input

---

### Story 3.10: Task and Tag Actions

As a workspace owner,
I want agents to create tasks and manage contact tags,
So that workflows can organize work and segment contacts.

**Acceptance Criteria:**

**Given** Agent instruction: "Create task: Follow up with @contact.firstName in 3 days"
**When** Action executes
**Then** Task is created in CRM with:
  - Title: "Follow up with John in 3 days"
  - Due date: Today + 3 days
  - Assigned to: Agent creator (or specified user)
  - Related contact: Contact ID
**And** Task appears in user's task list

**Given** Agent instruction: "Assign task to @user.salesRep"
**When** Action executes
**Then** Task is assigned to the specified user (if variable is defined)
**And** User receives notification: "New task assigned by agent [name]"

**Given** Agent instruction: "Add tag 'Interested' to contact"
**When** Action executes
**Then** Tag "Interested" is added to the contact
**And** If tag doesn't exist, it's created
**And** Contact appears in "Interested" segment

**Given** Agent instruction: "Remove tag 'Cold Lead' from contact"
**When** Action executes
**Then** Tag "Cold Lead" is removed from the contact
**And** Contact no longer appears in "Cold Lead" segment

**Given** Agent adds multiple tags: "Add tags 'Interested', 'CEO', 'SaaS'"
**When** Action executes
**Then** All three tags are added to the contact
**And** Each tag is created if it doesn't exist

**Given** Agent creates 100 tasks in one execution
**When** Execution runs
**Then** All 100 tasks are created successfully
**And** No rate limiting applied to task creation (internal CRM operation)

**Given** Task creation fails (e.g., invalid user assignment)
**When** Error occurs
**Then** Execution fails with error: "Cannot assign task to user [userId]: user not found"
**And** Error is logged for debugging

**Technical Requirements:**
- Integrate with existing Task model
- Create tasks with: title, dueDate, assignedTo, relatedContact, createdBy (agent)
- Integrate with existing tag system (Contact.tags field)
- Add/remove tags via Contact.updateOne() with $addToSet / $pull
- Create new tags if they don't exist
- Variable resolution in task titles and tag names
- Frontend: Task and tag action configuration UI
- RBAC: Tasks assigned to users within workspace only

---

### Story 3.11: Update Field and Enrich Actions

As a workspace owner,
I want agents to update contact fields and enrich contact data,
So that CRM data stays current and complete.

**Acceptance Criteria:**

**Given** Agent instruction: "Update contact field 'status' to 'Qualified'"
**When** Action executes
**Then** Contact.status field is updated to "Qualified"
**And** Contact.updatedAt timestamp is updated
**And** Update is logged in execution results

**Given** Agent instruction: "Update deal value to $50,000"
**When** Action executes on a deal
**Then** Deal.value field is updated to 50000
**And** Deal stage progression logic is triggered (if configured)

**Given** Agent updates custom field
**When** Instruction: "Set custom field 'leadScore' to 'A'"
**Then** Contact custom field is updated using CustomFieldDefinition
**And** Field value is validated against field type (string, number, date, etc.)

**Given** Custom field doesn't exist
**When** Update action executes
**Then** Execution fails with error: "Custom field 'leadScore' not found. Create field first."
**And** User is notified to add the custom field definition

**Given** Agent instruction: "Enrich contact using Apollo"
**When** Action executes
**Then** Apollo.io API is called with contact email
**And** Enriched data is returned: job title, company info, phone, social links
**And** Contact fields are updated with enriched data
**And** Enrichment is logged in Activity

**Given** Apollo enrichment finds no data
**When** API returns empty result
**Then** Action completes without error (no data available)
**And** Log shows: "Enrichment returned no data for [contact]"
**And** Execution continues

**Given** Apollo API rate limit is reached
**When** Enrichment action executes
**Then** Action fails with error: "Apollo API rate limit exceeded"
**And** Agent auto-pauses
**And** User is notified

**Given** Agent updates 50 contact fields in one execution
**When** Execution runs
**Then** All updates are applied via Contact.updateMany() for efficiency
**And** Bulk update completes in <5 seconds

**Technical Requirements:**
- Update Contact, Company, Opportunity fields via Mongoose .updateOne()
- Support custom fields via CustomFieldDefinition model
- Validate field types before updating
- Integrate with Apollo.io API for enrichment
- Track Apollo API usage (ApolloUsage model)
- Rate limiting: Respect Apollo plan limits
- Bulk update optimization for large datasets
- Frontend: Field update and enrichment action configuration
- Activity logging for enrichment actions

---

### Story 3.12: Wait Action and Human Handoff

As a workspace owner,
I want agents to pause execution for specified time periods and notify users for handoff,
So that workflows can include delays and human interaction points.

**Acceptance Criteria:**

**Given** Agent instruction: "Wait 5 days"
**When** Action executes
**Then** Agent execution pauses
**And** BullMQ job is scheduled to resume after 5 days
**And** Execution status is "waiting" with resumeAt timestamp
**And** User sees: "Agent paused. Will resume in 5 days."

**Given** Wait period completes
**When** 5 days pass
**Then** BullMQ job resumes execution automatically
**And** Remaining steps execute
**And** Execution status changes to "running"

**Given** Agent has multiple wait steps
**When** Execution encounters "Wait 3 days" then "Wait 2 days"
**Then** First wait completes, execution resumes, second wait begins
**And** Total wait time is 5 days (3 + 2)

**Given** Agent is paused manually during wait period
**When** User clicks "Pause Agent"
**Then** Scheduled resume job is canceled
**And** Execution remains in "waiting" state until user resumes manually

**Given** Agent instruction: "If no reply after 5 days, send follow-up"
**When** Wait completes and condition is checked
**Then** If contact.replied == false, follow-up is sent
**And** If contact.replied == true, follow-up is skipped

**Given** Agent instruction: "Hand off to @user.salesRep for personal outreach"
**When** Handoff action executes
**Then** Notification is sent to specified user: "Agent [name] needs your attention for [contact]"
**And** Task is created: "Personal outreach to [contact]"
**And** Execution pauses until user completes handoff (or continues automatically after timeout)

**Given** Human handoff with warm lead
**When** Agent detects: "Contact replied positively"
**Then** Notification to sales rep: "Warm lead from agent [name]: [contact] is interested"
**And** Context is provided: Contact info, conversation history, agent findings
**And** Sales rep can click "Take Over" to mark handoff complete

**Given** Wait action times out (e.g., 30-day wait)
**When** Long wait is configured
**Then** System supports waits up to 90 days
**And** Execution resumes correctly after long periods

**Technical Requirements:**
- BullMQ delayed jobs for wait periods
- Store execution state for resume: Current step, variables, memory
- Resume logic: Load execution state, continue from next step after wait
- Cancel scheduled jobs when agent is paused or deleted
- Notification system for human handoffs (email + in-app)
- Create Task for handoff actions
- Frontend: Wait duration input (days, hours)
- Frontend: Handoff user selector
- Track execution status: waiting, running, completed

---

### Story 3.13: Track Execution History

As a workspace owner,
I want all agent executions to be logged,
So that I can track what my agents have done and debug issues.

**Acceptance Criteria:**

**Given** An agent executes
**When** Execution starts
**Then** AgentExecution record is created with:
  - workspace, agent, triggeredBy (user or system), triggerType (manual, scheduled, event)
  - status: "running", startedAt: timestamp
**And** Record has unique executionId

**Given** Execution completes successfully
**When** All steps finish
**Then** AgentExecution is updated with:
  - status: "completed", completedAt: timestamp, duration: (completedAt - startedAt)
  - steps: Array of step results with actions, params, outcomes
  - summary: "Processed 5 contacts, sent 5 emails"

**Given** Execution fails
**When** Error occurs at Step 3
**Then** AgentExecution is updated with:
  - status: "failed", completedAt: timestamp, error: { message, step, details }
  - steps: Array showing Steps 1-2 completed, Step 3 failed, Steps 4-5 not executed

**Given** Execution is canceled manually
**When** User clicks "Cancel Execution"
**Then** AgentExecution is updated with:
  - status: "canceled", canceledAt: timestamp, canceledBy: userId

**Given** Multiple executions occur
**When** Agent runs 100 times
**Then** All 100 executions are logged
**And** Logs are retained for 30 days (standard tier) or 365 days (enterprise tier) per NFR84

**Given** Execution log includes sensitive data
**When** Email content or contact data is logged
**Then** Sensitive fields are redacted in logs (e.g., email body truncated to 100 chars)
**And** Full data is available to workspace owners only (RBAC)

**Given** Agent is deleted
**When** AgentExecution records exist
**Then** Logs are retained with agentDeleted: true flag
**And** Logs remain viewable for audit purposes
**And** Agent name is preserved in log: "Agent 'Outbound Campaign' (deleted)"

**Technical Requirements:**
- AgentExecution model: workspace, agent, executionId, status, triggeredBy, triggerType, startedAt, completedAt, duration, steps, results, error, agentDeleted
- Create execution record at start, update at completion/failure/cancel
- Store step-by-step results for debugging
- Log retention: TTL index for auto-deletion (30/365 days based on tier)
- Workspace isolation: All queries scoped by workspace
- RBAC: Owners/Admins see full logs, Members see summary only
- Index: { workspace: 1, agent: 1, startedAt: -1 } for fast queries

---

### Story 3.14: View Execution Logs

As a workspace owner,
I want to view and filter execution logs,
So that I can debug agents and understand what they've done.

**Acceptance Criteria:**

**Given** I navigate to an agent's detail page
**When** I click "Execution History" tab
**Then** I see a list of all executions with: ExecutionId, trigger type, status, start time, duration
**And** Most recent executions appear first

**Given** I view the execution list
**When** I filter by status
**Then** I can select: All, Completed, Failed, Running, Waiting, Canceled
**And** List updates to show only selected status

**Given** I filter by date range
**When** I select "Last 7 days"
**Then** Only executions from past 7 days are shown
**And** I can also select: Last 24 hours, Last 30 days, Custom range

**Given** I search execution logs
**When** I enter search term "john@acme.com"
**Then** Executions involving that email are shown
**And** Search looks through execution results and steps

**Given** I click on an execution
**When** Execution detail view opens
**Then** I see:
  - Execution metadata: ID, trigger, start/end time, duration, status
  - Step-by-step breakdown with timestamps
  - Each step shows: Action, params, result, status (✅ success, ❌ failed, ⏭️ skipped)
  - Error details if failed
  - Summary stats: Contacts processed, emails sent, tasks created

**Given** Execution has 20 steps
**When** I view execution detail
**Then** Steps are displayed in collapsible accordion
**And** I can expand each step to see full details
**And** Failed or warning steps are expanded by default

**Given** Execution failed at Step 5
**When** I view the failed execution
**Then** Step 5 is highlighted in red with error icon
**And** Error message is displayed: "Email template 'xyz' not found"
**And** I see suggestion: "Create template or update agent instructions"

**Given** Execution is currently running
**When** I view execution detail
**Then** Completed steps are shown
**And** Current step shows loading indicator: "Step 3: Sending emails... (5 of 10 sent)"
**And** Page updates in real-time via Socket.io

**Given** I want to retry a failed execution
**When** I click "Retry" button
**Then** Agent executes again with same trigger context
**And** New execution is logged separately

**Given** I want to export execution logs
**When** I click "Export"
**Then** I can download logs as JSON or CSV
**And** Export includes selected filters (date range, status)

**Technical Requirements:**
- GET `/api/workspaces/:workspaceId/agents/:agentId/executions` with filters: status, dateRange, search
- GET `/api/workspaces/:workspaceId/agents/:agentId/executions/:executionId` for detail view
- Frontend: Execution list with filtering, sorting, search
- Frontend: Execution detail view with step-by-step accordion
- Real-time updates via Socket.io for running executions
- Export endpoint: GET `/api/workspaces/:workspaceId/agents/:agentId/executions/export?format=json|csv`
- Pagination: 50 executions per page
- Query performance: <1 second for last 30 days (NFR9)

---

### Story 3.15: Export and Dashboard

As a workspace owner,
I want to see agent performance metrics and export execution data,
So that I can analyze effectiveness and report on automation ROI.

**Acceptance Criteria:**

**Given** I navigate to agent dashboard
**When** Page loads
**Then** I see agent performance metrics:
  - Total executions (all time)
  - Success rate: X% (completed / total)
  - Failure rate: Y% (failed / total)
  - Average execution time
  - Total contacts processed
  - Total emails sent, tasks created, etc.

**Given** Dashboard shows success rate
**When** Agent has 90 completed, 10 failed executions
**Then** Success rate displays: "90% (90 of 100 executions)"
**And** Target is 90% success rate (NFR35)

**Given** Dashboard shows execution time
**When** 80% of executions complete in <30 seconds
**Then** Dashboard shows: "Avg execution time: 18s (80% under 30s target)"
**And** Performance meets NFR1 requirement

**Given** I select date range on dashboard
**When** I choose "Last 30 days"
**Then** Metrics update to show only last 30 days
**And** I can compare to "Previous 30 days" to see trends

**Given** I view agent comparison
**When** I have multiple agents
**Then** Dashboard shows comparison table:
  - Agent name, executions, success rate, contacts processed
**And** I can sort by any metric

**Given** Agent performance degrades
**When** Success rate drops below 80%
**Then** Dashboard shows warning: "⚠️ Success rate below target (75%)"
**And** I see recommendations: "Review recent failures and update instructions"

**Given** I want to export agent data
**When** I click "Export Agent Configuration"
**Then** I can download agent configuration as JSON
**And** Export includes: Name, goal, triggers, instructions, restrictions, memory config
**And** I can import this JSON to duplicate agent to another workspace (future)

**Given** I want to export execution data
**When** I click "Export Execution Data"
**Then** I can download all executions as CSV
**And** CSV includes: ExecutionId, Date, Status, Duration, Contacts Processed, Actions Performed
**And** Export completes in <30 seconds for 90% of requests (NFR43)

**Given** I want to export for date range
**When** I select "Last 90 days" and export
**Then** Only executions from last 90 days are included
**And** File size is optimized (summary data, not full step details)

**Technical Requirements:**
- Agent dashboard endpoint: GET `/api/workspaces/:workspaceId/agents/:agentId/dashboard?dateRange=7d|30d|90d|all`
- Calculate metrics from AgentExecution aggregations:
  - Total: count(*)
  - Success rate: count(status='completed') / count(*)
  - Avg duration: avg(duration)
- Frontend: Dashboard charts/graphs for metrics (success rate over time, execution count by day)
- Export endpoints:
  - GET `/api/workspaces/:workspaceId/agents/:agentId/export-config` (JSON)
  - GET `/api/workspaces/:workspaceId/agents/:agentId/export-executions?format=csv&dateRange=...`
- Caching: Cache dashboard metrics for 5 minutes (reduce database load)
- Performance: Dashboard loads in <3 seconds (NFR8)

---

**Epic 3 Summary:**
- ✅ 15 stories created
- ✅ All FRs covered (FR23-FR32, FR34, FR81-FR83, FR87)
- ✅ Complete acceptance criteria for each story
- ✅ All 8 core actions implemented (Send Email, LinkedIn Invitation, Web Search, Create Task, Add/Remove Tag, Update Field, Enrich Contact, Wait)
- ✅ All 3 trigger types (Manual, Scheduled, Event-Based)
- ✅ Conditional logic and multi-step workflows
- ✅ Execution logging and monitoring
- ✅ No future dependencies (each story builds on previous)
- ✅ NFRs addressed (NFR1: <30s execution, NFR35: 90% success rate)

Shall I proceed to Epic 4: AI-Powered Agent Building?

---
