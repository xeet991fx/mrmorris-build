# Story 1.4: Configure Agent Restrictions

**Epic:** Epic 1 - Manual Agent Building
**Story Key:** 1-4-configure-agent-restrictions
**Status:** done
**Priority:** High - Core agent safety mechanism enabling behavior control and scope limits

---

## User Story

**As a** workspace owner,
**I want to** set restrictions on my agent's behavior,
**So that** I can prevent unwanted actions and control scope.

---

## Acceptance Criteria

### AC1: Restrictions Section Display

**Given** I have an agent with instructions
**When** I navigate to the "Restrictions" section
**Then** I see options to configure: Max executions per day, Max emails per day, Allowed integrations, Excluded contacts/companies, AND a "Guardrails" textarea for natural language rules

### AC2: Max Executions Per Day

**Given** I set "Max executions per day" to 50
**When** I save the agent
**Then** The agent will auto-pause after 50 executions in a 24-hour period
**And** The restriction is saved: `{ maxExecutionsPerDay: 50 }`

### AC3: Max Emails Per Day

**Given** I set "Max emails per day" to 100
**When** I save the agent
**Then** The agent will stop sending emails after 100 in a 24-hour period
**And** The restriction is saved: `{ maxEmailsPerDay: 100 }`

### AC4: Allowed Integrations

**Given** I select specific integrations the agent can use
**When** I check Gmail and LinkedIn only
**Then** The agent can only use these two integrations
**And** Attempts to use other integrations will be blocked
**And** The restriction is saved: `{ allowedIntegrations: ['gmail', 'linkedin'] }`

### AC5: Excluded Contacts/Companies

**Given** I add excluded contacts or companies
**When** I enter contact IDs or company domains to exclude
**Then** The agent will skip these contacts/companies during execution
**And** The restriction is saved: `{ excludedContacts: [...], excludedDomains: [...] }`

### AC6: Default Restrictions

**Given** I leave restrictions empty
**When** I save the agent
**Then** Default restrictions apply: `maxExecutionsPerDay: 100, maxEmailsPerDay: 100`
**And** All integrations are allowed by default

### AC7: Natural Language Guardrails

**Given** I write natural language guardrails
**When** I enter text like "Never contact anyone at competitor.com" or "Wait 48 hours between follow-ups"
**Then** The guardrails are saved with the agent (max 5000 characters)
**And** The restriction is saved: `{ guardrails: "..." }`

---

## Technical Requirements

### 1. Update Agent Model

**File:** `backend/src/models/Agent.ts`

Update the restrictions field from a simple string to a properly typed schema:

```typescript
// Add interface for restrictions
export interface IAgentRestrictions {
  maxExecutionsPerDay: number;
  maxEmailsPerDay: number;
  allowedIntegrations: string[];  // ['gmail', 'linkedin', 'slack', etc.] - empty = all allowed
  excludedContacts: string[];     // Array of contact IDs
  excludedDomains: string[];      // Array of company domains (e.g., 'competitor.com')
  guardrails: string;             // Natural language rules (max 5000 chars)
}

// Update IAgent interface
export interface IAgent extends Document {
  // ... existing fields
  restrictions?: IAgentRestrictions;
}

// Update schema
restrictions: {
  maxExecutionsPerDay: {
    type: Number,
    default: 100,
    min: [1, 'Max executions per day must be at least 1'],
    max: [1000, 'Max executions per day cannot exceed 1000']
  },
  maxEmailsPerDay: {
    type: Number,
    default: 100,
    min: [1, 'Max emails per day must be at least 1'],
    max: [500, 'Max emails per day cannot exceed 500']
  },
  allowedIntegrations: {
    type: [String],
    default: [],  // Empty = all integrations allowed
    enum: ['gmail', 'linkedin', 'slack', 'apollo', 'google-calendar', 'google-sheets']
  },
  excludedContacts: {
    type: [String],
    default: []
  },
  excludedDomains: {
    type: [String],
    default: []
  },
  guardrails: {
    type: String,
    default: '',
    maxlength: [5000, 'Guardrails cannot exceed 5,000 characters']
  }
}
```

### 2. API Endpoints

#### Update PUT `/api/workspaces/:workspaceId/agents/:agentId`

**Request:**
```typescript
{
  restrictions?: {
    maxExecutionsPerDay?: number;  // 1-1000, default 100
    maxEmailsPerDay?: number;      // 1-500, default 100
    allowedIntegrations?: string[];
    excludedContacts?: string[];
    excludedDomains?: string[];
  }
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  agent: {
    // ... existing fields
    restrictions: IAgentRestrictions;
    updatedAt: Date;
  }
}
```

**Validation:**
- maxExecutionsPerDay: positive integer, 1-1000
- maxEmailsPerDay: positive integer, 1-500
- allowedIntegrations: array of valid integration names
- excludedContacts: array of strings (ObjectId format or any string)
- excludedDomains: array of valid domain strings

**Error Responses:**
- 400: Invalid restriction values
- 403: User doesn't have workspace access
- 404: Agent not found
- 500: Server error

### 3. Backend Validation Schema

**File:** `backend/src/validations/agentValidation.ts`

```typescript
// Story 1.4: Restrictions constants
export const RESTRICTIONS_DEFAULTS = {
  maxExecutionsPerDay: 100,
  maxEmailsPerDay: 100
};

export const RESTRICTIONS_LIMITS = {
  maxExecutionsPerDay: { min: 1, max: 1000 },
  maxEmailsPerDay: { min: 1, max: 500 }
};

export const VALID_INTEGRATIONS = [
  'gmail',
  'linkedin',
  'slack',
  'apollo',
  'google-calendar',
  'google-sheets'
] as const;

// Restrictions schema
const restrictionsSchema = z.object({
  maxExecutionsPerDay: z.number()
    .int('Must be a whole number')
    .min(RESTRICTIONS_LIMITS.maxExecutionsPerDay.min, 'Must be at least 1')
    .max(RESTRICTIONS_LIMITS.maxExecutionsPerDay.max, 'Cannot exceed 1000')
    .optional(),
  maxEmailsPerDay: z.number()
    .int('Must be a whole number')
    .min(RESTRICTIONS_LIMITS.maxEmailsPerDay.min, 'Must be at least 1')
    .max(RESTRICTIONS_LIMITS.maxEmailsPerDay.max, 'Cannot exceed 500')
    .optional(),
  allowedIntegrations: z.array(z.enum(VALID_INTEGRATIONS)).optional(),
  excludedContacts: z.array(z.string()).optional(),
  excludedDomains: z.array(z.string().regex(/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/, 'Invalid domain format')).optional()
}).optional();

// Update updateAgentSchema
export const updateAgentSchema = z.object({
  body: z.object({
    // ... existing fields
    restrictions: restrictionsSchema
  })
});
```

### 4. Frontend Components

#### Location: `frontend/components/agents/RestrictionsConfiguration.tsx`

Main restrictions configuration component with:
- **Rate Limits Section:**
  - Max executions per day input (number, 1-1000)
  - Max emails per day input (number, 1-500)
  - Helper text explaining each limit
  - "Reset to defaults" button

- **Integration Permissions Section:**
  - Checkbox list of available integrations (with icons)
  - "Select All" / "Clear All" toggle
  - Helper text: "Leave empty to allow all integrations"

- **Exclusions Section:**
  - Excluded contacts picker (searchable, shows contact name)
  - Excluded domains input (comma-separated or tag-style)
  - Helper text explaining exclusion behavior

**Component Props:**
```typescript
interface RestrictionsConfigurationProps {
  workspaceId: string;
  agentId: string;
  initialRestrictions: IAgentRestrictions | null;
  onSave?: (restrictions: IAgentRestrictions) => void;
  disabled?: boolean;
}
```

#### Location: `frontend/types/agent.ts`

Add restrictions types:
```typescript
// Story 1.4: Restrictions types
export interface IAgentRestrictions {
  maxExecutionsPerDay: number;
  maxEmailsPerDay: number;
  allowedIntegrations: string[];
  excludedContacts: string[];
  excludedDomains: string[];
}

export const VALID_INTEGRATIONS = [
  { id: 'gmail', name: 'Gmail', icon: 'mail' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
  { id: 'slack', name: 'Slack', icon: 'slack' },
  { id: 'apollo', name: 'Apollo.io', icon: 'database' },
  { id: 'google-calendar', name: 'Google Calendar', icon: 'calendar' },
  { id: 'google-sheets', name: 'Google Sheets', icon: 'table' }
] as const;

export const RESTRICTIONS_DEFAULTS: IAgentRestrictions = {
  maxExecutionsPerDay: 100,
  maxEmailsPerDay: 100,
  allowedIntegrations: [],
  excludedContacts: [],
  excludedDomains: []
};

// Update UpdateAgentInput
export interface UpdateAgentInput {
  // ... existing fields
  restrictions?: Partial<IAgentRestrictions>;
}
```

---

## Architecture Compliance Requirements

### 1. Workspace Isolation

- All restriction data is scoped to the agent, which is already workspace-isolated
- No new workspace-level queries needed
- Existing compound indexes apply

### 2. Validation Pattern

**Backend:** (Zod + Mongoose)
- Zod schema validates request body structure and types
- Mongoose schema validates on save with min/max constraints
- Both layers must agree on constraints

**Frontend:**
- Form validation mirrors backend rules
- Prevent invalid inputs before API call
- Show inline errors for constraint violations

### 3. API Pattern

Follow existing PUT endpoint pattern:
```typescript
// In agentController.ts updateAgent function
if (updateData.restrictions !== undefined) {
  // Merge with defaults for any missing fields
  const defaultRestrictions = {
    maxExecutionsPerDay: 100,
    maxEmailsPerDay: 100,
    allowedIntegrations: [],
    excludedContacts: [],
    excludedDomains: []
  };
  
  agent.restrictions = {
    ...defaultRestrictions,
    ...updateData.restrictions
  };
}
```

---

## Previous Story Context (Story 1.3)

### Patterns Established:

1. **Component Structure:**
   - Separate component file in `frontend/components/agents/`
   - Props interface with workspaceId, agentId, initial values, onSave callback
   - Disabled state during save operations

2. **Save Flow:**
   - Use existing `updateAgent` function from `lib/api/agents.ts`
   - Toast notifications for success/error
   - Update parent state via callback

3. **Validation:**
   - Zod schemas in `agentValidation.ts`
   - Export constants for thresholds/limits
   - Mirror validation between frontend and backend

4. **Files Modified Pattern:**
   - Backend: Agent.ts (model), agentValidation.ts (schemas), agentController.ts (handler)
   - Frontend: types/agent.ts (types), new component, page.tsx (integration)

### Important Learnings from Code Review:

- Add `data-testid` attributes for E2E testing
- Wire up callbacks between components properly (e.g., onCopyToEditor)
- Frontend validation should prevent API calls when invalid
- Use shadcn/ui components consistently

---

## Developer Guardrails - Critical Patterns to Follow

### ✅ DO:

1. **Use Existing updateAgent API:**
   ```typescript
   // Reuse the existing updateAgent function
   import { updateAgent } from '@/lib/api/agents';
   
   await updateAgent(workspaceId, agentId, { restrictions: newRestrictions });
   ```

2. **Merge with Defaults on Save:**
   ```typescript
   // Backend: Always merge with defaults to ensure all fields present
   agent.restrictions = {
     maxExecutionsPerDay: 100,
     maxEmailsPerDay: 100,
     allowedIntegrations: [],
     excludedContacts: [],
     excludedDomains: [],
     ...updateData.restrictions
   };
   ```

3. **Match UI Patterns from TriggerConfiguration:**
   ```typescript
   // Use shadcn/ui components
   import { Input } from '@/components/ui/input';
   import { Checkbox } from '@/components/ui/checkbox';
   import { Label } from '@/components/ui/label';
   import { toast } from 'sonner';
   ```

4. **Add data-testid Attributes:**
   ```tsx
   <Input
     data-testid="max-executions-input"
     type="number"
     value={maxExecutionsPerDay}
     onChange={...}
   />
   ```

5. **Show Helper Text for Each Field:**
   ```tsx
   <p className="text-xs text-zinc-500">
     Agent will auto-pause after reaching this limit daily
   </p>
   ```

### ❌ DO NOT:

1. **Create Separate API Endpoints:**
   ```typescript
   // ❌ WRONG - Don't create new endpoint
   PUT /api/workspaces/:workspaceId/agents/:agentId/restrictions
   
   // ✅ CORRECT - Use existing endpoint
   PUT /api/workspaces/:workspaceId/agents/:agentId
   ```

2. **Store Empty Objects as Null:**
   ```typescript
   // ❌ WRONG - Inconsistent data
   if (Object.keys(restrictions).length === 0) {
     agent.restrictions = null;
   }
   
   // ✅ CORRECT - Always use object with defaults
   agent.restrictions = { ...DEFAULTS, ...restrictions };
   ```

3. **Forget Validation on Both Layers:**
   ```typescript
   // ❌ WRONG - Only backend validates
   // Frontend allows any value
   
   // ✅ CORRECT - Both validate
   // Frontend: min={1} max={1000} + inline error
   // Backend: z.number().min(1).max(1000)
   ```

4. **Mix Integration Names:**
   ```typescript
   // ❌ WRONG - Inconsistent naming
   allowedIntegrations: ['Gmail', 'LINKEDIN', 'google_calendar']
   
   // ✅ CORRECT - Lowercase with hyphens
   allowedIntegrations: ['gmail', 'linkedin', 'google-calendar']
   ```

---

## Implementation Order

1. **Backend Model Update** (Agent.ts)
   - Add IAgentRestrictions interface
   - Replace string restrictions with typed schema
   - Add default values and constraints

2. **Backend Validation** (agentValidation.ts)
   - Add restrictionsSchema with Zod
   - Add constants for limits and valid integrations
   - Update updateAgentSchema

3. **Backend Controller** (agentController.ts)
   - Handle restrictions field in updateAgent
   - Merge with defaults
   - Include restrictions in response

4. **Frontend Types** (types/agent.ts)
   - Add IAgentRestrictions interface
   - Add VALID_INTEGRATIONS and RESTRICTIONS_DEFAULTS constants
   - Update UpdateAgentInput

5. **Frontend Component** (RestrictionsConfiguration.tsx)
   - Rate limits inputs with validation
   - Integration checkboxes with icons
   - Exclusions input (domains)
   - Save button with loading state

6. **Update Agent Builder Page** (page.tsx)
   - Import and render RestrictionsConfiguration
   - Handle save callback
   - Replace placeholder section

7. **Test & Verify**
   - Manual testing of all flows
   - TypeScript compilation check
   - Verify data persists correctly

---

## Testing Requirements

### Backend Tests:

```typescript
describe('Restrictions Configuration', () => {
  it('should update agent with valid restrictions', async () => {
    // Test basic restrictions update
  });

  it('should apply default values when restrictions not provided', async () => {
    // Test defaults: maxExecutionsPerDay: 100, maxEmailsPerDay: 100
  });

  it('should validate maxExecutionsPerDay range (1-1000)', async () => {
    // Test min/max boundaries
  });

  it('should validate maxEmailsPerDay range (1-500)', async () => {
    // Test min/max boundaries
  });

  it('should only accept valid integration names', async () => {
    // Test enum validation for allowedIntegrations
  });

  it('should validate domain format in excludedDomains', async () => {
    // Test valid: 'example.com', invalid: 'not-a-domain'
  });

  it('should merge partial restrictions with defaults', async () => {
    // Test sending only maxExecutionsPerDay still gets other defaults
  });
});
```

### Manual Testing Checklist:

- [ ] Navigate to agent builder after creating agent with instructions
- [ ] See Restrictions section with all fields
- [ ] Input max executions per day (valid: 50, invalid: 0, 1001)
- [ ] Input max emails per day (valid: 25, invalid: 0, 501)
- [ ] Select/deselect integrations (Gmail, LinkedIn, etc.)
- [ ] See helper text "Leave empty to allow all"
- [ ] Add excluded domains (comma-separated)
- [ ] See inline validation errors for invalid inputs
- [ ] Save restrictions and verify persisted on reload
- [ ] Verify default values apply when left empty
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Responsive design works on mobile and desktop

---

## Definition of Done

This story is complete when:

- [ ] Agent model has typed restrictions field with IAgentRestrictions schema
- [ ] PUT endpoint accepts and saves restrictions object
- [ ] Backend validates maxExecutionsPerDay (1-1000), maxEmailsPerDay (1-500)
- [ ] Backend validates allowedIntegrations against enum
- [ ] Backend validates excludedDomains format
- [ ] Default restrictions (100/100) apply when not specified
- [ ] RestrictionsConfiguration component created with all fields
- [ ] Integration checkboxes display with names/icons
- [ ] Exclusions section accepts domains
- [ ] Inline validation errors display correctly
- [ ] Save functionality works with toast feedback
- [ ] Data persists correctly on page reload
- [ ] All data-testid attributes added for testing
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Responsive design works

---

## Tasks/Subtasks

### Backend Implementation
- [x] Update Agent.ts model with IAgentRestrictions interface
- [x] Replace string restrictions with typed schema in AgentSchema
- [x] Add default values and min/max constraints
- [x] Update agentValidation.ts with restrictionsSchema
- [x] Add RESTRICTIONS_DEFAULTS and RESTRICTIONS_LIMITS constants
- [x] Add VALID_INTEGRATIONS constant
- [x] Update agentController.ts updateAgent to handle restrictions
- [x] Ensure restrictions are merged with defaults
- [x] Include restrictions in getAgent response
- [x] Include restrictions in listAgents response

### Frontend Implementation
- [x] Update types/agent.ts with IAgentRestrictions interface
- [x] Add VALID_INTEGRATIONS and RESTRICTIONS_DEFAULTS constants
- [x] Update UpdateAgentInput type
- [x] Create RestrictionsConfiguration.tsx component with:
  - [x] Max executions per day input (number, 1-1000)
  - [x] Max emails per day input (number, 1-500)
  - [x] Integration checkboxes with icons
  - [x] Excluded domains input
  - [x] Inline validation errors
  - [x] Save button with loading state
  - [x] Helper text for each section
  - [x] data-testid attributes
- [x] Update agent builder page to include RestrictionsConfiguration
- [x] Remove placeholder section for Restrictions
- [x] Wire up save functionality to updateAgent API
- [x] Add toast notifications for success/error
- [x] Add Guardrails textarea with character counter

### Testing & Validation
- [x] Test valid restrictions save
- [x] Test invalid input rejection (out of range values)
- [x] Test defaults apply correctly
- [x] Test integration selection
- [x] Test domain format validation
- [x] Verify TypeScript compilation (no errors)
- [x] Verify responsive design
- [x] Document implementation in story file
- [x] Add guardrails validation test (max 5000 chars)
- [x] Add guardrails save/retrieve test

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Backend Files to Modify:**
- backend/src/models/Agent.ts
- backend/src/validations/agentValidation.ts
- backend/src/controllers/agentController.ts
- backend/src/tests/agentRestrictions.test.ts

**Frontend Files to Create:**
- frontend/components/agents/RestrictionsConfiguration.tsx

**Frontend Files to Modify:**
- frontend/types/agent.ts
- frontend/app/projects/[id]/agents/[agentId]/page.tsx

**Documentation Files Updated:**
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/epics/epic-01-manual-agent-building.md

---

## References

- [Source: Epic 1 - Story 1.4](file:///_bmad-output/planning-artifacts/epics.md#Story-1.4)
- [Source: Architecture - Security Requirements](file:///_bmad-output/planning-artifacts/architecture.md#Decision-4)
- [Source: Architecture - Rate Limiting](file:///_bmad-output/planning-artifacts/architecture.md#Circuit-Breakers)
- [Source: Story 1.3 - Patterns](file:///_bmad-output/implementation-artifacts/1-3-write-natural-language-instructions.md)
- [PRD: FR4 - Agent Restrictions](file:///_bmad-output/planning-artifacts/prd.md#FR4)

---

## Change Log

- **2026-01-15**: Story 1.4 created with comprehensive context from Epic 1, Architecture, and Story 1.3

---

## Status

**Status:** done
**Date Created:** 2026-01-15
**Story Key:** 1-4-configure-agent-restrictions
