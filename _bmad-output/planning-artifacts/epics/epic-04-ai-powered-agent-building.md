## Epic 4: AI-Powered Agent Building

Users build agents 10x faster with AI Copilot assistance and smart suggestions.

### Story 4.1: AI Copilot Chat Interface

As a workspace owner,
I want to chat with AI Copilot while building agents,
So that I can get help and guidance without leaving the builder.

**Acceptance Criteria:**

**Given** I am in the agent builder
**When** I click the "AI Copilot" button
**Then** A chat panel opens on the right side
**And** I see a welcome message: "Hi! I'm your AI Copilot. How can I help you build this agent?"
**And** I see a text input to send messages

**Given** The chat panel is open
**When** I type a message: "Help me create an outbound sales agent"
**Then** I can press Enter or click Send
**And** My message appears in the chat with my avatar
**And** AI Copilot response appears within 3 seconds (NFR4: 90% in <3s)

**Given** AI Copilot is generating a response
**When** Response is being generated
**Then** I see a typing indicator: "Copilot is thinking..."
**And** Response streams token-by-token (Server-Sent Events)
**And** I can see the response build in real-time

**Given** AI Copilot provides a response
**When** Response completes
**Then** Full message is displayed with Copilot avatar
**And** Response includes formatting (bold, lists, code blocks)
**And** I can copy code snippets with one click

**Given** I have a multi-turn conversation
**When** I ask follow-up questions
**Then** Copilot remembers context from previous messages
**And** Conversation history is preserved for the session
**And** I can scroll to see past messages

**Given** Conversation history is stored
**When** I close and reopen the agent builder
**Then** Last 10 messages are loaded
**And** Conversation persists for 7 days (TTL)
**And** After 7 days, conversation is deleted automatically

**Given** I want to clear the conversation
**When** I click "Clear Chat"
**Then** All messages are deleted
**And** I see: "Conversation cleared. How can I help?"

**Technical Requirements:**
- Create AgentCopilotConversation model: workspace, agent, user, messages: [{ role, content, timestamp }], expiresAt (7-day TTL)
- Backend: POST `/api/workspaces/:workspaceId/agents/:agentId/copilot/chat` with streaming via Server-Sent Events (SSE)
- Use AgentCopilotService with Gemini 2.5 Pro
- Track AI credit usage: 1 credit per message
- Frontend: Chat UI component with message history, streaming display, code syntax highlighting
- Store last 10 messages per conversation
- TTL index on AgentCopilotConversation: 7 days

---

### Story 4.2: Generate Complete Agent Instructions

As a workspace owner,
I want AI Copilot to generate complete agent workflows from my description,
So that I don't have to write instructions manually.

**Acceptance Criteria:**

**Given** I tell Copilot: "Create an agent that finds CEOs at SaaS companies and sends them a cold email"
**When** Copilot processes my request
**Then** Copilot generates complete instructions:
```
1. Find contacts where title contains 'CEO' or 'Chief Executive Officer'
2. Filter for contacts at companies where industry is 'SaaS'
3. Send email using template 'Cold Outreach - SaaS CEOs'
4. Wait 5 days
5. If contact has not replied, send follow-up email using template 'Follow-up 1'
```
**And** I see a button: "Apply Instructions"

**Given** Copilot generates instructions
**When** I click "Apply Instructions"
**Then** Instructions are inserted into the agent's instruction field
**And** I can edit them further if needed
**And** I see success message: "Instructions applied. Review and test before going live."

**Given** Generated instructions reference templates
**When** Template "Cold Outreach - SaaS CEOs" doesn't exist
**Then** Copilot includes note: "⚠️ Template 'Cold Outreach - SaaS CEOs' not found. Create this template or update the name."
**And** I can ask Copilot: "What should this template contain?"

**Given** I request complex multi-step workflow
**When** I say: "Create an agent for lead re-engagement with scoring and handoff"
**Then** Copilot generates 10-15 step workflow with:
  - Lead scoring logic
  - Conditional branching based on scores
  - Automated follow-ups
  - Human handoff for high-value leads
**And** Copilot explains each step in chat

**Given** Generated instructions are too complex
**When** Copilot creates 20+ steps
**Then** Copilot suggests: "This workflow is complex. Consider breaking into 2 agents: 'Lead Scoring' and 'Re-engagement Campaign'"
**And** I can ask: "Show me how to break this up"

**Given** I provide vague description
**When** I say: "Make an agent for sales"
**Then** Copilot asks clarifying questions:
  - "What specific sales task should this agent handle?"
  - "Who is the target audience (CEOs, VPs, etc.)?"
  - "What action should the agent take (email, LinkedIn, etc.)?"

**Given** Copilot generates instructions successfully
**When** Generation completes
**Then** 85% of generated instructions are executable without edits (NFR54)
**And** System tracks generation success rate

**Technical Requirements:**
- AgentCopilotService with Gemini 2.5 Pro
- System prompt: Sales automation expert, generates executable workflows
- Context injection: Available actions (8 core actions), available templates, workspace custom fields
- Structured output: Parse Copilot response into instruction steps
- Frontend: "Apply Instructions" button that inserts into instructions field
- Track generation quality: Success rate metric (executable without errors)
- Cost: 2-3 credits per generation

---

### Story 4.3: Answer Questions About Automation

As a workspace owner,
I want to ask AI Copilot questions about automation tasks,
So that I can learn how to build effective agents.

**Acceptance Criteria:**

**Given** I ask Copilot: "How do I send an email to a contact?"
**When** Copilot responds
**Then** I see clear explanation:
```
To send an email, use this instruction:
"Send email using template '[template-name]'"

You can reference contact data with variables:
- @contact.firstName
- @contact.email
- @company.name

Example:
"Send email using template 'Outbound v2' to @contact.email"
```

**Given** I ask: "What triggers can I use?"
**When** Copilot responds
**Then** I see list of trigger types:
  - Manual: Run on demand
  - Scheduled: Daily, weekly, monthly
  - Event-based: Contact created, deal updated, form submitted
**And** Examples for each trigger type

**Given** I ask: "How do I add a wait step?"
**When** Copilot responds
**Then** I see: "Add this instruction: 'Wait [X] days' where X is the number of days to pause execution."
**And** Example: "Wait 5 days before sending follow-up"

**Given** I ask about conditional logic
**When** I say: "How do I only email CEOs?"
**Then** Copilot explains:
```
Use conditional logic:
"If contact.title contains 'CEO', send email using template 'CEO Outreach'"

You can also combine conditions:
"If contact.title contains 'CEO' AND company.industry is 'SaaS', send email"
```

**Given** I ask about variables
**When** I say: "What variables can I use?"
**Then** Copilot lists available variables based on workspace:
  - Contact: @contact.firstName, @contact.email, @contact.title, @contact.company
  - Company: @company.name, @company.industry, @company.website
  - Deal: @deal.value, @deal.stage, @deal.closeDate
  - Custom fields: @contact.customField1, @contact.customField2 (workspace-specific)
**And** Copilot accesses workspace context (FR17)

**Given** I ask about integration
**When** I say: "Can I send LinkedIn messages?"
**Then** Copilot responds: "Yes! Use: 'Send LinkedIn invitation with note: [message]'"
**And** Copilot checks if LinkedIn is connected
**And** If not connected: "⚠️ Connect LinkedIn integration first in Settings."

**Given** I ask complex question
**When** I say: "How do I build a lead scoring system?"
**Then** Copilot provides comprehensive answer with multi-step approach
**And** Copilot offers: "Would you like me to generate the full workflow for you?"

**Technical Requirements:**
- AgentCopilotService with sales automation knowledge base
- Context injection: Workspace custom fields, connected integrations, available templates
- Response within 3 seconds for 90% of questions (NFR4)
- Frontend: Format responses with code highlighting, lists, examples
- Cost: 1 credit per question

---

### Story 4.4: Suggest Improvements to Instructions

As a workspace owner,
I want AI Copilot to analyze my instructions and suggest improvements,
So that I can build more effective agents.

**Acceptance Criteria:**

**Given** I ask Copilot: "Review my instructions and suggest improvements"
**When** Copilot analyzes my current instructions
**Then** Copilot provides specific suggestions:
```
✅ Good: You're using conditional logic effectively
⚠️ Suggestion 1: Add a wait step between email 1 and follow-up (currently sends immediately)
⚠️ Suggestion 2: Consider filtering out contacts who already replied to avoid duplicate emails
💡 Optimization: Combine steps 3 and 4 into one instruction for efficiency
```

**Given** Instructions are missing error handling
**When** Copilot reviews: "Send email using template 'Outbound v2'"
**Then** Copilot suggests: "Add fallback: 'If email fails, create task for manual follow-up'"

**Given** Instructions have redundant steps
**When** Copilot detects duplicate logic
**Then** Copilot suggests: "Steps 3 and 7 are similar. Consider combining them."
**And** Copilot shows combined version

**Given** Instructions lack personalization
**When** Copilot sees: "Send generic email to all contacts"
**Then** Copilot suggests: "Add personalization using @contact.firstName and @company.name for higher engagement"
**And** Copilot shows example with variables

**Given** Instructions might hit rate limits
**When** Copilot sees: "Send 500 emails"
**Then** Copilot warns: "⚠️ This may exceed daily email limit (100/day). Consider splitting into multiple runs or increasing limit."

**Given** Instructions reference non-existent resources
**When** Copilot sees: "Send email using template 'xyz'"
**Then** Copilot checks workspace templates
**And** If not found: "⚠️ Template 'xyz' not found. Create it first or use existing template: 'Outbound v2', 'Follow-up 1'"

**Given** I accept a suggestion
**When** I click "Apply Suggestion"
**Then** Instructions are updated with the improvement
**And** Original version is saved (undo available)

**Given** Copilot suggests best practices
**When** Analyzing instructions
**Then** Copilot highlights: "✅ Best practice: You're using wait steps before follow-ups"
**And** Copilot suggests: "Consider A/B testing different email templates for better results"

**Technical Requirements:**
- AgentCopilotService analyzes instructions using Gemini 2.5 Pro
- Context validation: Check templates exist, integrations connected, variables defined
- Best practices knowledge base: Wait steps, personalization, rate limits, error handling
- Frontend: Display suggestions with apply/dismiss buttons
- Track suggestion acceptance rate
- Cost: 2 credits per review

---

### Story 4.5: Analyze Failed Executions

As a workspace owner,
I want AI Copilot to explain why my agent failed,
So that I can fix issues quickly.

**Acceptance Criteria:**

**Given** An agent execution fails
**When** I click "Ask Copilot" on the failed execution
**Then** Copilot analyzes the error and execution logs
**And** Copilot explains in plain English:
```
Your agent failed at Step 3 because:
❌ Email template 'Outbound v3' was not found

How to fix:
1. Create the template 'Outbound v3' in Settings > Email Templates
2. Or update your instruction to use an existing template like 'Outbound v2'

Would you like me to update the instructions for you?
```

**Given** Execution failed due to missing integration
**When** Copilot analyzes error: "Gmail integration not connected"
**Then** Copilot explains:
```
Your agent tried to send an email but Gmail isn't connected.

Fix this:
1. Go to Settings > Integrations
2. Click "Connect Gmail"
3. Authorize access
4. Retry the agent

[Connect Gmail Now] button
```

**Given** Execution failed due to rate limit
**When** Error: "LinkedIn rate limit exceeded"
**Then** Copilot explains:
```
Your agent hit LinkedIn's daily limit (100 invitations/day).

Options:
1. Wait until tomorrow (quota resets at midnight)
2. Reduce the number of contacts in this run
3. Upgrade your LinkedIn plan for higher limits

Agent will auto-resume tomorrow when quota resets.
```

**Given** Execution failed due to invalid data
**When** Error: "Invalid email address for contact John Doe"
**Then** Copilot explains:
```
Contact "John Doe" has an invalid email address.

Fix this:
1. Update the contact's email in CRM
2. Or add instruction: "Skip contacts without valid email"

Would you like me to add the skip logic?
```

**Given** Multiple executions fail with same error
**When** Copilot detects pattern (5 failures with same error)
**Then** Copilot proactively suggests:
```
⚠️ This agent has failed 5 times with the same error.

Root cause: Template 'xyz' is missing
Recommendation: Pause this agent until template is created

[Pause Agent] [Create Template]
```

**Given** Copilot suggests a fix
**When** I ask: "Can you fix it for me?"
**Then** Copilot offers:
  - Update instructions (if code change needed)
  - Create missing resource (template, custom field)
  - Adjust configuration (rate limits, restrictions)
**And** I can approve with one click

**Technical Requirements:**
- AgentCopilotService with access to AgentExecution error logs
- Error analysis using Gemini 2.5 Pro: Parse error, identify root cause, suggest fix
- Context: Workspace integrations, templates, custom fields, agent configuration
- Frontend: "Ask Copilot" button on failed executions
- Generate actionable fixes with apply buttons
- Track fix success rate (did fix resolve the issue?)
- Cost: 1-2 credits per analysis

---

### Story 4.6: Access Workspace Context

As a workspace owner,
I want AI Copilot to know about my workspace setup,
So that suggestions are relevant to my specific CRM.

**Acceptance Criteria:**

**Given** I ask Copilot: "What email templates do I have?"
**When** Copilot queries workspace data
**Then** Copilot lists my templates:
```
You have 3 email templates:
1. Outbound v2 - Cold outreach for SaaS companies
2. Follow-up 1 - First follow-up after 5 days
3. Demo Request - Warm lead interested in demo

Which would you like to use?
```

**Given** I ask: "What custom fields can I use?"
**When** Copilot queries CustomFieldDefinition
**Then** Copilot lists workspace custom fields:
```
Your workspace has these custom fields:
- leadScore (string): A-F scoring
- leadSource (string): Where lead came from
- lastContactedDate (date): Last outreach date

Use them in instructions like: @contact.leadScore
```

**Given** I ask: "What integrations are connected?"
**When** Copilot checks IntegrationCredential
**Then** Copilot responds:
```
Connected integrations:
✅ Gmail - Ready for email sending
✅ LinkedIn - Ready for invitations
❌ Slack - Not connected
❌ Apollo.io - Not connected

To use Slack or Apollo, connect them in Settings.
```

**Given** I ask about tags
**When** Copilot queries workspace tags
**Then** Copilot lists commonly used tags:
```
Popular tags in your workspace:
- Interested (52 contacts)
- CEO (128 contacts)
- SaaS (234 contacts)
- Replied (89 contacts)

Use in instructions: "Add tag 'Interested' to contact"
```

**Given** Copilot generates instructions with workspace data
**When** Suggesting email template
**Then** Copilot uses actual template names from workspace
**And** Never suggests templates that don't exist
**And** Context improves instruction quality (FR17)

**Given** Workspace has no templates
**When** I ask about sending emails
**Then** Copilot responds: "You don't have any email templates yet. Create one in Settings > Email Templates first."
**And** Copilot offers: "I can help you write a template. What's your use case?"

**Technical Requirements:**
- AgentCopilotService queries workspace data:
  - EmailTemplate.find({ workspace })
  - CustomFieldDefinition.find({ workspace })
  - IntegrationCredential.find({ workspace })
  - Contact.distinct('tags', { workspace })
- Inject workspace context into Copilot system prompt
- Cache workspace context for 5 minutes (reduce DB queries)
- Frontend: Copilot responses include links to relevant settings pages
- RBAC: Only show data user has permission to view

---

### Story 4.7: Auto-Complete Suggestions

As a workspace owner,
I want to see auto-complete suggestions while typing instructions,
So that I can build agents faster with less typing.

**Acceptance Criteria:**

**Given** I start typing in the instructions field
**When** I type "Send em"
**Then** Auto-complete dropdown appears with:
  - "Send email using template '[template-name]'"
  - "Send email to @contact.email with subject '[subject]'"
**And** I can press Tab or click to accept

**Given** I type "If contact"
**When** Conditional keyword is detected
**Then** Auto-complete suggests:
  - "If contact.title contains '[value]'"
  - "If contact.replied == true"
  - "If contact.email exists"
**And** Suggestions appear within 200ms (NFR6)

**Given** I type "@contact."
**When** Variable prefix is detected
**Then** Auto-complete shows available contact fields:
  - @contact.firstName
  - @contact.email
  - @contact.title
  - @contact.company
  - @contact.leadScore (custom field)
**And** Fields are workspace-specific

**Given** I type "Wait"
**When** Wait keyword is detected
**Then** Auto-complete suggests:
  - "Wait 3 days"
  - "Wait 5 days"
  - "Wait 7 days"
  - "Wait [X] days"

**Given** I type "Add tag"
**When** Tag action is detected
**Then** Auto-complete shows popular workspace tags:
  - "Add tag 'Interested'"
  - "Add tag 'CEO'"
  - "Add tag 'SaaS'"
**And** Tags sorted by frequency of use

**Given** I accept a suggestion
**When** I press Tab or click
**Then** Text is inserted at cursor position
**And** Cursor moves to next placeholder (e.g., [template-name])
**And** I can continue typing

**Given** Auto-complete is showing
**When** I press Escape
**Then** Dropdown closes
**And** My typing continues normally

**Technical Requirements:**
- Create SmartSuggestionService
- Trigger on typing pause (debounced 300ms)
- Context-aware suggestions based on:
  - Current line content
  - Available actions
  - Workspace data (templates, fields, tags, integrations)
- Frontend: Dropdown component with keyboard navigation (arrow keys, Tab, Escape)
- Cache suggestions for common patterns
- Response time: <200ms for 90% (NFR6)

---

### Story 4.8: Next-Step Predictions

As a workspace owner,
I want AI to predict my next step while building workflows,
So that I can quickly add common follow-up actions.

**Acceptance Criteria:**

**Given** I write instruction: "Send email using template 'Outbound v2'"
**When** I press Enter to go to next line
**Then** AI suggests next step: "Wait 5 days"
**And** I see a chip/bubble: [+ Add: "Wait 5 days"]
**And** I can click to accept

**Given** I write: "Wait 5 days"
**When** AI predicts next step
**Then** AI suggests: "If contact has not replied, send follow-up"
**And** Prediction based on common sales automation patterns

**Given** I write: "If contact.title contains 'CEO'"
**When** AI predicts next step
**Then** AI suggests action inside if-block: "Send email using high-value template"
**And** AI understands context (CEO = high-value)

**Given** I write: "Find contacts where industry is 'SaaS'"
**When** AI predicts next step
**Then** AI suggests: "Send email to each contact"
**And** AI understands result set needs action

**Given** I write: "Create task for follow-up"
**When** AI predicts next step
**Then** AI suggests: "Assign task to @user.salesRep"
**And** AI knows tasks often need assignment

**Given** I accept a prediction
**When** I click the suggestion chip
**Then** Instruction is added to next line
**And** Cursor moves to new line
**And** I can continue building

**Given** I ignore a prediction
**When** I start typing something else
**Then** Prediction disappears
**And** New prediction may appear based on my typing

**Given** AI learns from my patterns
**When** I consistently add "Tag as 'Interested'" after "If contact replied"
**Then** AI starts predicting this pattern for me
**And** Predictions improve over time (workspace-specific learning - Phase 2)

**Technical Requirements:**
- SmartSuggestionService with Gemini 2.5 Pro
- Analyze current instruction context (last 3 lines)
- Predict based on:
  - Common workflow patterns (send email → wait → follow-up)
  - Sales automation best practices
  - Workspace data (available actions, templates)
- Frontend: Suggestion chips below instructions field
- Response time: <500ms (NFR5: suggestions appear within 500ms of typing pause)
- Cost: 0.5 credits per prediction

---

### Story 4.9: Variable Suggestions

As a workspace owner,
I want AI to suggest variables based on my trigger type and data,
So that I can personalize instructions without memorizing field names.

**Acceptance Criteria:**

**Given** Agent trigger is "Contact Created"
**When** I type "@" in instructions
**Then** AI suggests contact variables:
  - @contact.firstName
  - @contact.lastName
  - @contact.email
  - @contact.title
  - @contact.company
  - @contact.phone
**And** Suggestions are filtered by trigger type (contact-specific)

**Given** Agent trigger is "Deal Stage Updated"
**When** I type "@"
**Then** AI suggests deal variables:
  - @deal.value
  - @deal.stage
  - @deal.company
  - @deal.contact
  - @deal.closeDate
  - @deal.probability

**Given** I'm writing an email template reference
**When** Instruction includes: "Send email using template 'Outbound'"
**Then** AI suggests variables commonly used in emails:
  - @contact.firstName (personalization)
  - @company.name (relevance)
  - @contact.title (targeting)

**Given** Workspace has custom fields
**When** I type "@contact."
**Then** AI includes custom fields in suggestions:
  - @contact.leadScore
  - @contact.leadSource
  - @contact.lastContactedDate
**And** Custom fields are marked with badge: "Custom"

**Given** I'm using memory
**When** Memory is enabled and I type "@memory."
**Then** AI suggests configured memory variables:
  - @memory.processedContacts
  - @memory.emailsSentCount
  - @memory.lastRunDate

**Given** Variable doesn't exist
**When** I type "@contact.nonExistentField"
**Then** AI shows warning: "Field 'nonExistentField' not found"
**And** AI suggests: "Did you mean: @contact.firstName?"
**And** AI lists similar field names

**Given** I select a variable
**When** I click @contact.firstName
**Then** Variable is inserted at cursor
**And** I see a preview tooltip: "Example: John"
**And** Preview shows real data from workspace (if available)

**Technical Requirements:**
- SmartSuggestionService queries:
  - Contact/Deal/Company model schemas
  - CustomFieldDefinition for workspace
  - Agent memory config
- Filter suggestions by trigger type (context-aware)
- Frontend: Variable dropdown with:
  - Field name
  - Field type (string, number, date)
  - Badge for custom fields
  - Example preview
- Response time: <200ms (NFR6)

---

### Story 4.10: Convert Natural Language to Action Pills

As a workspace owner,
I want natural language instructions converted to visual action pills,
So that I can see workflow structure at a glance.

**Acceptance Criteria:**

**Given** I write: "Send email using template 'Outbound v2'"
**When** Instruction is parsed
**Then** Instruction appears as action pill:
  [📧 Send Email] → template: "Outbound v2"
**And** Pill has icon and action type
**And** Parameters shown as sub-text

**Given** I write: "Wait 5 days"
**When** Instruction is parsed
**Then** Appears as: [⏰ Wait] → 5 days
**And** Duration shown clearly

**Given** I write: "If contact.title contains 'CEO', send email"
**When** Conditional is parsed
**Then** Appears as:
  [🔀 If] contact.title contains 'CEO'
    └── [📧 Send Email]
**And** Nested structure shows branching visually

**Given** I write: "Add tag 'Interested' to contact"
**When** Tag action is parsed
**Then** Appears as: [🏷️ Add Tag] → "Interested"

**Given** I write: "Create task: Follow up with @contact.firstName"
**When** Task action is parsed
**Then** Appears as: [✓ Create Task] → "Follow up with John"
**And** Variables are resolved in preview

**Given** I have multi-step workflow with pills
**When** Viewing the workflow
**Then** I see flow diagram:
```
1. [🔍 Search] contacts → title: "CEO"
2. [📧 Send Email] → template: "Outbound v2"
3. [⏰ Wait] → 5 days
4. [🔀 If] contact.replied == false
   └── 5. [📧 Send Email] → template: "Follow-up 1"
```

**Given** Instruction cannot be parsed
**When** Text is ambiguous
**Then** Shows as: [⚠️ Unknown] → Raw text
**And** Tooltip: "This instruction may not execute correctly. Review with AI Copilot."

**Given** I click on an action pill
**When** Pill is clicked
**Then** I can edit the instruction
**And** Pill updates in real-time as I type
**And** I can toggle between text view and pill view

**Given** I drag action pills
**When** Reordering workflow (Phase 2)
**Then** I can drag pills to reorder steps
**And** Instructions update automatically

**Technical Requirements:**
- Use InstructionParserService to convert text to structured actions
- Frontend: Visual pill components for each action type
- Icons per action: 📧 Email, ⏰ Wait, 🔍 Search, 🏷️ Tag, ✓ Task, 🔀 Conditional
- Real-time parsing as user types (debounced 500ms)
- Toggle view: Text mode ↔ Visual mode
- Nested rendering for conditionals
- Click to edit (inline editing)

---

### Story 4.11: Accept or Reject AI Suggestions

As a workspace owner,
I want to control which AI suggestions to apply,
So that I maintain full control over my agent configuration.

**Acceptance Criteria:**

**Given** AI Copilot suggests an instruction
**When** Suggestion appears
**Then** I see two buttons: [Accept] [Reject]
**And** I can choose to apply or dismiss

**Given** I click "Accept"
**When** Accepting a suggestion
**Then** Suggested instruction is applied to agent
**And** I see confirmation: "Suggestion applied ✓"
**And** I can undo within 5 seconds

**Given** I click "Reject"
**When** Rejecting a suggestion
**Then** Suggestion is dismissed
**And** Copilot learns (doesn't repeat same suggestion)

**Given** Multiple suggestions are shown
**When** Copilot provides 3 improvement suggestions
**Then** I can accept/reject each individually
**And** Accepted suggestions apply immediately
**And** Rejected suggestions are removed from view

**Given** I accept a suggestion that modifies instructions
**When** Suggestion changes existing instruction
**Then** I see diff preview:
```
- Old: "Send email using template 'Outbound v1'"
+ New: "Send email using template 'Outbound v2' to @contact.email"
```
**And** I can review before confirming

**Given** I accidentally accept a suggestion
**When** I realize mistake within 5 seconds
**Then** I see "Undo" button
**And** I can click to revert changes
**And** Previous state is restored

**Given** Suggestion conflicts with existing config
**When** Copilot suggests: "Add wait step" but wait already exists
**Then** Copilot detects conflict
**And** Copilot clarifies: "You already have a wait step at line 4. Should I add another or modify existing?"

**Given** I want to preview suggestion impact
**When** Suggestion would affect multiple fields
**Then** I see summary:
```
This suggestion will:
✓ Update instructions (line 3)
✓ Add variable @contact.leadScore
✓ Require custom field 'leadScore' to be defined

[Preview in Test Mode] [Accept] [Reject]
```

**Given** I accept multiple suggestions
**When** Applying batch changes
**Then** All changes apply atomically (all or nothing)
**And** If one fails, all are rolled back
**And** Error message explains which suggestion failed

**Technical Requirements:**
- Frontend: Accept/Reject buttons for each suggestion
- Undo stack: Store last 5 changes with timestamps
- 5-second undo window with countdown timer
- Diff preview component (old vs new)
- Suggestion tracking: Log acceptance/rejection for ML learning (Phase 2)
- Atomic updates: Use transactions for batch changes
- Frontend: Preview modal for multi-field changes

---

**Epic 4 Summary:**
- ✅ 11 stories created
- ✅ All FRs covered (FR12-FR22)
- ✅ Complete acceptance criteria for each story
- ✅ AI Copilot chat, instruction generation, Q&A, improvement suggestions
- ✅ Smart suggestions: Auto-complete, next-step predictions, variable suggestions
- ✅ Visual workflow (action pills), accept/reject controls
- ✅ No future dependencies (each story builds on previous)
- ✅ NFRs addressed (NFR4: <3s Copilot response, NFR5: <500ms suggestions, NFR6: <200ms auto-complete, NFR54: 85% executable instructions)

Shall I proceed to Epic 5: External Integrations?

---
