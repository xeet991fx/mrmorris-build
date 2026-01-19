# Story 2.1: Enable Test Mode

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-1-enable-test-mode
**Status:** done
**Priority:** High - First story of Epic 2, foundational for all testing capabilities
**FRs Covered:** FR35, FR36, FR38, FR39, FR40, FR41

---

## User Story

**As a** workspace owner,
**I want to** run my agent in Test Mode,
**So that** I can see what it will do without executing real actions.

---

## Acceptance Criteria

### AC1: Test Mode Panel UI

**Given** I have an agent with instructions configured
**When** I click the "Test Mode" button in the agent builder
**Then** A Test Mode panel opens on the right side of the screen
**And** I see a "Run Test" button
**And** I see a message: "Test Mode simulates execution without performing real actions"

### AC2: Dry Run Execution

**Given** I click "Run Test" in Test Mode
**When** The test executes
**Then** The agent instructions are parsed by InstructionParserService
**And** Each step is simulated without actually executing actions
**And** No emails are sent, no LinkedIn messages are sent, no data is modified
**And** The test completes and shows results

### AC3: Email Action Simulation

**Given** An agent instruction says "Send email to contact"
**When** I run Test Mode
**Then** The result shows: "Would send email to [contact name] (DRY RUN)"
**And** No actual email is sent
**And** The email content preview is displayed

### AC4: CRM Update Simulation

**Given** An agent instruction includes "Update deal value to $50,000"
**When** I run Test Mode
**Then** The result shows: "Would update deal value to $50,000 (DRY RUN)"
**And** The actual deal value in the database is not changed

### AC5: Error Display

**Given** Test Mode encounters an error in instructions
**When** The test runs
**Then** The error is displayed: "Error at Step X: [error description]"
**And** The test stops at the error point
**And** I can fix the instructions and re-test

---

## Tasks / Subtasks

- [x] Task 1: Create TestModeService backend (AC: 2, 3, 4, 5)
  - [x] 1.1: Create `backend/src/services/TestModeService.ts`
  - [x] 1.2: Implement `simulateExecution(agentId, workspaceId)` method
  - [x] 1.3: Create mock execution handlers for each action type
  - [x] 1.4: Implement step-by-step result collection with timestamps
  - [x] 1.5: Add error handling with step identification
  - [x] 1.6: Calculate estimated credits and duration

- [x] Task 2: Create test API endpoint (AC: 2)
  - [x] 2.1: Add route `POST /api/workspaces/:workspaceId/agents/:agentId/test`
  - [x] 2.2: Implement controller method in `agentController.ts`
  - [x] 2.3: Add RBAC check (Owner/Admin can test)
  - [x] 2.4: Return structured test results

- [x] Task 3: Create TestModePanel frontend component (AC: 1)
  - [x] 3.1: Create `frontend/components/agents/TestModePanel.tsx`
  - [x] 3.2: Implement sliding panel UI (right side)
  - [x] 3.3: Add "Run Test" button with loading state
  - [x] 3.4: Display informational message about dry run
  - [x] 3.5: Wire up to test API endpoint

- [x] Task 4: Create TestResultsDisplay component (AC: 2, 3, 4, 5)
  - [x] 4.1: Create `frontend/components/agents/TestResultsDisplay.tsx`
  - [x] 4.2: Display step-by-step results with icons
  - [x] 4.3: Show action previews (email content, field changes)
  - [x] 4.4: Display errors with actionable suggestions
  - [x] 4.5: Show estimated credits and duration

- [x] Task 5: Integrate TestMode into agent builder (AC: 1)
  - [x] 5.1: Add "Test Mode" button to agent detail page
  - [x] 5.2: Conditionally show button only when instructions exist
  - [x] 5.3: Handle panel open/close state

---

## Dev Notes

### Critical Architecture Patterns

**TestModeService Design (from architecture.md):**

```typescript
// File: backend/src/services/TestModeService.ts
// CRITICAL: 0% false positives - NEVER execute real actions

interface TestStepResult {
  stepNumber: number;
  action: string;
  status: 'simulated' | 'skipped' | 'error';
  preview: {
    description: string;
    details?: Record<string, any>;
  };
  duration: number;
  estimatedCredits: number;
  note: string; // "DRY RUN - [action] not performed"
}

interface TestRunResult {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: Array<{
    step: number;
    severity: 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  error?: string;
}
```

**Action Simulation Behaviors (MUST follow):**

| Action | Simulation Behavior | Credits |
|--------|---------------------|---------|
| send_email | Show email preview, recipient, subject, body | 2 |
| linkedin_invite | Show invite message preview, recipient | 2 |
| web_search | ACTUALLY EXECUTE (read-only, safe) | 1 |
| create_task | Show task preview, assignee, due date | 0 |
| add_tag / remove_tag | Show tag change preview | 0 |
| update_field | Show field change preview with before/after | 0 |
| enrich_contact | Show enrichment preview with sample data | 3 |
| wait | Show wait duration, mark as simulated | 0 |

### Project Structure Notes

**Backend Files to Create:**

```
backend/src/
├── services/
│   └── TestModeService.ts  [NEW] - Core dry-run simulation logic
├── controllers/
│   └── agentController.ts  [UPDATE] - Add testAgent controller method
└── routes/
    └── agentRoutes.ts      [UPDATE] - Add test endpoint
```

**Frontend Files to Create:**

```
frontend/
├── components/agents/
│   ├── TestModePanel.tsx        [NEW] - Sliding panel container
│   └── TestResultsDisplay.tsx   [NEW] - Step-by-step results
├── lib/api/
│   └── agents.ts                [UPDATE] - Add testAgent API function
└── types/
    └── agent.ts                 [UPDATE] - Add test result types
```

### Existing Patterns to Reuse

**From Epic 1 stories - DO NOT reinvent:**

1. **Agent API Pattern** (from 1-1, 1-7, 1-11):
   ```typescript
   // In agentController.ts
   export const testAgent = async (req: Request, res: Response): Promise<void> => {
     const { workspaceId, agentId } = req.params;
     // Workspace isolation enforced
     const agent = await Agent.findOne({ _id: agentId, workspace: workspaceId });
     // ...
   };
   ```

2. **Frontend API Function Pattern** (from lib/api/agents.ts):
   ```typescript
   export const testAgent = async (
     workspaceId: string,
     agentId: string
   ): Promise<TestRunResponse> => {
     const response = await axios.post(
       `/workspaces/${workspaceId}/agents/${agentId}/test`
     );
     return response.data;
   };
   ```

3. **Panel Component Pattern** - Use shadcn Sheet component for sliding panel

### InstructionParserService Integration

The TestModeService depends on InstructionParserService for parsing:

```typescript
// From architecture.md - DO NOT reimplement parsing
import { InstructionParserService } from './InstructionParserService';

// In TestModeService:
const parsedActions = await InstructionParserService.parse(
  agent.instructions,
  agent.triggers[0]?.type || 'manual'
);
```

**If InstructionParserService doesn't exist yet:**
- Create a stub that returns `agent.parsedActions` directly
- The agent model already stores `parsedActions` from previous implementation
- Full parsing service will be implemented in Epic 4 (AI-Powered)

### Frontend Types to Add

```typescript
// In frontend/types/agent.ts

export interface TestStepResult {
  stepNumber: number;
  action: string;
  status: 'simulated' | 'skipped' | 'error';
  preview: {
    description: string;
    details?: Record<string, any>;
  };
  duration: number;
  estimatedCredits: number;
  note: string;
}

export interface TestRunResponse {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: Array<{
    step: number;
    severity: 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  error?: string;
}
```

### UI Component Guidelines

**TestModePanel (shadcn Sheet):**

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Panel should:
// - Open from right side
// - Be ~400px wide on desktop
// - Show loading state during test execution
// - Display TestResultsDisplay when results available
```

**TestResultsDisplay:**

```typescript
// Step status icons:
// - simulated: CheckCircle (green) with "DRY RUN" badge
// - skipped: ArrowRight (gray) with "SKIPPED" badge
// - error: XCircle (red) with error message

// Layout:
// - Accordion or list view
// - Each step expandable for full details
// - Summary at top: "X steps, Y credits, Z errors"
```

---

## Technical Requirements

### Performance Requirements (from NFRs)

- **NFR2:** Test Mode returns results within 10 seconds for 80% of runs
- **NFR41:** Test results < 10 seconds
- **Timeout:** Set execution timeout to 30 seconds max

### API Specification

**Endpoint:** `POST /api/workspaces/:workspaceId/agents/:agentId/test`

**Request:** No body required (uses agent's stored configuration)

**Response (200 OK):**
```json
{
  "success": true,
  "steps": [
    {
      "stepNumber": 1,
      "action": "send_email",
      "status": "simulated",
      "preview": {
        "description": "Would send email to john@acme.com",
        "details": {
          "to": "john@acme.com",
          "subject": "Follow up on our conversation",
          "body": "Hi John,\n\nI wanted to follow up..."
        }
      },
      "duration": 150,
      "estimatedCredits": 2,
      "note": "DRY RUN - Email not sent"
    }
  ],
  "totalEstimatedCredits": 5,
  "totalEstimatedDuration": 3500,
  "warnings": []
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to execute test",
  "steps": [...],  // Partial results if available
  "failedAtStep": 3
}
```

### Security Requirements

- **Workspace Isolation:** All queries MUST filter by workspaceId
- **RBAC:** Only Owner/Admin can run tests (same as edit permissions)
- **No Side Effects:** CRITICAL - Test mode must NEVER modify data or send messages

---

## Previous Story Intelligence (Epic 1)

### Patterns from 1-11 (List All Workspace Agents):

1. **Controller Pattern:**
   ```typescript
   // Standard response format
   res.status(200).json({
     success: true,
     data: result,
     meta: { /* pagination, counts */ }
   });
   ```

2. **Error Handling:**
   ```typescript
   catch (error: any) {
     console.error('Error [action]:', error);
     res.status(500).json({
       success: false,
       error: 'Failed to [action]'
     });
   }
   ```

3. **Frontend State Management:**
   - Use useState for local component state
   - Use useCallback for fetch functions
   - Toast notifications for errors

### Files Modified in Epic 1:

| File | Purpose |
|------|---------|
| `backend/src/models/Agent.ts` | Agent schema with parsedActions |
| `backend/src/controllers/agentController.ts` | CRUD operations |
| `frontend/types/agent.ts` | TypeScript interfaces |
| `frontend/lib/api/agents.ts` | API helper functions |

---

## Architecture Compliance Requirements

### Database Patterns

- Agent model already has `parsedActions` field - use it directly
- No new models needed for basic test mode
- Future: AgentTestRun model for test history (Story 2.6)

### Workspace Isolation

```typescript
// ALWAYS include workspace filter
const agent = await Agent.findOne({
  _id: agentId,
  workspace: workspaceId  // REQUIRED
});

if (!agent) {
  return res.status(404).json({
    success: false,
    error: 'Agent not found'
  });
}
```

### Error Messages

- User-facing: Clear, actionable ("Template 'xyz' not found. Create the template or update the instruction.")
- Technical: Logged with context for debugging

---

## Developer Guardrails - Critical Patterns

### DO:

1. **Use existing agent.parsedActions:**
   ```typescript
   // CORRECT - use pre-parsed actions from model
   const { parsedActions } = agent;
   for (const action of parsedActions) {
     const result = await simulateAction(action, workspaceId);
     steps.push(result);
   }
   ```

2. **Return structured step results:**
   ```typescript
   // CORRECT - full step detail
   return {
     stepNumber: index + 1,
     action: action.type,
     status: 'simulated',
     preview: { description, details },
     duration: Date.now() - startTime,
     estimatedCredits: getCreditCost(action.type),
     note: `DRY RUN - ${action.type} not performed`
   };
   ```

3. **Handle conditional actions:**
   ```typescript
   // CORRECT - evaluate conditions, mark as skipped if false
   if (action.condition) {
     const conditionMet = evaluateCondition(action.condition, context);
     if (!conditionMet) {
       return { ...result, status: 'skipped', note: 'Condition not met' };
     }
   }
   ```

### DO NOT:

1. **Don't execute real actions:**
   ```typescript
   // WRONG - never call actual integration services in test mode
   await EmailService.send(email);  // NEVER!

   // CORRECT - only simulate
   return { preview: { description: `Would send email to ${email.to}` } };
   ```

2. **Don't skip workspace isolation:**
   ```typescript
   // WRONG - no workspace filter
   const agent = await Agent.findById(agentId);

   // CORRECT - always filter
   const agent = await Agent.findOne({ _id: agentId, workspace: workspaceId });
   ```

3. **Don't create InstructionParserService from scratch:**
   ```typescript
   // WRONG - implementing full parser
   const parsedActions = parseInstructions(agent.instructions);

   // CORRECT - use stored parsedActions (or stub)
   const parsedActions = agent.parsedActions;
   ```

---

## Implementation Order

1. **Backend TestModeService** (Task 1)
   - Create service file
   - Implement simulateExecution method
   - Add action simulation handlers

2. **Backend API Endpoint** (Task 2)
   - Add route
   - Create controller method
   - Test with Postman/curl

3. **Frontend Types** (part of Task 3)
   - Add TestStepResult, TestRunResponse interfaces

4. **Frontend API Function** (part of Task 3)
   - Add testAgent function

5. **Frontend Components** (Tasks 3, 4)
   - TestModePanel (container)
   - TestResultsDisplay (results UI)

6. **Integration** (Task 5)
   - Add Test Mode button to agent detail
   - Wire everything together

7. **Test & Verify**
   - Test with agent that has parsedActions
   - Verify no real actions executed
   - Check error handling
   - Verify <10 second response time

---

## Testing Requirements

### Backend Tests

```typescript
describe('TestModeService', () => {
  it('should simulate all actions without side effects');
  it('should return step-by-step results');
  it('should handle errors gracefully');
  it('should calculate estimated credits correctly');
  it('should evaluate conditions and mark skipped steps');
  it('should complete within 10 seconds for simple agents');
});

describe('POST /agents/:agentId/test', () => {
  it('should return 200 with test results for valid agent');
  it('should return 404 for non-existent agent');
  it('should return 403 for unauthorized user');
  it('should enforce workspace isolation');
});
```

### Frontend Tests

```typescript
describe('TestModePanel', () => {
  it('should open panel when Test Mode button clicked');
  it('should display loading state during test');
  it('should show results after test completes');
  it('should display errors with suggestions');
});

describe('TestResultsDisplay', () => {
  it('should display all steps with correct icons');
  it('should show action previews expandable');
  it('should display estimated credits total');
});
```

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-02-safe-agent-testing.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 1: AI System Architecture - TestModeSimulatorService]
- [Source: _bmad-output/planning-artifacts/prd.md#FR35-FR41]
- [Source: _bmad-output/implementation-artifacts/1-11-list-all-workspace-agents.md - Epic 1 patterns]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend tests: 11 tests passed (TestModeService.test.ts)
- Frontend compilation: Passed (no errors in new code)

### Completion Notes List

1. Created TestModeService with full action simulation for all 10 action types
2. Implemented workspace isolation in all queries
3. Created test API endpoint with RBAC (Owner/Admin only)
4. Created Sheet UI component for sliding panel
5. Created TestModePanel with loading states and error handling
6. Created TestResultsDisplay with expandable step details
7. Integrated Test Mode button (conditionally shown when instructions exist)

### File List

**Backend (NEW):**
- `backend/src/services/TestModeService.ts` - Core dry-run simulation service
- `backend/src/services/TestModeService.test.ts` - Unit tests (11 tests)

**Backend (UPDATED):**
- `backend/src/controllers/agentController.ts` - Added testAgent controller
- `backend/src/routes/agentBuilder.ts` - Added test endpoint route
- `backend/src/models/Agent.ts` - [Note: Contains Story 1.11 changes bundled in commit]
- `backend/package.json` - Added test scripts (npm test, test:watch, test:coverage)

**Frontend (NEW):**
- `frontend/components/ui/sheet.tsx` - Sheet (sliding panel) component
- `frontend/components/agents/TestModePanel.tsx` - Test Mode panel container
- `frontend/components/agents/TestResultsDisplay.tsx` - Step-by-step results display

**Frontend (UPDATED):**
- `frontend/types/agent.ts` - Added TestStepResult, TestRunResponse types
- `frontend/lib/api/agents.ts` - Added testAgent API function
- `frontend/app/projects/[id]/agents/[agentId]/page.tsx` - Added Test Mode button and panel
- `frontend/app/projects/[id]/agents/page.tsx` - Minor updates
- `frontend/components/agents/AgentCard.tsx` - Minor updates
- `frontend/components/pipelines/PipelineForm.tsx` - Unrelated changes bundled
- `frontend/components/providers/theme-provider.tsx` - Unrelated changes bundled
- `frontend/lib/utils/date.ts` - Utility updates

### Review Follow-ups (Code Review)

- [ ] [CR][HIGH] Write frontend component tests for TestModePanel.tsx
- [ ] [CR][HIGH] Write frontend component tests for TestResultsDisplay.tsx
- [ ] [CR][MEDIUM] Verify backend tests pass with `npm test` after test script addition

