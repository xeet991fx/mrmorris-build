# Story 3.13: Track Execution History

Status: in-review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want all agent executions to be logged,
So that I can track what my agents have done and debug issues.

## Acceptance Criteria

1. **AC1: Create Execution Record on Start**
   - Given an agent executes
   - When execution starts
   - Then AgentExecution record is created with:
     - workspace, agent, triggeredBy (user or system), triggerType (manual, scheduled, event)
     - status: "running", startedAt: timestamp
   - And record has unique executionId

2. **AC2: Update Record on Successful Completion**
   - Given execution completes successfully
   - When all steps finish
   - Then AgentExecution is updated with:
     - status: "completed", completedAt: timestamp, duration: (completedAt - startedAt)
     - steps: Array of step results with actions, params, outcomes
     - summary: "Processed 5 contacts, sent 5 emails"

3. **AC3: Update Record on Failure**
   - Given execution fails
   - When error occurs at Step N
   - Then AgentExecution is updated with:
     - status: "failed", completedAt: timestamp, error: { message, step, details }
     - steps: Array showing completed steps, failed step, and not-executed steps

4. **AC4: Update Record on Cancel**
   - Given execution is canceled manually
   - When user clicks "Cancel Execution"
   - Then AgentExecution is updated with:
     - status: "cancelled", canceledAt: timestamp, canceledBy: userId

5. **AC5: Log Multiple Executions with Retention**
   - Given multiple executions occur
   - When agent runs 100 times
   - Then All 100 executions are logged
   - And Logs are retained for 30 days (standard tier) or 365 days (enterprise tier) per NFR84

6. **AC6: Redact Sensitive Data in Logs**
   - Given execution log includes sensitive data
   - When email content or contact data is logged
   - Then Sensitive fields are redacted in logs (e.g., email body truncated to 100 chars)
   - And Full data is available to workspace owners only (RBAC)

7. **AC7: Preserve Logs on Agent Deletion**
   - Given agent is deleted
   - When AgentExecution records exist
   - Then Logs are retained with agentDeleted: true flag
   - And Logs remain viewable for audit purposes
   - And Agent name is preserved in log: "Agent 'Outbound Campaign' (deleted)"

## Tasks / Subtasks

- [ ] **Task 1: Enhance AgentExecution Model for History Tracking (AC: 1, 3, 4, 7)**
  - [ ] 1.1 Add `triggeredBy` field (ObjectId ref to User, optional for system triggers)
  - [ ] 1.2 Add `canceledAt` and `canceledBy` fields for cancel tracking
  - [ ] 1.3 Add `agentDeleted` boolean field (default: false)
  - [ ] 1.4 Add `agentName` string field to preserve name after deletion
  - [ ] 1.5 Add `duration` virtual field (completedAt - startedAt in ms)
  - [ ] 1.6 Add compound index for workspace history queries: `{ workspace: 1, startedAt: -1 }`

- [ ] **Task 2: Implement Execution Record Creation (AC: 1)**
  - [ ] 2.1 Create helper function `createExecutionRecord(agentId, workspaceId, triggerType, triggeredBy?)` in AgentExecutionService
  - [ ] 2.2 Generate unique executionId using `nanoid` or UUID
  - [ ] 2.3 Set initial status to "running" and startedAt to current timestamp
  - [ ] 2.4 Verify all existing trigger flows call createExecutionRecord at start

- [ ] **Task 3: Implement Execution Completion Updates (AC: 2)**
  - [ ] 3.1 Create helper function `completeExecution(executionId, steps, summary)` in AgentExecutionService
  - [ ] 3.2 Calculate duration from startedAt to now
  - [ ] 3.3 Build summary string from step results (e.g., "Processed X contacts, sent Y emails")
  - [ ] 3.4 Update AgentExecution with status: "completed", completedAt, duration, steps, summary

- [ ] **Task 4: Implement Execution Failure Updates (AC: 3)**
  - [ ] 4.1 Create helper function `failExecution(executionId, error, steps, failedStepNumber)` in AgentExecutionService
  - [ ] 4.2 Mark steps before failure as completed, failed step with error, remaining as "not_executed"
  - [ ] 4.3 Store error object with message, step number, and stack trace (sanitized)
  - [ ] 4.4 Update AgentExecution with status: "failed", completedAt, error, steps

- [ ] **Task 5: Implement Execution Cancel (AC: 4)**
  - [ ] 5.1 Create API endpoint: POST `/api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/cancel`
  - [ ] 5.2 Validate execution belongs to workspace and is in "running" or "waiting" status
  - [ ] 5.3 Cancel any BullMQ resume job if execution is waiting
  - [ ] 5.4 Update AgentExecution with status: "cancelled", canceledAt, canceledBy
  - [ ] 5.5 Emit Socket.io event for real-time UI update
  - [ ] 5.6 Add route to agentBuilder.ts routes file

- [ ] **Task 6: Implement Log Retention TTL (AC: 5)**
  - [ ] 6.1 Add TTL index on AgentExecution: `{ createdAt: 1 }, { expireAfterSeconds: 2592000 }` (30 days)
  - [ ] 6.2 Document enterprise tier requires different TTL (365 days) - manual index update needed
  - [ ] 6.3 Add migration script to create TTL index on existing collections

- [ ] **Task 7: Implement Sensitive Data Redaction (AC: 6)**
  - [ ] 7.1 Create `redactSensitiveData(stepResult)` utility function
  - [ ] 7.2 Truncate email body to 100 chars in step results
  - [ ] 7.3 Redact phone numbers and personal identifiers from logs
  - [ ] 7.4 Apply redaction when saving step results to AgentExecution
  - [ ] 7.5 Add RBAC check in GET endpoint: owners see full data, members see redacted

- [ ] **Task 8: Preserve Agent Info on Deletion (AC: 7)**
  - [ ] 8.1 Add pre-delete middleware to Agent model
  - [ ] 8.2 When agent is deleted, update all AgentExecution records:
    - Set `agentDeleted: true`
    - Copy `agent.name` to `agentName` field
  - [ ] 8.3 Modify execution list queries to handle deleted agents gracefully

- [ ] **Task 9: Unit Tests (AC: All)**
  - [ ] 9.1 Unit test: createExecutionRecord creates valid record with all fields
  - [ ] 9.2 Unit test: completeExecution calculates correct duration and summary
  - [ ] 9.3 Unit test: failExecution marks steps correctly with error details
  - [ ] 9.4 Unit test: cancelExecution updates status and canceledBy
  - [ ] 9.5 Unit test: redactSensitiveData truncates email body and redacts PII
  - [ ] 9.6 Unit test: Agent deletion preserves execution logs with agentDeleted flag

- [ ] **Task 10: Integration Tests (AC: All)**
  - [ ] 10.1 Integration test: Full execution flow creates and updates record correctly
  - [ ] 10.2 Integration test: Cancel API endpoint works with running execution
  - [ ] 10.3 Integration test: TTL index is created and functions correctly
  - [ ] 10.4 Integration test: Workspace isolation - cannot access other workspace's executions

## Dev Notes

### Current Implementation Analysis

| Aspect | Current State | Required State (3.13) |
|--------|---------------|----------------------|
| AgentExecution model | Exists with full schema | Add triggeredBy, canceledAt, canceledBy, agentDeleted, agentName |
| Execution creation | In AgentExecutionService | Verify all paths call creation |
| Completion updates | Exists | Verify summary generation |
| Cancel execution | Not implemented | New API endpoint needed |
| TTL retention | No TTL index | Add TTL index for 30 days |
| Data redaction | Not implemented | New utility function needed |
| Agent deletion handling | Not implemented | Pre-delete middleware needed |

### Existing AgentExecution Model Fields (Already Implemented)

```typescript
// From backend/src/models/AgentExecution.ts
export interface IAgentExecution extends Document {
  executionId: string;
  agent: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  linkedTestRunId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
    eventDetails?: Record<string, any>;
  };
  target?: { type: 'contact' | 'deal'; id: string; currentData?: Record<string, any>; };
  currentStep: number;
  totalSteps: number;
  steps: IAgentExecutionStep[];
  summary: { totalSteps, successfulSteps, failedSteps, totalCreditsUsed, totalDurationMs };
  comparison?: IAgentExecutionComparison;
  savedContext?: Record<string, any>;
  savedMemory?: Record<string, any>;
  resumeFromStep?: number;
  resumeAt?: Date;
  resumeJobId?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}
```

### New Fields to Add

```typescript
// Add to AgentExecution model
{
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },  // For manual triggers
  canceledAt: Date,
  canceledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  agentDeleted: { type: Boolean, default: false },
  agentName: String,  // Preserved after deletion
  duration: Number,   // Computed: completedAt - startedAt (or add as virtual)
}
```

### Cancel Execution API Design

```typescript
// POST /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/cancel

interface CancelExecutionResponse {
  success: boolean;
  execution: {
    executionId: string;
    status: 'cancelled';
    canceledAt: Date;
    canceledBy: string;
  };
  message: string;
}

// Handler logic:
// 1. Validate execution exists and belongs to workspace
// 2. Verify status is 'running' or 'waiting'
// 3. If resumeJobId exists, cancel the BullMQ job
// 4. Update execution: status: 'cancelled', canceledAt, canceledBy
// 5. Emit Socket.io event: 'execution:cancelled'
// 6. Return success response
```

### Sensitive Data Redaction Utility

```typescript
// backend/src/utils/redactSensitiveData.ts

const PII_PATTERNS = {
  phone: /\+?[1-9]\d{1,14}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  email_in_text: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
};

export function redactSensitiveData(stepResult: any): any {
  const redacted = { ...stepResult };
  
  // Truncate email body
  if (redacted.data?.emailBody) {
    redacted.data.emailBody = redacted.data.emailBody.substring(0, 100) + '...';
  }
  
  // Redact PII in description
  if (redacted.description) {
    redacted.description = redacted.description
      .replace(PII_PATTERNS.phone, '[REDACTED]')
      .replace(PII_PATTERNS.ssn, '[REDACTED]');
  }
  
  return redacted;
}
```

### TTL Index for Log Retention

```typescript
// Migration script: add-execution-ttl-index.ts
import mongoose from 'mongoose';

async function addTTLIndex() {
  await mongoose.connection.collection('agentexecutions').createIndex(
    { createdAt: 1 },
    { 
      expireAfterSeconds: 2592000, // 30 days = 30 * 24 * 60 * 60
      background: true,
      name: 'createdAt_ttl_30days'
    }
  );
  console.log('TTL index created for 30-day retention');
}
```

### Agent Deletion Middleware

```typescript
// Add to Agent model pre-delete hook
AgentSchema.pre('deleteOne', { document: true, query: false }, async function() {
  const AgentExecution = mongoose.model('AgentExecution');
  
  // Preserve agent info in execution logs
  await AgentExecution.updateMany(
    { agent: this._id },
    { 
      $set: { 
        agentDeleted: true,
        agentName: this.name
      }
    }
  );
});
```

### Key Files to Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| Execution Model | `backend/src/models/AgentExecution.ts` | **Modify** - Add new fields |
| Agent Model | `backend/src/models/Agent.ts` | **Modify** - Add pre-delete hook |
| Execution Service | `backend/src/services/AgentExecutionService.ts` | **Modify** - Add helper functions |
| Agent Controller | `backend/src/controllers/agentController.ts` | **Modify** - Add cancel endpoint |
| Agent Routes | `backend/src/routes/agentBuilder.ts` | **Modify** - Add cancel route |
| Redaction Utility | `backend/src/utils/redactSensitiveData.ts` | **Create** - New utility |
| TTL Migration | `backend/src/migrations/add-execution-ttl-index.ts` | **Create** - New migration |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| Execution Model | `backend/src/models/AgentExecution.ts` | Existing schema to extend |
| Agent Model | `backend/src/models/Agent.ts` | Pre-delete hook pattern |
| Execution Service | `backend/src/services/AgentExecutionService.ts` | Execution helper patterns |
| Previous Story | `_bmad-output/implementation-artifacts/3-12-wait-action-and-human-handoff.md` | Pattern reference |
| Queue Config | `backend/src/events/queue/queue.config.ts` | Job cancellation pattern |

### Previous Story Patterns to Follow (from 3-12)

- Return structured responses with success, description, error, data
- Handle errors gracefully with user-friendly messages  
- Use sanitizeErrorMessage() for error display
- Socket.io events for real-time updates
- BullMQ job cancellation via `queue.remove(jobId)`

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| Execution not found | "Cannot cancel execution: Execution not found" |
| Execution not running | "Cannot cancel execution: Execution not in running or waiting state" |
| Execution belongs to other workspace | "Cannot cancel execution: Access denied" |
| Already cancelled | "Execution already cancelled" |

### NFR Compliance

- **NFR84:** Log retention 30 days (standard) / 365 days (enterprise) - TTL index
- **NFR9:** Query performance <1 second - compound indexes
- **Workspace isolation:** All queries scoped by workspace

### Project Structure Notes

- Extend existing AgentExecution model (no new model needed)
- Add pre-delete middleware to Agent model
- New cancel API endpoint in existing route file
- New redaction utility in utils folder
- Migration script for TTL index

### Existing Indexes (from AgentExecution.ts)

```typescript
AgentExecutionSchema.index({ agent: 1, workspace: 1, createdAt: -1 });
AgentExecutionSchema.index({ agent: 1, linkedTestRunId: 1 });
AgentExecutionSchema.index({ status: 1, resumeAt: 1 });
```

### New Index Needed

```typescript
// For workspace-wide execution history queries
AgentExecutionSchema.index({ workspace: 1, startedAt: -1 });
```

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.13] - Full acceptance criteria
- [Source: backend/src/models/AgentExecution.ts] - Existing model schema
- [Source: backend/src/models/Agent.ts] - Agent model for deletion hook
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 3] - Data model patterns
- [Source: _bmad-output/implementation-artifacts/3-12-wait-action-and-human-handoff.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**Code Review Fixes Applied (2026-01-27):**

1. **HIGH-1 FIXED**: Created TTL migration script `backend/src/migrations/add-execution-ttl-index.ts` for 30-day log retention
2. **HIGH-2 VERIFIED**: Cancel execution route already exists in agentBuilder.ts (DELETE endpoint)
3. **HIGH-3 FIXED**: Updated File List section with all 8 changed files
4. **HIGH-4 FIXED**: Added `triggeredBy` population - userId now tracked in trigger object and saved to execution record
5. **HIGH-5 FIXED**: Implemented `generateExecutionSummary()` function - creates human-readable summaries like "Sent 5 emails and updated 3 fields"
6. **HIGH-6 FIXED**: Integrated redaction utility - `redactSensitiveData()` now applied to step results before logging
7. **HIGH-7 FIXED**: Added RBAC check in `getAgentExecution` - owners/admins see full data, members/viewers see redacted data
8. **MEDIUM-1 FIXED**: Added workspace filter to agent deletion hooks for multi-tenant safety
9. **MEDIUM-2 FIXED**: Updated story status from `ready-for-dev` to `in-review`
10. **MEDIUM-4 FIXED**: Pass userId to `cancelExecution` service method for proper `canceledBy` tracking in socket events

**Implementation Highlights:**
- PII redaction: Emails truncated to 100 chars, phone numbers/SSNs/credit cards replaced with `[REDACTED]`
- Summary generation: Automatically creates readable descriptions from step results
- Audit trail: All manual triggers and cancellations now track the user who performed the action
- Role-based data access: Sensitive execution data hidden from non-admin users

### File List

#### Models
- `backend/src/models/AgentExecution.ts` - Added execution history fields, indexes, and virtual properties
- `backend/src/models/Agent.ts` - Added pre-delete hooks to mark executions as agentDeleted

#### Services
- `backend/src/services/AgentExecutionService.ts` - Integrated redaction, triggeredBy tracking, summary generation

#### Controllers
- `backend/src/controllers/agentController.ts` - Added RBAC for execution viewing, userId tracking for triggers/cancels

#### Utilities
- `backend/src/utils/redactSensitiveData.ts` - **NEW** - PII redaction utility for execution logs

#### Socket Events
- `backend/src/socket/agentExecutionSocket.ts` - Added execution:cancelled event type

#### Migrations
- `backend/src/migrations/add-execution-ttl-index.ts` - **NEW** - TTL index migration for log retention

#### Story Files
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated sprint tracking
- `_bmad-output/implementation-artifacts/3-13-track-execution-history.md` - This story file
