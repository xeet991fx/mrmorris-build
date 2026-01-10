# Clianta - Multi-Agent AI System

## Overview

Clianta's AI system is powered by **Google Gemini 2.5 Pro** and the **DeepAgents framework**, featuring **23 specialized worker agents** that can work independently or coordinate together to handle complex CRM tasks autonomously.

**Location**: `backend/src/agents/`

## 1. Architecture Overview

### System Flow

```
User Request
     ↓
Supervisor V2 (Entry Point)
     ↓
Complexity Analyzer ──┐
     ↓                │
┌────┴─────┬──────────┤
│  Simple  │ Complex  │
│   Task   │   Task   │
└────┬─────┴────┬─────┘
     │          │
Single Agent  Execution Planner
     │          ↓
     │    Multi-Agent Coordinator
     │          ↓
     │    2-4 Agents (Parallel/Sequential)
     │          │
     └──────────┤
                ↓
        Result Aggregation
                ↓
           Verifier
                ↓
           User Response
```

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **Supervisor V2** | `supervisorV2.ts` | Entry point, routes to single or multi-agent execution |
| **Complexity Analyzer** | `complexityAnalyzer.ts` | Determines if task requires multiple agents |
| **Execution Planner** | `executionPlanner.ts` | Creates execution plan with agent dependencies |
| **Coordinator** | `coordinator.ts` | Executes multiple agents and aggregates results |
| **State Manager** | `state.ts` | Manages shared state between agents |
| **Model Factory** | `modelFactory.ts` | Creates Gemini model instances with tools |

---

## 2. Specialized Worker Agents (23 Total)

### CRM Core Operations Agents

#### **contactAgent** (`workers/contactAgent.ts`)
- **Purpose**: Manage contacts (create, update, search, analyze)
- **Tools**: Contact CRUD, search, enrichment, deduplication
- **Use Cases**:
  - "Add John Doe from Acme Corp as a contact"
  - "Find all contacts in the SaaS industry"
  - "Update contact phone number"

#### **companyAgent** (`workers/companyAgent.ts`)
- **Purpose**: Manage companies/accounts
- **Tools**: Company CRUD, search, industry analysis
- **Use Cases**:
  - "Create a company profile for Acme Corp"
  - "Find all technology companies in our database"
  - "Get company insights and competitive positioning"

#### **dealAgent** (`workers/dealAgent.ts`)
- **Purpose**: Manage sales opportunities
- **Tools**: Opportunity CRUD, stage management, forecasting
- **Use Cases**:
  - "Move the Acme deal to Proposal stage"
  - "What deals are closing this quarter?"
  - "Analyze deal health for all open opportunities"

#### **pipelineAgent** (`workers/pipelineAgent.ts`)
- **Purpose**: Manage sales pipelines and stages
- **Tools**: Pipeline configuration, stage analytics, conversion rates
- **Use Cases**:
  - "Create a new SaaS sales pipeline"
  - "Show me conversion rates by stage"
  - "Optimize our pipeline stages"

---

### Sales Engagement & Campaign Agents

#### **campaignAgent** (`workers/campaignAgent.ts`)
- **Purpose**: Create and manage email campaigns
- **Tools**: Campaign builder, audience targeting, analytics
- **Use Cases**:
  - "Create a product launch campaign for SaaS contacts"
  - "Generate campaign performance report"
  - "Optimize campaign send times"

#### **emailAgent** (`workers/emailAgent.ts`)
- **Purpose**: Email operations and template management
- **Tools**: Email templates, sending, tracking
- **Use Cases**:
  - "Draft a follow-up email for the Acme meeting"
  - "Create an email template for cold outreach"
  - "Track email engagement for this campaign"

#### **sequenceAgent** (`workers/sequenceAgent.ts`)
- **Purpose**: Manage multi-step email sequences
- **Tools**: Sequence builder, enrollment, performance tracking
- **Use Cases**:
  - "Create a 5-step nurture sequence for new leads"
  - "Enroll contacts who downloaded the ebook"
  - "Pause sequence for contacts who replied"

#### **landingPageAgent** (`workers/landingPageAgent.ts`)
- **Purpose**: Create and optimize landing pages
- **Tools**: Page builder, A/B testing, conversion tracking
- **Use Cases**:
  - "Generate a landing page for our new feature"
  - "Analyze landing page conversion rates"
  - "Create a lead magnet page"

---

### Data & Intelligence Agents

#### **dataEntryAgent** (`workers/dataEntryAgent.ts`)
- **Purpose**: Parse and structure unstructured data
- **Tools**: Text extraction, entity recognition, data validation
- **Use Cases**:
  - "Extract contacts from this email signature"
  - "Parse business card information"
  - "Structure meeting notes into actionable items"

#### **leadScoreAgent** (`workers/leadScoreAgent.ts`)
- **Purpose**: Calculate and manage lead scores
- **Tools**: Scoring algorithms, grade assignment, factor analysis
- **Use Cases**:
  - "Recalculate lead scores for all contacts"
  - "Why is this contact scored as a B?"
  - "Identify A-grade leads in the database"

#### **competitorAgent** (`workers/competitorAgent.ts`)
- **Purpose**: Competitive intelligence and analysis
- **Tools**: Competitor tracking, battlecard generation, SWOT analysis
- **Use Cases**:
  - "Create a battlecard for competing against Salesforce"
  - "What are our competitive differentiators?"
  - "Analyze competitor pricing strategies"

#### **hygieneAgent** (`workers/hygieneAgent.ts`)
- **Purpose**: Data quality and deduplication
- **Tools**: Duplicate detection, data cleaning, validation
- **Use Cases**:
  - "Find and merge duplicate contacts"
  - "Clean up invalid email addresses"
  - "Audit data quality across the workspace"

---

### Automation & Workflow Agents

#### **workflowAgent** (`workers/workflowAgent.ts`)
- **Purpose**: Create and manage workflow automation
- **Tools**: Workflow builder, trigger configuration, action setup
- **Use Cases**:
  - "Create a workflow to assign new leads to sales reps"
  - "Build automation for lead nurturing"
  - "Set up deal stage notifications"

#### **taskAgent** (`workers/taskAgent.ts`)
- **Purpose**: Task and reminder management
- **Tools**: Task CRUD, assignment, deadline tracking
- **Use Cases**:
  - "Create a follow-up task for tomorrow"
  - "Assign tasks to team members"
  - "Show overdue tasks for my team"

#### **schedulingAgent** (`workers/schedulingAgent.ts`)
- **Purpose**: Meeting scheduling and coordination
- **Tools**: Calendar integration, availability checking, booking
- **Use Cases**:
  - "Schedule a meeting with Acme Corp next week"
  - "Find available time slots for a demo"
  - "Send meeting invite to attendees"

---

### Analysis & Reporting Agents

#### **briefingAgent** (`workers/briefingAgent.ts`)
- **Purpose**: Generate comprehensive meeting briefings
- **Tools**: Multi-source data aggregation, insights generation
- **Use Cases**:
  - "Prepare briefing for my call with Acme Corp"
  - "Summarize all interactions with this contact"
  - "What should I know before this meeting?"

#### **forecastAgent** (`workers/forecastAgent.ts`)
- **Purpose**: Revenue forecasting and pipeline analysis
- **Tools**: Statistical modeling, trend analysis, predictions
- **Use Cases**:
  - "Forecast revenue for Q4"
  - "Predict close likelihood for active deals"
  - "Analyze pipeline health trends"

#### **reportsAgent** (`workers/reportsAgent.ts`)
- **Purpose**: Generate custom reports and dashboards
- **Tools**: Report builder, data visualization, export
- **Use Cases**:
  - "Create a sales performance report for this month"
  - "Generate team activity summary"
  - "Build a custom pipeline report"

---

### Specialized Function Agents

#### **proposalAgent** (`workers/proposalAgent.ts`)
- **Purpose**: Generate sales proposals and quotes
- **Tools**: Proposal templates, pricing calculation, document generation
- **Use Cases**:
  - "Create a proposal for the Acme opportunity"
  - "Generate pricing quote based on requirements"
  - "Draft SOW for this deal"

#### **transcriptionAgent** (`workers/transcriptionAgent.ts`)
- **Purpose**: Transcribe and analyze call recordings
- **Tools**: Speech-to-text, sentiment analysis, action item extraction
- **Use Cases**:
  - "Transcribe this sales call"
  - "Extract action items from meeting recording"
  - "Analyze sentiment in customer calls"

#### **ticketAgent** (`workers/ticketAgent.ts`)
- **Purpose**: Customer support ticket management
- **Tools**: Ticket CRUD, priority assignment, resolution tracking
- **Use Cases**:
  - "Create a support ticket for this issue"
  - "Escalate high-priority tickets"
  - "Analyze ticket resolution times"

---

### Fallback Agents

#### **dynamicAgent** (`workers/dynamicAgent.ts`)
- **Purpose**: Handle edge cases and custom requests
- **Tools**: Dynamic tool selection, flexible execution
- **Use Cases**: Requests that don't fit specialized agents

#### **generalAgent** (`workers/generalAgent.ts`)
- **Purpose**: Generic assistant for simple queries
- **Tools**: General knowledge, workspace context
- **Use Cases**: "What is Clianta?", "How do I create a contact?"

---

## 3. Multi-Agent Coordination

### Complexity Analysis

The **Complexity Analyzer** evaluates requests based on:

1. **Pattern Matching**: Keywords indicating multi-step tasks
   - "prepare for meeting" → Meeting prep scenario
   - "analyze and recommend" → Analysis + recommendation
   - "create campaign for" → Campaign creation with targeting

2. **AI Analysis**: Uses Gemini to determine:
   - Number of steps required
   - Data sources needed (contacts, deals, companies)
   - Agent specializations required

3. **Confidence Scoring**: Returns 0-1 confidence score
   - < 0.3: Single agent sufficient
   - 0.3-0.7: Medium complexity (2-3 agents)
   - > 0.7: High complexity (3-4 agents)

### Execution Modes

#### **Parallel Execution**
Agents work simultaneously, results aggregated at end.

**Example**: Meeting Preparation
```
┌─ contactAgent ──┐
├─ companyAgent ──┼─→ briefingAgent → Final Briefing
├─ dealAgent ─────┤
└─ competitorAgent┘
```

**Use Cases**:
- Independent data gathering
- No dependencies between agents
- Time-critical tasks

#### **Sequential Execution**
Agents work in order, passing results to next agent.

**Example**: Lead Qualification
```
dataEntryAgent → leadScoreAgent → workflowAgent → taskAgent
```

**Use Cases**:
- Output of one agent required by next
- Progressive refinement
- Multi-stage processing

### Predefined Execution Plans

Located in `executionPlanner.ts`:

#### **meeting_prep**
Agents: contactAgent, companyAgent, dealAgent, briefingAgent
Mode: Parallel → Aggregation
Output: Comprehensive meeting brief

#### **campaign_creation**
Agents: contactAgent (audience), campaignAgent, emailAgent
Mode: Sequential
Output: Configured campaign ready to send

#### **deal_analysis**
Agents: dealAgent, forecastAgent, competitorAgent
Mode: Parallel → Analysis
Output: Deal health report with recommendations

#### **data_enrichment**
Agents: dataEntryAgent, leadScoreAgent, hygieneAgent
Mode: Sequential
Output: Clean, enriched, scored data

---

## 4. Google Gemini Integration

### Model Configuration

```typescript
// backend/src/agents/modelFactory.ts
const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  .getGenerativeModel({
    model: 'gemini-2.5-pro-latest',
    generationConfig: {
      temperature: 0.7,        // Balanced creativity
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,   // Extended output
    },
    safetySettings: [
      // Production safety filters
    ]
  });
```

### Tool Calling Architecture

Each agent has access to specialized tools:

```typescript
// Example: contactAgent tools
const contactTools = [
  {
    name: 'searchContacts',
    description: 'Search for contacts by name, email, company, or tags',
    parameters: {
      query: 'string',
      limit: 'number'
    }
  },
  {
    name: 'createContact',
    description: 'Create a new contact',
    parameters: {
      name: 'string',
      email: 'string',
      company: 'string',
      phone: 'string?'
    }
  },
  // ... more tools
];
```

### Function Execution

1. Agent receives user request
2. Gemini model decides which tool to call
3. Tool executes against database/API
4. Result returned to model
5. Model synthesizes natural language response

---

## 5. Agent Communication & State

### Shared State Manager

```typescript
// backend/src/agents/state.ts
interface AgentState {
  sessionId: string;
  workspaceId: string;
  userId: string;
  sharedData: {
    contacts?: Contact[];
    companies?: Company[];
    deals?: Opportunity[];
    [key: string]: any;
  };
  agentResults: Map<string, any>;
}
```

### State Sharing Example

```typescript
// Contact agent stores results
state.sharedData.contacts = foundContacts;
state.agentResults.set('contactAgent', { count: 5, contacts: [...] });

// Company agent accesses contact data
const contacts = state.sharedData.contacts;
const companies = contacts.map(c => c.company).filter(unique);
```

### Result Aggregation

After all agents complete, the **Coordinator** uses Gemini to synthesize results:

```typescript
const aggregationPrompt = `
You are aggregating results from multiple AI agents.

Contact Agent Results: ${contactAgentOutput}
Company Agent Results: ${companyAgentOutput}
Deal Agent Results: ${dealAgentOutput}

Synthesize these into a cohesive briefing for the user's meeting preparation.
`;

const finalResponse = await gemini.generateContent(aggregationPrompt);
```

---

## 6. Error Handling & Fallbacks

### Agent-Level Errors

```typescript
try {
  const result = await agent.execute(request, state);
  return result;
} catch (error) {
  console.error(`Agent ${agentName} failed:`, error);

  // Fallback to generalAgent
  return await generalAgent.execute(request, state);
}
```

### Coordination-Level Errors

```typescript
// If multi-agent coordination fails, fall back to single agent
if (multiAgentError) {
  console.warn('Multi-agent coordination failed, using single agent');
  return await invokeAgent(message, workspaceId, userId, sessionId);
}
```

### Timeout Handling

```typescript
const AGENT_TIMEOUT = 30000; // 30 seconds

const result = await Promise.race([
  agent.execute(request, state),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Agent timeout')), AGENT_TIMEOUT)
  )
]);
```

---

## 7. Performance Optimization

### Token Usage

- **Input Optimization**: Summarize large datasets before passing to agents
- **Output Limitation**: Set maxOutputTokens per use case (briefing: 8192, simple query: 1024)
- **Caching**: Use AI Memory for frequently accessed context

### Latency Reduction

- **Parallel Execution**: Run independent agents simultaneously
- **Tool Optimization**: Index-backed database queries
- **Response Streaming**: Stream agent responses for perceived performance (future)

### Cost Management

- **Model Selection**: Use Gemini 2.5 Pro (cost-effective) vs Opus 4.5 (accuracy)
- **Tool Minimization**: Provide only relevant tools to each agent
- **Result Caching**: Cache repeated queries in AI Memory

---

## 8. Agent Development Guide

### Creating a New Agent

1. **Create Worker File**: `backend/src/agents/workers/myAgent.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentState } from '../state';

export async function myAgent(
  request: string,
  state: AgentState
): Promise<string> {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    .getGenerativeModel({ model: 'gemini-2.5-pro-latest' });

  const tools = [
    {
      name: 'myTool',
      description: 'What this tool does',
      parameters: { /* ... */ }
    }
  ];

  const prompt = `You are a specialized agent for [purpose].

Available tools: ${JSON.stringify(tools)}

User request: ${request}

Workspace ID: ${state.workspaceId}
`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools
  });

  return result.response.text();
}
```

2. **Register in Supervisor**: Add to agent routing in `supervisorV2.ts`

3. **Add Tools**: Implement tool functions that interact with database/APIs

4. **Test**: Create test cases for single-agent and multi-agent scenarios

---

## 9. Use Case Examples

### Example 1: Meeting Preparation (Multi-Agent)

**User Request**: "Prepare me for my call with John Doe at Acme Corp tomorrow"

**System Response**:
1. Complexity Analyzer: High complexity (meeting prep scenario)
2. Execution Planner: Use `meeting_prep` plan
3. Coordinator executes in parallel:
   - **contactAgent**: Fetch John Doe's contact history, last interactions, notes
   - **companyAgent**: Get Acme Corp profile, industry, recent news
   - **dealAgent**: Find open opportunities with Acme Corp, stage, value
   - **competitorAgent**: Identify Acme's current vendors, competitive landscape
4. **briefingAgent**: Aggregates all results into comprehensive brief

**Output**:
```
# Meeting Brief: John Doe @ Acme Corp

## Contact Overview
- John Doe, VP of Sales @ Acme Corp
- Last contacted: 2 weeks ago (follow-up email)
- Previous meetings: 3 (all positive sentiment)

## Company Context
- Acme Corp: SaaS company, 200 employees, $20M ARR
- Industry: B2B Software
- Recent news: Just raised Series B funding

## Active Opportunities
- "Acme Corp - Enterprise Plan" ($50K ARR)
- Stage: Proposal
- Close date: Next month
- 75% win probability

## Competitive Landscape
- Currently using HubSpot
- Evaluating Salesforce and Clianta
- Key differentiator: Our AI-native approach

## Recommended Talking Points
1. Emphasize ROI from AI automation
2. Address integration with existing stack
3. Discuss implementation timeline
4. Offer pilot program

## Questions to Ask
- What are their top 3 pain points with HubSpot?
- Who else is involved in the decision?
- What's their timeline for making a decision?
```

### Example 2: Campaign Creation (Sequential Multi-Agent)

**User Request**: "Create an email campaign for all A-grade SaaS leads"

**System Response**:
1. Complexity Analyzer: Medium complexity
2. Execution Planner: Custom sequential plan
3. Coordinator executes sequentially:
   - **contactAgent**: Find all A-grade contacts in SaaS industry (returns 150 contacts)
   - **campaignAgent**: Create campaign with targeting criteria
   - **emailAgent**: Generate email template based on audience
4. Aggregator: Present campaign configuration for approval

**Output**:
```
✅ Campaign Created: "SaaS A-Grade Nurture"

📊 Audience: 150 contacts
   - Lead Score: A
   - Industry: SaaS
   - Lifecycle Stage: MQL, SQL

📧 Email Template: "Unlock Revenue with AI-Powered CRM"
   - Subject: Personalizable per contact
   - Body: Value proposition + use cases
   - CTA: "Schedule Demo"

⚙️ Settings:
   - Send time: Tuesday 10 AM (optimal for SaaS)
   - From: Your default email account
   - Tracking: Opens, clicks, replies enabled

Ready to send? Reply "yes" to launch campaign.
```

---

## Summary

Clianta's multi-agent system provides:

- **23 Specialized Agents** for every CRM task
- **Intelligent Coordination** via complexity analysis
- **Parallel & Sequential Execution** for optimal performance
- **Google Gemini 2.5 Pro** for state-of-the-art AI capabilities
- **Tool-Based Architecture** for database/API interactions
- **Graceful Fallbacks** for reliability

**Key Innovation**: Automatic detection of task complexity and dynamic multi-agent coordination without user intervention.

For implementation details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system design
- [BACKGROUND_JOBS.md](./BACKGROUND_JOBS.md) - Async AI operations
- Source code: `backend/src/agents/`
