## Epic 6: Agent Templates & Quick Start

Users can start from pre-built templates for common sales workflows instead of building from scratch.

### Story 6.1: Browse Template Library

As a workspace owner,
I want to browse pre-built agent templates,
So that I can quickly find workflows for common sales tasks.

**Acceptance Criteria:**

**Given** I navigate to Agents page
**When** I click "Browse Templates"
**Then** Template library opens
**And** I see 10 pre-built templates organized by category
**And** Categories include: Outbound, Follow-up, Lead Management, Engagement, Enrichment

**Given** Template library is open
**When** I view available templates
**Then** Each template shows:
  - Template name (e.g., "Big 4 Outbound Campaign")
  - Description (what it does)
  - Category badge
  - Trigger type (manual, scheduled, event)
  - Estimated setup time (e.g., "5 minutes")
  - Preview of instructions

**Given** I click on a template
**When** Template detail view opens
**Then** I see:
  - Full description of what the agent does
  - Step-by-step workflow preview
  - Required integrations (Gmail, LinkedIn, etc.)
  - Customization points (what needs to be configured)
  - "Use This Template" button

**Given** Template requires Gmail integration
**When** Viewing template details
**Then** I see: "Requires: ✅ Gmail (connected)" or "Requires: ❌ Gmail (not connected)"
**And** If not connected, I see "Connect Gmail" button

**Given** I search for templates
**When** I type "outbound" in search
**Then** Templates with "outbound" in name/description are shown
**And** Results update in real-time

**Given** I filter by category
**When** I select "Follow-up" category
**Then** Only follow-up templates are shown
**And** Other categories are available in dropdown

**Given** I filter by integration
**When** I select "Show only templates I can use"
**Then** Only templates with connected integrations are shown
**And** I can toggle to show all templates

**Technical Requirements:**
- Create AgentTemplate model: name, description, category, triggerType, instructions, requiredIntegrations, estimatedSetupTime, isPublic, createdBy, workspace (null for system templates)
- Seed database with 10 pre-built templates
- Frontend: Template library UI with grid/list view
- Template categories: outbound, followup, lead_management, engagement, enrichment
- Search: Filter by name/description
- Filter by category and integration availability
- GET `/api/workspaces/:workspaceId/templates` endpoint
- System templates: workspace=null, isPublic=true

---

### Story 6.2: 10 Pre-Built Templates

As a workspace owner,
I want access to 10 pre-built templates for common sales workflows,
So that I can start automating immediately without building from scratch.

**Acceptance Criteria:**

**Given** System templates are seeded
**When** I browse template library
**Then** I see these 10 templates:

**1. Big 4 Outbound Campaign**
- Category: Outbound
- Description: Find CEOs at SaaS companies and send personalized cold emails with follow-ups
- Triggers: Manual
- Actions: Search contacts, send email, wait 5 days, conditional follow-up
- Requires: Gmail

**2. Deal Stage Progression Follow-up**
- Category: Follow-up
- Description: Automatically follow up when deals move to new stages
- Triggers: Event (Deal Stage Updated)
- Actions: Send email, create task, notify team via Slack
- Requires: Gmail, Slack

**3. Cold Lead Re-engagement**
- Category: Engagement
- Description: Re-engage leads who went cold 30+ days ago
- Triggers: Scheduled (weekly)
- Actions: Find inactive contacts, send re-engagement email, tag interested
- Requires: Gmail

**4. Warm Lead Handoff to Sales**
- Category: Lead Management
- Description: Detect warm leads (opened email, replied) and hand off to sales rep
- Triggers: Event (Contact Replied)
- Actions: Create task, send Slack notification, update lead score
- Requires: Slack

**5. LinkedIn Connection + Email Combo**
- Category: Outbound
- Description: Send LinkedIn invitation, wait 3 days, follow up with email if accepted
- Triggers: Manual
- Actions: Send LinkedIn invitation, wait, conditional email
- Requires: LinkedIn, Gmail

**6. Contact Enrichment Pipeline**
- Category: Enrichment
- Description: Enrich all contacts with missing data using Apollo.io
- Triggers: Scheduled (daily)
- Actions: Find contacts with missing fields, enrich via Apollo, update records
- Requires: Apollo.io

**7. Demo Request Auto-Responder**
- Category: Engagement
- Description: Instantly respond when contact submits demo form
- Triggers: Event (Form Submitted)
- Actions: Send confirmation email, create calendar event, notify sales team
- Requires: Gmail, Google Calendar, Slack

**8. Post-Demo Follow-up Sequence**
- Category: Follow-up
- Description: Multi-touch follow-up after demos (1 day, 3 days, 7 days)
- Triggers: Manual (after demo)
- Actions: Send thank you email, wait, send value prop, wait, send case study
- Requires: Gmail

**9. Inbound Lead Qualification**
- Category: Lead Management
- Description: Score and qualify inbound leads based on title, company size
- Triggers: Event (Contact Created)
- Actions: Web search for company info, score lead, route to appropriate rep
- Requires: Web Search, Slack

**10. Weekly Pipeline Review Report**
- Category: Lead Management
- Description: Export weekly summary of deals and activities to Google Sheets
- Triggers: Scheduled (weekly, Monday 9 AM)
- Actions: Query deals by stage, calculate metrics, export to Google Sheets
- Requires: Google Sheets

**Given** Each template is seeded
**When** Template is viewed
**Then** Instructions are complete and executable
**And** Variables are properly formatted (@contact.firstName, etc.)
**And** Conditional logic is valid

**Technical Requirements:**
- Create database seed script with 10 templates
- Each template includes:
  - Complete instructions (natural language)
  - Default configuration (triggers, restrictions, memory)
  - Required integrations list
  - Category and metadata
- Templates are immutable system templates (workspace=null)
- Instructions follow best practices (wait steps, personalization, error handling)

---

### Story 6.3: Install and Customize Template

As a workspace owner,
I want to install templates and customize them for my needs,
So that I can quickly start with proven workflows.

**Acceptance Criteria:**

**Given** I view template "Big 4 Outbound Campaign"
**When** I click "Use This Template"
**Then** Installation wizard opens
**And** Step 1 shows: "Customize Agent Name"
**And** Default name: "Big 4 Outbound Campaign (from template)"

**Given** I'm in customization wizard
**When** I enter agent name: "CEO Outreach - Q1 2026"
**Then** Name is validated (required, max 100 chars)
**And** I can proceed to next step

**Given** Step 2: Configure Integrations
**When** Template requires Gmail and it's connected
**Then** I see: "✅ Gmail connected as john@gmail.com"
**And** I can proceed

**Given** Template requires LinkedIn but it's not connected
**When** I reach integration step
**Then** I see: "❌ LinkedIn not connected"
**And** "Connect LinkedIn" button
**And** I must connect or skip this template

**Given** Step 3: Customize Instructions
**When** Template instructions are displayed
**Then** I see editable text with placeholders highlighted
**And** Placeholders: [email-template-name], [wait-days], [follow-up-template]
**And** I can edit instructions or keep defaults

**Given** Template uses email template "Outbound v2"
**When** Template doesn't exist in my workspace
**Then** I see warning: "⚠️ Create template 'Outbound v2' or update name"
**And** I can create template or change name

**Given** Step 4: Review & Create
**When** I review configuration
**Then** I see summary:
  - Agent name
  - Trigger type
  - Required integrations (connected/not connected)
  - Instructions preview
**And** "Create Agent" button

**Given** I click "Create Agent"
**When** Agent is created from template
**Then** New agent is saved with:
  - Name from step 1
  - Instructions from step 3
  - Triggers from template
  - Default restrictions from template
  - Status: Draft
  - Source: templateId reference
**And** I'm redirected to agent builder
**And** Success message: "Agent created from template! Test before going live."

**Given** Agent is created from template
**When** I view agent details
**Then** I see badge: "From template: Big 4 Outbound Campaign"
**And** I can edit any configuration
**And** Changes don't affect original template

**Technical Requirements:**
- POST `/api/workspaces/:workspaceId/agents/from-template` endpoint
- Request body: { templateId, customizations: { name, instructions, triggers } }
- Copy template configuration to new agent
- Validate required integrations are connected
- Frontend: Multi-step installation wizard
- Placeholder detection and highlighting in instructions
- Reference original template: agent.sourceTemplate = templateId
- Agent is fully customizable after creation (not linked to template)

---

### Story 6.4: Save Agent as Custom Template

As a workspace owner,
I want to save my agents as templates,
So that I can reuse them or share with team members.

**Acceptance Criteria:**

**Given** I have a working agent
**When** I click "Save as Template"
**Then** Save template modal opens
**And** I see fields:
  - Template name (default: agent name)
  - Description (required)
  - Category (dropdown: outbound, followup, lead_management, engagement, enrichment, custom)
  - Visibility: Private (only me) or Workspace (all team members)

**Given** I fill in template details
**When** Name: "My Custom Outreach Flow"
**And** Description: "Personalized CEO outreach with 3-touch follow-up"
**And** Category: Custom
**And** Visibility: Workspace
**Then** I can save template

**Given** I click "Save Template"
**When** Template is created
**Then** AgentTemplate record is created with:
  - workspace: current workspace
  - createdBy: current user
  - isPublic: false (workspace-scoped)
  - name, description, category, instructions, configuration
**And** Success message: "Template saved! Available in your template library."

**Given** Template is saved
**When** I browse template library
**Then** I see my custom template in "My Templates" tab
**And** Template shows creator: "Created by You"
**And** Template shows: "Private" or "Workspace" visibility badge

**Given** Custom template is workspace-visible
**When** Team member browses templates
**Then** They see my template in "Team Templates" tab
**And** Template shows creator: "Created by [My Name]"
**And** They can install it

**Given** I save template with same name as existing
**When** Duplicate name detected
**Then** Error: "Template 'My Custom Outreach Flow' already exists. Choose different name."
**And** I can update name

**Given** Agent has sensitive data in instructions
**When** Saving as template
**Then** I see warning: "Review instructions for sensitive data (emails, names, etc.) before sharing"
**And** I can review and sanitize before saving

**Given** I update original agent after saving template
**When** Agent configuration changes
**Then** Template remains unchanged (snapshot at save time)
**And** Template and agent are independent

**Technical Requirements:**
- Add "Save as Template" action to agent menu
- POST `/api/workspaces/:workspaceId/templates` endpoint
- Create AgentTemplate from agent configuration
- Validate: name unique within workspace, description required
- Visibility options: private (createdBy only), workspace (all members)
- Frontend: Save template modal with form
- Template tabs: System Templates, My Templates, Team Templates
- Sanitization warning for sensitive data
- Template is snapshot (not linked to original agent)

---

### Story 6.5: Share Templates Within Workspace

As a workspace owner,
I want to share templates with team members,
So that everyone can use proven workflows.

**Acceptance Criteria:**

**Given** I create a template with workspace visibility
**When** Template is saved
**Then** All workspace members can see it in "Team Templates" tab
**And** Template shows creator name

**Given** Team member views my template
**When** They click "Use This Template"
**Then** They can install it like system templates
**And** Customization wizard follows same flow
**And** They create their own agent from template

**Given** I update my template
**When** I save changes to template
**Then** AgentTemplate record is updated
**And** Team members see updated version
**And** Agents already created from template are not affected

**Given** Multiple team members use same template
**When** Each creates agent from template
**Then** Each has independent agent
**And** Changes to one agent don't affect others
**And** All agents reference same templateId

**Given** I delete my template
**When** Template is deleted
**Then** Template is marked as deleted: deletedAt timestamp
**And** Template no longer appears in library
**And** Agents created from template remain (show "Template deleted")

**Given** Workspace admin views templates
**When** Browsing team templates
**Then** They see all workspace templates
**And** They can delete any template (even if not creator)
**And** Confirmation required: "Delete template? This won't affect agents created from it."

**Given** I want to see who uses my template
**When** I view template details
**Then** I see usage stats:
  - "5 agents created from this template"
  - List of agents (if I have permission)
  - Created by team members

**Given** Team member creates great template
**When** Template is highly used
**Then** I can see popular templates: "Most used" sort option
**And** Templates show usage count badge

**Technical Requirements:**
- GET `/api/workspaces/:workspaceId/templates?visibility=workspace` for team templates
- Update PUT `/api/workspaces/:workspaceId/templates/:id` endpoint (creator or admin only)
- Delete with soft delete (deletedAt timestamp)
- RBAC: All members can view workspace templates, only creator/admin can edit/delete
- Track template usage: Count agents with sourceTemplate = templateId
- Frontend: Team Templates tab with creator attribution
- Usage stats: Aggregate agents by template
- Popular templates: Sort by usage count
- Admin controls: Manage all workspace templates

---

**Epic 6 Summary:**
- ✅ 5 stories created
- ✅ All FRs covered (FR64-FR68)
- ✅ Complete acceptance criteria for each story
- ✅ Template library with browse, search, and filter
- ✅ 10 pre-built system templates for common sales workflows
- ✅ Installation wizard with customization flow
- ✅ Save agents as custom templates
- ✅ Share templates within workspace with visibility controls
- ✅ Template usage tracking and stats
- ✅ No future dependencies (each story builds on previous)

Shall I proceed to Epic 7: Production Governance & Safety (final epic)?

---
