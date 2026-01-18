# Story 1.9: Manage Agent Status

**Epic:** Epic 1 - Manual Agent Building
**Story Key:** 1-9-manage-agent-status
**Status:** done
**Priority:** High - Controls agent lifecycle and execution readiness
**FR Covered:** FR10 - Users can manage agent status (Draft, Live, Paused)

---

## User Story

**As a** workspace owner,
**I want to** manage agent status (Draft, Live, Paused),
**So that** I can control when agents are active and executing.

---

## Acceptance Criteria

### AC1: Default Draft Status

**Given** I create a new agent
**When** The agent is saved
**Then** It is in "Draft" status by default
**And** Draft agents do not execute automatically (manual trigger only for testing)

### AC2: Draft to Live Validation

**Given** I have a Draft agent with complete configuration
**When** I click "Go Live"
**Then** I see a validation check for: Name, goal, at least one trigger, instructions (required)
**And** If all required fields are present, status changes to "Live"
**And** If any required fields are missing, I see specific validation errors

### AC3: Live Agent Execution

**Given** An agent is in Live status
**When** Scheduled triggers are configured
**Then** The agent executes automatically according to the schedule
**And** Event-based triggers fire when events occur

### AC4: Pause Live Agent

**Given** I have a Live agent
**When** I click "Pause"
**Then** The status changes to "Paused"
**And** Scheduled executions are stopped
**And** Event-based triggers are disabled
**And** I see a pause indicator on the agent card

### AC5: Resume Paused Agent

**Given** I have a Paused agent
**When** I click "Resume"
**Then** The status changes back to "Live"
**And** Scheduled executions resume from next scheduled time
**And** Event-based triggers are re-enabled

### AC6: Live to Draft Warning

**Given** I have a Live agent
**When** I change status to Draft
**Then** I see a warning: "Changing to Draft will stop all executions. Continue?"
**And** Upon confirmation, status changes to Draft and all automatic execution stops

### AC7: Circuit Breaker Auto-Pause

**Given** An agent hits a circuit breaker (max executions/day)
**When** The limit is reached
**Then** The agent status automatically changes to "Paused"
**And** A notification is sent: "Agent [name] auto-paused: execution limit reached"
**And** I can manually resume after reviewing

### AC8: RBAC Permission Check

**Given** I am a workspace member (not owner/admin)
**When** I try to change agent status
**Then** I see error: "You don't have permission to change agent status"
**And** The status change is blocked

---

## Technical Requirements

### 1. API Endpoint

#### PATCH `/api/workspaces/:workspaceId/agents/:agentId/status`

**Request:**
```typescript
{
  status: 'Draft' | 'Live' | 'Paused';
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  agent: {
    _id: string;
    workspace: string;
    name: string;
    goal: string;
    status: 'Draft' | 'Live' | 'Paused';
    updatedAt: string;
    updatedBy: string;
    // ... other fields
  }
}
```

**Response (400 Bad Request - Validation Failed):**
```typescript
{
  success: false;
  error: 'Cannot activate agent: Missing required fields';
  validationErrors: [
    { field: 'instructions', message: 'Instructions are required to go Live' },
    { field: 'triggers', message: 'At least one trigger is required to go Live' }
  ]
}
```

**Response (403 Forbidden):**
```typescript
{
  success: false;
  error: "You don't have permission to change agent status"
}
```

**Response (404 Not Found):**
```typescript
{
  success: false;
  error: 'Agent not found'
}
```

### 2. Backend Validation Schema

**File:** `backend/src/validations/agentValidation.ts`

Add status update validation schema:

```typescript
// Story 1.9: Update agent status validation schema
export const updateAgentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Draft', 'Live', 'Paused'], {
      errorMap: () => ({ message: "Status must be 'Draft', 'Live', or 'Paused'" })
    })
  }),
  params: z.object({
    workspaceId: z.string().min(1),
    agentId: z.string().min(1)
  })
});

export type UpdateAgentStatusInput = z.infer<typeof updateAgentStatusSchema>['body'];
```

### 3. Backend Controller

**File:** `backend/src/controllers/agentController.ts`

Add new `updateAgentStatus` function:

```typescript
/**
 * @route PATCH /api/workspaces/:workspaceId/agents/:agentId/status
 * @desc Update agent status (Draft, Live, Paused)
 * @access Private (requires authentication, workspace access, and Owner/Admin role)
 */
export const updateAgentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // RBAC Check: Must be Owner or Admin to change agent status
    const workspace = await Project.findById(workspaceId);
    const isWorkspaceCreator = workspace && workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to change agent status"
        });
        return;
      }
    }

    // Find agent with workspace filter for security
    const agent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Validate status transition
    const currentStatus = agent.status;
    const validationErrors: { field: string; message: string }[] = [];

    // Validation for transitioning TO Live status
    if (status === 'Live' && currentStatus !== 'Live') {
      // Check required fields
      if (!agent.name || agent.name.trim() === '') {
        validationErrors.push({ field: 'name', message: 'Agent name is required to go Live' });
      }
      if (!agent.goal || agent.goal.trim() === '') {
        validationErrors.push({ field: 'goal', message: 'Agent goal is required to go Live' });
      }
      if (!agent.triggers || agent.triggers.length === 0) {
        validationErrors.push({ field: 'triggers', message: 'At least one trigger is required to go Live' });
      }
      if (!agent.instructions || agent.instructions.trim() === '') {
        validationErrors.push({ field: 'instructions', message: 'Instructions are required to go Live' });
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot activate agent: Missing required fields',
          validationErrors
        });
        return;
      }
    }

    // Update agent status
    agent.status = status;
    agent.updatedBy = userId;
    await agent.save();

    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        updatedBy: agent.updatedBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        triggers: agent.triggers || [],
        instructions: agent.instructions || null,
        restrictions: agent.restrictions || RESTRICTIONS_DEFAULTS,
        memory: agent.memory || MEMORY_DEFAULTS,
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      }
    });
  } catch (error: any) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
};
```

### 4. Backend Routes Update

**File:** `backend/src/routes/agentBuilder.ts`

Add new route for status update:

```typescript
import { createAgent, listAgents, getAgent, updateAgent, duplicateAgent, updateAgentStatus } from '../controllers/agentController';
import { createAgentSchema, updateAgentSchema, duplicateAgentSchema, updateAgentStatusSchema } from '../validations/agentValidation';

// ... existing routes ...

/**
 * @route PATCH /api/workspaces/:workspaceId/agents/:agentId/status
 * @desc Update agent status (Draft, Live, Paused)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.patch(
  '/workspaces/:workspaceId/agents/:agentId/status',
  authenticate,
  validateWorkspaceAccess,
  validate(updateAgentStatusSchema),
  updateAgentStatus
);
```

### 5. Frontend Types

**File:** `frontend/types/agent.ts`

Add status-related types:

```typescript
// Story 1.9: Agent status types
export type AgentStatus = 'Draft' | 'Live' | 'Paused';

// Story 1.9: Update agent status input
export interface UpdateAgentStatusInput {
  status: AgentStatus;
}

// Story 1.9: Update agent status response
export interface UpdateAgentStatusResponse {
  success: boolean;
  agent: IAgent;
}

// Story 1.9: Status validation error response
export interface StatusValidationErrorResponse {
  success: false;
  error: string;
  validationErrors: {
    field: string;
    message: string;
  }[];
}

// Story 1.9: Status display info
export const AGENT_STATUS_INFO = {
  Draft: {
    label: 'Draft',
    color: 'bg-zinc-500',
    description: 'Agent is in development. Only manual testing available.',
    icon: 'edit'
  },
  Live: {
    label: 'Live',
    color: 'bg-green-500',
    description: 'Agent is active and executing automatically.',
    icon: 'play'
  },
  Paused: {
    label: 'Paused',
    color: 'bg-yellow-500',
    description: 'Agent is temporarily stopped. Resume to continue.',
    icon: 'pause'
  }
} as const;
```

### 6. Frontend API Function

**File:** `frontend/lib/api/agents.ts`

Add update status API function:

```typescript
/**
 * Story 1.9: Update agent status
 */
export async function updateAgentStatus(
  workspaceId: string,
  agentId: string,
  data: UpdateAgentStatusInput
): Promise<UpdateAgentStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/agents/${agentId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    }
  );

  const result = await response.json();

  if (!response.ok) {
    // Handle validation errors specially
    if (response.status === 400 && result.validationErrors) {
      const error: any = new Error(result.error || 'Validation failed');
      error.validationErrors = result.validationErrors;
      throw error;
    }
    throw new Error(result.error || 'Failed to update agent status');
  }

  return result;
}
```

### 7. Frontend Components

#### Create: `frontend/components/agents/AgentStatusControls.tsx` [NEW]

Status control buttons component:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Pause, Edit, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updateAgentStatus } from '@/lib/api/agents';
import { IAgent, AgentStatus, AGENT_STATUS_INFO } from '@/types/agent';

interface AgentStatusControlsProps {
  agent: IAgent;
  workspaceId: string;
  onStatusChange?: (updatedAgent: IAgent) => void;
  variant?: 'default' | 'compact';
}

export function AgentStatusControls({
  agent,
  workspaceId,
  onStatusChange,
  variant = 'default'
}: AgentStatusControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDraftWarning, setShowDraftWarning] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([]);

  const handleStatusChange = async (newStatus: AgentStatus) => {
    // Show warning when changing to Draft from Live
    if (agent.status === 'Live' && newStatus === 'Draft') {
      setShowDraftWarning(true);
      return;
    }

    await performStatusChange(newStatus);
  };

  const performStatusChange = async (newStatus: AgentStatus) => {
    setIsLoading(true);
    setValidationErrors([]);

    try {
      const response = await updateAgentStatus(workspaceId, agent._id, { status: newStatus });
      
      const statusInfo = AGENT_STATUS_INFO[newStatus];
      toast.success(`Agent status changed to ${statusInfo.label}`);
      onStatusChange?.(response.agent);
    } catch (err: any) {
      if (err.validationErrors) {
        setValidationErrors(err.validationErrors);
        setShowValidationErrors(true);
      } else {
        toast.error(err.message || 'Failed to update agent status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDraftChange = async () => {
    setShowDraftWarning(false);
    await performStatusChange('Draft');
  };

  const renderStatusButton = () => {
    const { status } = agent;
    const isCompact = variant === 'compact';
    const size = isCompact ? 'sm' : 'default';

    if (status === 'Draft') {
      return (
        <Button
          variant="default"
          size={size}
          onClick={() => handleStatusChange('Live')}
          disabled={isLoading}
          data-testid="go-live-button"
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isCompact ? 'Live' : 'Go Live'}
        </Button>
      );
    }

    if (status === 'Live') {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size={size}
            onClick={() => handleStatusChange('Paused')}
            disabled={isLoading}
            data-testid="pause-button"
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            Pause
          </Button>
          <Button
            variant="ghost"
            size={size}
            onClick={() => handleStatusChange('Draft')}
            disabled={isLoading}
            data-testid="set-draft-button"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isCompact ? 'Draft' : 'Set to Draft'}
          </Button>
        </div>
      );
    }

    if (status === 'Paused') {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            size={size}
            onClick={() => handleStatusChange('Live')}
            disabled={isLoading}
            data-testid="resume-button"
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Resume
          </Button>
          <Button
            variant="ghost"
            size={size}
            onClick={() => handleStatusChange('Draft')}
            disabled={isLoading}
            data-testid="set-draft-button-paused"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isCompact ? 'Draft' : 'Set to Draft'}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderStatusButton()}

      {/* Draft Warning Dialog */}
      <AlertDialog open={showDraftWarning} onOpenChange={setShowDraftWarning}>
        <AlertDialogContent data-testid="draft-warning-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Change to Draft Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing to Draft will stop all automatic executions. Scheduled triggers
              will no longer run and event-based triggers will be disabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-draft-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDraftChange}
              data-testid="confirm-draft-change"
            >
              Change to Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Validation Errors Dialog */}
      <AlertDialog open={showValidationErrors} onOpenChange={setShowValidationErrors}>
        <AlertDialogContent data-testid="validation-errors-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cannot Activate Agent
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following fields are required to go Live:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-red-600">
                      <span className="font-medium capitalize">{error.field}</span>: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowValidationErrors(false)}
              data-testid="close-validation-errors"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

#### Create: `frontend/components/agents/AgentStatusBadge.tsx` [NEW]

Status badge component:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Play, Pause, Edit } from 'lucide-react';
import { AgentStatus, AGENT_STATUS_INFO } from '@/types/agent';
import { cn } from '@/lib/utils';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function AgentStatusBadge({
  status,
  showIcon = true,
  size = 'default'
}: AgentStatusBadgeProps) {
  const statusInfo = AGENT_STATUS_INFO[status];

  const Icon = status === 'Draft' ? Edit : status === 'Live' ? Play : Pause;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const bgClasses = {
    Draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    Live: 'bg-green-500/20 text-green-400 border-green-500/30',
    Paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        bgClasses[status],
        sizeClasses[size]
      )}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {showIcon && <Icon className={cn('mr-1', iconSizes[size])} />}
      {statusInfo.label}
    </Badge>
  );
}
```

#### Update: `frontend/components/agents/AgentCard.tsx`

Integrate status controls into agent cards:

```typescript
// Add to imports
import { AgentStatusBadge } from './AgentStatusBadge';
import { AgentStatusControls } from './AgentStatusControls';

// Update card header to show status badge
<AgentStatusBadge status={agent.status} size="sm" />

// Add status controls to card actions
<AgentStatusControls
  agent={agent}
  workspaceId={workspaceId}
  onStatusChange={onAgentUpdate}
  variant="compact"
/>
```

---

## Architecture Compliance Requirements

### 1. Workspace Isolation

- All agent operations must filter by workspace ID
- RBAC enforced: Only Owner/Admin can change status
- Matches existing 70+ model patterns

### 2. Validation Pattern

**Backend:** (Zod + Mongoose)
- Zod schema validates request body structure (status enum)
- Controller validates business rules (Live requires name, goal, triggers, instructions)
- Returns specific validation errors with field paths

**Frontend:**
- Display validation errors clearly in dialog
- Disable buttons during loading
- Show confirmation for destructive actions (Live → Draft)

### 3. API Pattern

New PATCH endpoint following REST conventions:
```typescript
PATCH /api/workspaces/:workspaceId/agents/:agentId/status
```

Uses PATCH (not PUT) because we're updating a single property, not the entire resource.

### 4. Status Transition Rules

```
Draft → Live: Requires validation (name, goal, triggers, instructions)
Draft → Paused: NOT ALLOWED (must go Live first)
Live → Paused: Allowed (immediate)
Live → Draft: Allowed with warning
Paused → Live: Allowed (resumes execution)
Paused → Draft: Allowed with warning
```

---

## Previous Story Intelligence (Story 1.8)

### Patterns Established:

1. **RBAC Check Pattern:**
   ```typescript
   // Check workspace creator first, then TeamMember
   const isWorkspaceCreator = workspace && workspace.userId.toString() === userId.toString();
   if (!isWorkspaceCreator) {
     const teamMember = await TeamMember.findOne({ ... });
     if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
       return res.status(403).json({ error: "You don't have permission..." });
     }
   }
   ```

2. **Component Structure:**
   - Components in `frontend/components/agents/`
   - Props interface with workspaceId, agent, callbacks
   - Loading state during async operations
   - Toast notifications using sonner
   - data-testid attributes for E2E testing

3. **Files Modified Pattern:**
   - Backend: agentController.ts (handler), agentValidation.ts (schema), agentBuilder.ts (route)
   - Frontend: types/agent.ts (types), lib/api/agents.ts (API), new component, integration

### Learnings from Code Reviews:

- Add `data-testid` attributes for E2E testing
- Use AlertDialog for destructive action warnings
- Handle validation errors specially (show in dialog, not toast)
- Use shadcn/ui components consistently
- Add loading states to buttons

---

## Developer Guardrails - Critical Patterns to Follow

### DO:

1. **Use PATCH for Status Updates:**
   ```typescript
   // CORRECT - PATCH for partial update
   router.patch('/workspaces/:workspaceId/agents/:agentId/status', ...)
   
   // WRONG - PUT for partial update
   router.put('/workspaces/:workspaceId/agents/:agentId/status', ...)
   ```

2. **Validate Required Fields Before Going Live:**
   ```typescript
   if (status === 'Live' && currentStatus !== 'Live') {
     const validationErrors = [];
     if (!agent.name) validationErrors.push({ field: 'name', message: '...' });
     if (!agent.triggers?.length) validationErrors.push({ field: 'triggers', message: '...' });
     // ... check all required fields
   }
   ```

3. **Update updatedBy on Status Change:**
   ```typescript
   agent.status = status;
   agent.updatedBy = userId;  // Track who made the change
   await agent.save();
   ```

4. **Show Warning for Destructive Status Changes:**
   ```typescript
   // Live → Draft requires confirmation
   if (agent.status === 'Live' && newStatus === 'Draft') {
     setShowDraftWarning(true);
     return;
   }
   ```

5. **Return Validation Errors with Structure:**
   ```typescript
   res.status(400).json({
     success: false,
     error: 'Cannot activate agent: Missing required fields',
     validationErrors: [
       { field: 'instructions', message: 'Instructions are required to go Live' }
     ]
   });
   ```

### DO NOT:

1. **Allow Draft → Paused Transition:**
   ```typescript
   // WRONG - Paused only makes sense for Live agents
   if (status === 'Paused' && currentStatus === 'Draft') {
     // This should fail validation or be blocked in UI
   }
   ```

2. **Skip Workspace Filter:**
   ```typescript
   // WRONG - no workspace isolation
   const agent = await Agent.findById(agentId);
   
   // CORRECT - always filter by workspace
   const agent = await Agent.findOne({ _id: agentId, workspace: workspaceId });
   ```

3. **Use Toast for Validation Errors:**
   ```typescript
   // WRONG - toast for complex validation errors
   toast.error('Instructions are required to go Live');
   
   // CORRECT - dialog showing all errors
   setValidationErrors(err.validationErrors);
   setShowValidationErrors(true);
   ```

4. **Forget to Export New Types:**
   ```typescript
   // WRONG - define but don't export
   type AgentStatus = 'Draft' | 'Live' | 'Paused';
   
   // CORRECT - export for use in components
   export type AgentStatus = 'Draft' | 'Live' | 'Paused';
   ```

---

## Implementation Order

1. **Backend Validation** (agentValidation.ts)
   - Add updateAgentStatusSchema
   - Add UpdateAgentStatusInput type export

2. **Backend Controller** (agentController.ts)
   - Add updateAgentStatus function
   - Include validation logic for Draft → Live transition
   - Use RBAC pattern from Story 1.8

3. **Backend Routes** (agentBuilder.ts)
   - Import updateAgentStatus and updateAgentStatusSchema
   - Add PATCH route for status update

4. **Frontend Types** (types/agent.ts)
   - Add AgentStatus type
   - Add UpdateAgentStatusInput interface
   - Add UpdateAgentStatusResponse interface
   - Add StatusValidationErrorResponse interface
   - Add AGENT_STATUS_INFO constant

5. **Frontend API** (lib/api/agents.ts)
   - Add updateAgentStatus function
   - Handle validation errors specially

6. **Frontend Badge Component** (AgentStatusBadge.tsx) [NEW]
   - Create status badge with icon and color

7. **Frontend Controls Component** (AgentStatusControls.tsx) [NEW]
   - Create status control buttons
   - Add warning dialogs
   - Add validation error dialog

8. **Frontend Integration** (AgentCard.tsx or AgentsList.tsx)
   - Add status badge to cards
   - Integrate status controls
   - Handle status change callback

9. **Test & Verify**
   - Manual testing of all status transitions
   - TypeScript compilation check
   - Verify RBAC works correctly
   - Verify validation works for Live transition
   - Verify warnings appear for destructive changes

---

## Testing Requirements

### Backend Tests:

```typescript
describe('Update Agent Status', () => {
  it('should change status from Draft to Live with valid agent', async () => {
    // Agent has name, goal, triggers, instructions → 200 OK
  });

  it('should reject Draft to Live without instructions', async () => {
    // Missing instructions → 400 with validationErrors
  });

  it('should reject Draft to Live without triggers', async () => {
    // No triggers → 400 with validationErrors
  });

  it('should change status from Live to Paused', async () => {
    // Immediate change, no validation needed → 200 OK
  });

  it('should change status from Paused to Live', async () => {
    // Resume execution → 200 OK
  });

  it('should reject status change for non-owner/admin', async () => {
    // Member role → 403 Forbidden
  });

  it('should allow workspace creator to change status', async () => {
    // Creator without TeamMember record → 200 OK
  });

  it('should update updatedBy field on status change', async () => {
    // Verify updatedBy matches current user
  });
});
```

### Frontend Tests:

```typescript
describe('AgentStatusControls', () => {
  it('should show Go Live button for Draft agents', () => {});
  
  it('should show Pause and Set to Draft buttons for Live agents', () => {});
  
  it('should show Resume and Set to Draft buttons for Paused agents', () => {});
  
  it('should show warning dialog when changing Live to Draft', () => {});
  
  it('should show validation errors dialog when going Live fails', () => {});
  
  it('should disable buttons during loading', () => {});
  
  it('should call onStatusChange after successful update', () => {});
});
```

---

## File List (Expected Changes)

### Backend:
- `backend/src/validations/agentValidation.ts` - Add updateAgentStatusSchema
- `backend/src/controllers/agentController.ts` - Add updateAgentStatus function
- `backend/src/routes/agentBuilder.ts` - Add PATCH route

### Frontend:
- `frontend/types/agent.ts` - Add status types
- `frontend/lib/api/agents.ts` - Add updateAgentStatus function
- `frontend/components/agents/AgentStatusBadge.tsx` [NEW]
- `frontend/components/agents/AgentStatusControls.tsx` [NEW]
- `frontend/components/agents/AgentCard.tsx` - Integrate status components

---

## Dev Agent Record

### Agent Model Used

Amelia (BMad Dev Agent) - dev-story workflow

### Debug Log References

- TypeScript compilation passes for all modified agent files
- Pre-existing errors in opportunity.ts not related to this story

### Completion Notes List

- ✅ Added `updateAgentStatusSchema` validation in `agentValidation.ts`
- ✅ Added `updateAgentStatus` controller function with RBAC check and Live validation
- ✅ Added PATCH route `/workspaces/:workspaceId/agents/:agentId/status` in `agentBuilder.ts`
- ✅ Added frontend types: `AgentStatus`, `UpdateAgentStatusInput`, `UpdateAgentStatusResponse`, `AGENT_STATUS_INFO`
- ✅ Added `updateAgentStatus` API function with validation error handling
- ✅ Created `AgentStatusBadge.tsx` component with color-coded status display
- ✅ Created `AgentStatusControls.tsx` component with Go Live/Pause/Resume buttons and dialogs
- ✅ Integrated status components into `AgentCard.tsx`
- ⚠️ AC3 (Live Agent Execution) and AC7 (Circuit Breaker) require agent execution engine (future epic)
- Implementation follows established RBAC pattern from Story 1.7/1.8

### File List

#### Modified:
- `backend/src/validations/agentValidation.ts`
- `backend/src/controllers/agentController.ts`
- `backend/src/routes/agentBuilder.ts`
- `frontend/types/agent.ts`
- `frontend/lib/api/agents.ts`
- `frontend/components/agents/AgentCard.tsx`
- `frontend/components/agents/AgentStatusControls.tsx`
- `frontend/app/projects/[id]/agents/page.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

#### New:
- `frontend/components/agents/AgentStatusBadge.tsx`
- `frontend/components/agents/AgentStatusControls.tsx`
- `backend/src/tests/agentStatus.test.ts`

### Code Review Fixes Applied

1. **CRITICAL FIX**: Added validation to block Draft → Paused transition in `agentController.ts:567-574`
2. **CRITICAL FIX**: Added missing `onStatusChange` callback in `agents/page.tsx` - UI wasn't updating after status change
3. **MEDIUM FIX**: Removed debug console.log statements from `agentBuilder.ts` validation middleware
4. **LOW FIX**: Removed unused imports (Play, Pause, Edit) from `AgentCard.tsx`
5. **DOCS FIX**: Added `sprint-status.yaml` to File List

### Code Review #2 Fixes Applied

6. **HIGH FIX**: Created `backend/src/tests/agentStatus.test.ts` with 9 comprehensive unit tests covering all status transitions, validation errors, and updatedBy tracking
7. **MEDIUM FIX**: Updated route documentation header in `agentBuilder.ts` to include PATCH /status and DELETE routes
8. **LOW FIX**: Removed unused `isCompact` variable in `AgentStatusControls.tsx`

