# AI-Powered CRM Agent Architecture
## Complete Implementation Guide

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Contextual Agent Triggers - Detailed Specs](#contextual-agent-triggers)
4. [Three-Layer Architecture Implementation](#three-layer-architecture)
5. [Agent Specifications](#agent-specifications)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Implementation Roadmap](#implementation-roadmap)

---

## System Overview

Transform your AI chatbot into an ambient intelligence layer that monitors user actions, analyzes context, and proactively provides insights across all CRM modules.

**Key Principles:**
- Non-intrusive: Agents work in background, surface insights only when valuable
- Context-aware: Every suggestion based on current user context and historical data
- Action-oriented: Every insight should lead to a clear action
- Learning: System improves based on which suggestions users act on

---

## Core Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  (Contact Page, Pipeline, Inbox, Campaigns, etc.)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 1: CONTEXT ANALYZER                  │
│  - Monitors user actions (page views, clicks, edits)        │
│  - Builds context payload with relevant data                │
│  - Determines when to trigger agents                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   LAYER 2: AGENT ROUTER                      │
│  - Supervisor Agent analyzes context                        │
│  - Routes to appropriate specialist agent(s)                │
│  - Orchestrates multi-agent workflows                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 3: SPECIALIST AGENTS                  │
│  - Contact Intelligence Agent                               │
│  - Pipeline Predictor Agent                                 │
│  - Campaign Optimizer Agent                                 │
│  - Email Intelligence Agent                                 │
│  - Workflow Automation Agent                                │
│  - Data Quality Agent                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     UI FEEDBACK LAYER                        │
│  - Inline insights panels                                   │
│  - Toast notifications                                      │
│  - Background enrichment                                    │
│  - Action buttons                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Contextual Agent Triggers

### 1. Contact Page Agents

#### **A. Contact Engagement Analyzer**

**When Triggered:** User opens contact detail page

**Context Collected:**
```typescript
interface ContactContext {
  contactId: string;
  contactData: {
    name: string;
    email: string;
    phone: string;
    company: string;
    tags: string[];
    customFields: Record<string, any>;
  };
  engagementHistory: {
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    lastEmailDate: Date;
    lastOpenDate: Date;
    callHistory: CallRecord[];
    meetingHistory: MeetingRecord[];
  };
  dealHistory: {
    currentDeals: Deal[];
    wonDeals: Deal[];
    lostDeals: Deal[];
    totalValue: number;
  };
  recentActivity: Activity[];
  timeOnPage: number;
  userAction: 'view' | 'edit' | 'new';
}
```

**Agent Analysis:**
```typescript
// Engagement Pattern Analysis
const analysisPrompt = `
Analyze this contact's engagement pattern:

Contact: ${context.contactData.name}
Last email sent: ${context.engagementHistory.lastEmailDate}
Last email opened: ${context.engagementHistory.lastOpenDate}
Open rate: ${calculateOpenRate(context)}
Recent activities: ${context.recentActivity}

Determine:
1. Engagement level (Hot/Warm/Cold/Ghosting)
2. Best time to reach out (based on historical open times)
3. Recommended communication channel
4. Risk flags (e.g., going cold, ignored last 3 emails)
5. Next best action

Return structured JSON response.
`;
```

**Output Format:**
```typescript
interface ContactInsight {
  type: 'engagement_analysis';
  priority: 'high' | 'medium' | 'low';
  insights: {
    engagementLevel: 'hot' | 'warm' | 'cold' | 'ghosting';
    riskFlags: string[];
    bestTimeToContact: {
      day: string;
      time: string;
      confidence: number;
    };
    recommendedChannel: 'email' | 'phone' | 'meeting';
    nextAction: {
      action: string;
      reasoning: string;
      urgency: 'immediate' | 'this_week' | 'this_month';
    };
  };
  confidence: number;
  suggestedActions: Action[];
}
```

**UI Display:**
```tsx
// Inline panel on contact page
<ContactInsightsPanel>
  <EngagementScore score="warm" trend="declining" />
  <RiskAlert type="going_cold" 
             message="No engagement in 14 days - 3x longer than usual" />
  <BestTimeToContact 
    day="Tuesday" 
    time="2-4 PM" 
    confidence={0.87} />
  <RecommendedAction
    action="Send re-engagement email"
    template="We noticed you haven't opened recent emails"
    urgency="high"
  />
</ContactInsightsPanel>
```

---

#### **B. Contact Intelligence & Enrichment**

**When Triggered:** User creates new contact or views contact with incomplete data

**Analysis:**
```typescript
const enrichmentPrompt = `
Contact data completeness check:
- Email: ${contact.email ? 'present' : 'missing'}
- Phone: ${contact.phone ? 'present' : 'missing'}
- Company: ${contact.company ? 'present' : 'missing'}
- LinkedIn: ${contact.linkedin ? 'present' : 'missing'}
- Job title: ${contact.jobTitle ? 'present' : 'missing'}

Determine:
1. Data quality score (0-100)
2. Critical missing fields
3. Enrichment opportunities (LinkedIn lookup, company info)
4. Duplicate contact risk
`;
```

**Actions:**
```typescript
interface EnrichmentAction {
  type: 'data_enrichment';
  actions: [
    {
      action: 'lookup_linkedin',
      field: 'jobTitle',
      confidence: 0.92,
      source: 'linkedin_api'
    },
    {
      action: 'find_company_info',
      field: 'company_size',
      confidence: 0.85,
      source: 'clearbit'
    },
    {
      action: 'check_duplicates',
      matches: Contact[],
      similarity: number
    }
  ];
}
```

---

### 2. Pipeline Agents

#### **A. Deal Risk Predictor**

**When Triggered:** User opens pipeline view or specific deal

**Context Collected:**
```typescript
interface PipelineContext {
  dealId?: string;
  pipelineView: 'all' | 'specific_stage';
  dealData?: {
    value: number;
    stage: string;
    createdDate: Date;
    lastActivityDate: Date;
    contactEngagement: number;
    daysInStage: number;
    expectedCloseDate: Date;
    assignedTo: string;
  };
  historicalData: {
    similarDeals: Deal[];
    winRate: number;
    averageTimeInStage: Record<string, number>;
    conversionRates: Record<string, number>;
  };
  teamPerformance: {
    repWinRate: number;
    repAverageCloseTime: number;
  };
}
```

**Analysis:**
```typescript
const riskAnalysisPrompt = `
Analyze deal risk for: ${deal.name}
Current stage: ${deal.stage}
Days in stage: ${deal.daysInStage} (avg for stage: ${historicalData.averageTimeInStage[deal.stage]})
Last activity: ${deal.lastActivityDate}
Contact engagement: ${deal.contactEngagement}
Expected close: ${deal.expectedCloseDate}

Similar deals won: ${similarDeals.filter(d => d.won).length}
Similar deals lost: ${similarDeals.filter(d => d.lost).length}

Predict:
1. Win probability (0-100%)
2. Risk level (low/medium/high/critical)
3. Risk factors
4. Recommended actions to de-risk
5. Bottlenecks
`;
```

**Output:**
```typescript
interface DealRiskInsight {
  dealId: string;
  winProbability: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: [
    {
      factor: 'No activity in 7 days';
      impact: 'high';
      recommendation: 'Schedule follow-up call';
    },
    {
      factor: 'Deal 2x longer in stage than average';
      impact: 'medium';
      recommendation: 'Review with manager';
    }
  ];
  bottlenecks: string[];
  nextBestActions: [
    {
      action: 'Send proposal';
      priority: 1;
      expectedImpact: '+15% win probability';
    }
  ];
  predictedCloseDate: Date;
  confidence: number;
}
```

**UI Display:**
```tsx
<DealCard deal={deal}>
  <RiskBadge level={insight.riskLevel} probability={insight.winProbability} />
  <AlertSection>
    {insight.riskFactors.map(factor => (
      <RiskFactor 
        factor={factor.factor}
        impact={factor.impact}
        recommendation={factor.recommendation}
      />
    ))}
  </AlertSection>
  <NextActionsPanel>
    {insight.nextBestActions.map(action => (
      <ActionButton 
        action={action.action}
        impact={action.expectedImpact}
        onClick={() => executeAction(action)}
      />
    ))}
  </NextActionsPanel>
</DealCard>
```

---

#### **B. Pipeline Bottleneck Detector**

**When Triggered:** User views full pipeline or specific stage

**Analysis:**
```typescript
const bottleneckPrompt = `
Pipeline analysis:
Stage distribution: ${stageDistribution}
Average time per stage: ${averageTimePerStage}
Deals stuck (>2x avg time): ${stuckDeals.length}
Conversion rates: ${conversionRates}

Historical benchmarks:
- Last quarter conversion: ${lastQuarterData}
- Team average: ${teamAverages}

Identify:
1. Bottleneck stages
2. Deals at risk of stalling
3. Process improvements
4. Resource allocation recommendations
`;
```

---

### 3. Campaign Agents

#### **A. Campaign Optimizer**

**When Triggered:** User creates/edits campaign or views campaign performance

**Context Collected:**
```typescript
interface CampaignContext {
  campaignId?: string;
  campaignData?: {
    type: 'email' | 'linkedin' | 'multi-channel';
    audience: {
      size: number;
      segments: Segment[];
      filters: Filter[];
    };
    content: {
      subject?: string;
      body?: string;
      cta?: string;
    };
    schedule: {
      sendTime?: Date;
      frequency?: string;
    };
  };
  performance?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    unsubscribed: number;
  };
  historicalCampaigns: Campaign[];
}
```

**For New Campaigns:**
```typescript
const optimizationPrompt = `
Campaign creation analysis:
Audience size: ${campaign.audience.size}
Segments: ${campaign.audience.segments}
Subject line: "${campaign.content.subject}"
Send time: ${campaign.schedule.sendTime}

Historical data:
- Best performing subject patterns: ${historicalBestSubjects}
- Best send times: ${bestSendTimes}
- Audience engagement patterns: ${audiencePatterns}

Recommend:
1. Subject line improvements (A/B test suggestions)
2. Optimal send time
3. Audience refinements
4. Expected performance metrics
`;
```

**For Active Campaigns:**
```typescript
const performancePrompt = `
Campaign performance:
Open rate: ${performance.opened / performance.sent}% (industry avg: 21%)
Click rate: ${performance.clicked / performance.opened}% (industry avg: 2.6%)
Reply rate: ${performance.replied / performance.sent}% (industry avg: 1%)

Segment performance:
${segmentBreakdown}

Real-time recommendations:
1. Should we adjust send time?
2. Which segments to focus on?
3. When to send follow-up?
4. A/B test winners
`;
```

**Output:**
```typescript
interface CampaignInsight {
  type: 'pre_launch' | 'active' | 'post_campaign';
  optimizations: [
    {
      area: 'subject_line';
      current: string;
      suggested: string;
      expectedImpact: '+8% open rate';
      confidence: 0.82;
    },
    {
      area: 'send_time';
      current: string;
      suggested: string;
      reasoning: 'Historical data shows 35% higher opens at this time';
    }
  ];
  abTestSuggestions?: {
    variant_a: string;
    variant_b: string;
    testParameter: string;
    recommendedSplit: number;
  }[];
  predictions?: {
    expectedOpenRate: number;
    expectedClickRate: number;
    expectedReplies: number;
  };
}
```

---

### 4. Inbox Agents

#### **A. Email Intelligence Agent**

**When Triggered:** New email arrives or user opens inbox

**Context Collected:**
```typescript
interface EmailContext {
  emailId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  threadHistory?: Email[];
  contactData?: Contact;
  relatedDeals?: Deal[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
}
```

**Analysis:**
```typescript
const emailAnalysisPrompt = `
Email analysis:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Contact context:
- Current deals: ${relatedDeals}
- Last interaction: ${contactData.lastInteraction}
- Relationship status: ${contactData.status}

Determine:
1. Email category (inquiry, complaint, followup, opportunity, FYI)
2. Urgency level (immediate, today, this_week, no_rush)
3. Sentiment analysis
4. Action items extracted
5. Suggested response (if applicable)
6. Auto-handle possibility
`;
```

**Output:**
```typescript
interface EmailInsight {
  emailId: string;
  category: 'inquiry' | 'complaint' | 'followup' | 'opportunity' | 'fyi' | 'spam';
  urgency: 'immediate' | 'today' | 'this_week' | 'no_rush';
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  actionItems: [
    {
      action: 'Schedule demo';
      deadline?: Date;
      assignTo?: string;
    }
  ];
  suggestedResponse?: {
    tone: 'professional' | 'friendly' | 'apologetic';
    template: string;
    confidence: number;
  };
  autoHandleable: boolean;
  reasoning: string;
}
```

**UI Display:**
```tsx
<EmailListItem email={email}>
  <CategoryBadge category={insight.category} />
  <UrgencyIndicator level={insight.urgency} />
  <SentimentBadge sentiment={insight.sentiment} />
  
  {insight.urgency === 'immediate' && (
    <UrgentAlert>
      Requires immediate attention: {insight.reasoning}
    </UrgentAlert>
  )}
  
  <ActionItemsPanel>
    {insight.actionItems.map(item => (
      <ActionItem 
        action={item.action}
        onComplete={() => markComplete(item)}
      />
    ))}
  </ActionItemsPanel>
  
  {insight.suggestedResponse && (
    <SmartReplyPanel>
      <ResponsePreview 
        template={insight.suggestedResponse.template}
        confidence={insight.suggestedResponse.confidence}
      />
      <ActionButtons>
        <Button onClick={() => useSuggestedReply()}>Use This Reply</Button>
        <Button onClick={() => editReply()}>Edit & Send</Button>
      </ActionButtons>
    </SmartReplyPanel>
  )}
</EmailListItem>
```

---

#### **B. Response Drafter**

**When Triggered:** User clicks reply on email

**Context:**
```typescript
const responseDraftPrompt = `
Email thread context:
${threadHistory}

Contact info:
${contactData}

Related deals:
${relatedDeals}

User's typical response style:
${learnedResponseStyle}

Draft a response that:
1. Addresses all points in the email
2. Matches user's communication style
3. Includes relevant deal/product info
4. Has clear call-to-action
5. Maintains professional tone
`;
```

---

### 5. Workflow Agents

#### **A. Automation Opportunity Detector**

**When Triggered:** Background monitoring of user actions

**Context Collected:**
```typescript
interface WorkflowContext {
  userActions: UserAction[]; // Last 30 days
  repetitivePatterns: {
    action: string;
    frequency: number;
    avgTimeTaken: number;
    conditions: Condition[];
  }[];
  existingWorkflows: Workflow[];
}
```

**Analysis:**
```typescript
const automationPrompt = `
User action analysis (last 30 days):
Repetitive patterns detected:
1. When new deal created → assigns to self (45 times)
2. When email received from VIP → creates task (32 times)
3. When deal moves to "Proposal" → sends template email (28 times)
4. When contact tagged "hot-lead" → adds to nurture campaign (23 times)

Existing workflows: ${existingWorkflows.length}

Suggest:
1. New workflow opportunities
2. Time savings per automation
3. Workflow templates
4. Trigger conditions
5. Actions to automate
`;
```

**Output:**
```typescript
interface AutomationSuggestion {
  pattern: {
    trigger: string;
    action: string;
    frequency: number;
    timeSavings: number; // minutes per month
  };
  suggestedWorkflow: {
    name: string;
    trigger: WorkflowTrigger;
    conditions?: WorkflowCondition[];
    actions: WorkflowAction[];
    template?: string;
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}
```

**UI Display:**
```tsx
// Toast notification (non-intrusive)
<ToastNotification type="automation_suggestion">
  <Icon name="magic-wand" />
  <Message>
    We noticed you've manually assigned yourself to 45 new deals this month.
  </Message>
  <Suggestion>
    Create a workflow to auto-assign new deals in "Enterprise" pipeline?
  </Suggestion>
  <Actions>
    <Button variant="primary" onClick={() => createWorkflow()}>
      Create Workflow
    </Button>
    <Button variant="ghost" onClick={() => dismiss()}>
      Not Now
    </Button>
  </Actions>
  <TimeSavings>
    Est. time savings: ~4 hours/month
  </TimeSavings>
</ToastNotification>
```

---

## Three-Layer Architecture Implementation

### Layer 1: Context Analyzer

```typescript
// services/context-analyzer.ts

class ContextAnalyzer {
  private eventQueue: EventQueue;
  private contextStore: ContextStore;
  
  constructor() {
    this.eventQueue = new EventQueue();
    this.contextStore = new ContextStore();
  }
  
  /**
   * Monitor user actions and build context
   */
  async captureUserAction(event: UserEvent): Promise<void> {
    const context = await this.buildContext(event);
    
    // Decide if this warrants agent analysis
    if (this.shouldTriggerAgent(event, context)) {
      await this.eventQueue.enqueue({
        type: event.type,
        context: context,
        priority: this.calculatePriority(event, context),
        timestamp: new Date()
      });
    }
    
    // Store context for future reference
    await this.contextStore.save(context);
  }
  
  /**
   * Build comprehensive context from event
   */
  private async buildContext(event: UserEvent): Promise<AgentContext> {
    const baseContext = {
      userId: event.userId,
      action: event.action,
      page: event.page,
      timestamp: event.timestamp
    };
    
    switch (event.page) {
      case 'contact_detail':
        return await this.buildContactContext(event, baseContext);
      
      case 'pipeline':
        return await this.buildPipelineContext(event, baseContext);
      
      case 'campaign':
        return await this.buildCampaignContext(event, baseContext);
      
      case 'inbox':
        return await this.buildInboxContext(event, baseContext);
      
      default:
        return baseContext;
    }
  }
  
  /**
   * Build contact-specific context
   */
  private async buildContactContext(
    event: UserEvent, 
    baseContext: any
  ): Promise<ContactContext> {
    const contactId = event.resourceId;
    
    // Parallel data fetching for performance
    const [
      contactData,
      engagementHistory,
      dealHistory,
      recentActivity,
      emailThreads
    ] = await Promise.all([
      this.db.contacts.findUnique({ where: { id: contactId } }),
      this.getEngagementHistory(contactId),
      this.getDealHistory(contactId),
      this.getRecentActivity(contactId, 30), // Last 30 days
      this.getEmailThreads(contactId, 10) // Last 10 emails
    ]);
    
    return {
      ...baseContext,
      contactId,
      contactData,
      engagementHistory,
      dealHistory,
      recentActivity,
      emailThreads,
      userAction: event.action // 'view', 'edit', 'create'
    };
  }
  
  /**
   * Determine if action warrants agent analysis
   */
  private shouldTriggerAgent(event: UserEvent, context: any): boolean {
    // Don't trigger for rapid repeated actions (anti-spam)
    if (this.isRapidRepeat(event)) return false;
    
    // Trigger rules based on page and action
    const triggerRules = {
      contact_detail: {
        view: true, // Always analyze on contact view
        edit: false, // Don't interrupt editing
        create: true // Analyze new contacts
      },
      pipeline: {
        view: true,
        stage_change: true, // Deal moved
        create: true
      },
      campaign: {
        create: true,
        schedule: true,
        view_performance: true
      },
      inbox: {
        new_email: true, // High priority
        open_email: false, // Don't analyze every open
        reply: true // Analyze when replying
      }
    };
    
    return triggerRules[event.page]?.[event.action] ?? false;
  }
  
  /**
   * Calculate priority for agent queue
   */
  private calculatePriority(event: UserEvent, context: any): number {
    let priority = 50; // Default
    
    // High priority scenarios
    if (event.page === 'inbox' && event.action === 'new_email') {
      priority = 90;
    }
    
    if (event.page === 'pipeline' && context.dealData?.value > 100000) {
      priority = 80; // High-value deals
    }
    
    if (event.page === 'contact_detail' && 
        context.engagementHistory?.lastActivityDate < 
        Date.now() - (14 * 24 * 60 * 60 * 1000)) {
      priority = 70; // Cold contacts
    }
    
    return priority;
  }
}

export default new ContextAnalyzer();
```

---

### Layer 2: Agent Router (Supervisor)

```typescript
// services/agent-router.ts

import { Gemini2_5Pro } from './gemini-client';

class AgentRouter {
  private supervisorAgent: Gemini2_5Pro;
  private specialistAgents: Map<string, Agent>;
  
  constructor() {
    this.supervisorAgent = new Gemini2_5Pro({
      model: 'gemini-2.5-pro',
      systemPrompt: this.getSupervisorPrompt()
    });
    
    this.specialistAgents = new Map([
      ['contact_intelligence', new ContactIntelligenceAgent()],
      ['pipeline_predictor', new PipelinePredictorAgent()],
      ['campaign_optimizer', new CampaignOptimizerAgent()],
      ['email_intelligence', new EmailIntelligenceAgent()],
      ['workflow_automation', new WorkflowAutomationAgent()],
      ['data_quality', new DataQualityAgent()]
    ]);
  }
  
  /**
   * Route context to appropriate specialist agent(s)
   */
  async route(context: AgentContext): Promise<AgentResponse> {
    // Supervisor decides which agent(s) to invoke
    const routingDecision = await this.supervisorAgent.analyze({
      context: context,
      availableAgents: Array.from(this.specialistAgents.keys()),
      task: 'Determine which specialist agent(s) should analyze this context'
    });
    
    // Execute agent(s) in parallel if multiple needed
    const agentPromises = routingDecision.selectedAgents.map(agentName => {
      const agent = this.specialistAgents.get(agentName);
      return agent.analyze(context);
    });
    
    const results = await Promise.all(agentPromises);
    
    // Supervisor synthesizes if multiple agents involved
    if (results.length > 1) {
      return await this.synthesizeResults(results, context);
    }
    
    return results[0];
  }
  
  /**
   * Supervisor system prompt
   */
  private getSupervisorPrompt(): string {
    return `
You are a supervisor AI agent for a CRM system. Your role is to:

1. Analyze user context and determine which specialist agent(s) should handle it
2. Route complex scenarios to multiple agents
3. Synthesize results from multiple agents into coherent insights
4. Ensure insights are actionable and non-intrusive

Available specialist agents:
- contact_intelligence: Analyzes contact engagement, predicts best outreach times
- pipeline_predictor: Predicts deal risk, identifies bottlenecks
- campaign_optimizer: Optimizes campaign performance, suggests A/B tests
- email_intelligence: Categorizes emails, drafts responses, extracts action items
- workflow_automation: Detects automation opportunities from user patterns
- data_quality: Identifies data gaps, suggests enrichment

Rules:
- Only invoke agents when insights will be valuable
- Don't interrupt user workflows with low-value suggestions
- Prioritize actionable insights over interesting observations
- Consider user's current context and likely intent

Return JSON: { selectedAgents: string[], reasoning: string, priority: number }
    `;
  }
  
  /**
   * Synthesize results from multiple agents
   */
  private async synthesizeResults(
    results: AgentResponse[], 
    context: AgentContext
  ): Promise<AgentResponse> {
    const synthesisPrompt = `
Multiple agents have analyzed the same context. Synthesize their insights:

${results.map((r, i) => `Agent ${i + 1} (${r.agentType}): ${JSON.stringify(r.insights)}`).join('\n\n')}

Create a unified response that:
1. Prioritizes most important insights
2. Removes redundancy
3. Provides clear action items
4. Maintains coherent narrative

Return structured JSON response.
    `;
    
    return await this.supervisorAgent.synthesize(synthesisPrompt);
  }
}

export default new AgentRouter();
```

---

### Layer 3: Specialist Agents

```typescript
// services/agents/contact-intelligence-agent.ts

class ContactIntelligenceAgent implements Agent {
  private model: Gemini2_5Pro;
  
  constructor() {
    this.model = new Gemini2_5Pro({
      model: 'gemini-2.5-pro',
      systemPrompt: this.getSystemPrompt()
    });
  }
  
  async analyze(context: ContactContext): Promise<AgentResponse> {
    // Build analysis prompt from context
    const prompt = this.buildAnalysisPrompt(context);
    
    // Get AI analysis
    const analysis = await this.model.generate(prompt);
    
    // Structure response
    return {
      agentType: 'contact_intelligence',
      insights: this.parseAnalysis(analysis),
      suggestedActions: this.generateActions(analysis, context),
      confidence: this.calculateConfidence(analysis, context),
      displayType: this.determineDisplayType(analysis)
    };
  }
  
  private getSystemPrompt(): string {
    return `
You are a contact intelligence AI agent. Your role is to:

1. Analyze contact engagement patterns
2. Predict best times to reach out
3. Identify contacts at risk of going cold
4. Recommend communication strategies
5. Flag data quality issues

Analyze based on:
- Email open/click patterns
- Response times
- Deal history
- Meeting attendance
- Communication preferences

Provide insights that are:
- Actionable (clear next steps)
- Data-driven (based on historical patterns)
- Time-sensitive (flagging urgent situations)
- Relevant (to user's current context)

Return structured JSON with:
{
  engagementLevel: "hot" | "warm" | "cold" | "ghosting",
  riskFlags: string[],
  bestTimeToContact: { day, time, confidence },
  recommendedChannel: "email" | "phone" | "meeting",
  nextAction: { action, reasoning, urgency },
  dataQuality: { score, missingFields }
}
    `;
  }
  
  private buildAnalysisPrompt(context: ContactContext): string {
    return `
Analyze contact engagement:

Contact: ${context.contactData.name} (${context.contactData.email})
Company: ${context.contactData.company}

Engagement History:
- Emails sent: ${context.engagementHistory.emailsSent}
- Emails opened: ${context.engagementHistory.emailsOpened}
- Open rate: ${this.calculateOpenRate(context)}%
- Last email sent: ${context.engagementHistory.lastEmailDate}
- Last email opened: ${context.engagementHistory.lastOpenDate}
- Days since last engagement: ${this.daysSinceLastEngagement(context)}

Historical open times:
${this.getHistoricalOpenTimes(context)}

Recent Activity:
${context.recentActivity.map(a => `- ${a.type}: ${a.description}`).join('\n')}

Deal History:
- Active deals: ${context.dealHistory.currentDeals.length} ($${context.dealHistory.totalValue})
- Won deals: ${context.dealHistory.wonDeals.length}
- Lost deals: ${context.dealHistory.lostDeals.length}

Current user action: ${context.userAction}

Provide comprehensive analysis and recommendations.
    `;
  }
  
  private parseAnalysis(analysis: any): ContactInsight {
    // Parse AI response into structured format
    // Add validation and error handling
    return {
      type: 'engagement_analysis',
      priority: analysis.riskFlags.length > 0 ? 'high' : 'medium',
      insights: {
        engagementLevel: analysis.engagementLevel,
        riskFlags: analysis.riskFlags,
        bestTimeToContact: analysis.bestTimeToContact,
        recommendedChannel: analysis.recommendedChannel,
        nextAction: analysis.nextAction
      },
      confidence: analysis.confidence || 0.75,
      suggestedActions: this.convertToActions(analysis)
    };
  }
  
  private generateActions(analysis: any, context: ContactContext): Action[] {
    const actions: Action[] = [];
    
    // Generate action buttons based on recommendations
    if (analysis.nextAction.action.includes('email')) {
      actions.push({
        id: `send_email_${context.contactId}`,
        type: 'send_email',
        label: 'Send Re-engagement Email',
        template: this.selectEmailTemplate(analysis),
        priority: analysis.nextAction.urgency === 'immediate' ? 1 : 2
      });
    }
    
    if (analysis.nextAction.action.includes('call')) {
      actions.push({
        id: `schedule_call_${context.contactId}`,
        type: 'schedule_call',
        label: 'Schedule Call',
        suggestedTime: analysis.bestTimeToContact,
        priority: 1
      });
    }
    
    if (analysis.dataQuality.score < 70) {
      actions.push({
        id: `enrich_data_${context.contactId}`,
        type: 'enrich_data',
        label: 'Enrich Contact Data',
        fields: analysis.dataQuality.missingFields,
        priority: 3
      });
    }
    
    return actions.sort((a, b) => a.priority - b.priority);
  }
  
  private determineDisplayType(analysis: any): DisplayType {
    // Decide how to show insights to user
    if (analysis.riskFlags.some(flag => flag.includes('immediate'))) {
      return 'toast_notification'; // Urgent
    }
    
    if (analysis.nextAction.urgency === 'immediate') {
      return 'inline_alert'; // Important but not interrupting
    }
    
    return 'inline_panel'; // Standard insights panel
  }
}
```

---

## Database Schema

```sql
-- Agent insights cache
CREATE TABLE agent_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  context_type VARCHAR(50) NOT NULL, -- 'contact', 'deal', 'email', etc.
  context_id UUID, -- ID of contact/deal/email
  agent_type VARCHAR(50) NOT NULL, -- 'contact_intelligence', etc.
  insights JSONB NOT NULL,
  suggested_actions JSONB,
  confidence FLOAT,
  display_type VARCHAR(50),
  priority INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'shown', 'acted', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  shown_at TIMESTAMP,
  acted_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  
  INDEX idx_user_status (user_id, status),
  INDEX idx_context (context_type, context_id),
  INDEX idx_priority (priority DESC, created_at DESC)
);

-- User action tracking for automation detection
CREATE TABLE user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  page VARCHAR(50),
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_actions (user_id, timestamp DESC),
  INDEX idx_action_patterns (user_id, action_type, timestamp DESC)
);

-- Agent performance tracking
CREATE TABLE agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  insight_id UUID REFERENCES agent_insights(id),
  action_taken BOOLEAN DEFAULT FALSE,
  action_type VARCHAR(100),
  response_time_ms INTEGER,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  helpful BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_agent_performance (agent_type, created_at DESC),
  INDEX idx_user_performance (user_id, agent_type)
);

-- Conversation sessions for agent context
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  session_id VARCHAR(100) NOT NULL,
  messages JSONB DEFAULT '[]',
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  INDEX idx_session_lookup (workspace_id, session_id),
  UNIQUE (workspace_id, session_id)
);
```

---

## API Endpoints

### Agent Chat Endpoint

The main endpoint for interacting with the AI agent system.

```typescript
// POST /api/workspaces/:workspaceId/agent/chat
// Main chat endpoint for the AI agent system

interface AgentChatRequest {
  message: string;          // Natural language request
  sessionId?: string;       // Optional session for conversation context
}

interface AgentChatResponse {
  success: boolean;
  data: {
    response: string;           // AI-generated response text
    needsInput?: boolean;       // Whether more input is needed
    toolResults?: Record<string, any>; // Results from tool executions
  };
  warning?: string;             // Non-fatal warnings
}
```

**Example Usage:**
```bash
curl -X POST "https://api.example.com/api/workspaces/{workspaceId}/agent/chat" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a contact named John Smith from Acme Corp"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I've created a new contact for John Smith from Acme Corp. The contact has been added to your workspace and is ready for follow-up.",
    "toolResults": {
      "createContact": {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Smith",
        "company": "Acme Corp"
      }
    }
  }
}
```

---

### Agent Status Endpoint

Returns the current status and capabilities of the agent system.

```typescript
// GET /api/workspaces/:workspaceId/agent/status

interface AgentStatusResponse {
  success: boolean;
  data: {
    status: 'active' | 'maintenance' | 'unavailable';
    model: string;                    // AI model in use
    multiAgentCoordination: boolean;  // Multi-agent framework enabled
    availableAgents: {
      name: string;
      description: string;
    }[];
    examples: string[];               // Example commands
    features: string[];               // Currently available features
  };
}
```

**Available Agents:**

| Agent | Description | Key Capabilities |
|-------|-------------|------------------|
| `contact` | Contact management | Create, search, update, bulk ops |
| `email` | Email operations | Draft emails, manage templates |
| `deal` | Deal management | Create deals, manage pipeline |
| `task` | Task management | Create, assign, schedule tasks |
| `campaign` | Campaign management | Create campaigns, A/B testing |
| `workflow` | Workflow automation | Create and manage workflows |
| `sequence` | Email sequences | Design multi-step sequences |
| `pipeline` | Pipeline management | Configure stages, analytics |
| `leadScore` | Lead scoring | Score leads, prioritization |
| `scheduler` | Meeting scheduling | Book meetings, calendar sync |
| `briefing` | Pre-meeting intel | Generate meeting briefs |
| `proposal` | Proposal generation | Create proposals from data |
| `ticket` | Support tickets | Manage customer tickets |
| `reports` | Analytics & reports | Generate insights, dashboards |
| `hygiene` | Data quality | Stale deal detection, cleanup |
| `forecast` | Revenue forecasting | Predictions, trend analysis |
| `competitor` | Competitive intel | Battlecards, comparisons |
| `dataEntry` | Data cleanup | Duplicate detection, merging |
| `transcription` | Call transcription | Summarize calls, extract insights |
| `company` | Company management | Manage accounts, hierarchies |
| `general` | General knowledge | Web search, research |

---

## Frontend Components

### Agent Chat Interface

The main chat component for interacting with the AI system.

```tsx
// components/agent/AgentChat.tsx

interface AgentChatProps {
  workspaceId: string;
  onInsightReceived?: (insight: AgentInsight) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({ 
  workspaceId,
  onInsightReceived 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await sendAgentMessage(workspaceId, input);
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: response.data.response }
      ]);

      // Handle tool results (e.g., display created entities)
      if (response.data.toolResults) {
        handleToolResults(response.data.toolResults);
      }
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="agent-chat">
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <ChatBubble key={idx} message={msg} />
        ))}
      </div>
      <ChatInput 
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
        placeholder="Ask anything... e.g., 'Create a task to follow up with John'"
      />
    </div>
  );
};
```

---

### Insights Panel Component

Displays AI-generated insights inline on entity pages.

```tsx
// components/agent/InsightsPanel.tsx

interface InsightsPanelProps {
  entityType: 'contact' | 'deal' | 'campaign';
  entityId: string;
  insights: AgentInsight[];
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  entityType,
  entityId,
  insights
}) => {
  const priorityInsights = insights
    .filter(i => i.priority === 'high')
    .slice(0, 3);

  return (
    <Card className="insights-panel">
      <CardHeader>
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span>AI Insights</span>
      </CardHeader>
      <CardContent>
        {priorityInsights.map((insight, idx) => (
          <InsightCard key={idx} insight={insight}>
            {insight.suggestedActions?.map((action, actionIdx) => (
              <ActionButton 
                key={actionIdx}
                action={action}
                onExecute={() => executeAction(action)}
              />
            ))}
          </InsightCard>
        ))}
      </CardContent>
    </Card>
  );
};
```

---

### Agent API Client

Frontend API wrapper for agent interactions.

```typescript
// lib/api/agent.ts

import { axiosInstance } from "../axios";

export interface AgentChatResponse {
  success: boolean;
  data?: {
    response: string;
    toolResults?: Record<string, any>;
    error?: string;
  };
  error?: string;
}

export interface AgentStatusResponse {
  success: boolean;
  data?: {
    status: string;
    model: string;
    availableAgents: {
      name: string;
      description: string;
      capabilities: string[];
    }[];
    examples: string[];
  };
  error?: string;
}

/**
 * Send a message to the AI agent
 */
export const sendAgentMessage = async (
  workspaceId: string,
  message: string
): Promise<AgentChatResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/agent/chat`,
    { message }
  );
  return response.data;
};

/**
 * Get agent system status
 */
export const getAgentStatus = async (
  workspaceId: string
): Promise<AgentStatusResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/agent/status`
  );
  return response.data;
};
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Completed ✅)

- [x] Multi-agent coordinator (LangGraph-based)
- [x] Supervisor agent for task routing
- [x] Worker agent framework (21 specialized agents)
- [x] Model factory with Vertex AI integration
- [x] Rate limiting and authentication
- [x] Error handling and timeout management
- [x] Conversation session management

### Phase 2: Agent Capabilities (Completed ✅)

- [x] Contact Agent (CRUD + bulk operations)
- [x] Email Agent (drafting, templates, AI personalization)
- [x] Deal Agent (pipeline management)
- [x] Task Agent (task management + scheduling)
- [x] Campaign Agent (campaign creation, A/B testing)
- [x] Workflow Agent (automation rules)
- [x] Sequence Agent (multi-step email sequences)
- [x] Pipeline Agent (pipeline configuration)
- [x] Lead Scoring Agent (scoring + prioritization)
- [x] Scheduling Agent (calendar integration)
- [x] Meeting Briefing Agent (pre-meeting intelligence)
- [x] Proposal Agent (document generation)
- [x] Ticket Agent (support management)
- [x] Reports Agent (analytics + insights)
- [x] Data Hygiene Agent (cleanup + health)
- [x] Forecast Agent (revenue predictions)
- [x] Competitor Agent (battlecards + intel)
- [x] Data Entry Agent (duplicate handling)
- [x] Transcription Agent (call summarization)
- [x] Company Agent (account management)
- [x] General Agent (web search + research)

### Phase 3: Context & Intelligence (In Progress 🔄)

- [x] Session-based conversation memory
- [x] Complexity analysis for task routing
- [ ] Background context analyzer
- [ ] Proactive insight generation
- [ ] User action pattern detection
- [ ] Automation opportunity suggestions
- [ ] Real-time engagement scoring

### Phase 4: UI Integration (Planned 📋)

- [ ] Inline insights panels on entity pages
- [ ] Toast notifications for urgent insights
- [ ] Action buttons with one-click execution
- [ ] Chat widget across all pages
- [ ] Insight dismissal/feedback tracking
- [ ] Dark/light mode theming

### Phase 5: Learning & Optimization (Future 🔮)

- [ ] Track action completion rates
- [ ] A/B test suggestion strategies
- [ ] Personalize insights per user
- [ ] Optimize trigger thresholds
- [ ] Build feedback loops
- [ ] Performance analytics dashboard

---

## Configuration

### Environment Variables

```bash
# AI Model Configuration
GOOGLE_CREDENTIALS_BASE64=<base64-encoded-service-account-json>
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_LOCATION=us-central1

# Rate Limiting
AGENT_RATE_LIMIT_WINDOW_MS=60000
AGENT_RATE_LIMIT_MAX_REQUESTS=30

# Session Configuration
AGENT_SESSION_TIMEOUT_MS=3600000  # 1 hour
AGENT_MAX_CONVERSATION_LENGTH=10  # messages
```

### Model Configuration

```typescript
// agents/modelFactory.ts

const MODEL_CONFIG = {
  pro: {
    model: 'gemini-2.0-flash',  // High capability for complex tasks
    temperature: 0.3,
    maxOutputTokens: 8192,
  },
  flash: {
    model: 'gemini-2.0-flash',  // Fast for simple tasks
    temperature: 0.2,
    maxOutputTokens: 4096,
  }
};
```

---

## Best Practices

### 1. Clear Natural Language Commands

```
✅ Good: "Create a task to follow up with John Smith next Tuesday at 2pm"
✅ Good: "Find all contacts from Acme Corp who haven't been contacted in 30 days"
❌ Poor: "Do something with contacts"
```

### 2. Bulk Operations

```
✅ Good: "Add the 'enterprise' tag to all contacts from companies with over 500 employees"
✅ Good: "Move all stale deals older than 60 days to the 'Lost' stage"
```

### 3. Multi-Step Workflows

```
✅ Good: "Create a workflow that assigns new enterprise leads to sales team and creates a follow-up task"
```

---

## Metrics & Monitoring

### Key Performance Indicators

| Metric | Target | Current |
|--------|--------|---------|
| Response Time P95 | < 5s | 3.2s |
| Task Success Rate | > 95% | 97.3% |
| User Adoption | > 60% | - |
| Insight Action Rate | > 30% | - |

### Monitoring Endpoints

```bash
# Health check
GET /api/workspaces/:id/agent/status

# Performance metrics (internal)
GET /api/admin/agent/metrics
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Agent unavailable" | Model credentials invalid | Verify `GOOGLE_CREDENTIALS_BASE64` |
| Slow responses | Complex multi-agent task | Normal for complex queries (< 60s) |
| "Rate limited" | Too many requests | Wait 1 minute, reduce frequency |
| Missing tool results | Agent couldn't complete task | Check entity permissions |

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=agent:* npm run dev
```

---

> **Note:** This document describes the AI agent architecture. For implementation details of specific agents, refer to the individual agent files in `backend/src/agents/workers/`.