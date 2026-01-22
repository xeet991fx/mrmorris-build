# Story 3.3: Scheduled Trigger Execution

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to run automatically on schedules,
So that I can automate recurring workflows without manual intervention.

## Acceptance Criteria

1. **AC1: Daily Schedule Execution**
   - Given an agent has scheduled trigger: Daily at 9 AM
   - When the system clock reaches 9 AM
   - Then a BullMQ job is created: `agent-scheduled-execution`
   - And the job executes the agent automatically
   - And execution log records trigger type: "scheduled"

2. **AC2: Weekly Schedule Execution**
   - Given an agent has weekly schedule: Every Monday at 8 AM
   - When Monday 8 AM arrives
   - Then the agent executes automatically
   - And does not execute on other days of the week

3. **AC3: Monthly Schedule Execution**
   - Given an agent has monthly schedule: 1st of month at 10 AM
   - When the 1st of the month at 10 AM arrives
   - Then the agent executes automatically
   - And does not execute on other days

4. **AC4: Overlapping Execution Handling**
   - Given a scheduled execution is running when next schedule arrives
   - When next execution time occurs
   - Then the new execution is queued (not skipped)
   - And executes after current run completes
   - And user sees notification: "Scheduled execution queued (previous run still active)"

5. **AC5: Paused Agent Behavior**
   - Given an agent is Paused
   - When scheduled time arrives
   - Then the agent does NOT execute
   - And schedule remains configured but inactive
   - And execution log shows: "Skipped: Agent paused"

6. **AC6: Circuit Breaker Integration**
   - Given agent hits circuit breaker (100 executions/day)
   - When scheduled time arrives
   - Then execution is blocked
   - And agent auto-pauses
   - And user receives notification: "Agent paused: execution limit reached"

7. **AC7: Failure Handling & Alerts**
   - Given scheduled execution fails
   - When error occurs
   - Then error is logged with timestamp and details
   - And next scheduled execution still runs (failure doesn't disable schedule)
   - And after 3 consecutive failures, user receives alert

## Tasks / Subtasks

- [x] **Task 1: Create Scheduled Agent Queue & Worker (AC: 1, 2, 3)**
  - [x] 1.1 Create `backend/src/jobs/agentScheduledJob.ts` following `emailSyncJob.ts` pattern
  - [x] 1.2 Define queue name in `queue.config.ts`: `AGENT_SCHEDULED: 'agent-scheduled'`
  - [x] 1.3 Create BullMQ Queue with `defaultQueueOptions`
  - [x] 1.4 Create Worker with handler to call `AgentExecutionService.executeAgent()` with trigger type 'scheduled'
  - [x] 1.5 Add worker event handlers (completed, failed, active, error)

- [x] **Task 2: Implement Schedule Registration System (AC: 1, 2, 3)**
  - [x] 2.1 Create `registerAgentSchedule(agentId, cronExpression)` function
  - [x] 2.2 Use BullMQ `repeat` option with cron pattern (e.g., `{ pattern: '0 9 * * *' }`)
  - [x] 2.3 Set unique `jobId: \`scheduled-${agentId}\`` to prevent duplicate registrations
  - [x] 2.4 Create `removeAgentSchedule(agentId)` function using `removeRepeatableByKey()`
  - [x] 2.5 Create `updateAgentSchedule(agentId, newCronExpression)` (remove + register)

- [x] **Task 3: Hook Schedule Registration to Agent Lifecycle (AC: 1, 5)**
  - [x] 3.1 On agent status change to 'Live': Register schedule if scheduled trigger exists
  - [x] 3.2 On agent status change to 'Paused': Remove scheduled job (cancel future executions)
  - [x] 3.3 On agent trigger update: Update schedule registration
  - [x] 3.4 On agent deletion: Remove scheduled job
  - [x] 3.5 Add schedule registration in `agentController.ts` status update handlers

- [x] **Task 4: Handle Overlapping/Queued Executions (AC: 4)**
  - [x] 4.1 In worker handler: Check for existing running execution before starting
  - [x] 4.2 If execution running: Add job back to queue with 60-second delay
  - [x] 4.3 Emit Socket.io event: `execution:queued` with message "Previous run still active"
  - [x] 4.4 Log queued execution in AgentExecution with status 'queued'

- [x] **Task 5: Integrate Circuit Breaker Check (AC: 6)**
  - [x] 5.1 Before execution: Check daily execution count against `restrictions.maxExecutionsPerDay`
  - [x] 5.2 If limit reached: Skip execution, log "Skipped: execution limit reached"
  - [x] 5.3 Auto-pause agent by updating status to 'Paused'
  - [x] 5.4 Emit Socket.io event: `agent:auto-paused` with reason
  - [x] 5.5 Remove scheduled job when auto-paused

- [x] **Task 6: Implement Failure Tracking & Alerts (AC: 7)**
  - [x] 6.1 Track consecutive failures in Agent model (add `consecutiveFailures` field)
  - [x] 6.2 On success: Reset `consecutiveFailures` to 0
  - [x] 6.3 On failure: Increment `consecutiveFailures`
  - [x] 6.4 If `consecutiveFailures >= 3`: Send alert notification
  - [x] 6.5 Use existing notification system or Socket.io for alerts

- [x] **Task 7: Create Paused Agent Skip Logic (AC: 5)**
  - [x] 7.1 In worker handler: Query agent status before execution
  - [x] 7.2 If status === 'Paused': Create AgentExecution with status 'skipped', reason 'Agent paused'
  - [x] 7.3 Do not call AgentExecutionService.executeAgent() for paused agents
  - [x] 7.4 Log skip event with timestamp

- [x] **Task 8: Start Job on Server Initialization (AC: All)**
  - [x] 8.1 Add `startAgentScheduledJob()` call in `server.ts` after other job initializations
  - [x] 8.2 On server startup: Query all Live agents with scheduled triggers and register jobs
  - [x] 8.3 Handle graceful shutdown: Close queue connections properly

- [x] **Task 9: Add Tests (AC: All)** (Recommend TEA testarch-automate)
  - [x] 9.1 Unit tests for schedule registration/removal
  - [x] 9.2 Unit tests for circuit breaker logic
  - [x] 9.3 Integration tests for scheduled execution flow
  - [x] 9.4 Test overlapping execution queuing

## Dev Notes

### Key Difference from Story 3.2 (/trigger)

| Aspect | Story 3.2: Manual Trigger | Story 3.3: Scheduled Trigger |
|--------|--------------------------|------------------------------|
| Trigger | User clicks "Run Now" | BullMQ cron job fires |
| Timing | Immediate | Based on cron expression |
| Queue | N/A (direct call) | `agent-scheduled` queue |
| Duplicate Check | 409 Conflict | Queue with delay |
| Registration | N/A | On agent Live status |
| Cancellation | N/A | On agent Pause/Delete |

### Architecture Pattern: BullMQ Repeatable Jobs

From `emailSyncJob.ts:21-41` - This is the EXACT pattern to follow:

```typescript
// Create queue
const agentScheduledQueue = new Queue('agent-scheduled', defaultQueueOptions);

// Register a repeatable job with cron pattern
await agentScheduledQueue.add(
  `scheduled-${agentId}`,
  { agentId, workspaceId },
  {
    repeat: {
      pattern: '0 9 * * *', // Cron: Daily at 9 AM
    },
    jobId: `scheduled-${agentId}`, // CRITICAL: Prevents duplicate registrations
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  }
);

// Remove a repeatable job
const repeatableJobs = await agentScheduledQueue.getRepeatableJobs();
const jobToRemove = repeatableJobs.find(j => j.id === `scheduled-${agentId}`);
if (jobToRemove) {
  await agentScheduledQueue.removeRepeatableByKey(jobToRemove.key);
}
```

### Cron Expression Reference

From architecture document - schedule types to support:

| Schedule | Cron Expression |
|----------|-----------------|
| Daily 9 AM | `0 9 * * *` |
| Weekly Monday 8 AM | `0 8 * * 1` |
| Monthly 1st at 10 AM | `0 10 1 * *` |
| Every hour | `0 * * * *` |
| Every 5 minutes | `*/5 * * * *` |

**IMPORTANT:** Cron expressions are in UTC. Frontend should convert user's local time to UTC before storing.

### Existing Code Patterns to Follow

**Queue Config (from queue.config.ts:1-91):**
```typescript
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';

// Add new queue name constant
export const QUEUE_NAMES = {
  // ... existing queues
  AGENT_SCHEDULED: 'agent-scheduled',
} as const;
```

**Worker Pattern (from emailSyncJob.ts:52-152):**
```typescript
const agentScheduledWorker = new Worker(
  'agent-scheduled',
  async (job) => {
    const { agentId, workspaceId } = job.data;

    // 1. Query agent to verify still Live
    const Agent = (await import('../models/Agent')).default;
    const agent = await Agent.findById(agentId);

    if (!agent || agent.status !== 'Live') {
      // Create skipped execution record
      return { success: false, reason: 'Agent not Live' };
    }

    // 2. Check for running execution (overlapping)
    const AgentExecution = (await import('../models/AgentExecution')).default;
    const runningExecution = await AgentExecution.findOne({
      agent: agentId,
      status: { $in: ['pending', 'running'] }
    });

    if (runningExecution) {
      // Queue with delay
      await agentScheduledQueue.add(
        `scheduled-${agentId}`,
        { agentId, workspaceId },
        { delay: 60000 } // 60 seconds
      );
      return { success: false, reason: 'Execution queued - previous run active' };
    }

    // 3. Execute agent
    const AgentExecutionService = (await import('../services/AgentExecutionService')).AgentExecutionService;
    const result = await AgentExecutionService.executeAgent(
      agentId,
      workspaceId,
      { type: 'scheduled' }
    );

    return { success: true, executionId: result.executionId };
  },
  defaultWorkerOptions
);
```

### Agent Model Changes

Add to `backend/src/models/Agent.ts`:

```typescript
// Story 3.3: Track consecutive failures for alerting
consecutiveFailures?: number;
lastScheduledExecution?: Date;
```

### Trigger Schema (Already Exists - from Agent.ts:4-9)

```typescript
export interface ITriggerConfig {
  type: 'manual' | 'scheduled' | 'event';
  config: any; // For scheduled: { cron: string }
  enabled?: boolean;
  createdAt?: Date;
}
```

**Scheduled Trigger Config Structure:**
```typescript
{
  type: 'scheduled',
  config: {
    cron: '0 9 * * *',       // Cron expression (UTC)
    timezone: 'America/New_York' // Optional for display purposes
  },
  enabled: true
}
```

### Integration with AgentExecutionService

From `AgentExecutionService.ts:358-361`:
```typescript
static async executeAgent(
  agentId: string,
  workspaceId: string,
  trigger: { type: 'manual' | 'scheduled' | 'event'; eventDetails?: Record<string, any> },
)
```

**Call from scheduled job:**
```typescript
await AgentExecutionService.executeAgent(
  agentId,
  workspaceId,
  { type: 'scheduled' }
);
```

### Socket.io Events (from Story 3.2)

Reuse the existing namespace from `agentExecutionSocket.ts`:
- `execution:started`
- `execution:progress`
- `execution:completed`
- `execution:failed`

**New events for Story 3.3:**
- `execution:queued` - When scheduled execution is queued due to overlap
- `agent:auto-paused` - When agent hits circuit breaker

### Circuit Breaker Logic

From architecture document and Agent model:
```typescript
// Check daily execution count
const today = new Date();
today.setHours(0, 0, 0, 0);

const dailyExecutions = await AgentExecution.countDocuments({
  agent: agentId,
  startedAt: { $gte: today },
  status: { $in: ['completed', 'failed', 'running'] }
});

const maxPerDay = agent.restrictions?.maxExecutionsPerDay || 100;

if (dailyExecutions >= maxPerDay) {
  // Auto-pause agent
  await Agent.findByIdAndUpdate(agentId, { status: 'Paused' });

  // Remove scheduled job
  await removeAgentSchedule(agentId);

  // Emit notification
  agentExecutionNamespace.to(`workspace:${workspaceId}:agent:${agentId}`)
    .emit('agent:auto-paused', { agentId, reason: 'Daily execution limit reached' });

  return { success: false, reason: 'Execution limit reached' };
}
```

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Queue Config | `backend/src/events/queue/queue.config.ts:1-91` |
| Email Sync Job (Pattern) | `backend/src/jobs/emailSyncJob.ts:1-209` |
| Agent Model | `backend/src/models/Agent.ts:1-150` |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` |
| AgentExecutionService | `backend/src/services/AgentExecutionService.ts:358-509` |
| Socket.io Pattern | `backend/src/socket/agentExecutionSocket.ts` |
| Server Initialization | `backend/src/server.ts` |
| Previous Story | `_bmad-output/implementation-artifacts/3-2-manual-trigger-execution.md` |

### Upstash Redis Optimization

From `queue.config.ts:71-74` - Worker options are already optimized:
```typescript
drainDelay: 30000, // 30 seconds between polls when queue is empty
stalledInterval: 60000, // Check for stalled jobs every 60s
```

**Keep these settings** to stay within Upstash free tier (10K commands/day).

### Server Startup Registration

In `server.ts`, add after other job starts:
```typescript
// Story 3.3: Register scheduled jobs for all Live agents
import { startAgentScheduledJob, registerAllLiveAgentSchedules } from './jobs/agentScheduledJob';

// Start the worker
startAgentScheduledJob();

// Register schedules for all existing Live agents with scheduled triggers
await registerAllLiveAgentSchedules();
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.3] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Background Jobs (BullMQ)] - Queue patterns
- [Source: backend/src/events/queue/queue.config.ts:1-91] - Queue configuration
- [Source: backend/src/jobs/emailSyncJob.ts:1-209] - Repeatable job pattern
- [Source: backend/src/services/AgentExecutionService.ts:358-509] - Execution service
- [Source: backend/src/models/Agent.ts:1-150] - Agent and trigger schema
- [Source: _bmad-output/implementation-artifacts/3-2-manual-trigger-execution.md] - Previous story context

## Dev Agent Record

### Agent Model Used

Claude claude-opus-4-5-thinking (Amelia - Dev Agent)

### Debug Log References

- TypeScript compilation: PASSED (no errors)
- Test execution: PASSED (agentScheduled.test.ts - exit code 0)

### Completion Notes List

- Created `agentScheduledJob.ts` with complete BullMQ repeatable job implementation
- Added `AGENT_SCHEDULED` queue constant to `queue.config.ts`
- Implemented `registerAgentSchedule`, `removeAgentSchedule`, `updateAgentSchedule` functions
- Added Agent model fields: `consecutiveFailures` (Number, default: 0), `lastScheduledExecution` (Date)
- Added index for scheduled trigger queries: `{ status: 1, 'triggers.type': 1, 'triggers.enabled': 1 }`
- Integrated schedule registration in `agentController.ts`:
  - On status change to Live: Register schedule
  - On status change to Paused/Draft: Remove schedule
  - On trigger update (Live agent): Update schedule
  - On agent delete: Remove schedule
- Worker handles all ACs: paused skip, circuit breaker, overlapping execution queue, failure tracking
- Added Socket.io event types: `ExecutionQueuedEvent`, `AgentAutoPausedEvent`, `AgentFailureAlertEvent`
- Added helper functions: `emitExecutionQueued`, `emitAgentAutoPaused`, `emitAgentFailureAlert`
- Server startup: Calls `startAgentScheduledJob()` and `registerAllLiveAgentSchedules()`
- Comprehensive test suite created with 12 test cases covering all ACs

### File List

**New Files:**
- backend/src/jobs/agentScheduledJob.ts
- backend/src/tests/agentScheduled.test.ts

**Modified Files:**
- backend/src/events/queue/queue.config.ts (added AGENT_SCHEDULED constant)
- backend/src/models/Agent.ts (added consecutiveFailures, lastScheduledExecution fields + index)
- backend/src/controllers/agentController.ts (added schedule lifecycle hooks in updateAgent, updateAgentStatus, deleteAgent)
- backend/src/socket/agentExecutionSocket.ts (added new event types and helper functions)
- backend/src/server.ts (added agentScheduledJob import and startup calls)

## Change Log

- 2026-01-22: Story 3.3 implemented - Scheduled trigger execution with BullMQ cron jobs