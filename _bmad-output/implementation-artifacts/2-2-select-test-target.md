# Story 2.2: Select Test Target

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-2-select-test-target
**Status:** done
**Priority:** High - Enables realistic testing with actual workspace data
**FRs Covered:** FR37 (Test with specific contacts/deals)

---

## User Story

**As a** workspace owner,
**I want to** select a specific contact or deal to test my agent against,
**So that** I can see realistic results based on actual data.

---

## Acceptance Criteria

### AC1: Test Target Selector UI

**Given** I open Test Mode for an agent
**When** The Test Mode panel displays
**Then** I see a dropdown to "Select test target"
**And** I can choose between: Contact, Deal, or No target (manual input)

### AC2: Contact Selection

**Given** I select "Contact" as test target
**When** The dropdown expands
**Then** I see a searchable list of contacts from my workspace
**And** I can search by name, email, or company
**And** I can select a contact from the list

### AC3: Contact Data Resolution

**Given** I select contact "John Doe" as test target
**When** I run the test
**Then** The test uses John Doe's actual data (email, title, company, custom fields)
**And** Instructions referencing @contact.firstName resolve to "John"
**And** Instructions referencing @contact.company resolve to John's company

### AC4: Deal Selection

**Given** I select "Deal" as test target
**When** The dropdown expands
**Then** I see a searchable list of deals from my workspace
**And** I can search by deal name, company, or value
**And** I can select a deal from the list

### AC5: Deal Data Resolution

**Given** I select deal "Acme Corp - $50K" as test target
**When** I run the test
**Then** The test uses the deal's actual data (value, stage, company, contact)
**And** Instructions referencing @deal.value resolve to 50000
**And** Instructions referencing @deal.company resolve to "Acme Corp"

### AC6: Manual Input Mode

**Given** I select "No target" (manual input)
**When** I run the test
**Then** I can manually enter test data for variables
**And** The test uses my manually entered data instead of real records

### AC7: Trigger-Based Default

**Given** An agent has trigger "Contact Created"
**When** I open Test Mode
**Then** The test target defaults to "Contact" type
**And** I must select a contact to test against

---

## Tasks / Subtasks

- [x] Task 1: Create test target API endpoints (AC: 2, 4)
  - [x] 1.1: Create `GET /api/workspaces/:workspaceId/test-targets/contacts` endpoint with search
  - [x] 1.2: Create `GET /api/workspaces/:workspaceId/test-targets/deals` endpoint with search
  - [x] 1.3: Add pagination (limit 20) and search filtering
  - [x] 1.4: Return minimal data for selection (id, name, email/value, company)

- [x] Task 2: Update TestModeService for target injection (AC: 3, 5, 6)
  - [x] 2.1: Add `testTarget` parameter to `simulateExecution` method
  - [x] 2.2: Create `resolveTestContext(targetType, targetId, workspaceId)` method
  - [x] 2.3: Implement variable resolution for @contact.* references
  - [x] 2.4: Implement variable resolution for @deal.* references
  - [x] 2.5: Handle "no target" mode with manual data

- [x] Task 3: Update test API endpoint (AC: 1, 7)
  - [x] 3.1: Extend `POST /api/workspaces/:workspaceId/agents/:agentId/test` with testTarget body
  - [x] 3.2: Validate testTarget: { type: 'contact' | 'deal' | 'none', id?: string, manualData?: object }
  - [x] 3.3: Implement trigger-based target type inference

- [x] Task 4: Create TestTargetSelector frontend component (AC: 1, 2, 4)
  - [x] 4.1: Create `frontend/components/agents/TestTargetSelector.tsx`
  - [x] 4.2: Implement dropdown with three options (Contact, Deal, No target)
  - [x] 4.3: Implement searchable contact list with debounced search
  - [x] 4.4: Implement searchable deal list with debounced search
  - [x] 4.5: Display selected target preview (name, key info)

- [x] Task 5: Create ManualTestDataInput component (AC: 6)
  - [x] 5.1: Create `frontend/components/agents/ManualTestDataInput.tsx`
  - [x] 5.2: Detect required variables from agent instructions/parsedActions
  - [x] 5.3: Generate input fields for each required variable
  - [x] 5.4: Validate required fields before test execution

- [x] Task 6: Integrate TestTargetSelector into TestModePanel (AC: 1, 7)
  - [x] 6.1: Add TestTargetSelector to TestModePanel above Run Test button
  - [x] 6.2: Pass selected target to testAgent API call
  - [x] 6.3: Implement trigger-based default selection
  - [x] 6.4: Disable Run Test if required target not selected

---

## Dev Notes

### Critical Architecture Patterns

**Test Target Context Resolution (from architecture.md):**

```typescript
// File: backend/src/services/TestModeService.ts
// EXTEND existing service with target injection

interface TestTarget {
  type: 'contact' | 'deal' | 'none';
  id?: string;
  manualData?: Record<string, any>;
}

interface TestContext {
  contact?: IContact;
  deal?: IDeal;
  variables: Record<string, any>; // Resolved @contact.*, @deal.* values
}

// Variable resolution patterns:
// @contact.firstName → testContext.contact.firstName
// @contact.company → testContext.contact.company?.name
// @deal.value → testContext.deal.value
// @deal.stage → testContext.deal.stage
```

**Variable Reference Pattern:**

| Reference | Resolution Path |
|-----------|-----------------|
| @contact.firstName | contact.firstName |
| @contact.lastName | contact.lastName |
| @contact.email | contact.email |
| @contact.title | contact.title |
| @contact.company | contact.company.name (populated) |
| @contact.phone | contact.phone |
| @deal.name | deal.name |
| @deal.value | deal.value |
| @deal.stage | deal.stage |
| @deal.company | deal.company.name (populated) |
| @deal.contact | deal.contact.firstName + lastName (populated) |

### Project Structure Notes

**Backend Files to Create/Update:**

```
backend/src/
├── services/
│   └── TestModeService.ts  [UPDATE] - Add testTarget parameter and context resolution
├── controllers/
│   └── agentController.ts  [UPDATE] - Update testAgent for target body
│   └── testTargetController.ts [NEW] - Contact/Deal search endpoints
└── routes/
    └── agentBuilder.ts     [UPDATE] - Add test-targets routes
```

**Frontend Files to Create/Update:**

```
frontend/
├── components/agents/
│   ├── TestModePanel.tsx        [UPDATE] - Add TestTargetSelector
│   ├── TestTargetSelector.tsx   [NEW] - Target type and selection UI
│   └── ManualTestDataInput.tsx  [NEW] - Manual variable input fields
├── lib/api/
│   └── agents.ts                [UPDATE] - Add testTargets API functions
└── types/
    └── agent.ts                 [UPDATE] - Add TestTarget types
```

### Existing Patterns to Reuse

**From Story 2.1 - DO NOT reinvent:**

1. **TestModeService Pattern** (`backend/src/services/TestModeService.ts:1-400`):
   ```typescript
   // EXTEND this existing service
   async simulateExecution(
     agentId: string,
     workspaceId: string,
     testTarget?: TestTarget  // NEW PARAMETER
   ): Promise<TestRunResult>
   ```

2. **Test API Endpoint Pattern** (`backend/src/routes/agentBuilder.ts:145-150`):
   ```typescript
   // EXTEND existing endpoint with body
   router.post(
     '/workspaces/:workspaceId/agents/:agentId/test',
     authenticate,
     validateWorkspaceAccess,
     testAgent  // Update controller to accept testTarget body
   );
   ```

3. **Sheet Panel Pattern** (`frontend/components/agents/TestModePanel.tsx`):
   - Already has sliding panel structure
   - Add TestTargetSelector above Run Test button
   - Pass testTarget state to testAgent call

4. **Searchable Dropdown Pattern** - Use existing Contact/Deal pickers if available, or shadcn Combobox

### Model References

**Contact Model** (`backend/src/models/Contact.ts`):
```typescript
interface IContact {
  _id: ObjectId;
  workspace: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  title?: string;
  company?: ObjectId;  // Reference to Company model
  phone?: string;
  customFields?: Record<string, any>;
  // ... other fields
}
```

**Deal Model** (`backend/src/models/Deal.ts`):
```typescript
interface IDeal {
  _id: ObjectId;
  workspace: ObjectId;
  name: string;
  value: number;
  stage: string;
  company?: ObjectId;  // Reference to Company model
  contact?: ObjectId;  // Reference to Contact model
  // ... other fields
}
```

### Frontend Types to Add

```typescript
// In frontend/types/agent.ts - ADD these types

export type TestTargetType = 'contact' | 'deal' | 'none';

export interface TestTarget {
  type: TestTargetType;
  id?: string;
  manualData?: Record<string, any>;
}

export interface TestTargetOption {
  id: string;
  name: string;
  subtitle?: string;  // email for contact, value for deal
  company?: string;
}

export interface TestTargetSearchParams {
  search?: string;
  limit?: number;
}

// UPDATE existing TestRunResponse - no changes needed,
// variable resolution happens server-side
```

### API Specifications

**Endpoint 1:** `GET /api/workspaces/:workspaceId/test-targets/contacts`

**Query Params:**
- `search?: string` - Search in firstName, lastName, email, company.name
- `limit?: number` - Default 20, max 50

**Response (200 OK):**
```json
{
  "success": true,
  "targets": [
    {
      "id": "64abc...",
      "name": "John Doe",
      "subtitle": "john@acme.com",
      "company": "Acme Corp"
    }
  ],
  "hasMore": true
}
```

---

**Endpoint 2:** `GET /api/workspaces/:workspaceId/test-targets/deals`

**Query Params:**
- `search?: string` - Search in name, company.name
- `limit?: number` - Default 20, max 50

**Response (200 OK):**
```json
{
  "success": true,
  "targets": [
    {
      "id": "64def...",
      "name": "Enterprise Deal",
      "subtitle": "$50,000",
      "company": "Acme Corp"
    }
  ],
  "hasMore": true
}
```

---

**Endpoint 3:** `POST /api/workspaces/:workspaceId/agents/:agentId/test` (UPDATED)

**Request Body:**
```json
{
  "testTarget": {
    "type": "contact",
    "id": "64abc..."
  }
}
```

OR for manual input:
```json
{
  "testTarget": {
    "type": "none",
    "manualData": {
      "contact.firstName": "Test",
      "contact.lastName": "User",
      "contact.email": "test@example.com",
      "deal.value": 10000
    }
  }
}
```

**Response:** Same as Story 2.1 (TestRunResponse)

---

## Technical Requirements

### Performance Requirements (from NFRs)

- **NFR2:** Test Mode returns results within 10 seconds for 80% of runs (maintained)
- **Target Search:** < 500ms response time for search queries
- **Debounce:** 300ms debounce on search input to minimize API calls

### Security Requirements

- **Workspace Isolation:** Contact/Deal queries MUST filter by workspaceId
- **RBAC:** Same as test execution - Owner/Admin can test
- **Data Exposure:** Only return minimal data needed for selection (no sensitive fields)

### Trigger-Based Defaults Logic

```typescript
// Determine default target type based on agent triggers
function getDefaultTargetType(triggers: ITriggerConfig[]): TestTargetType {
  for (const trigger of triggers) {
    if (trigger.type === 'event') {
      const event = trigger.config.event;
      if (event === 'contact.created' || event === 'form.submitted') {
        return 'contact';
      }
      if (event === 'deal.stage_updated') {
        return 'deal';
      }
    }
  }
  // Manual or scheduled triggers - no default
  return 'none';
}

// Required target check
function isTargetRequired(agent: IAgent): boolean {
  // If instructions reference @contact.* or @deal.*, require target
  const instructions = agent.instructions || '';
  if (instructions.includes('@contact.')) return true;
  if (instructions.includes('@deal.')) return true;
  return false;
}
```

---

## Previous Story Intelligence (Story 2.1)

### Patterns Established in 2.1:

1. **TestModeService Architecture:**
   - `simulateExecution()` method returns TestRunResult
   - Action simulation handlers for all 10 action types
   - Workspace isolation in all queries
   - RBAC enforcement (Owner/Admin only)

2. **Frontend Integration:**
   - TestModePanel uses Sheet component (sliding right)
   - TestResultsDisplay shows step-by-step results
   - Loading states and error handling patterns
   - Toast notifications for success/error

3. **API Response Format:**
   ```typescript
   {
     success: boolean;
     steps: TestStepResult[];
     totalEstimatedCredits: number;
     totalEstimatedDuration: number;
     warnings: Array<...>;
     error?: string;
   }
   ```

### Files Modified in 2.1:

| File | Relevance to 2.2 |
|------|------------------|
| `backend/src/services/TestModeService.ts` | EXTEND - add testTarget parameter |
| `backend/src/controllers/agentController.ts` | EXTEND - update testAgent for body |
| `frontend/components/agents/TestModePanel.tsx` | EXTEND - add TestTargetSelector |
| `frontend/lib/api/agents.ts` | EXTEND - add testTargets API functions |
| `frontend/types/agent.ts` | EXTEND - add TestTarget types |

### Review Follow-ups from 2.1:

- [ ] Frontend component tests still needed (carry forward to 2.2)

---

## Architecture Compliance Requirements

### Database Patterns

- Use existing Contact and Deal models - no new models needed
- Populate company references for display: `.populate('company', 'name')`
- Limit queries for performance: `.limit(20)`
- Search with regex for flexible matching: `{ $regex: search, $options: 'i' }`

### Workspace Isolation

```typescript
// ALWAYS include workspace filter in target queries
const contacts = await Contact.find({
  workspace: workspaceId,  // REQUIRED
  $or: [
    { firstName: { $regex: search, $options: 'i' } },
    { lastName: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } }
  ]
})
.populate('company', 'name')
.limit(20)
.select('_id firstName lastName email company');
```

### Error Messages

- "Please select a contact to test against" (when required but not selected)
- "No contacts found matching '[search]'" (empty search results)
- "Test target not found" (404 if selected target was deleted)

---

## Developer Guardrails - Critical Patterns

### DO:

1. **Extend existing TestModeService:**
   ```typescript
   // CORRECT - extend existing method signature
   async simulateExecution(
     agentId: string,
     workspaceId: string,
     testTarget?: TestTarget  // ADD optional parameter
   ): Promise<TestRunResult>
   ```

2. **Use compound queries for search:**
   ```typescript
   // CORRECT - search multiple fields
   const query = search
     ? {
         workspace: workspaceId,
         $or: [
           { firstName: { $regex: search, $options: 'i' } },
           { email: { $regex: search, $options: 'i' } }
         ]
       }
     : { workspace: workspaceId };
   ```

3. **Debounce search in frontend:**
   ```typescript
   // CORRECT - prevent excessive API calls
   const debouncedSearch = useMemo(
     () => debounce((value: string) => searchTargets(value), 300),
     []
   );
   ```

### DO NOT:

1. **Don't skip workspace isolation:**
   ```typescript
   // WRONG - no workspace filter
   const contacts = await Contact.find({ email: search });

   // CORRECT - always filter
   const contacts = await Contact.find({ workspace: workspaceId, email: search });
   ```

2. **Don't fetch full documents:**
   ```typescript
   // WRONG - fetching all fields
   const contacts = await Contact.find({ workspace: workspaceId });

   // CORRECT - select only needed fields
   const contacts = await Contact.find({ workspace: workspaceId })
     .select('_id firstName lastName email company')
     .limit(20);
   ```

3. **Don't make search required:**
   ```typescript
   // WRONG - requiring search
   if (!search) throw new Error('Search required');

   // CORRECT - search is optional
   const query = search
     ? { workspace: workspaceId, ...searchFilters }
     : { workspace: workspaceId };
   ```

---

## Implementation Order

1. **Backend Target Search Endpoints** (Task 1)
   - Create testTargetController.ts
   - Add routes for contacts and deals search
   - Test with Postman/curl

2. **Backend TestModeService Extension** (Task 2)
   - Add testTarget parameter
   - Implement context resolution
   - Handle variable substitution

3. **Backend API Update** (Task 3)
   - Update testAgent controller for body
   - Add Zod validation for testTarget

4. **Frontend Types** (part of Task 4)
   - Add TestTarget, TestTargetOption interfaces

5. **Frontend API Functions** (part of Task 4)
   - Add searchContacts, searchDeals functions

6. **Frontend Components** (Tasks 4, 5)
   - TestTargetSelector component
   - ManualTestDataInput component

7. **Frontend Integration** (Task 6)
   - Wire TestTargetSelector into TestModePanel
   - Pass target to API call

8. **Test & Verify**
   - Test contact selection and variable resolution
   - Test deal selection and variable resolution
   - Test manual input mode
   - Verify trigger-based defaults

---

## Testing Requirements

### Backend Tests

```typescript
describe('TestModeService with target', () => {
  it('should resolve @contact.* variables from selected contact');
  it('should resolve @deal.* variables from selected deal');
  it('should handle manual data for variable resolution');
  it('should return error if required target not provided');
  it('should populate company name for contact display');
});

describe('GET /test-targets/contacts', () => {
  it('should return contacts matching search');
  it('should respect workspace isolation');
  it('should return limited fields for selection');
  it('should paginate results (max 20)');
});

describe('GET /test-targets/deals', () => {
  it('should return deals matching search');
  it('should include formatted value in subtitle');
  it('should populate company name');
});

describe('POST /agents/:agentId/test with target', () => {
  it('should accept testTarget in request body');
  it('should use target data for variable resolution');
  it('should validate testTarget schema');
});
```

### Frontend Tests

```typescript
describe('TestTargetSelector', () => {
  it('should display three target type options');
  it('should show searchable contact list when Contact selected');
  it('should show searchable deal list when Deal selected');
  it('should debounce search input');
  it('should display selected target preview');
});

describe('ManualTestDataInput', () => {
  it('should generate inputs for required variables');
  it('should validate required fields');
  it('should return structured manualData object');
});
```

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-02-safe-agent-testing.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Variable Resolution]
- [Source: _bmad-output/implementation-artifacts/2-1-enable-test-mode.md - Previous story patterns]
- [Source: backend/src/models/Contact.ts - Contact model schema]
- [Source: backend/src/models/Deal.ts - Deal model schema]

---

## Dev Agent Record

### Agent Model Used

Claude (claude-opus-4-5-thinking)

### Debug Log References

- TypeScript compilation passes for both backend and frontend
- All tasks implemented following the story specification
- Variable resolution implemented for @contact.* and @deal.* patterns

### Completion Notes List

1. Created test target API endpoints with search functionality and pagination
2. Extended TestModeService with testTarget parameter and context resolution
3. Updated test API endpoint to accept testTarget in request body
4. Created TestTargetSelector component with tabs for Contact/Deal/Manual
5. Created ManualTestDataInput component for custom variable entry
6. Integrated TestTargetSelector into TestModePanel

### File List

**Backend - New Files:**
- backend/src/controllers/testTargetController.ts
- backend/src/tests/testTarget.test.ts

**Backend - Modified Files:**
- backend/package.json
- backend/src/services/TestModeService.ts
- backend/src/controllers/agentController.ts
- backend/src/routes/agentBuilder.ts
- backend/src/validations/agentValidation.ts

**Frontend - New Files:**
- frontend/components/agents/TestTargetSelector.tsx
- frontend/components/agents/ManualTestDataInput.tsx

**Frontend - Modified Files:**
- frontend/components/agents/TestModePanel.tsx
- frontend/lib/api/agents.ts
- frontend/types/agent.ts

