# Story 3.4: Event-Based Trigger Execution

Status: completed

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to execute automatically when CRM events occur,
So that I can respond to user actions in real-time.

## Acceptance Criteria

1. **AC1: Contact Created Event**
   - Given an agent has trigger: "Contact Created"
   - When a new contact is created in the workspace
   - Then the agent executes automatically with the new contact as context
   - And contact data is available via @contact.* variables
   - And execution log shows trigger type: "event: contact_created"

2. **AC2: Deal Stage Updated Event**
   - Given an agent has trigger: "Deal Stage Updated"
   - When a deal stage changes (e.g., from Proposal to Closed Won)
   - Then the agent executes automatically with the deal as context
   - And deal data is available via @deal.* variables
   - And previous and new stage values are available

3. **AC3: Form Submitted Event**
   - Given an agent has trigger: "Form Submitted"
   - When a lead submits a form on the website
   - Then the agent executes automatically with form submission data
   - And form fields are available as variables
   - And new contact is created if needed, then agent runs

4. **AC4: Event Condition Evaluation**
   - Given agent has event conditions: "when deal value > $10,000"
   - When deal is updated with value $5,000
   - Then the agent does NOT execute (condition not met)
   - When deal is updated with value $15,000
   - Then the agent executes (condition met)

5. **AC5: Multiple Agents Same Event**
   - Given multiple agents have the same event trigger
   - When the event occurs
   - Then all matching agents execute (in parallel if possible)
   - And each execution is independent
   - And one agent's failure doesn't affect others

6. **AC6: Paused Agent Event Behavior**
   - Given event-based agent is Paused
   - When event occurs
   - Then agent does NOT execute
   - And event is logged but skipped

7. **AC7: High-Frequency Event Rate Limiting**
   - Given agent event trigger fires rapidly (e.g., 50 contacts created in 1 minute)
   - When events occur
   - Then executions are queued via BullMQ
   - And rate limiting applies (max 10 executions/min per agent)
   - And circuit breaker prevents runaway execution

## Tasks / Subtasks

- [x] **Task 1: Create Event Trigger Queue & Worker (AC: 1, 2, 3, 5)**
  - [x] 1.1 Create `backend/src/jobs/agentEventTriggerJob.ts` following `agentScheduledJob.ts` pattern
  - [x] 1.2 Add queue name in `queue.config.ts`: `AGENT_EVENT_TRIGGER: 'agent-event-trigger'`
  - [x] 1.3 Create BullMQ Queue with `defaultQueueOptions`
  - [x] 1.4 Create Worker with handler to call `AgentExecutionService.executeAgent()` with trigger type 'event' and eventDetails
  - [x] 1.5 Add worker event handlers (completed, failed, active, error)
  - [x] 1.6 Pass full event context (contact/deal/form data) in job payload

- [x] **Task 2: Implement Event Listener Service (AC: 1, 2, 3)**
  - [x] 2.1 Create `backend/src/services/AgentEventListenerService.ts`
  - [x] 2.2 Implement `handleContactCreated(contact, workspaceId)` - finds matching agents, queues executions
  - [x] 2.3 Implement `handleDealStageUpdated(deal, previousStage, newStage, workspaceId)`
  - [x] 2.4 Implement `handleFormSubmitted(formData, workspaceId)`
  - [x] 2.5 Create `findMatchingAgents(workspaceId, eventType)` to query Live agents with matching event triggers
  - [x] 2.6 Use MongoDB query: `{ workspace, status: 'Live', 'triggers.type': 'event', 'triggers.config.eventType': eventType, 'triggers.enabled': true }`

- [x] **Task 3: Hook Event Listeners to CRM Operations (AC: 1, 2, 3)**
  - [x] 3.1 In `contactController.ts` create method: After successful create, call `AgentEventListenerService.handleContactCreated()`
  - [x] 3.2 In `opportunityController.ts` update method: Detect stage changes, call `AgentEventListenerService.handleDealStageUpdated()`
  - [x] 3.3 Hook form submission in `publicForm.ts`: Call `AgentEventListenerService.handleFormSubmitted()` after form stats update
  - [x] 3.4 Emit Socket.io event when agent triggered: `agent:event-triggered` with event details (in worker)

- [x] **Task 4: Implement Condition Evaluation Engine (AC: 4)**
  - [x] 4.1 Create `evaluateEventCondition(condition, eventContext)` function
  - [x] 4.2 Support operators: `equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `not_contains`, `exists`, `not_exists`
  - [x] 4.3 Support field paths: `deal.value`, `contact.title`, `form.email`, etc.
  - [x] 4.4 Return boolean - skip execution if condition evaluates to false
  - [x] 4.5 Log condition evaluation result in execution context for debugging
  - [x] 4.6 Handle missing fields gracefully (default to false, log warning)

- [x] **Task 5: Implement Rate Limiting for Event Triggers (AC: 7)**
  - [x] 5.1 Create rate limiter using Redis: `event-trigger:${agentId}:minute` key with 60s TTL
  - [x] 5.2 Max 10 executions per minute per agent (NFR78)
  - [x] 5.3 If rate limit exceeded: Queue job with delay (60 seconds)
  - [x] 5.4 Emit Socket.io event: `execution:rate-limited` with message "Rate limit reached, queued"
  - [x] 5.5 Log rate limit events for monitoring

- [x] **Task 6: Handle Paused Agents (AC: 6)**
  - [x] 6.1 In worker handler: Query agent status before execution
  - [x] 6.2 If status === 'Paused': Create AgentExecution with status 'skipped', reason 'Agent paused'
  - [x] 6.3 Do not call AgentExecutionService.executeAgent() for paused agents
  - [x] 6.4 Log event: "Event received but agent paused: [eventType]"

- [x] **Task 7: Integrate Circuit Breaker (AC: 7)**
  - [x] 7.1 Reuse circuit breaker logic from Story 3.3
  - [x] 7.2 Before execution: Check daily execution count against `restrictions.maxExecutionsPerDay`
  - [x] 7.3 If limit reached: Skip execution, log "Skipped: execution limit reached"
  - [x] 7.4 Auto-pause agent, emit `agent:auto-paused` Socket.io event
  - [x] 7.5 Do NOT auto-unpause on next event (requires manual intervention)

- [x] **Task 8: Parallel Execution for Multiple Agents (AC: 5)**
  - [x] 8.1 When multiple agents match an event: Queue jobs for all agents simultaneously
  - [x] 8.2 Each job is independent - one failure doesn't cancel others
  - [x] 8.3 Use unique jobId per execution: `event-${agentId}-${eventId}-${timestamp}`
  - [x] 8.4 Track execution count per event for analytics

- [x] **Task 9: Extend Agent Model for Event Triggers (AC: All)**
  - [x] 9.1 Add index for event trigger queries: `{ workspace: 1, status: 1, 'triggers.type': 1, 'triggers.config.eventType': 1, 'triggers.enabled': 1 }`
  - [x] 9.2 Add `eventTriggersCount` field to Agent model for analytics (optional - not added, existing indexes sufficient)

- [x] **Task 10: Add Tests (AC: All)**
  - [x] 10.1 Unit tests for condition evaluation engine
  - [x] 10.2 Unit tests for findMatchingAgents
  - [x] 10.3 Tests for event types (contact_created, deal_stage_updated, form_submitted)
  - [x] 10.4 Test multiple agents responding to same event
  - [x] 10.5 Test paused agent behavior (not finding paused agents)

## Dev Notes

### Key Difference from Story 3.3 (Scheduled)

| Aspect | Story 3.3: Scheduled | Story 3.4: Event-Based |
|--------|---------------------|------------------------|
| Trigger | BullMQ cron job | CRM operation callback |
| Timing | Based on cron | Immediate on event |
| Queue | `agent-scheduled` | `agent-event-trigger` |
| Job Registration | On agent Live status | Not needed (on-demand) |
| Rate Limit | Per-day (circuit breaker) | Per-minute + per-day |
| Condition | N/A | Pre-execution evaluation |
| Context | Agent only | Event data (contact/deal/form) |

### Architecture Pattern: Event-Driven Agent Triggering

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  CRM Operation  │────▶│ AgentEventListenerService │────▶│  BullMQ Queue   │
│  (Create/Update)│     │ (Find matching agents)    │     │ agent-event-    │
└─────────────────┘     └──────────────────────────┘     │ trigger         │
                                                          └────────┬────────┘
                                                                   │
                                   ┌───────────────────────────────┘
                                   ▼
                        ┌────────────────────┐
                        │  Event Trigger     │
                        │  Worker            │
                        │  - Rate limit check│
                        │  - Condition eval  │
                        │  - Circuit breaker │
                        │  - Execute agent   │
                        └────────────────────┘
```

### Event Trigger Configuration Schema

From Agent.ts ITriggerConfig - event trigger structure:

```typescript
{
  type: 'event',
  config: {
    eventType: 'contact_created' | 'deal_stage_updated' | 'form_submitted',
    conditions: [
      {
        field: 'deal.value',
        operator: 'greater_than',
        value: 10000
      }
    ]
  },
  enabled: true
}
```

### Event Context Structure

Pass complete event context to AgentExecutionService:

```typescript
// Contact Created Event
{
  type: 'event',
  eventDetails: {
    eventType: 'contact_created',
    contact: {
      _id: 'contact123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      title: 'CEO',
      company: 'Acme Corp',
      // ... all contact fields
    },
    timestamp: new Date(),
    triggeredBy: 'user123' // or 'system' for bulk imports
  }
}

// Deal Stage Updated Event
{
  type: 'event',
  eventDetails: {
    eventType: 'deal_stage_updated',
    deal: {
      _id: 'deal123',
      name: 'Acme Corp Enterprise',
      value: 75000,
      stage: 'Closed Won',
      // ... all deal fields
    },
    previousStage: 'Proposal',
    newStage: 'Closed Won',
    timestamp: new Date()
  }
}

// Form Submitted Event
{
  type: 'event',
  eventDetails: {
    eventType: 'form_submitted',
    form: {
      formId: 'contact-us-form',
      submittedAt: new Date(),
      fields: {
        email: 'lead@company.com',
        name: 'Jane Smith',
        company: 'Tech Corp',
        message: 'Interested in demo'
      }
    },
    contact: { /* auto-created contact if applicable */ },
    isNewContact: true
  }
}
```

### AgentEventListenerService Implementation

```typescript
// backend/src/services/AgentEventListenerService.ts
import { agentEventTriggerQueue } from '../jobs/agentEventTriggerJob';
import Agent from '../models/Agent';

export class AgentEventListenerService {

  static async handleContactCreated(
    contact: IContact,
    workspaceId: string,
    triggeredBy?: string
  ): Promise<void> {
    const matchingAgents = await this.findMatchingAgents(
      workspaceId,
      'contact_created'
    );

    for (const agent of matchingAgents) {
      // Evaluate conditions before queueing
      const conditionsMet = this.evaluateConditions(
        agent.triggers[0].config.conditions,
        { contact }
      );

      if (conditionsMet) {
        await agentEventTriggerQueue.add(
          `event-${agent._id}-${contact._id}-${Date.now()}`,
          {
            agentId: agent._id.toString(),
            workspaceId,
            eventType: 'contact_created',
            eventContext: { contact },
            timestamp: new Date()
          },
          {
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 100 }
          }
        );
      }
    }
  }

  static async findMatchingAgents(
    workspaceId: string,
    eventType: string
  ): Promise<IAgent[]> {
    return Agent.find({
      workspace: workspaceId,
      status: 'Live',
      'triggers.type': 'event',
      'triggers.config.eventType': eventType,
      'triggers.enabled': true
    });
  }

  static evaluateConditions(
    conditions: ICondition[],
    context: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(context, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private static evaluateCondition(
    fieldValue: any,
    operator: string,
    compareValue: any
  ): boolean {
    switch (operator) {
      case 'equals': return fieldValue === compareValue;
      case 'not_equals': return fieldValue !== compareValue;
      case 'greater_than': return Number(fieldValue) > Number(compareValue);
      case 'less_than': return Number(fieldValue) < Number(compareValue);
      case 'contains': return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'not_contains': return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'exists': return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists': return fieldValue === undefined || fieldValue === null;
      default: return false;
    }
  }
}
```

### Rate Limiting Implementation

Use Redis for per-minute rate limiting:

```typescript
// In agentEventTriggerJob.ts worker handler
const rateLimitKey = `event-trigger:${agentId}:minute`;
const currentCount = await redis.incr(rateLimitKey);

if (currentCount === 1) {
  // First request this minute - set TTL
  await redis.expire(rateLimitKey, 60);
}

if (currentCount > 10) {
  // Rate limit exceeded - requeue with delay
  await agentEventTriggerQueue.add(
    `event-${agentId}-${eventId}-retry`,
    jobData,
    { delay: 60000 } // Wait 60 seconds
  );

  agentExecutionNamespace.to(`workspace:${workspaceId}:agent:${agentId}`)
    .emit('execution:rate-limited', {
      agentId,
      reason: 'Rate limit exceeded (10/min)',
      retryIn: 60
    });

  return { success: false, reason: 'Rate limited' };
}
```

### CRM Hook Integration Points

**Contact Creation (contactController.ts):**
```typescript
// In createContact handler, after successful save
const contact = await Contact.create({ ...contactData, workspace: workspaceId });

// Trigger event-based agents
await AgentEventListenerService.handleContactCreated(
  contact,
  workspaceId,
  req.user._id
);
```

**Deal Stage Update (opportunityController.ts):**
```typescript
// In updateOpportunity handler, detect stage change
const existingDeal = await Opportunity.findById(dealId);
const previousStage = existingDeal.stage;
const updatedDeal = await Opportunity.findByIdAndUpdate(dealId, updateData, { new: true });

if (previousStage !== updatedDeal.stage) {
  await AgentEventListenerService.handleDealStageUpdated(
    updatedDeal,
    previousStage,
    updatedDeal.stage,
    workspaceId
  );
}
```

**Form Webhook (new endpoint):**
```typescript
// POST /api/workspaces/:workspaceId/webhooks/form-submitted
router.post('/webhooks/form-submitted', async (req, res) => {
  const { workspaceId } = req.params;
  const formData = req.body;

  // Optionally create contact from form data
  let contact = await Contact.findOne({ email: formData.email, workspace: workspaceId });
  if (!contact) {
    contact = await Contact.create({
      email: formData.email,
      firstName: formData.name?.split(' ')[0],
      lastName: formData.name?.split(' ').slice(1).join(' '),
      workspace: workspaceId,
      source: 'form_submission'
    });
  }

  await AgentEventListenerService.handleFormSubmitted(formData, contact, workspaceId);

  res.json({ success: true, contactId: contact._id });
});
```

### Socket.io Events

New events for Story 3.4:

```typescript
// In agentExecutionSocket.ts - add new event types
export interface EventTriggeredEvent {
  agentId: string;
  eventType: 'contact_created' | 'deal_stage_updated' | 'form_submitted';
  eventContext: {
    contactId?: string;
    dealId?: string;
    formId?: string;
  };
  timestamp: Date;
}

export interface ExecutionRateLimitedEvent {
  agentId: string;
  reason: string;
  retryIn: number; // seconds
}

// Emit when event triggers agent
export const emitEventTriggered = (
  workspaceId: string,
  agentId: string,
  event: EventTriggeredEvent
): void => {
  agentExecutionNamespace.to(`workspace:${workspaceId}:agent:${agentId}`)
    .emit('agent:event-triggered', event);
};
```

### Worker Implementation Pattern

```typescript
// backend/src/jobs/agentEventTriggerJob.ts
import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions, getRedisConnection } from '../events/queue/queue.config';
import { AgentExecutionService } from '../services/AgentExecutionService';
import Agent from '../models/Agent';
import AgentExecution from '../models/AgentExecution';

const redis = getRedisConnection();

export const agentEventTriggerQueue = new Queue('agent-event-trigger', defaultQueueOptions);

export const startAgentEventTriggerJob = (): void => {
  const worker = new Worker(
    'agent-event-trigger',
    async (job: Job) => {
      const { agentId, workspaceId, eventType, eventContext } = job.data;

      // 1. Check agent status
      const agent = await Agent.findById(agentId);
      if (!agent || agent.status !== 'Live') {
        await AgentExecution.create({
          workspace: workspaceId,
          agent: agentId,
          status: 'skipped',
          triggerType: 'event',
          triggerDetails: { eventType },
          error: { message: 'Agent not Live' },
          startedAt: new Date(),
          completedAt: new Date()
        });
        return { success: false, reason: 'Agent not Live' };
      }

      // 2. Rate limit check (10/min per agent)
      const rateLimitKey = `event-trigger:${agentId}:minute`;
      const count = await redis.incr(rateLimitKey);
      if (count === 1) await redis.expire(rateLimitKey, 60);

      if (count > 10) {
        // Requeue with delay
        await agentEventTriggerQueue.add(job.name + '-retry', job.data, { delay: 60000 });
        return { success: false, reason: 'Rate limited, requeued' };
      }

      // 3. Circuit breaker check (daily limit)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyCount = await AgentExecution.countDocuments({
        agent: agentId,
        startedAt: { $gte: today },
        status: { $in: ['completed', 'failed', 'running'] }
      });

      const maxPerDay = agent.restrictions?.maxExecutionsPerDay || 100;
      if (dailyCount >= maxPerDay) {
        await Agent.findByIdAndUpdate(agentId, { status: 'Paused' });
        return { success: false, reason: 'Daily limit reached, agent paused' };
      }

      // 4. Execute agent with event context
      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        {
          type: 'event',
          eventDetails: {
            eventType,
            ...eventContext
          }
        }
      );

      return { success: true, executionId: result.executionId };
    },
    defaultWorkerOptions
  );

  worker.on('completed', (job, result) => {
    console.log(`[AgentEventTrigger] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[AgentEventTrigger] Job ${job?.id} failed:`, err);
  });
};
```

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Queue Config | `backend/src/events/queue/queue.config.ts:1-91` |
| Scheduled Job (Pattern) | `backend/src/jobs/agentScheduledJob.ts` |
| Agent Model | `backend/src/models/Agent.ts` |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` |
| AgentExecutionService | `backend/src/services/AgentExecutionService.ts:358-509` |
| Socket.io Pattern | `backend/src/socket/agentExecutionSocket.ts` |
| Contact Controller | `backend/src/controllers/contactController.ts` |
| Opportunity Controller | `backend/src/controllers/opportunityController.ts` |
| Previous Story | `_bmad-output/implementation-artifacts/3-3-scheduled-trigger-execution.md` |

### NFR Compliance

- **NFR78:** Rate limiting 10 executions/min per agent - Implemented via Redis counter with TTL
- **NFR1:** 80% executions complete within 30 seconds - Leverage existing AgentExecutionService
- **NFR35:** 90% success rate - Circuit breaker prevents runaway failures
- **Queue Optimization:** Upstash Redis free tier (10K commands/day) - Minimal Redis calls

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.4] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Background Jobs] - Queue patterns
- [Source: _bmad-output/implementation-artifacts/3-3-scheduled-trigger-execution.md] - Previous story patterns
- [Source: backend/src/jobs/agentScheduledJob.ts] - BullMQ job pattern
- [Source: backend/src/services/AgentExecutionService.ts:358-509] - Execution service API

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

