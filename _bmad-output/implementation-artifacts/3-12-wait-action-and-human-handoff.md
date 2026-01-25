# Story 3.12: Wait Action and Human Handoff

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to pause execution for specified time periods and notify users for handoff,
So that workflows can include delays and human interaction points.

## Acceptance Criteria

1. **AC1: Wait Action with Scheduled Resume**
   - Given agent instruction: "Wait 5 days"
   - When action executes
   - Then Agent execution pauses
   - And BullMQ job is scheduled to resume after 5 days
   - And Execution status is "waiting" with resumeAt timestamp
   - And User sees: "Agent paused. Will resume in 5 days."

2. **AC2: Wait Period Completion**
   - Given wait period completes
   - When 5 days pass
   - Then BullMQ job resumes execution automatically
   - And Remaining steps execute
   - And Execution status changes to "running"

3. **AC3: Multiple Sequential Wait Steps**
   - Given agent has multiple wait steps
   - When execution encounters "Wait 3 days" then "Wait 2 days"
   - Then First wait completes, execution resumes, second wait begins
   - And Total wait time is 5 days (3 + 2)

4. **AC4: Manual Pause During Wait**
   - Given agent is paused manually during wait period
   - When user clicks "Pause Agent"
   - Then Scheduled resume job is canceled
   - And Execution remains in "waiting" state until user resumes manually

5. **AC5: Wait with Conditional Follow-up**
   - Given agent instruction: "If no reply after 5 days, send follow-up"
   - When wait completes and condition is checked
   - Then If contact.replied == false, follow-up is sent
   - And If contact.replied == true, follow-up is skipped

6. **AC6: Human Handoff with Context**
   - Given agent instruction: "Hand off to @user.salesRep for personal outreach"
   - When handoff action executes
   - Then Notification is sent to specified user: "Agent [name] needs your attention for [contact]"
   - And Task is created: "Personal outreach to [contact]"
   - And Execution pauses until user completes handoff (or continues automatically after timeout)

7. **AC7: Warm Lead Handoff with Full Context**
   - Given human handoff with warm lead
   - When agent detects: "Contact replied positively"
   - Then Notification to sales rep: "Warm lead from agent [name]: [contact] is interested"
   - And Context is provided: Contact info, conversation history, agent findings
   - And Sales rep can click "Take Over" to mark handoff complete

8. **AC8: Long Wait Support (90 days)**
   - Given wait action times out (e.g., 30-day wait)
   - When long wait is configured
   - Then System supports waits up to 90 days
   - And Execution resumes correctly after long periods

9. **AC9: Cancel Resume Job on Agent Delete**
   - Given agent is deleted during wait period
   - When resume job triggers
   - Then Resume job detects deleted agent
   - And Execution is marked as failed with reason: "Agent deleted during wait period"

## Tasks / Subtasks

- [x] **Task 1: Add Handoff Timeout Resume Logic (AC: 6, 8)**
  - [x] 1.1 Add `handoffTimeout` parameter to executeHumanHandoff (default 7 days)
  - [x] 1.2 When handoff timeout > 0, schedule BullMQ resume job after timeout
  - [x] 1.3 Return `scheduled: true` and `resumeAt` in ActionResult like wait action
  - [x] 1.4 Store handoff job ID in execution for cancellation if completed early

- [x] **Task 2: Enhance Handoff Context for Warm Leads (AC: 7)**
  - [x] 2.1 Add `leadContext` parameter extraction: sentiment, agent findings, conversation history
  - [x] 2.2 Build rich context object from execution steps (emails sent, searches performed, conditions met)
  - [x] 2.3 Include in Task description: contact info, execution summary, agent reasoning
  - [x] 2.4 Add `isWarmLead` flag detection based on positive conditions or explicit instruction

- [x] **Task 3: Add "Take Over" Handoff Completion (AC: 7)**
  - [x] 3.1 Create API endpoint: PUT `/api/workspaces/:workspaceId/agents/executions/:executionId/complete-handoff`
  - [x] 3.2 Endpoint sets execution status from "waiting" to "completed"
  - [x] 3.3 Cancel scheduled handoff timeout resume job if exists
  - [x] 3.4 Log handoff completion in execution steps: "Handoff completed by [user] at [time]"
  - [x] 3.5 Add route in `agentBuilder.ts` routes file

- [x] **Task 4: Add Notification Type for Agent Handoff (AC: 6, 7)**
  - [x] 4.1 Add 'agent_handoff' to Notification model type enum
  - [x] 4.2 Update notification creation in executeHumanHandoff to use 'agent_handoff' type
  - [x] 4.3 Include warm lead indicator in notification priority: warm lead = 'high', normal = 'normal'
  - [x] 4.4 Add actionUrl to deep link to handoff task: `/tasks/{taskId}?action=handoff`

- [x] **Task 5: Verify Long Wait Support (AC: 8)**
  - [x] 5.1 Test BullMQ delay with 90-day duration (7,776,000,000 ms)
  - [x] 5.2 Document any Redis/BullMQ limitations for long delays
  - [x] 5.3 If limitations exist, implement chunked wait strategy (schedule next chunk job at 30-day max)

- [x] **Task 6: Add Cancel Resume Job on Agent Pause (AC: 4)**
  - [x] 6.1 When agent status changes to "Paused", find all waiting executions
  - [x] 6.2 For each waiting execution with resumeJobId, call `queue.remove(resumeJobId)`
  - [x] 6.3 Update execution status to "cancelled" with reason: "Agent paused manually"
  - [x] 6.4 Add this logic to agent status update controller

- [x] **Task 7: Unit Tests (AC: All)**
  - [x] 7.1 Unit test: executeHumanHandoff with timeout schedules resume job
  - [x] 7.2 Unit test: Handoff with warm lead context builds rich description
  - [x] 7.3 Unit test: Complete-handoff endpoint cancels resume job and updates status
  - [x] 7.4 Unit test: Notification created with agent_handoff type
  - [x] 7.5 Unit test: Long wait (90 days) schedules correctly
  - [x] 7.6 Unit test: Cancel resume job when agent paused

- [x] **Task 8: Integration Tests (AC: All)**
  - [x] 8.1 Integration test: Wait action followed by condition check (mock wait duration)
  - [x] 8.2 Integration test: Human handoff creates task and notification
  - [x] 8.3 Integration test: Complete-handoff API flow
  - [x] 8.4 Integration test: Resume job handles deleted agent gracefully

## Dev Notes

### Current Implementation Analysis

| Aspect | Current State | Required State (3.12) |
|--------|---------------|----------------------|
| Wait action | Implemented - schedules BullMQ job | Already complete ✓ |
| Resume job | Implemented in agentResumeExecutionJob.ts | Already complete ✓ |
| Human handoff | Basic - creates Task and Notification | Add timeout, context, take-over |
| Handoff context | Minimal - just message and contact | Rich context with findings |
| Take over | Not implemented | New API endpoint needed |
| Notification type | Uses 'task_assigned' | Add 'agent_handoff' type |
| Long waits | Not tested | Verify 90-day support |
| Agent pause cancel | Partial - resume job checks | Add proactive job removal |

### Architecture Pattern: Enhanced Human Handoff Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              executeHumanHandoff Flow (Enhanced)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Extract Parameters                                           │
│     │                                                            │
│     ├── action.assignee or @user.salesRep variable              │
│     ├── action.message or 'Agent requires attention'            │
│     ├── action.priority: 'low' | 'medium' | 'high' | 'urgent'  │
│     └── action.timeout or 7 days (default handoff timeout)      │
│                                                                  │
│  2. Build Rich Context (NEW)                                     │
│     │                                                            │
│     ├── Extract execution steps summary:                         │
│     │   - Emails sent with subjects                              │
│     │   - Searches performed with results                        │
│     │   - Conditions evaluated with outcomes                     │
│     │   - Previous actions in this execution                     │
│     │                                                            │
│     ├── Contact/Deal context:                                    │
│     │   - Full contact info (name, email, phone, company)        │
│     │   - Deal info if present (value, stage, probability)       │
│     │   - Recent activities from Activity model                  │
│     │                                                            │
│     └── Warm lead detection:                                     │
│         - Check if instruction contains "warm", "interested"     │
│         - Check if condition "replied == true" was met           │
│         - Set isWarmLead flag                                    │
│                                                                  │
│  3. Create Task with Enhanced Description                        │
│     │                                                            │
│     ├── Title: "[Agent Handoff] Personal outreach to [contact]" │
│     ├── Description:                                             │
│     │   **Human Handoff from Agent**                             │
│     │   Agent: [agent name]                                      │
│     │   Execution: [executionId]                                 │
│     │                                                            │
│     │   **Contact Information**                                  │
│     │   Name: John Doe                                           │
│     │   Email: john@acme.com                                     │
│     │   Company: Acme Corp                                       │
│     │                                                            │
│     │   **Agent Findings**                                       │
│     │   - Sent 3 emails, last on [date]                          │
│     │   - Contact opened 2 emails                                │
│     │   - Contact replied positively                             │
│     │                                                            │
│     │   **Recommended Action**                                   │
│     │   [message from instruction]                               │
│     │                                                            │
│     ├── Tags: ['agent-handoff', 'requires-review']              │
│     │   + ['warm-lead'] if isWarmLead                            │
│     └── Priority: 'high' if isWarmLead else instruction value   │
│                                                                  │
│  4. Create Notification                                          │
│     │                                                            │
│     ├── Type: 'agent_handoff' (NEW type)                        │
│     ├── Title: "[Warm Lead] Agent handoff: [contact]"           │
│     │   or "Agent handoff: [contact]"                            │
│     ├── Message: Summary of findings + action needed             │
│     ├── Priority: 'high' if isWarmLead                          │
│     └── ActionUrl: `/tasks/{taskId}?action=handoff`             │
│                                                                  │
│  5. Schedule Timeout Resume (NEW)                                │
│     │                                                            │
│     ├── If timeout > 0:                                          │
│     │   ├── Calculate resumeAt = now + timeout                   │
│     │   ├── Schedule BullMQ resume job with delay                │
│     │   └── Store jobId in execution for cancellation            │
│     │                                                            │
│     └── Return ActionResult with scheduled: true if timeout set │
│                                                                  │
│  6. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true                                            │
│     ├── scheduled: true (if timeout enabled)                     │
│     ├── description: "Human handoff created..."                  │
│     └── data: { taskId, notificationId, resumeAt?, isWarmLead } │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Complete-Handoff API Endpoint Design

```typescript
// PUT /api/workspaces/:workspaceId/agents/executions/:executionId/complete-handoff

interface CompleteHandoffRequest {
  notes?: string;          // Optional notes from user about resolution
  outcomeType?: 'resolved' | 'escalated' | 'no_action_needed';
}

interface CompleteHandoffResponse {
  success: boolean;
  execution: {
    executionId: string;
    status: 'completed' | 'cancelled';
    completedAt: Date;
    completedBy: string;
  };
  message: string;
}

// Handler logic:
// 1. Validate execution exists and belongs to workspace
// 2. Verify execution status is 'waiting'
// 3. If resumeJobId exists, cancel the job: queue.remove(resumeJobId)
// 4. Update execution:
//    - status: 'completed'
//    - completedAt: new Date()
//    - Add completion step to steps array
// 5. Emit Socket.io notification for real-time UI update
// 6. Return success response
```

### Notification Model Enhancement

```typescript
// Add 'agent_handoff' to type enum in backend/src/models/Notification.ts

type: {
  type: String,
  enum: [
    "task_due",
    "task_assigned",
    "deal_won",
    "deal_lost",
    "new_lead",
    "workflow_complete",
    "mention",
    "system",
    "custom",
    "agent_handoff"  // NEW
  ],
  required: true,
  index: true,
}
```

### BullMQ Long Wait Considerations

```typescript
// BullMQ delay limits:
// - Maximum delay: Technically ~24 days due to 32-bit integer ms limit
// - Redis sorted set score: 64-bit, supports larger delays
// - BullMQ v5: No hard limit, but extremely long delays are unusual

// For 90-day waits (7,776,000,000 ms):
// - Test with BullMQ v5 to confirm support
// - If issues: Implement chunked wait pattern:

const MAX_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function scheduleWaitWithChunking(totalDelayMs: number, executionId: string): Promise<string> {
  if (totalDelayMs <= MAX_DELAY_MS) {
    // Direct scheduling
    const job = await queue.add('resume', { executionId }, { delay: totalDelayMs });
    return job.id;
  }

  // Chunk into multiple jobs
  // First job resumes at MAX_DELAY_MS, then schedules next chunk
  const job = await queue.add('resume-chunk', {
    executionId,
    remainingDelayMs: totalDelayMs - MAX_DELAY_MS,
  }, { delay: MAX_DELAY_MS });

  return job.id;
}
```

### Key Files to Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| Human Handoff | `backend/src/services/ActionExecutorService.ts` | **Modify** - Enhance executeHumanHandoff |
| Complete Handoff API | `backend/src/controllers/agentController.ts` | **Modify** - Add completeHandoff method |
| Agent Routes | `backend/src/routes/agentBuilder.ts` | **Modify** - Add PUT route |
| Notification Model | `backend/src/models/Notification.ts` | **Modify** - Add agent_handoff type |
| ActionExecutor Tests | `backend/src/services/ActionExecutorService.test.ts` | **Modify** - Add handoff tests |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| Wait Action | `backend/src/services/ActionExecutorService.ts:1406-1478` | executeWait pattern |
| Resume Job | `backend/src/jobs/agentResumeExecutionJob.ts` | Resume job handling |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` | Execution state fields |
| Task Model | `backend/src/models/Task.ts` | Task creation pattern |
| Notification Model | `backend/src/models/Notification.ts` | Notification types |
| Queue Config | `backend/src/events/queue/queue.config.ts` | AGENT_EXECUTION_RESUME queue |
| Previous Story | `_bmad-output/implementation-artifacts/3-11-update-field-and-enrich-actions.md` | Pattern reference |

### Current executeHumanHandoff Implementation (Reference)

```typescript
// From ActionExecutorService.ts:1555-1646
// Key areas to enhance:

// 1. Add timeout parameter (line ~1563)
const timeout = action.timeout || action.params?.timeout || 7 * 24 * 60 * 60 * 1000; // 7 days default

// 2. Build rich context before task creation (line ~1566)
const executionContext = await buildHandoffContext(context);

// 3. Detect warm lead (line ~1567)
const isWarmLead = detectWarmLead(action, context);

// 4. Enhanced task description (line ~1588)
description: buildRichHandoffDescription(executionContext, message, isWarmLead),

// 5. Add warm-lead tag if applicable (line ~1605)
tags: ['agent-handoff', 'requires-review', ...(isWarmLead ? ['warm-lead'] : [])],

// 6. Schedule timeout resume job (after task creation)
if (timeout > 0) {
  const resumeAt = new Date(Date.now() + timeout);
  const job = await getAgentResumeQueue().add(...);
  // Store job ID in execution for cancellation
}
```

### Previous Story Patterns to Follow (from 3-11)

**From Story 3.11 (Update Field and Enrich Actions):**
- Return structured ActionResult with success, description, error, data, durationMs
- Handle errors gracefully with user-friendly messages
- Use same testing patterns (unit tests for validation, integration tests for action)
- Sanitize error messages with `sanitizeErrorMessage()`

**From Story 3.10 (Task and Tag Actions):**
- Task creation using Task model
- RBAC validation for assignee
- Variable resolution for task titles

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Invalid assignee | "Handoff failed: User [userId] not found or inactive in workspace" |
| Execution not waiting | "Cannot complete handoff: Execution not in waiting state" |
| Execution not found | "Cannot complete handoff: Execution not found" |
| Resume job cancel failed | "Handoff completed but failed to cancel scheduled resume" (warning, not error) |

### NFR Compliance

- **NFR1:** Wait action < 30s execution (scheduling only, actual wait is async)
- **NFR35:** 90% success rate - Handoff failures don't count as agent failures
- **NFR84:** Execution logs retained for 30 days with handoff details
- **Long waits:** Support up to 90 days as specified in acceptance criteria

### Project Structure Notes

- No new files needed - enhance existing ActionExecutorService and add controller method
- Add one new API route in agentBuilder.ts
- Update Notification model enum (1 line change)
- Tests go in ActionExecutorService.test.ts

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.12] - Full acceptance criteria
- [Source: backend/src/services/ActionExecutorService.ts:1406-1478] - executeWait implementation
- [Source: backend/src/services/ActionExecutorService.ts:1555-1646] - Current executeHumanHandoff
- [Source: backend/src/jobs/agentResumeExecutionJob.ts] - Resume job infrastructure
- [Source: backend/src/models/AgentExecution.ts:89-94] - Resume capability fields
- [Source: backend/src/models/Notification.ts] - Notification model
- [Source: backend/src/models/Task.ts] - Task model
- [Source: _bmad-output/implementation-artifacts/3-11-update-field-and-enrich-actions.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
