## Epic 1: Manual Agent Building

Users can create, edit, and manage sales automation agents manually to automate their workflows.

### Story 1.1: Create Basic Agent

As a workspace owner,
I want to create a new agent with a name and goal,
So that I can start building automation workflows for my sales team.

**Acceptance Criteria:**

**Given** I am logged in as a workspace owner
**When** I navigate to the Agents page and click "Create Agent"
**Then** I see a form with fields for agent name and goal
**And** I can enter an agent name (required, max 100 characters)
**And** I can enter an agent goal (required, max 500 characters)

**Given** I have filled in the agent name and goal
**When** I click "Create Draft Agent"
**Then** A new agent is created in Draft status
**And** The agent is saved to the database with workspace isolation (workspace field populated)
**And** I am redirected to the agent builder page for the new agent
**And** The agent appears in my workspace agents list

**Given** I try to create an agent without a name or goal
**When** I click "Create Draft Agent"
**Then** I see validation errors for required fields
**And** The agent is not created

**Given** Another user in a different workspace creates an agent
**When** I view my agents list
**Then** I do not see their agent (workspace isolation verified)

**Technical Requirements:**
- Create Agent model with fields: workspace, name, goal, status, createdBy, createdAt, updatedAt
- Create POST `/api/workspaces/:workspaceId/agents` endpoint with workspace isolation
- Create GET `/api/workspaces/:workspaceId/agents/:agentId` endpoint
- Frontend: Agent creation modal with form validation
- Workspace isolation enforced at database query level

---

### Story 1.2: Add Trigger Configuration

As a workspace owner,
I want to configure when my agent runs (manual, scheduled, or event-based),
So that I can control how my automation executes.

**Acceptance Criteria:**

**Given** I have created an agent
**When** I open the agent configuration
**Then** I see a "Triggers" section with options: Manual, Scheduled, Event-Based

**Given** I select "Manual" trigger type
**When** I save the agent
**Then** The agent can only be triggered manually via "Run Now" button
**And** The trigger configuration is saved with type: "manual"

**Given** I select "Scheduled" trigger type
**When** I configure the schedule (daily at 9 AM, weekly on Monday, monthly on 1st)
**Then** I can select frequency (daily, weekly, monthly)
**And** I can set the time of day
**And** I can set specific days (for weekly) or date (for monthly)
**And** The schedule configuration is saved with the agent

**Given** I select "Event-Based" trigger type
**When** I configure the event
**Then** I can select from available events: Contact Created, Deal Stage Updated, Form Submitted
**And** I can add conditions for the event (e.g., "when deal value > $10,000")
**And** The event configuration is saved with the agent

**Given** I have configured multiple trigger types
**When** I save the agent
**Then** All trigger configurations are stored
**And** I can see all configured triggers in the agent summary

**Technical Requirements:**
- Add triggers field to Agent model (array of trigger objects)
- Trigger schema: { type: string, config: object }
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint to accept triggers
- Frontend: Trigger configuration UI with type selector and conditional fields
- Validation: At least one trigger required per agent

---

### Story 1.3: Write Natural Language Instructions

As a workspace owner,
I want to write agent instructions in plain English,
So that I can define what my agent should do without learning code.

**Acceptance Criteria:**

**Given** I have created an agent with triggers
**When** I navigate to the "Instructions" section
**Then** I see a large text area for writing instructions
**And** I see helper text: "Describe what this agent should do in plain English"
**And** I see examples of valid instructions

**Given** I write instructions in the text area
**When** I type "Send email to all CEOs at SaaS companies"
**Then** The text is saved as I type (auto-save every 2 seconds)
**And** I see a "Last saved" timestamp

**Given** I have written multi-step instructions
**When** I write:
```
1. Find contacts where title contains "CEO"
2. Filter for SaaS industry companies
3. Send personalized email using template "Outbound v2"
4. Wait 5 days
5. If no reply, send follow-up email
```
**Then** The instructions are saved with line breaks preserved
**And** The instructions appear exactly as written when I reload the page

**Given** I try to save an agent without instructions
**When** I attempt to change status from Draft to Live
**Then** I see validation error: "Instructions are required"
**And** The agent remains in Draft status

**Given** Instructions exceed 10,000 characters
**When** I try to save
**Then** I see warning: "Instructions are very long. Consider breaking into multiple agents."
**And** The instructions are still saved (warning only, not blocking)

**Technical Requirements:**
- Add instructions field to Agent model (text, max 10,000 characters, required for Live status)
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint to accept instructions
- Frontend: Large textarea with auto-save (debounced 2 seconds)
- Frontend: Character count display and helper text with examples
- Validation: Instructions required to transition to Live status

---

### Story 1.4: Configure Agent Restrictions

As a workspace owner,
I want to set restrictions on my agent's behavior,
So that I can prevent unwanted actions and control scope.

**Acceptance Criteria:**

**Given** I have an agent with instructions
**When** I navigate to the "Restrictions" section
**Then** I see options to configure: Max executions per day, Max emails per day, Allowed integrations, Excluded contacts/companies

**Given** I set "Max executions per day" to 50
**When** I save the agent
**Then** The agent will auto-pause after 50 executions in a 24-hour period
**And** The restriction is saved: { maxExecutionsPerDay: 50 }

**Given** I set "Max emails per day" to 100
**When** I save the agent
**Then** The agent will stop sending emails after 100 in a 24-hour period
**And** The restriction is saved: { maxEmailsPerDay: 100 }

**Given** I select specific integrations the agent can use
**When** I check Gmail and LinkedIn only
**Then** The agent can only use these two integrations
**And** Attempts to use other integrations will be blocked
**And** The restriction is saved: { allowedIntegrations: ['gmail', 'linkedin'] }

**Given** I add excluded contacts or companies
**When** I enter contact IDs or company domains to exclude
**Then** The agent will skip these contacts/companies during execution
**And** The restriction is saved: { excludedContacts: [...], excludedDomains: [...] }

**Given** I leave restrictions empty
**When** I save the agent
**Then** Default restrictions apply: maxExecutionsPerDay: 100, maxEmailsPerDay: 100
**And** All integrations are allowed by default

**Technical Requirements:**
- Add restrictions field to Agent model (object with maxExecutionsPerDay, maxEmailsPerDay, allowedIntegrations, excludedContacts, excludedDomains)
- Default restrictions: { maxExecutionsPerDay: 100, maxEmailsPerDay: 100, allowedIntegrations: [] (all) }
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint to accept restrictions
- Frontend: Restrictions configuration UI with numeric inputs, integration checkboxes, contact/company exclusion picker
- Validation: Numeric fields must be positive integers

---

### Story 1.5: Configure Agent Memory

As a workspace owner,
I want to configure memory for my agent,
So that it can track state and remember context between executions.

**Acceptance Criteria:**

**Given** I have an agent with instructions
**When** I navigate to the "Memory" section
**Then** I see options to: Enable memory, Define memory variables, Set memory retention

**Given** I enable memory for the agent
**When** I toggle "Enable Memory"
**Then** The agent can store and retrieve data between executions
**And** The memory configuration is saved: { enabled: true }

**Given** I define custom memory variables
**When** I add variables like "lastContactedDate", "emailsSentCount", "respondedContacts"
**Then** I can specify variable name, type (string, number, date, array), and default value
**And** The variables are saved: { variables: [{ name, type, defaultValue }] }
**And** These variables are available in agent instructions via @memory.variableName

**Given** I set memory retention
**When** I select retention period: 7 days, 30 days, 90 days, Forever
**Then** Memory data older than the retention period is automatically deleted
**And** The retention is saved: { retentionDays: 30 }

**Given** Memory is disabled
**When** I save the agent
**Then** Memory configuration is saved as: { enabled: false, variables: [], retentionDays: 0 }
**And** No memory data is stored during execution

**Given** I define a memory variable "contactsProcessed" as array
**When** The agent runs and adds contact IDs to this array
**Then** On next execution, the agent can check if a contact was already processed
**And** The agent skips already-processed contacts

**Technical Requirements:**
- Add memory field to Agent model (object with enabled, variables, retentionDays)
- Create AgentMemory model (workspace, agent, key, value, expiresAt)
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint to accept memory config
- Frontend: Memory configuration UI with variable builder (name, type, default value)
- Validation: Variable names must be valid identifiers (alphanumeric + underscore)

---

### Story 1.6: Set Approval Requirements

As a workspace owner,
I want to require approval for specific agent actions,
So that sensitive operations need human review before execution.

**Acceptance Criteria:**

**Given** I have an agent with instructions
**When** I navigate to the "Approvals" section
**Then** I see options to: Require approval for all actions, Require approval for specific actions, Set approvers

**Given** I enable "Require approval for all actions"
**When** I save the agent
**Then** Every action the agent attempts requires manual approval
**And** The approval config is saved: { enabled: true, requireForAllActions: true }

**Given** I enable approval for specific actions only
**When** I select "Send Email" and "Update Deal Value" actions
**Then** Only these actions require approval, others execute automatically
**And** The approval config is saved: { enabled: true, requireForAllActions: false, requiredForActions: ['send_email', 'update_deal_value'] }

**Given** I set specific approvers
**When** I select team members from the workspace
**Then** Only selected users can approve agent actions
**And** The approvers are saved: { approvers: [userId1, userId2] }
**And** If no approvers specified, all workspace owners/admins can approve

**Given** Approval is disabled
**When** I save the agent
**Then** All actions execute automatically without approval
**And** The approval config is saved: { enabled: false }

**Given** An agent has approval enabled
**When** The agent runs and attempts an action requiring approval
**Then** The action is queued for approval (not executed immediately)
**And** Designated approvers receive notification
**And** The agent execution pauses until approval is granted or denied

**Technical Requirements:**
- Add approvalConfig field to Agent model (object with enabled, requireForAllActions, requiredForActions, approvers)
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint to accept approval config
- Frontend: Approval configuration UI with toggle, action selector, user picker
- Validation: If enabled and specific actions selected, at least one action must be selected
- Note: Approval workflow execution is part of Epic 3 (this story only configures the settings)

---

### Story 1.7: Edit Existing Agent

As a workspace owner,
I want to edit existing agents,
So that I can update configurations and fix issues.

**Acceptance Criteria:**

**Given** I have existing agents in my workspace
**When** I navigate to the Agents page
**Then** I see a list of all agents with edit buttons

**Given** I click "Edit" on an agent
**When** The agent builder opens
**Then** All existing configuration is pre-populated (name, goal, triggers, instructions, restrictions, memory, approvals)
**And** I can modify any field

**Given** I update the agent name
**When** I change the name and save
**Then** The agent name is updated in the database
**And** The updatedAt timestamp is updated
**And** The name change is reflected in the agents list

**Given** I update agent instructions
**When** I modify the instructions and save
**Then** The new instructions are saved
**And** The previous instructions are not retained (no version history in MVP)

**Given** I try to edit an agent in Live status
**When** I make changes and save
**Then** A warning appears: "Agent is Live. Changes will affect active executions."
**And** I can confirm to save or cancel

**Given** Another user is editing the same agent
**When** I try to save my changes
**Then** I see a conflict warning: "Agent was modified by [user] at [time]. Reload to see latest version."
**And** I must reload before saving (optimistic locking check via updatedAt)

**Given** I am a workspace member (not owner/admin)
**When** I try to edit an agent
**Then** I see an error: "You don't have permission to edit agents"
**And** The edit action is blocked (RBAC check)

**Technical Requirements:**
- Update PUT `/api/workspaces/:workspaceId/agents/:agentId` endpoint with RBAC check (Owner/Admin only)
- Frontend: Agent edit form pre-populated with existing data
- Optimistic locking: Check updatedAt timestamp before saving
- Frontend: Warning modal when editing Live agents
- RBAC: Verify user role (Owner/Admin) before allowing edit

---

### Story 1.8: Duplicate Agent

As a workspace owner,
I want to duplicate existing agents,
So that I can create variations without starting from scratch.

**Acceptance Criteria:**

**Given** I have existing agents in my workspace
**When** I view the agents list
**Then** Each agent has a "Duplicate" button

**Given** I click "Duplicate" on an agent
**When** The duplication modal opens
**Then** I see a field to enter a new name for the duplicated agent
**And** The default name is "[Original Name] (Copy)"

**Given** I enter a new name and confirm
**When** I click "Duplicate Agent"
**Then** A new agent is created with the same configuration as the original
**And** The new agent has: Same goal, triggers, instructions, restrictions, memory config, approval config
**And** The new agent is in Draft status (regardless of original status)
**And** The new agent has a new unique ID
**And** The createdBy field is set to the current user
**And** The createdAt and updatedAt timestamps are set to now

**Given** I duplicate an agent with integrations
**When** The duplicate is created
**Then** The duplicate has the same allowedIntegrations restrictions
**And** But it does not inherit execution history or memory data (clean slate)

**Given** I duplicate an agent and modify the instructions
**When** I save the duplicate
**Then** The original agent is unchanged
**And** The duplicate has the modified instructions (independent copy)

**Given** I try to duplicate an agent without edit permissions
**When** I click "Duplicate"
**Then** I see error: "You don't have permission to duplicate agents"
**And** The duplication is blocked

**Technical Requirements:**
- Create POST `/api/workspaces/:workspaceId/agents/:agentId/duplicate` endpoint
- Copy all configuration fields except: id, createdAt, updatedAt, createdBy, status (set to Draft)
- Do not copy: Execution history, memory data
- Frontend: Duplicate modal with name input
- RBAC: Verify user role (Owner/Admin) before allowing duplication
- Return the new agent object after successful duplication

---

### Story 1.9: Manage Agent Status

As a workspace owner,
I want to manage agent status (Draft, Live, Paused),
So that I can control when agents are active and executing.

**Acceptance Criteria:**

**Given** I create a new agent
**When** The agent is saved
**Then** It is in "Draft" status by default
**And** Draft agents do not execute automatically (manual trigger only for testing)

**Given** I have a Draft agent with complete configuration
**When** I click "Go Live"
**Then** I see a validation check for: Name, goal, at least one trigger, instructions (required)
**And** If all required fields are present, status changes to "Live"
**And** If any required fields are missing, I see specific validation errors

**Given** An agent is in Live status
**When** Scheduled triggers are configured
**Then** The agent executes automatically according to the schedule
**And** Event-based triggers fire when events occur

**Given** I have a Live agent
**When** I click "Pause"
**Then** The status changes to "Paused"
**And** Scheduled executions are stopped
**And** Event-based triggers are disabled
**And** I see a pause indicator on the agent card

**Given** I have a Paused agent
**When** I click "Resume"
**Then** The status changes back to "Live"
**And** Scheduled executions resume from next scheduled time
**And** Event-based triggers are re-enabled

**Given** I have a Live agent
**When** I change status to Draft
**Then** I see a warning: "Changing to Draft will stop all executions. Continue?"
**And** Upon confirmation, status changes to Draft and all automatic execution stops

**Given** An agent hits a circuit breaker (max executions/day)
**When** The limit is reached
**Then** The agent status automatically changes to "Paused"
**And** A notification is sent: "Agent [name] auto-paused: execution limit reached"
**And** I can manually resume after reviewing

**Technical Requirements:**
- Add status field to Agent model (enum: 'draft', 'live', 'paused', default: 'draft')
- Create PATCH `/api/workspaces/:workspaceId/agents/:agentId/status` endpoint
- Status validation:
  - Draft → Live: requires name, goal, triggers, instructions
  - Live → Paused: allowed
  - Paused → Live: allowed
  - Live → Draft: show warning
- Frontend: Status badge and action buttons (Go Live, Pause, Resume, Set to Draft)
- Frontend: Validation modal showing missing required fields
- RBAC: Verify user role (Owner/Admin) before allowing status changes

---

### Story 1.10: Delete Agent

As a workspace owner,
I want to delete agents I no longer need,
So that I can keep my workspace organized.

**Acceptance Criteria:**

**Given** I have existing agents in my workspace
**When** I view the agents list
**Then** Each agent has a "Delete" button (trash icon)

**Given** I click "Delete" on a Draft agent
**When** The confirmation modal opens
**Then** I see: "Delete agent [name]? This cannot be undone."
**And** I see options: "Cancel" and "Delete Agent"

**Given** I confirm deletion of a Draft agent
**When** I click "Delete Agent"
**Then** The agent is permanently deleted from the database
**And** The agent disappears from the agents list
**And** I see success message: "Agent deleted successfully"

**Given** I click "Delete" on a Live agent
**When** The confirmation modal opens
**Then** I see a stronger warning: "This agent is Live and may have active executions. Delete anyway?"
**And** The delete button text is "Force Delete"

**Given** I confirm deletion of a Live agent
**When** I click "Force Delete"
**Then** The agent is deleted
**And** All scheduled executions are canceled
**And** Execution history is retained (for audit purposes) but marked as orphaned

**Given** I try to delete an agent without permission
**When** I click "Delete"
**Then** I see error: "You don't have permission to delete agents"
**And** The deletion is blocked

**Given** An agent has execution history
**When** I delete the agent
**Then** The agent record is deleted
**And** Execution logs remain in database with agentDeleted flag
**And** Logs can still be viewed for audit purposes

**Technical Requirements:**
- Create DELETE `/api/workspaces/:workspaceId/agents/:agentId` endpoint
- Soft delete agent record (add deletedAt timestamp) OR hard delete with cascade
- Mark associated execution logs with agentDeleted: true
- Cancel all scheduled jobs for the agent (BullMQ job removal)
- Frontend: Delete confirmation modal with different warnings for Draft vs Live
- RBAC: Verify user role (Owner/Admin) before allowing deletion
- Return success message after deletion

---

### Story 1.11: List All Workspace Agents

As a workspace owner,
I want to view all agents in my workspace,
So that I can see what automation I have configured.

**Acceptance Criteria:**

**Given** I have agents in my workspace
**When** I navigate to the Agents page
**Then** I see a list of all agents with: Name, status badge (Draft/Live/Paused), last execution time, created date

**Given** I have 0 agents in my workspace
**When** I navigate to the Agents page
**Then** I see an empty state with: "No agents yet" message and "Create Your First Agent" button

**Given** I have multiple agents
**When** I view the list
**Then** Agents are sorted by createdAt (newest first) by default
**And** I can change sorting to: Name (A-Z), Status, Last Execution

**Given** I have agents in different statuses
**When** I view the list
**Then** I can filter by status: All, Draft, Live, Paused
**And** The count of agents in each status is shown

**Given** I have many agents
**When** I search in the search bar
**Then** Agents are filtered by name or goal (case-insensitive)
**And** The list updates in real-time as I type

**Given** I view an agent in the list
**When** I click on the agent card
**Then** I am navigated to the agent detail/edit page

**Given** I hover over an agent card
**When** My cursor is over the card
**Then** I see quick action buttons: Edit, Duplicate, Delete, View Logs

**Given** Another user in a different workspace has agents
**When** I view my agents list
**Then** I only see agents from my workspace (workspace isolation verified)

**Technical Requirements:**
- Create GET `/api/workspaces/:workspaceId/agents` endpoint with workspace isolation
- Support query parameters: status (filter), sortBy (name, status, createdAt, lastExecutedAt), search (name, goal)
- Return agent list with pagination support (limit, offset)
- Frontend: Agents list page with cards/table view
- Frontend: Filter dropdown, sort dropdown, search input
- Frontend: Empty state with CTA button
- RBAC: All workspace members can view agents list (read permission)

---

**Epic 1 Summary:**
- 11 stories created
- All FRs covered (FR1-FR11)
- Complete acceptance criteria for each story
- No future dependencies (each story builds on previous)
- Stories appropriately sized for single dev completion
