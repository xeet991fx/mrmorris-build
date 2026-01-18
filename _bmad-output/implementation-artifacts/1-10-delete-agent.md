# Story 1.10: Delete Agent

**Epic:** Epic 1 - Manual Agent Building
**Story Key:** 1-10-delete-agent
**Status:** done
**Priority:** High - Completes agent lifecycle CRUD operations
**FR Covered:** Agent deletion with confirmation and workspace isolation

---

## User Story

**As a** workspace owner,
**I want to** delete agents I no longer need,
**So that** I can keep my workspace organized.

---

## Acceptance Criteria

### AC1: Delete Button Visibility

**Given** I have existing agents in my workspace
**When** I view the agents list
**Then** Each agent has a "Delete" option in the menu (trash icon)

### AC2: Draft Agent Delete Confirmation

**Given** I click "Delete" on a Draft agent
**When** The confirmation modal opens
**Then** I see: "Delete agent [name]? This cannot be undone."
**And** I see options: "Cancel" and "Delete Agent"

### AC3: Draft Agent Successful Deletion

**Given** I confirm deletion of a Draft agent
**When** I click "Delete Agent"
**Then** The agent is permanently deleted from the database
**And** The agent disappears from the agents list
**And** I see success message: "Agent deleted successfully"

### AC4: Live Agent Delete Warning

**Given** I click "Delete" on a Live agent
**When** The confirmation modal opens
**Then** I see a stronger warning: "This agent is Live and may have active executions. Delete anyway?"
**And** The delete button text is "Force Delete"

### AC5: Live Agent Successful Deletion

**Given** I confirm deletion of a Live agent
**When** I click "Force Delete"
**Then** The agent is deleted
**And** All scheduled executions are canceled (future epic)
**And** Execution history is retained (for audit purposes) but marked as orphaned

### AC6: RBAC Permission Check

**Given** I try to delete an agent without permission
**When** I click "Delete"
**Then** I see error: "You don't have permission to delete agents"
**And** The deletion is blocked

### AC7: Execution History Preservation (Audit)

**Given** An agent has execution history
**When** I delete the agent
**Then** The agent record is deleted
**And** Execution logs remain in database with agentDeleted flag (future: logs not implemented yet)
**And** Logs can still be viewed for audit purposes (future capability)

---

## Technical Requirements

### 1. API Endpoint

#### DELETE `/api/workspaces/:workspaceId/agents/:agentId`

**Response (200 OK):**
```typescript
{
  success: true;
  message: 'Agent deleted successfully';
}
```

**Response (403 Forbidden):**
```typescript
{
  success: false;
  error: "You don't have permission to delete agents";
}
```

**Response (404 Not Found):**
```typescript
{
  success: false;
  error: 'Agent not found';
}
```

### 2. Backend Controller

**File:** `backend/src/controllers/agentController.ts`

Add new `deleteAgent` function:

```typescript
/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId
 * @desc Delete an agent from the workspace
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
export const deleteAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // RBAC Check: Must be Owner or Admin to delete agents
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
      return;
    }

    const isWorkspaceCreator = workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to delete agents"
        });
        return;
      }
    }

    // Find and delete agent with workspace filter for security
    const agent = await Agent.findOneAndDelete({
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

    // TODO (Future Epic 3): Cancel scheduled BullMQ jobs for this agent
    // TODO (Future Epic 3): Mark execution logs with agentDeleted: true

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
};
```

### 3. Backend Routes Update

**File:** `backend/src/routes/agentBuilder.ts`

Add new route for agent deletion:

```typescript
import { createAgent, listAgents, getAgent, updateAgent, duplicateAgent, updateAgentStatus, deleteAgent } from '../controllers/agentController';

// ... existing routes ...

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId
 * @desc Delete an agent from the workspace
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.delete(
  '/workspaces/:workspaceId/agents/:agentId',
  authenticate,
  validateWorkspaceAccess,
  deleteAgent
);
```

### 4. Frontend Types

**File:** `frontend/types/agent.ts`

Add delete-related types:

```typescript
// Story 1.10: Delete agent response
export interface DeleteAgentResponse {
  success: boolean;
  message: string;
}
```

### 5. Frontend API Function

**File:** `frontend/lib/api/agents.ts`

Add delete API function:

```typescript
/**
 * Delete an agent (Story 1.10)
 */
export const deleteAgent = async (
  workspaceId: string,
  agentId: string
): Promise<DeleteAgentResponse> => {
  const response = await axios.delete(
    `/workspaces/${workspaceId}/agents/${agentId}`
  );
  return response.data;
};
```

### 6. Frontend Components

#### Create: `frontend/components/agents/DeleteAgentModal.tsx` [NEW]

Delete confirmation modal component:

```typescript
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteAgent } from '@/lib/api/agents';
import { IAgent } from '@/types/agent';

interface DeleteAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: IAgent;
  workspaceId: string;
  onSuccess?: () => void;
}

export function DeleteAgentModal({
  open,
  onOpenChange,
  agent,
  workspaceId,
  onSuccess
}: DeleteAgentModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isLive = agent.status === 'Live';

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      await deleteAgent(workspaceId, agent._id);
      toast.success('Agent deleted successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to delete agent';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-agent-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLive ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Trash2 className="h-5 w-5 text-zinc-500" />
            )}
            Delete Agent
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLive ? (
              <>
                <span className="font-medium text-red-600">
                  This agent is Live and may have active executions.
                </span>
                <br />
                Delete &quot;{agent.name}&quot; anyway? This cannot be undone.
              </>
            ) : (
              <>
                Delete agent &quot;{agent.name}&quot;? This cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            data-testid="delete-cancel-button"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className={isLive
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
            }
            data-testid="delete-confirm-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : isLive ? (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Force Delete
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Agent
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### Update: `frontend/components/agents/AgentCard.tsx`

Add delete option to the card menu:

```typescript
// Add to imports
import { Trash2 } from 'lucide-react';
import { DeleteAgentModal } from './DeleteAgentModal';

// Add to AgentCardProps interface
interface AgentCardProps {
  agent: IAgent;
  workspaceId: string;
  onDuplicate?: (newAgent: IAgent) => void;
  onStatusChange?: (updatedAgent: IAgent) => void;
  onDelete?: () => void;  // New prop for delete callback
}

// Add state for delete modal
const [showDeleteModal, setShowDeleteModal] = useState(false);

// Add delete click handler
const handleDeleteClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  setShowMenu(false);
  setShowDeleteModal(true);
};

// Add delete button to menu (after duplicate button)
<button
  onClick={handleDeleteClick}
  data-testid={`delete-agent-${agent._id}`}
  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
>
  <Trash2 className="w-4 h-4" />
  Delete
</button>

// Add DeleteAgentModal at end of component (after DuplicateAgentModal)
<DeleteAgentModal
  open={showDeleteModal}
  onOpenChange={setShowDeleteModal}
  agent={agent}
  workspaceId={workspaceId}
  onSuccess={onDelete}
/>
```

#### Update: `frontend/app/projects/[id]/agents/page.tsx`

Handle agent deletion in the list:

```typescript
// Update AgentCard usage to include onDelete callback
<AgentCard
  agent={agent}
  workspaceId={workspaceId}
  onDuplicate={(newAgent) => {
    setAgents((prev) => [newAgent, ...prev]);
  }}
  onStatusChange={(updatedAgent) => {
    setAgents((prev) =>
      prev.map((a) => (a._id === updatedAgent._id ? updatedAgent : a))
    );
  }}
  onDelete={() => {
    // Remove deleted agent from list
    setAgents((prev) => prev.filter((a) => a._id !== agent._id));
  }}
/>
```

---

## Architecture Compliance Requirements

### 1. Workspace Isolation

- DELETE query MUST filter by workspace ID: `{ _id: agentId, workspace: workspaceId }`
- Uses `findOneAndDelete` with workspace filter (not `findByIdAndDelete`)
- Agent model middleware will enforce workspace filter

### 2. RBAC Pattern

Follow established pattern from Stories 1.7-1.9:

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

### 3. Response Pattern

- 200 for successful deletion
- 403 for permission denied
- 404 for agent not found
- 500 for server errors

### 4. Frontend Pattern

- Use AlertDialog from shadcn/ui for confirmation (same as status change warning)
- Show different warning message for Live vs Draft agents
- Use toast.success/error for feedback
- Update local state immediately after successful deletion

---

## Previous Story Intelligence (Story 1.9)

### Patterns Established:

1. **RBAC Check Pattern:** Check workspace creator first, then TeamMember with role check

2. **Modal Pattern:** DuplicateAgentModal uses Dialog, DeleteAgentModal should use AlertDialog (destructive action)

3. **Component Structure:**
   - Components in `frontend/components/agents/`
   - Props interface with workspaceId, agent, callbacks
   - Loading state during async operations
   - Toast notifications using sonner
   - data-testid attributes for E2E testing

4. **Files Modified Pattern:**
   - Backend: agentController.ts (handler), agentBuilder.ts (route)
   - Frontend: types/agent.ts (types), lib/api/agents.ts (API), new modal component, AgentCard integration

### Learnings from Previous Stories:

- Add `data-testid` attributes for E2E testing
- Use AlertDialog for destructive actions (not Dialog)
- Handle loading states properly
- Use red color scheme for destructive actions
- Show different warnings based on agent status (Live vs Draft)

---

## Developer Guardrails - Critical Patterns

### DO:

1. **Use findOneAndDelete with workspace filter:**
   ```typescript
   // CORRECT - with workspace isolation
   const agent = await Agent.findOneAndDelete({
     _id: agentId,
     workspace: workspaceId
   });

   // WRONG - no workspace isolation
   const agent = await Agent.findByIdAndDelete(agentId);
   ```

2. **Check for null result after delete:**
   ```typescript
   if (!agent) {
     res.status(404).json({ success: false, error: 'Agent not found' });
     return;
   }
   ```

3. **Use AlertDialog for destructive confirmation:**
   ```typescript
   // CORRECT - AlertDialog for destructive actions
   <AlertDialog open={open} onOpenChange={onOpenChange}>

   // WRONG - Dialog for destructive actions
   <Dialog open={open} onOpenChange={onOpenChange}>
   ```

4. **Show different warnings for Live agents:**
   ```typescript
   const isLive = agent.status === 'Live';
   // Show stronger warning and "Force Delete" button for Live agents
   ```

5. **Remove from local state after deletion:**
   ```typescript
   onDelete={() => {
     setAgents((prev) => prev.filter((a) => a._id !== agent._id));
   }}
   ```

### DO NOT:

1. **Don't use findByIdAndDelete:**
   ```typescript
   // WRONG - bypasses workspace isolation
   await Agent.findByIdAndDelete(agentId);
   ```

2. **Don't forget to stop propagation in menu:**
   ```typescript
   // Menu click handler must stop propagation
   const handleDeleteClick = (e: React.MouseEvent) => {
     e.stopPropagation(); // Prevent card click navigation
     setShowMenu(false);
     setShowDeleteModal(true);
   };
   ```

3. **Don't use Dialog instead of AlertDialog:**
   ```typescript
   // Dialog is for non-destructive modals (create, edit)
   // AlertDialog is for destructive confirmations (delete)
   ```

4. **Don't forget the workspace check in delete:**
   The Agent model has middleware that will throw if workspace is not in query

---

## Implementation Order

1. **Backend Controller** (agentController.ts)
   - Add deleteAgent function with RBAC check
   - Use findOneAndDelete with workspace filter

2. **Backend Routes** (agentBuilder.ts)
   - Import deleteAgent
   - Add DELETE route

3. **Frontend Types** (types/agent.ts)
   - Add DeleteAgentResponse interface

4. **Frontend API** (lib/api/agents.ts)
   - Add deleteAgent function

5. **Frontend Modal Component** (DeleteAgentModal.tsx) [NEW]
   - Create AlertDialog-based confirmation modal
   - Handle Live vs Draft agent warnings

6. **Frontend Integration** (AgentCard.tsx)
   - Add delete button to menu
   - Add DeleteAgentModal with state
   - Wire up onDelete callback

7. **Frontend Page Integration** (agents/page.tsx)
   - Add onDelete prop to AgentCard
   - Remove deleted agent from state

8. **Test & Verify**
   - TypeScript compilation check
   - Test RBAC: Only Owner/Admin can delete
   - Test Draft agent deletion (simple confirm)
   - Test Live agent deletion (force delete warning)
   - Verify agent removed from list after delete
   - Verify workspace isolation (can't delete other workspace's agents)

---

## Testing Requirements

### Backend Tests:

```typescript
describe('Delete Agent', () => {
  it('should delete a Draft agent successfully', async () => {
    // 200 OK, agent removed from database
  });

  it('should delete a Live agent successfully', async () => {
    // Same as Draft, 200 OK - frontend shows different warning
  });

  it('should return 404 for non-existent agent', async () => {
    // 404 Not Found
  });

  it('should return 403 for non-owner/admin', async () => {
    // Member role -> 403 Forbidden
  });

  it('should not delete agent from different workspace', async () => {
    // Workspace isolation check -> 404 Not Found
  });

  it('should allow workspace creator to delete without TeamMember record', async () => {
    // Creator without TeamMember -> 200 OK
  });
});
```

### Frontend Tests:

```typescript
describe('DeleteAgentModal', () => {
  it('should show standard warning for Draft agents', () => {
    // "Delete agent [name]? This cannot be undone."
  });

  it('should show stronger warning for Live agents', () => {
    // "This agent is Live and may have active executions."
  });

  it('should show "Force Delete" button for Live agents', () => {
    // Button text changes based on status
  });

  it('should show loading state during deletion', () => {
    // Spinner and disabled buttons
  });

  it('should call onSuccess after successful deletion', () => {
    // Callback invoked
  });

  it('should show error toast on failure', () => {
    // Error message displayed
  });
});
```

---

## File List (Expected Changes)

### Backend:
- `backend/src/controllers/agentController.ts` - Add deleteAgent function
- `backend/src/routes/agentBuilder.ts` - Add DELETE route

### Frontend:
- `frontend/types/agent.ts` - Add DeleteAgentResponse type
- `frontend/lib/api/agents.ts` - Add deleteAgent function
- `frontend/components/agents/DeleteAgentModal.tsx` [NEW]
- `frontend/components/agents/AgentCard.tsx` - Add delete option to menu
- `frontend/app/projects/[id]/agents/page.tsx` - Add onDelete handler

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Clean implementation with no blocking issues.

### Completion Notes List

- **Backend Controller:** Added `deleteAgent` function to `agentController.ts` with RBAC check (Owner/Admin only) and workspace isolation using `findOneAndDelete`
- **Backend Route:** Added DELETE route `/api/workspaces/:workspaceId/agents/:agentId` to `agentBuilder.ts`
- **Frontend Types:** Added `DeleteAgentResponse` interface to `types/agent.ts`
- **Frontend API:** Added `deleteAgent` function to `lib/api/agents.ts`
- **Frontend Modal:** Created new `DeleteAgentModal.tsx` using AlertDialog with different warnings for Live vs Draft agents
- **Frontend Integration:** Updated `AgentCard.tsx` with delete button in menu and modal integration
- **Page Integration:** Updated `agents/page.tsx` with `onDelete` callback to remove agent from local state
- **Dependency:** Added `alert-dialog` shadcn component (required for destructive action confirmation)
- All TypeScript compilation passes for story-related files (pre-existing errors in unrelated files)

**Code Review Fixes (added during review):**
- **MEDIUM-3 Fix:** Added `e.preventDefault()` to `handleDelete` in DeleteAgentModal to prevent AlertDialog race condition
- **Backend Tests:** Created `agentDelete.test.ts` with 10 test cases covering deletion, RBAC, workspace isolation, and error handling
- **Frontend Tests:** Created `DeleteAgentModal.test.tsx` with comprehensive tests for Draft/Live warnings, loading states, success/error handling

### File List

**Backend (Modified):**
- `backend/src/controllers/agentController.ts` - Added deleteAgent function
- `backend/src/routes/agentBuilder.ts` - Added DELETE route

**Backend (Tests Created):**
- `backend/src/tests/agentDelete.test.ts` - Delete agent test suite (RBAC, workspace isolation, error handling)

**Frontend (Modified):**
- `frontend/types/agent.ts` - Added DeleteAgentResponse type
- `frontend/lib/api/agents.ts` - Added deleteAgent function
- `frontend/components/agents/AgentCard.tsx` - Added delete option to menu
- `frontend/package.json` - Added @radix-ui/react-alert-dialog dependency
- `frontend/package-lock.json` - Updated lockfile

**Frontend (Created):**
- `frontend/components/agents/DeleteAgentModal.tsx` - New confirmation modal
- `frontend/components/ui/alert-dialog.tsx` - shadcn component (added via CLI)

**Frontend (Tests Created):**
- `frontend/components/agents/__tests__/DeleteAgentModal.test.tsx` - Modal component test suite

**Frontend (Page Updated):**
- `frontend/app/projects/[id]/agents/page.tsx` - Added onDelete handler
