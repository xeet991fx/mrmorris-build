---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - 'docs/AGENT_SYSTEM.md'
  - 'docs/API_ROUTES_MAP.md'
  - 'docs/ARCHITECTURE.md'
  - 'docs/BACKGROUND_JOBS.md'
  - 'docs/BUILD_AND_DEPLOYMENT.md'
  - 'docs/DEPENDENCIES.md'
  - 'docs/ENVIRONMENT_CONFIGURATION.md'
  - 'docs/FOLDER_STRUCTURE.md'
  - 'docs/INTEGRATIONS.md'
  - 'docs/MIGRATION_NOTES.md'
  - 'docs/MODELS_AND_SCHEMAS.md'
  - 'docs/RESTRUCTURE_CHECKLIST.md'
workflowType: 'prd'
projectType: 'brownfield'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 12
classification:
  projectType: 'saas_b2b'
  domain: 'general'
  complexity: 'medium-high'
  projectContext: 'brownfield'
  businessModel: 'paid-feature'
  keyCharacteristics:
    - 'Multi-tenant platform with workspace isolation'
    - 'AI agent orchestration and LLM interpretation'
    - 'Security-critical (workspace isolation, integration safety, approval workflows)'
    - 'Integration-heavy (Slack, LinkedIn, Google Workspace)'
    - 'User empowerment (no-code agent builder for non-developers)'
    - 'Real-time execution (triggers, schedules, background processing)'
  criticalRequirements:
    - 'Runaway agent protection (circuit breakers, execution limits)'
    - 'Prompt injection defense (system prompt isolation, tool whitelisting)'
    - 'Dry run/sandbox mode for safe testing'
    - 'Human-readable execution logs and debugging'
    - 'Approval workflows for sensitive actions'
    - 'Rate limiting (per-agent, per-workspace, per-integration)'
    - 'Cost management (LLM API quotas, budget tracking)'
  priorityIntegrations:
    - 'Slack'
    - 'LinkedIn'
    - 'Gmail'
    - 'Google Calendar'
    - 'Google Sheets'
  phasedApproach:
    phase1: 'MVP - Core builder, 3 triggers, 8 actions, dry run (6-8 weeks)'
    phase2: 'Enhanced Intelligence - Approvals, chaining, analytics (4 weeks)'
    phase3: 'Marketplace & Community - Agent library, orchestration (8 weeks)'
---

# Product Requirements Document - Clianta AI Agent Builder

**Author:** Gandharv
**Date:** 2026-01-11

## Executive Summary

Clianta's AI Agent Builder enables non-technical users (startup founders, sales ops, agencies) to automate sales workflows through conversational AI assistance. The core value is the **agent building system** that automates repetitive sales work. The **AI Copilot** is the competitive differentiator that builds agents 10x faster than traditional workflow builders.

**Target Users:** Seed to Series A founders, sales operations teams, agencies managing multiple clients
**Business Model:** AI credits system (paid feature), 3 tiers (Free/Paid/Enterprise)
**Differentiator:** AI Copilot builds complete agent workflows from plain English descriptions, not just suggestions

## Success Criteria

### User Success

**The "Aha!" Moment:**
Users typing instructions see AI Copilot complete their thought or ask clarifying questions, feeling like they're collaborating with an intelligent assistant, not filling a form.

**Measurable Outcomes:**

1. **AI-Assisted Creation**: 70% of users interact with AI Copilot while building first agent
2. **Suggestion Adoption**: 60% of smart suggestions accepted
3. **First-Time Success**: 85% of agents passing Test Mode execute successfully when Live
4. **Rapid Creation**: <15 minutes average to complete first agent
5. **Self-Service Debugging**: 75% of failed agents diagnosed and fixed using execution logs without support

**Emotional Success Signals:**
- "It suggested exactly what I was going to type next!"
- "The Copilot helped me think through edge cases I would have missed"
- "I built a 10-step workflow by describing what I want"
- "Test Mode showed exactly what would happen - no surprises"

### Business Success

**Core Differentiator:**
AI Agent Builder with intelligent Copilot is what makes Clianta fundamentally different from traditional CRMs.

**Launch Readiness (Month 1):**
1. MVP Agent Builder with AI Copilot, Smart Suggestions, Test Mode ready
2. AI Credits tracked, enforced, visible with predictive warnings
3. Demo agent building with Copilot in <3 minutes

**Early Adoption (Months 1-3):**
1. 50% of paid users create ≥1 agent within first 3 days
2. 40% start with template then customize
3. Average agent has 6+ steps
4. 65% ask Copilot ≥3 questions while building first agent

**Retention & Growth (Months 3-6):**
1. Workspaces with active agents have 50% lower churn
2. 20% upgrade to higher credit tier after hitting limits
3. "AI Agent Builder" cited as primary reason for choosing Clianta in 50% of signup surveys
4. 25% of new signups mention seeing agents shared by colleagues

### Technical Success

**AI Intelligence:**
1. 80% of Copilot responses rated "helpful"
2. AI correctly interprets 90% of natural language instructions including conditions and loops
3. Smart Suggestions contextually relevant 85% of time
4. Auto-suggests variables with 90% accuracy

**Test Mode Excellence:**
1. Test Mode predictions match live execution 95% of time
2. 0% false positives - Test Mode NEVER executes real actions
3. Returns results in <10 seconds for 80% of test runs

**Stability & Security:**
1. 90% of live agents execute without errors
2. Zero cross-workspace data leaks (validated through automated testing)
3. Circuit breakers prevent runaway agents (>100 executions/day auto-pause)
4. 80% of executions complete in <30 seconds

### Measurable Outcomes Summary

**30 Days:** 150+ agents created, 85% execution success, 70% Copilot usage
**90 Days:** 600+ agents created, 50% paid activation, 15% credit upgrades
**180 Days:** 2,500+ agents created, AI Agent Builder #1 differentiator, 30% churn reduction

## User Journeys

### Journey 1: Sarah - Seed Stage Founder (Solo Sales)

**Context:** CEO, seed-stage B2B SaaS (12 employees, $800K ARR), only person doing sales, needs $2M ARR in 8 months for Series A.

**Breaking Point:**
11 PM Wednesday. Sarah spent 6 hours sending personalized LinkedIn messages and cold emails (40 companies, 40 unique messages). Tomorrow: 5 demos she hasn't prepped for. Needs 100 more outreach messages this week. Exhausted, unsustainable.

**Pain:**
- 25 hours/week manual outreach
- Misses follow-ups (drowning in volume)
- Can't hire BDR yet (burn rate too high)
- Closing deals is her value-add, stuck doing repetitive prospecting

**Discovery:**
Friend: "It's like having a BDR that works 24/7 for your coffee budget."

Signs up, clicks "Big 4 Outbound Campaign" template.

**Copilot Interaction:**
```
Copilot: "Tell me about your ideal customer."
Sarah: "VPs of Sales at B2B SaaS companies, 50-200 employees, selling to enterprises"
Copilot: "Perfect! I'll build an agent that:
1. Finds VPs of Sales at B2B SaaS companies (50-200 employees)
2. Researches them on LinkedIn and finds recent company news
3. Sends personalized LinkedIn invite mentioning findings
4. Waits 3 days, if accepted, sends personalized email
5. If reply, notifies you to take over
Should I build this?"
Sarah: "Yes! But email after 5 days, not 3"
Copilot: "Done! Your agent is ready to test."
```

**Test Mode:**
- Finds contact (John Smith, VP Sales at Acme SaaS)
- Searches, finds Acme raised Series B
- Drafts: "Congrats on the Series B! We help companies like Acme..."
- Shows email preview: "Hi John, saw you're scaling post-Series B..."

Clicks "Run Live." Sets 20 prospects/day.

**Three Weeks Later:**
8 AM routine: Opens Clianta, sees overnight activity:
- Agent found 15 prospects, sent 15 invites, 8 accepted, 8 emails sent
- 3 replied positively → flagged for Sarah
- 30 minutes taking over warm conversations
- Rest of day: demos, closing, strategic work

**Transformation:**
- 25 hours/week saved (now demos and closing)
- 60 qualified conversations vs 20 last month (3x)
- Built 2 more agents: "Follow-Up Cold Leads", "Meeting Prep"
- Feels in control, not drowning

**Emotional Arc:** Exhausted/overwhelmed → Skeptical but hopeful → Relieved/empowered/confident

---

### Journey 2: Marcus - Series A Founder (Small Sales Team)

**Context:** CEO, Series A marketing analytics ($3M ARR, 35 employees, $8M raised), 2 sales reps good at closing but terrible at follow-up.

**Lost Deal:**
Monthly pipeline: $120K deal marked "Lost." Lead came hot, rep sent 1 email + 1 call, lead went dark, no follow-up, 47 days later bought from competitor. 8 similar deals last quarter = $400K missed revenue.

**Pain:**
- Reps inconsistent at follow-up
- No scalable playbook
- Can't afford sales ops team
- More reps won't fix process problem

**Discovery:**
Investor: "It's like building your own sales ops AI team."

Logs in, sees "Deal Stage Progression" template.

**Copilot Customization:**
```
Copilot: "What's your sales cycle length?"
Marcus: "30-60 days first contact to close"
Copilot: "I'll set up:
- Deal in 'Demo Complete' >7 days → send follow-up email
- Deal in 'Proposal Sent' >5 days → send case study + schedule call
- Deal >$50K without activity 3 days → notify you AND rep
- Prospect replies → notify rep immediately
Sound good?"
Marcus: "Perfect. Add: if deal goes cold, move to 'Nurture' and monthly update email"
Copilot: "Added! Ready to test."
```

**First Week:**
Monday activation. By Friday:
- Caught 12 stalled deals
- Sent 12 automated follow-ups
- 4 replied ("Thanks for following up! Let's schedule")
- 2 moved to "Contract Sent" ($180K combined)
- 0 reps complained (happy someone covers follow-ups)

**Two Months Later:**
Built 5 agents: Deal Progression, Inbound Response, Meeting Prep, Lost Deal Re-engagement, Weekly Rep Digest

**Transformation:**
- Win rate 18% → 27% (nothing falls through cracks)
- Sales cycle shortened 12 days
- Reps focus conversations, agents handle repetitive tasks
- Can scale to 5 reps without sales ops hire

**Emotional Arc:** Frustrated → Excited → Confident

---

### Journey 3: Jennifer - Agency Owner (Multi-Client Operations)

**Context:** 15-person marketing agency, 8 active clients, each needs weekly check-ins + monthly reports + proactive upsell.

**Client Crisis:**
7 PM call from biggest client ($12K/month retainer): "Haven't heard in 3 weeks. Still working our account?"

Realizes: 8 clients × 4 weekly check-ins = 32 touchpoints/month. Missing half.

**Pain:**
- Manual client communication doesn't scale
- Clients want personalized updates, not templates
- Account manager costs $60K/year (tight margins)
- Losing clients due to poor communication, not poor work

**Discovery:**
Friend: "I use Clianta to automate client follow-ups. Like a virtual account manager."

**Copilot Build:**
```
Copilot: "Tell me about typical client touchpoints."
Jennifer: "Weekly check-ins with campaign performance. If campaign performs well, proactively suggest budget expansion."
Copilot: "Perfect! I'll build:

Agent 1: Weekly Client Check-In
- Monday 9 AM
- For each client, pull last week's campaign data
- Send personalized email: 'Hi [client], week in review...'
- Include metrics + insights

Agent 2: Upsell Opportunity Detector
- If campaign ROAS > 4x
- Email: 'Campaign crushing it! Scale budget?'
- Create task for follow-up

Ready?"
Jennifer: "Yes! Add: if client hasn't replied in 2 weeks, gentle check-in"
Copilot: "Added!"
```

**First Month:**
- 32 check-ins sent automatically (100% vs 50% before)
- 5 upsell opportunities identified
- 2 clients increased budgets (+$8K/month)
- 0 "haven't heard from you" calls

**Three Months Later:**
5-agent library: Weekly Check-In, Upsell Detector, Client Re-engagement, New Client Onboarding, Monthly Report Generator

**Transformation:**
- Signed 3 new clients (11 total vs 8)
- Retention up (clients feel "heard" and "proactive")
- Upsold $15K/month additional services
- Saved $60K/year (didn't hire account manager)

**Emotional Arc:** Stressed/reactive → Hopeful → Strategic

---

### Journey 4: Alex - First Sales Hire

**Context:** First sales rep, seed-stage startup (Sarah's company from Journey 1), junior, no playbook.

**First Day:**
Sarah: "Hit 100 qualified conversations this month. You'll take over half the outreach."
Alex: "What's the process? What do I say? Who do I target?"
Sarah realizes no time to train (closing deals). Needs Alex productive FAST.

**Solution:**
Sarah remembers 3 working agents in Clianta. Clicks "Big 4 Outbound Campaign" → "Duplicate for Alex" → Done.

**Handoff:**
"AI agent handles outbound. Finds prospects, researches, sends personalized LinkedIn + email, flags warm replies for you. Focus on conversations, not prospecting."

Alex logs in:
- Agent already running (sent 15 invites yesterday)
- 3 replied positively → flagged
- Instructions: "Take over these 3 conversations, book demos"

**First Week:**
Day 1: 3 warm conversations → 1 demo booked
Day 2: 5 warm conversations → 2 demos
Day 3: 4 warm conversations → 2 demos
Week total: 5 demos booked without cold prospecting

**One Month Later:**
- Agent handles top-of-funnel (40 conversations/week)
- Alex takes warm leads (20-30/week)
- Closed first 3 deals ($45K ARR)
- Sarah saved 40 training hours

**Transformation:**
- Productive (not lost/confused)
- Focuses closing, not prospecting grunt work
- Has proven playbook (Sarah's agents)
- Confident hitting quota

**Emotional Arc:** Anxious → Relieved → Confident

---

### Journey Capabilities Summary

**Core Builder:** Template library, AI Copilot, Test Mode, Smart Suggestions, agent duplication
**Execution:** Scheduled triggers, activity dashboard, human handoff, multi-step sequences, conditional logic
**Team:** Multi-user workspaces, agent permissions, notifications
**Management:** Credit tracking, execution limits, performance analytics
**Integrations:** LinkedIn, Gmail, CRM data, Apollo enrichment, web search

## Innovation & Novel Patterns

### 1. AI Copilot as Builder (Not Advisor)

Shifting AI from "suggestion engine" to "construction engine":

- **Traditional AI CRMs**: Insights and recommendations ("You should call this lead")
- **Workflow Tools with AI**: Suggest next steps while building ("Maybe add if/then?")
- **Clianta**: AI Copilot builds entire agent workflow conversationally, user refines

Turns agent building from "learning workflow UI" into "having conversation."

### 2. Dual-Mode Flexibility

- **Copilot-First**: AI builds 80%, user refines 20% (fastest for non-technical)
- **Manual Edit**: Override any Copilot decision (control for power users)
- **From Scratch**: Ignore Copilot, use form interface (manual preference)

Innovation enhances rather than replaces user agency.

### 3. Sales-Specific Intelligence

Clianta's Copilot trained on sales automation patterns:

- "outbound prospecting" → suggests LinkedIn + Email + Wait + Follow-up
- "cold lead re-engagement" → suggests 30-90 day delays and messaging
- "deal follow-up" → suggests stage-based triggers and notifications

Domain specificity vs generic workflow AI.

### 4. Combination Effect

Stack creates 10x easier experience:
- AI Copilot (builds conversationally)
- Smart Suggestions (next-step predictions, auto-complete)
- Test Mode (dry run)
- Natural Language Instructions (plain English)
- Manual Override (edit anything)

### Market Context

**Existing Solutions:**
1. **Generic Workflow Tools** (Zapier, Make, n8n): Drag-and-drop, learning curve, n8n has beta AI (validates direction), not sales-specific
2. **CRM Automation** (HubSpot, Salesforce): Built-in, no AI assist, limited external integrations
3. **AI-Powered CRMs** (HubSpot AI, Einstein): Suggestions/insights, don't build automations, passive advice

**Clianta Position:** AI Copilot builds (sales-specific), built into CRM, non-technical focus

**Innovation Risk:** Competitors could add AI. Defensibility: sales-specific intelligence + execution excellence + speed to market.

### Validation Approach

1. **Copilot Usage** (70% interact while building first agent) - proves helpful
2. **Suggestion Acceptance** (60% accepted) - proves smart
3. **Time-to-First-Agent** (<15 min avg) - proves faster (2-3x vs competitors)
4. **Manual Override Rate** (40% edit before Live) - proves flexibility (did 80% of work)
5. **First-Run Success** (85% pass Test Mode, execute successfully Live) - proves it works
6. **User Feedback** - qualitative validation

### Risk Mitigation

**Risk 1: Copilot Builds Wrong Thing**
- Mitigation: Test Mode preview, user edit/override, Smart Suggestions validate, fallback to manual

**Risk 2: Copilot Not Smart Enough**
- Mitigation: Track acceptance in beta, sales-specific training, workspace context learning
- Fallback: If acceptance <40%, ship without Copilot (nice-to-have not core)

**Risk 3: Users Don't Engage**
- Mitigation: Onboarding highlights Copilot, template wizard uses it, tooltips prompt usage
- Fallback: Manual interface fully functional

**Risk 4: Competitors Copy**
- Mitigation: Sales intelligence defensible (domain knowledge), execution excellence, CRM integration, speed to market

**Risk 5: LLM Costs Too High**
- Mitigation: AI credits (users pay), cache responses, smaller models for simple ops
- Fallback: "AI-Lite" manual-only tier

## SaaS B2B Requirements

### Multi-Tenancy Model

**Workspace Isolation:**
- Complete data isolation (agents, logs, integrations, AI credits)
- Agent executions workspace-scoped
- Integration credentials stored per workspace
- AI credit pools tracked separately

**Workspace Structure:**
- Each workspace = one company/team
- Contains: users, agents, integrations, execution history, credit balance
- Zero data leakage (critical requirement)

### Permission Model (RBAC)

| Role | Agent Creation | Agent Editing | Agent Deletion | Trigger Agents | View Logs | Manage Integrations | Manage Users |
|------|---------------|---------------|----------------|----------------|-----------|---------------------|--------------|
| **Owner** | ✅ All | ✅ All | ✅ All | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ All | ✅ All | ✅ All | ✅ | ✅ | ✅ | ❌ |
| **Member** | ❌ | ❌ | ❌ | ✅ Manual only | ✅ View only | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ✅ View only | ❌ | ❌ |

**Agent-Level Permissions:**
- Edit permissions (Owner/Admin only or specific users)
- Integration access scope (limit which integrations)
- Approval workflow (require approval for sensitive actions)

**Permission Inheritance:**
- Workspace-level permissions cascade to agents
- Workspace loses Gmail access → all agents using Gmail stop
- Clear error messages for permission issues

### Subscription Tiers & AI Credits

**Free Tier:** 1 agent, 50 credits/month, 3 integrations (Slack/Gmail/Calendar), view-only advanced features, unlimited Test Mode

**Paid Tier:** Unlimited agents, 500-1000 credits/month, full Copilot, all integrations, Smart Suggestions, priority support

**Enterprise Tier:** Everything Paid + 5000+ credits/month, custom integrations, dedicated support, SLA, 1-year audit logs

**AI Credits System:**
- Copilot conversation: 1 credit/message
- Agent execution with LLM: 2-5 credits (complexity-based)
- Smart Suggestions: 0.5 credits/suggestion
- Real-time balance display
- Warning at 80%, pause at 100%, 10% grace period (48 hours)

### Integration Requirements

**Priority Integrations (MVP):**
1. Slack (messages, channels, updates)
2. LinkedIn (connection requests, messaging, profile updates per API terms)
3. Gmail (send emails, read inbox, search)
4. Google Calendar (events, availability, invites)
5. Google Sheets (read/write, create sheets, update cells)
6. Apollo.io (contact enrichment, lists)

**Architecture:**
- OAuth per integration
- Auto token refresh, expiration notifications
- Rate limits: Slack 1 req/sec/workspace, LinkedIn 100 req/day/user, Gmail 250 units/sec/user, Calendar 1M queries/day, Sheets 100 req/100s/user, Apollo per user plan

**Safety:**
- Per-agent rate limits
- Per-workspace aggregate limits
- Circuit breakers (auto-pause at limits, resume on quota refresh)
- Clear error messages

### Compliance & Data Governance

**Retention:**
- Agent execution logs: 30 days (standard), 365 days (enterprise)
- Failed execution details: 90 days
- Agent instructions: while agent exists
- Integration credentials: encrypted, rotated on request
- Export capability: anytime (JSON/CSV)

**Privacy & Security:**
- OAuth-only (no password storage)
- Workspace isolation (agents can't access other workspaces)
- Employee access: requires user consent for support
- Audit trail: all admin actions logged

**Third-Party Compliance:**
- LinkedIn: API terms, no scraping, rate limits, user consent
- Google Workspace: API Services User Data Policy
- Slack: workspace settings, user permissions
- Apollo.io: authorized business use only

**GDPR (EU customers):**
- Right to access (export all)
- Right to deletion (agents + execution history)
- Right to portability (JSON export)
- Consent management (clear disclosure)
- Data Processing Agreement (enterprise)

**Security:**
- Prompt injection defense (system prompt isolation, tool whitelisting)
- Runaway protection (max 100 executions/agent/day)
- Approval workflows (sensitive actions)
- Test Mode (dry-run validation)

### Implementation Considerations

**Scalability:** Multi-tenant DB with workspace sharding, queue-based execution (BullMQ), integration credential caching (Redis)

**Monitoring:** Real-time execution dashboards, integration health monitoring, AI credit analytics, alert system (failed agents, quota exhaustion)

**Migration:** Existing users auto-assigned Free tier, one-click upgrade, downgrade marks extra agents inactive (not deleted)

## Product Scope & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience-Driven MVP with Complete Functionality

Core value = agent building system automating sales workflows
AI Copilot = competitive differentiator making building 10x easier

**Strategic Rationale:**
- Agent builder must work reliably (execution excellence non-negotiable)
- AI Copilot must demonstrate innovation advantage
- All safety features day 1 (circuit breakers, rate limits, workspace isolation)
- Business model (AI credits) operational at launch
- Team capacity validated for all phases

### Phase 1: MVP - Intelligent Agent Builder (6-8 Weeks)

**Supported Journeys:**
- Sarah (seed founder): solo sales automation, 25 hrs/week saved
- Marcus (Series A): deal follow-up automation
- Jennifer (agency): multi-client communication automation
- Alex (first hire): onboarding with proven playbooks

**Agent Builder Core:**

Structured form: Goal (required), Triggers (required), Instructions with AI Copilot + Smart Suggestions (required), Restrictions (optional), Memory (optional), Manually Approve Actions (optional)

Natural language parsing (Gemini 2.5 Pro), Test Mode/dry run, status management (Draft → Live → Paused)

**AI Copilot (Innovation):**

In-builder chat assistant:
```
User: "How do I send email only to CEOs?"
Copilot: "Add condition before Send Email:
If contact.title contains 'CEO' or 'Chief Executive':
  Send Email using [template]
Want me to add this?"
```

Capabilities: Generate full instructions, answer questions, suggest improvements, debug errors, contextual help (knows workspace data)

**Smart Suggestions:**

- Auto-complete: "Send em..." → "Send Email using template..."
- Next-step predictions: After "Send LinkedIn invitation" → "Wait X days, check if accepted"
- Action recognition: "email them" → 📧 Send Email pill
- Variable suggestions: @contact.firstName, @deal.value based on trigger

**Test Mode:**

Right panel preview, dry run (no real actions), step-by-step breakdown, select specific contact/deal to test, shows execution time estimate + AI credit cost

Example:
```
✅ Step 1: Found contact (John Doe, CEO at Acme)
✅ Step 2: Web Search returned 3 articles about Acme
✅ Step 3: Would send LinkedIn invitation (DRY RUN)
✅ Step 4: Would wait 5 days (simulated)
⚠️ Step 5: Email template missing @company.industry variable
   Suggestion: Add fallback or check if company exists first
```

**Actions (8 Core):**
1. 📧 Send Email (Gmail, template-based, AI personalization)
2. 💼 Send LinkedIn Invitation (connection request, custom note)
3. 🔍 Web Search (research company/contact news)
4. 📝 Create Task (assign to rep, due date)
5. 🏷️ Add/Remove Tag (contact segmentation)
6. 📊 Update Field (modify contact/deal custom fields)
7. 🔄 Enrich Contact (Apollo.io data enrichment)
8. ⏰ Wait (pause X days/hours)

**Triggers (3 Core):**
1. Manual Run
2. Scheduled (daily, weekly, monthly)
3. Contact Created

**Templates (10 Pre-Built):**
1. Big 4 Outbound Campaign (VP+ outreach LinkedIn + Email)
2. Enterprise Lead Nurture (multi-touch for large deals)
3. Cold Lead Re-engagement (revive after 30+ days)
4. Inbound Lead Response (instant personalized follow-up)
5. Deal Stage Progression (auto-move based on activity)
6. LinkedIn Connection Workflow (invite → wait → email if accepted)
7. High-Value Deal Escalation (alert for deals >$50K)
8. Meeting Prep Automation (research before meetings)
9. Lost Deal Follow-Up (re-engage 90 days after loss)
10. Weekly Rep Digest (summary of stale contacts)

**Integrations (MVP):**
Gmail, Apollo.io, Slack, LinkedIn, Internal CRM (contacts, deals, tasks, tags, fields)

**Safety & Governance:**
AI credit tracking/enforcement, circuit breakers (max 100 executions/day/agent), email limits (100/day/agent), workspace isolation (zero leakage), rate limiting (10 executions/min/agent), prompt injection defense

**Business Model:**
3 tiers operational (Free: 1 agent/50 credits, Paid: unlimited agents/500-1000 credits, Enterprise: 5000+ credits)

### Phase 2: Enhanced Intelligence (Weeks 9-12)

**Advanced Features:**
- Approval workflows with designated approvers
- Visual conditional logic builder (alternative to text)
- Agent memory with variable manager
- Sequential agent chaining (Agent A → Agent B)

**Additional Integrations:**
Google Calendar, Google Sheets, enhanced LinkedIn (track acceptances)

**Enhanced Analytics:**
Success/failure rates per agent, cost per execution, performance optimization suggestions, A/B testing

**Additional Triggers:**
Deal Stage Updated, Form Submitted, External Contact Search

### Phase 3: Marketplace & Community (Months 4-6)

**Agent Marketplace:**
Public library (browse, install, rate), community templates, premium agents (monetization)

**Advanced Orchestration:**
Multi-agent coordination, advanced scheduling (complex time rules), webhook triggers, API for programmatic creation

**Enterprise Features:**
Enhanced RBAC, advanced audit logging (1 year), multi-workspace sharing, custom integration builder

### Risk Mitigation Strategy

**Technical Risks:**

1. **LLM parsing accuracy <90%**
   - Mitigation: Extensive testing with sales scenarios, continuous prompt refinement, Test Mode catches errors
   - Fallback: Manual instruction editing always available

2. **Integration rate limits causing failures**
   - Mitigation: Circuit breakers auto-pause at limits, per-agent and per-workspace limiting, BullMQ handles backpressure

3. **Workspace isolation breach**
   - Mitigation: Automated testing in CI/CD, database-level workspace scoping, security audits pre-launch

**Market Risks:**

1. **AI Copilot not helpful (low engagement)**
   - Validation: Track 70% usage target in beta
   - Mitigation: Sales-specific training, workspace context awareness
   - Fallback: Manual builder fully functional

2. **Competitors add AI (n8n, HubSpot)**
   - Mitigation: Sales-specific intelligence (defensible domain expertise), execution excellence, CRM integration, speed to market

3. **Users don't trust AI for critical workflows**
   - Validation: 85% first-run success proves AI builds correctly
   - Mitigation: Test Mode shows exact preview, manual override for all decisions

**Resource Risks:**

1. **Scope too ambitious**
   - Mitigation: Team capacity validated for all phases, phased approach allows iterative delivery
   - Contingency: Core builder (without Copilot) is fallback MVP

2. **LLM costs exceed revenue**
   - Mitigation: AI credits priced with margin, caching for common responses, smaller models for simple ops
   - Fallback: "AI-Lite" manual-only tier

## Functional Requirements

### Agent Creation & Configuration

- FR1: Users can create agents by defining goal, triggers, instructions, restrictions, memory, approval settings
- FR2: Users can write agent instructions in natural language
- FR3: Users can specify multiple trigger types (manual, scheduled, event-based)
- FR4: Users can define agent restrictions to prevent unwanted behaviors
- FR5: Users can configure agent memory to track state between executions
- FR6: Users can set approval requirements for specific actions
- FR7: Users can edit existing agents and update configuration
- FR8: Users can delete agents from workspace
- FR9: Users can duplicate existing agents to create variations
- FR10: Users can set agent status (Draft, Live, Paused)
- FR11: Users can pause and resume live agents

### AI Copilot & Smart Assistance

- FR12: Users can interact with AI Copilot via in-builder chat
- FR13: AI Copilot can generate complete agent instructions from plain English descriptions
- FR14: AI Copilot can answer questions about automation tasks
- FR15: AI Copilot can suggest improvements to agent instructions
- FR16: AI Copilot can analyze failed executions and explain errors
- FR17: AI Copilot can access workspace context (templates, tags, custom fields)
- FR18: Users can see auto-complete suggestions while typing
- FR19: Users can see next-step predictions based on current logic
- FR20: Users can see variable suggestions based on trigger type and available data
- FR21: System can convert natural language descriptions into structured action pills
- FR22: Users can accept or reject AI Copilot suggestions

### Agent Execution & Orchestration

- FR23: System can parse natural language instructions and execute corresponding actions
- FR24: System can execute agents based on manual triggers
- FR25: System can execute agents based on scheduled triggers (daily, weekly, monthly)
- FR26: System can execute agents based on CRM events (contact created, deal updated, form submitted)
- FR27: System can execute sequential multi-step workflows
- FR28: System can execute conditional logic (if/then in plain English)
- FR29: System can pause execution for specified time periods
- FR30: System can hand off warm leads to human users
- FR31: System can execute actions: Send Email, Send LinkedIn Invitation, Web Search, Create Task, Add/Remove Tag, Update Field, Enrich Contact, Wait
- FR32: Users can manually trigger agent execution on demand
- FR33: System can chain multiple agents together (Agent A → Agent B)
- FR34: System can track agent execution history and status

### Testing & Validation

- FR35: Users can run agents in Test Mode (dry run) before going live
- FR36: System can simulate execution without performing real actions
- FR37: Users can select specific contacts/deals to test against
- FR38: System can display step-by-step preview of actions
- FR39: System can show estimated execution time and AI credit cost for tests
- FR40: System can validate instructions and warn about potential errors
- FR41: System can return test results within 10 seconds for 80% of runs

### Integration Management

- FR42: Users can authenticate third-party integrations via OAuth
- FR43: System can manage OAuth token refresh automatically
- FR44: System can notify users when credentials expire
- FR45: Users can connect Gmail for emails and inbox
- FR46: Users can connect LinkedIn for invitations and messages
- FR47: Users can connect Apollo.io for contact enrichment
- FR48: Users can connect Slack for messages and notifications
- FR49: Users can connect Google Calendar for availability and events
- FR50: Users can connect Google Sheets for data import/export
- FR51: System can access internal CRM data (contacts, deals, tasks, tags, custom fields)
- FR52: System can enforce rate limits per integration (Slack 1 req/sec, LinkedIn 100 req/day, etc.)
- FR53: System can display integration health status and quota usage

### Workspace, Users & Permissions

- FR54: System can isolate data between workspaces (zero cross-workspace access)
- FR55: Workspace Owners can create, edit, delete any agent in workspace
- FR56: Workspace Admins can create, edit, delete any agent in workspace
- FR57: Workspace Members can view agents and trigger manual runs only
- FR58: Workspace Viewers can view agents and logs in read-only mode
- FR59: Workspace Owners can manage users and assign roles
- FR60: Agent creators can set edit permissions on individual agents
- FR61: Agent creators can limit which integrations specific agents can access
- FR62: System can cascade workspace-level integration permissions to agents
- FR63: System can display clear error messages for permission issues

### Templates & Knowledge Base

- FR64: Users can browse pre-built agent templates
- FR65: Users can install templates and customize for their needs
- FR66: System can provide 10 pre-built templates for common sales workflows
- FR67: Users can save their own agents as templates for reuse
- FR68: Users can share templates with team members in workspace
- FR69: Users can browse public agent marketplace (Phase 3)
- FR70: Users can publish agents to marketplace (Phase 3)
- FR71: Users can rate and review marketplace agents (Phase 3)

### Safety, Governance & Monitoring

- FR72: System can track AI credit consumption per execution
- FR73: System can display real-time AI credit balance
- FR74: System can warn users at 80% credit usage
- FR75: System can pause agents when credit quota exhausted
- FR76: System can enforce circuit breakers (max 100 executions/day/agent)
- FR77: System can enforce email limits (max 100 emails/day/agent)
- FR78: System can enforce rate limits (max 10 executions/minute/agent)
- FR79: System can defend against prompt injection via system prompt isolation
- FR80: System can whitelist allowed tools/actions for security
- FR81: System can log all executions with timestamp, user, outcome
- FR82: Users can view execution logs for debugging
- FR83: Users can export agent data (configurations, logs) in JSON/CSV
- FR84: System can retain execution logs per tier (30 days standard, 365 days enterprise)
- FR85: System can audit all admin actions (who created/edited/deleted agents, when)
- FR86: System can auto-pause agents hitting integration rate limits
- FR87: System can display agent execution dashboards with success/failure rates
- FR88: System can alert users when agents fail or quotas exhausted
- FR89: System can enforce workspace isolation at database level

## Non-Functional Requirements

### Performance

**Agent Execution:**
- NFR1: 80% of executions complete within 30 seconds
- NFR2: Test Mode returns results within 10 seconds for 80% of runs
- NFR3: Execution queue processes 100+ concurrent jobs without degradation

**AI Copilot Responsiveness:**
- NFR4: Copilot responds within 3 seconds for 90% of interactions
- NFR5: Smart Suggestions appear within 500ms of typing pause
- NFR6: Auto-complete suggestions rendered within 200ms

**UI Performance:**
- NFR7: Agent builder interface loads within 2 seconds on standard broadband
- NFR8: Dashboard with 50+ agents renders within 3 seconds
- NFR9: Execution log queries return results within 1 second for last 30 days

### Security

**Data Protection:**
- NFR10: All data encrypted at rest using AES-256
- NFR11: All data encrypted in transit using TLS 1.3
- NFR12: Integration credentials stored using industry-standard secrets management
- NFR13: Database queries enforce workspace scoping at query level

**Authentication & Authorization:**
- NFR14: OAuth token refresh handled automatically with 99.9% success rate
- NFR15: RBAC enforced on all API endpoints (Owner, Admin, Member, Viewer)
- NFR16: Session tokens expire after 7 days inactivity
- NFR17: Failed login attempts limited to 5 per 15 minutes

**Prompt Injection Defense:**
- NFR18: System prompts isolated from user inputs (no user input modifies system behavior)
- NFR19: Tool whitelisting enforced (agents execute approved actions only)
- NFR20: Instruction parsing validates against known attack patterns

**Workspace Isolation:**
- NFR21: Zero cross-workspace data leaks validated via automated testing in CI/CD
- NFR22: All database queries scoped to workspace ID at ORM level
- NFR23: Integration credentials accessible only to owning workspace

### Scalability

**Multi-Tenancy:**
- NFR24: System supports 1,000+ concurrent workspaces without performance degradation
- NFR25: Database sharding strategy supports 10x workspace growth
- NFR26: Agent execution queue scales horizontally (add workers as needed)

**Concurrent Execution:**
- NFR27: System handles 500+ concurrent agent executions across all workspaces
- NFR28: BullMQ queue processes 100+ jobs per second at peak load
- NFR29: Redis caching reduces database load by 60% for frequently accessed data

**Growth Handling:**
- NFR30: System supports 10x user growth with <10% performance degradation
- NFR31: Storage architecture supports 1 million+ agent executions per day

### Reliability

**Uptime & Availability:**
- NFR32: System maintains 99.5% uptime (excluding planned maintenance)
- NFR33: Planned maintenance windows limited to 4 hours per month
- NFR34: Database backups performed daily with 30-day retention

**Execution Success:**
- NFR35: 90% of live agents execute without errors
- NFR36: Test Mode predictions match live execution results 95% of time
- NFR37: Circuit breakers auto-pause agents after 100 failed executions per day

**Error Handling:**
- NFR38: All errors logged with timestamp, workspace, user, stack trace
- NFR39: User-facing error messages provide actionable guidance (not technical jargon)
- NFR40: Critical errors (workspace isolation breach, credit overflow) trigger immediate alerts

**Data Integrity:**
- NFR41: Agent execution logs retained per tier (30 days standard, 365 days enterprise)
- NFR42: Audit trail captures all admin actions with user and timestamp
- NFR43: Data export completes within 30 seconds for 90% of requests

### Integration Quality

**OAuth & Authentication:**
- NFR44: OAuth token refresh succeeds automatically 99.9% of time
- NFR45: Integration credential expiration warnings sent 7 days before expiry
- NFR46: Failed OAuth flows provide clear re-authentication instructions

**Rate Limit Compliance:**
- NFR47: System enforces integration-specific rate limits (Slack 1 req/sec, LinkedIn 100 req/day, Gmail 250 units/sec, etc.)
- NFR48: Circuit breakers auto-pause agents hitting rate limits and resume when quota refreshes
- NFR49: Per-agent rate limiting prevents single agent from consuming workspace quota

**Integration Health:**
- NFR50: Integration health monitoring detects failures within 60 seconds
- NFR51: Failed integration requests retry with exponential backoff (3 attempts max)
- NFR52: Integration quota usage displayed in real-time with <5 second lag

**API Reliability:**
- NFR53: LLM instruction parsing achieves >90% accuracy on sales automation scenarios
- NFR54: AI Copilot instruction generation produces executable workflows 85% of time without edits
- NFR55: Web search action returns results within 5 seconds for 90% of queries
