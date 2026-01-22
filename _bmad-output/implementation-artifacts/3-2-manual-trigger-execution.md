# Story 3.2: Manual Trigger Execution

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want to manually trigger agent execution on demand,
So that I can run agents when I need them without waiting for schedules.

## Acceptance Criteria

1. **AC1: Immediate Execution on "Run Now"**
   - Given I have an agent in Live or Draft status
   - When I click "Run Now" button
   - Then the agent executes immediately
   - And I see a loading indicator: "Agent is running..."
   - And execution starts within 2 seconds

2. **AC2: Trigger Configuration Applied**
   - Given agent has manual trigger configured
   - When I trigger execution
   - Then the agent uses the trigger configuration
   - And if trigger has target filters (e.g., "contacts created today"), those are applied

3. **AC3: Success Completion Feedback**
   - Given agent execution completes successfully
   - When execution finishes
   - Then I see success message: "Agent completed successfully. Processed X contacts."
   - And I see a link to "View Execution Log"
   - And execution appears in execution history

4. **AC4: Failure Handling**
   - Given agent execution fails
   - When execution encounters error
   - Then I see error message: "Agent failed: [error details]"
   - And I see option to "View Error Log" and "Retry Execution"
   - And agent status remains Live (doesn't auto-pause for manual failures)

5. **AC5: Duplicate Execution Prevention**
   - Given I trigger an agent already running
   - When I click "Run Now"
   - Then I see message: "Agent is already running. Wait for current execution to complete."
   - And current execution ID is shown
   - And new execution is not started (prevent duplicate runs)

6. **AC6: RBAC for Manual Trigger**
   - Given I am a workspace member (not owner/admin)
   - When I try to trigger an agent
   - Then I can trigger agents with manual execution permission (FR57)
   - And I cannot trigger agents without permission (see error message)

## Tasks / Subtasks

- [x] **Task 1: Create Manual Trigger API Endpoint (AC: 1, 2, 5)**
  - [x] 1.1 Create POST `/api/workspaces/:workspaceId/agents/:agentId/trigger` route
  - [x] 1.2 Accept both Live AND Draft agent status (differs from /execute)
  - [x] 1.3 Implement duplicate execution check (query AgentExecution for status: 'pending' | 'running')
  - [x] 1.4 Return 409 Conflict with current execution ID if already running
  - [x] 1.5 Apply trigger configuration filters if present
  - [x] 1.6 Return execution ID immediately (async execution)
  - [x] 1.7 Add `triggerAgentSchema` validation

- [x] **Task 2: Update RBAC for Manual Trigger (AC: 6)**
  - [x] 2.1 Allow 'member' role to trigger agents (not just owner/admin)
  - [x] 2.2 Deny 'viewer' role from triggering agents
  - [x] 2.3 Add permission check for agent-level trigger permission if configured

- [x] **Task 3: Real-time Status Updates via Socket.io (AC: 1, 3, 4)**
  - [x] 3.1 Create agent execution namespace: `/agent-execution`
  - [x] 3.2 Emit `execution:started` event when execution begins
  - [x] 3.3 Emit `execution:progress` event for each step completion
  - [x] 3.4 Emit `execution:completed` event with success message and processed count
  - [x] 3.5 Emit `execution:failed` event with error details
  - [x] 3.6 Workspace-scoped rooms: `workspace:${workspaceId}:agent:${agentId}`

- [x] **Task 4: Frontend "Run Now" Button Component (AC: 1, 3, 4, 5)**
  - [x] 4.1 Create `RunNowButton` component with loading state
  - [x] 4.2 Show loading indicator: "Agent is running..." during execution
  - [x] 4.3 Handle 409 Conflict response (show "already running" message)
  - [x] 4.4 Connect to Socket.io for real-time status updates
  - [x] 4.5 Show toast notification on completion/failure

- [x] **Task 5: Frontend Execution Result Toast/Notification (AC: 3, 4)**
  - [x] 5.1 Success toast: "Agent completed successfully. Processed X contacts."
  - [x] 5.2 Include "View Execution Log" link in toast
  - [x] 5.3 Error toast: "Agent failed: [error details]"
  - [x] 5.4 Include "View Error Log" and "Retry" actions on error

- [ ] **Task 6: Add Tests (AC: All)** (Deferred - recommend running TEA testarch-automate)
  - [ ] 6.1 Unit tests for trigger endpoint (status check, duplicate prevention, RBAC)
  - [ ] 6.2 Integration tests for Socket.io events
  - [ ] 6.3 Frontend component tests for RunNowButton

## Dev Notes

### Key Difference from Story 3.1 (/execute)

| Aspect | Story 3.1: /execute | Story 3.2: /trigger |
|--------|---------------------|---------------------|
| Agent Status | Live only | Live OR Draft |
| RBAC | Owner/Admin only | Members can trigger |
| Execution | Synchronous (returns full result) | Async (returns execution ID immediately) |
| Duplicate Check | None | Prevents concurrent runs |
| Real-time Updates | Deferred | Required via Socket.io |
| Frontend | No UI | "Run Now" button + toast |

### Existing Code Patterns

**Controller Pattern (from agentController.ts):**
```typescript
export const triggerAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;
    // ... RBAC check, validation, execution
  } catch (error: any) {
    console.error('Error triggering agent:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger agent' });
  }
};
```

**RBAC Pattern (from updateAgent in agentController.ts:263-283):**
```typescript
// Check if user is workspace creator (owner permissions)
const workspace = await Project.findById(workspaceId);
const isWorkspaceCreator = workspace && workspace.userId.toString() === userId.toString();

if (!isWorkspaceCreator) {
  const teamMember = await TeamMember.findOne({
    workspaceId: workspaceId,
    userId: userId,
    status: 'active'
  });
  // For trigger: allow 'member' role (not just owner/admin)
  if (!teamMember || teamMember.role === 'viewer') {
    res.status(403).json({ ... });
    return;
  }
}
```

**Duplicate Execution Check:**
```typescript
// Check for existing running execution
const runningExecution = await AgentExecution.findOne({
  agent: new mongoose.Types.ObjectId(agentId),
  workspace: new mongoose.Types.ObjectId(workspaceId),
  status: { $in: ['pending', 'running'] }
}).select('executionId startedAt');

if (runningExecution) {
  res.status(409).json({
    success: false,
    error: 'Agent is already running. Wait for current execution to complete.',
    currentExecutionId: runningExecution.executionId,
    startedAt: runningExecution.startedAt
  });
  return;
}
```

### Socket.io Pattern (from chatSocket.ts)

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export function initializeAgentExecutionSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Namespace for agent execution updates
  const agentNamespace = io.of('/agent-execution');

  agentNamespace.on('connection', (socket) => {
    // Join workspace room on connection
    socket.on('join', async (data: { workspaceId: string; agentId: string }) => {
      socket.join(`workspace:${data.workspaceId}:agent:${data.agentId}`);
    });
  });

  // Export for emitting from services
  return agentNamespace;
}

// In AgentExecutionService - emit events:
agentNamespace.to(`workspace:${workspaceId}:agent:${agentId}`).emit('execution:started', {
  executionId,
  agentId,
  startedAt: new Date()
});
```

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Agent Controller | `backend/src/controllers/agentController.ts:1293-1403` (executeAgent function) |
| Agent Routes | `backend/src/routes/agentBuilder.ts:294-300` (execute route pattern) |
| Execution Service | `backend/src/services/AgentExecutionService.ts:352-693` (executeAgent method) |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` |
| Socket.io Pattern | `backend/src/socket/chatSocket.ts:1-100` |
| Validation Schema | `backend/src/validations/agentValidation.ts` (executeAgentSchema) |
| Previous Story | `_bmad-output/implementation-artifacts/3-1-parse-and-execute-instructions.md` |

### Architecture Requirements

**From Architecture Document:**
- Real-time: Socket.io 4.8.3 for WebSocket connections
- Room-based workspace isolation for Socket.io
- Rate limits: 10 executions/min per agent, 100/day (already implemented in 3.1)

**Socket.io Event Schema:**
```typescript
// execution:started
{ executionId: string, agentId: string, startedAt: Date }

// execution:progress
{ executionId: string, step: number, total: number, action: string, status: 'success' | 'failed' }

// execution:completed
{ executionId: string, success: true, processedCount: number, summary: object }

// execution:failed
{ executionId: string, success: false, error: string, failedAtStep?: number }
```

### Frontend Requirements

**"Run Now" Button States:**
1. **Idle**: "Run Now" button visible
2. **Loading**: Disabled button with spinner, text "Agent is running..."
3. **Success**: Toast notification with "View Execution Log" link
4. **Error**: Toast notification with "View Error Log" and "Retry" actions
5. **Already Running**: Disabled button, show current execution info

**Frontend Files to Create/Modify:**
```
frontend/src/components/agents/
├── RunNowButton.tsx          # New - button with states
├── ExecutionToast.tsx        # New - success/error notifications

frontend/src/hooks/
├── useAgentExecution.ts      # New - Socket.io connection hook
```

### Integration Points

**Socket.io Setup:**
- Integrate with existing `backend/src/socket/chatSocket.ts` or create new file
- Export `agentExecutionNamespace` for use in AgentExecutionService
- Ensure workspace isolation in room names

**Frontend Socket.io:**
- Use existing Socket.io client setup (check `frontend/src` for socket patterns)
- Connect to `/agent-execution` namespace
- Join room `workspace:${workspaceId}:agent:${agentId}` on component mount

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Real-Time Communication] - Socket.io patterns
- [Source: backend/src/controllers/agentController.ts:1293-1403] - executeAgent pattern
- [Source: backend/src/services/AgentExecutionService.ts:352-693] - Execution service
- [Source: backend/src/socket/chatSocket.ts:1-100] - Socket.io initialization pattern
- [Source: _bmad-output/implementation-artifacts/3-1-parse-and-execute-instructions.md] - Previous story context

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-thinking (Opus 4.5)

### Debug Log References

N/A - No errors encountered during implementation

### Completion Notes List

1. **Backend Implementation Complete**
   - Created POST `/api/workspaces/:workspaceId/agents/:agentId/trigger` endpoint
   - Implemented duplicate execution prevention (409 Conflict)
   - RBAC: Members can trigger, Viewers denied
   - Agent can be Live OR Draft (unlike /execute which requires Live)
   - Returns 202 Accepted with execution ID immediately

2. **Socket.io Integration Complete**
   - Created `agentExecutionSocket.ts` with `/agent-execution` namespace
   - Emit events: execution:started, execution:progress, execution:completed, execution:failed
   - Workspace-scoped rooms for isolation
   - Integrated emit calls into AgentExecutionService

3. **Frontend Components Complete**
   - Created `RunNowButton.tsx` with all states (idle, loading, success, error, already running)
   - Created `useAgentExecution.ts` hook for Socket.io real-time updates
   - Toast notifications via sonner for success/failure feedback
   - Added `triggerAgent` API function with conflict error handling

4. **Tests Deferred**
   - Recommend running TEA `testarch-automate` workflow after implementation
   - Test patterns exist in `backend/src/tests/agent.test.ts`

### File List

**Backend Files Modified:**
- `backend/src/validations/agentValidation.ts` - Added triggerAgentSchema
- `backend/src/controllers/agentController.ts` - Added triggerAgent controller
- `backend/src/routes/agentBuilder.ts` - Added /trigger route
- `backend/src/services/AgentExecutionService.ts` - Added Socket.io emit calls

**Backend Files Created:**
- `backend/src/socket/agentExecutionSocket.ts` - Socket.io namespace for execution updates

**Frontend Files Created:**
- `frontend/components/agents/RunNowButton.tsx` - Run Now button component
- `frontend/hooks/useAgentExecution.ts` - Socket.io hook for execution updates

**Frontend Files Modified:**
- `frontend/lib/api/agents.ts` - Added triggerAgent API function and types
