# Story 3.1: Parse and Execute Instructions

Status: review

## Story

As a workspace owner,
I want the system to parse my natural language instructions and execute them,
So that my agents can automate workflows without writing code.

## Acceptance Criteria

1. **AC1: Instruction Parsing with Structured Output**
   - Given an agent has instructions: "Find contacts where title contains CEO and send email"
   - When the agent executes
   - Then InstructionParserService parses the instructions using Gemini 2.5 Pro + LangChain
   - And instructions are converted to structured action array: `[{ type: 'search_contacts', params: { field: 'title', operator: 'contains', value: 'CEO' } }, { type: 'send_email', params: {...} }]`
   - And each action is executed in sequence

2. **AC2: Variable Resolution**
   - Given instructions include variables like `@contact.firstName`
   - When execution runs
   - Then variables are resolved to actual values from the context (contact data)
   - And "Hi @contact.firstName" becomes "Hi John"

3. **AC3: Sales-Specific Parsing Intelligence**
   - Given instructions have ambiguous phrasing
   - When parsing occurs
   - Then the system uses sales-specific training to interpret correctly
   - And "email them" is recognized as send_email action
   - And parsing achieves >90% accuracy on sales automation scenarios (NFR53)

4. **AC4: Parsing Error Handling**
   - Given instructions cannot be parsed
   - When execution attempts to start
   - Then agent fails with error: "Unable to parse instructions. Please clarify."
   - And execution log shows parsing error details
   - And user is notified to revise instructions

5. **AC5: Execution Performance**
   - Given parsed actions execute successfully
   - When execution completes
   - Then 80% of executions complete within 30 seconds (NFR1)
   - And execution status is updated to "completed"
   - And results are logged in AgentExecution model

## Tasks / Subtasks

- [x] **Task 1: Create AgentExecutionService (AC: 1, 2, 5)**
  - [x] 1.1 Create `backend/src/services/AgentExecutionService.ts`
  - [x] 1.2 Implement `executeAgent(agentId, trigger, workspaceId)` method
  - [x] 1.3 Implement action execution pipeline: parse → validate → execute → log
  - [x] 1.4 Add variable resolution for @contact.*, @deal.*, @memory.*
  - [x] 1.5 Implement step-by-step execution with progress tracking
  - [x] 1.6 Add execution status management (Queued → Running → Completed/Failed)
  - [x] 1.7 Add execution logging to AgentExecution model

- [x] **Task 2: Create InstructionParserService (AC: 1, 3, 4)**
  - [x] 2.1 Create `backend/src/services/InstructionParserService.ts`
  - [x] 2.2 Integrate LangChain StructuredOutputParser with Gemini 2.5 Pro
  - [x] 2.3 Define Zod schemas for all 8 core action types
  - [x] 2.4 Implement sales-specific system prompt for parsing accuracy
  - [x] 2.5 Add condition parsing (if/then in plain English)
  - [x] 2.6 Add variable extraction and validation
  - [x] 2.7 Add error handling with specific error messages
  - [x] 2.8 Add parsing result caching for identical instructions

- [x] **Task 3: Create Action Executor Handlers (AC: 1, 2, 5)**
  - [x] 3.1 Create `backend/src/services/ActionExecutorService.ts`
  - [x] 3.2 Implement handler for send_email action (Gmail integration)
  - [x] 3.3 Implement handler for linkedin_invite action
  - [x] 3.4 Implement handler for web_search action
  - [x] 3.5 Implement handler for create_task action
  - [x] 3.6 Implement handler for add_tag/remove_tag actions
  - [x] 3.7 Implement handler for update_field action
  - [x] 3.8 Implement handler for enrich_contact action (Apollo)
  - [x] 3.9 Implement handler for wait action
  - [x] 3.10 Add error handling with retry logic for each handler

- [x] **Task 4: Create Execution API Endpoint (AC: 1, 4, 5)**
  - [x] 4.1 Create POST `/api/workspaces/:workspaceId/agents/:agentId/execute` route
  - [x] 4.2 Add RBAC validation (Owners/Admins can execute)
  - [x] 4.3 Add pre-execution validation checks
  - [x] 4.4 Return execution ID for status tracking
  - [ ] 4.5 Add real-time status updates via Socket.io (deferred to Story 3.3)

- [x] **Task 5: Add Tests (AC: All)**
  - [x] 5.1 Unit tests for InstructionParserService
  - [x] 5.2 Unit tests for AgentExecutionService
  - [ ] 5.3 Unit tests for ActionExecutorService (basic handlers in place)
  - [ ] 5.4 Integration tests for execute endpoint (deferred)

## Dev Notes

### Existing Codebase Patterns

**Service Layer Pattern:**
All services in `backend/src/services/` follow this pattern:
```typescript
export class ServiceName {
  static async methodName(params): Promise<ReturnType> {
    // Implementation
  }
}
export default ServiceName;
```

**Model Pattern (Workspace Isolation):**
All models MUST include workspace isolation middleware:
```typescript
AgentSchema.pre('find', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required');
  }
});
```

**Route Pattern:**
All routes follow `/api/workspaces/:workspaceId/[resource]` pattern.

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Agent Model | `backend/src/models/Agent.ts:1-357` |
| AgentExecution Model | `backend/src/models/AgentExecution.ts:1-167` |
| TestModeService (simulation logic) | `backend/src/services/TestModeService.ts:1-1697` |
| InstructionValidationService | `backend/src/services/InstructionValidationService.ts` |
| Action simulation handlers | `backend/src/services/TestModeService.ts:737-1325` |
| Variable resolution logic | `backend/src/services/TestModeService.ts:585-617` |
| Condition evaluation logic | `backend/src/services/TestModeService.ts:619-682` |

### Architecture Requirements

**AI Service Stack:**
- LangChain for structured output parsing
- Gemini 2.5 Pro for natural language understanding
- Zod schemas for action type validation

**Action Schema (from Architecture):**
```typescript
const ActionSchema = z.object({
  type: z.enum([
    'send_email', 'linkedin_invite', 'web_search', 'create_task',
    'add_tag', 'remove_tag', 'update_field', 'enrich_contact', 'wait'
  ]),
  condition: z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists']),
    value: z.any()
  }).optional(),
  parameters: z.record(z.any()),
  order: z.number()
});
```

**Execution Flow (from Architecture):**
```typescript
class AgentExecutionService {
  async executeAgent(agentId, trigger, workspaceId) {
    // 1. Create AgentExecution record (status: Queued)
    // 2. Load agent and parsedActions
    // 3. For each action: execute and log step
    // 4. Emit Socket.io progress events
    // 5. Update final status (Completed/Failed)
  }
}
```

### Variable Resolution Engine

Variables to resolve:
- `@contact.*` - Contact fields (firstName, lastName, email, title, company, tags, customField[name])
- `@deal.*` - Deal fields (name, value, stage, owner, company, customField[name])
- `@memory.*` - Agent memory variables
- `@workspace.*` - Workspace context (name, owner)
- `@current.*` - Runtime context (date, time)

**Reference existing implementation:** `TestModeService.ts:585-617`

### Integration Points

**Gmail Integration:**
- Service: `backend/src/services/EmailAccountService.ts`
- Credential model: IntegrationCredential
- Rate limit: 250 units/sec (from architecture)

**LinkedIn Integration:**
- Service: `backend/src/services/LinkedInService.ts`
- Rate limit: 100 requests/day (from architecture)

**Apollo Integration:**
- Service: `backend/src/services/ApolloService.ts`
- Used for enrich_contact action

### Credit Cost Per Action (from TestModeService)

```typescript
const CREDIT_COSTS = {
  send_email: 2,
  linkedin_invite: 2,
  enrich_contact: 3,
  web_search: 1,
  // Free actions
  search: 0, wait: 0, conditional: 0, create_task: 0,
  add_tag: 0, remove_tag: 0, update_field: 0, human_handoff: 0
};
```

### Performance Requirements

- **NFR1:** 80% of executions complete within 30 seconds
- **NFR53:** >90% parsing accuracy on sales automation scenarios
- **NFR27:** System handles 500+ concurrent executions

### Circuit Breaker Integration

Check before execution (from architecture):
```typescript
// Pre-execution validation
1. Check workspace AI credit balance
2. Check agent circuit breaker status (max 100 executions/day)
3. Check rate limit (10 executions/min per agent)
4. Validate integration credentials
5. Calculate estimated credit cost
```

### Project Structure Notes

Files to create:
```
backend/src/services/
├── AgentExecutionService.ts      # New - orchestrates execution
├── InstructionParserService.ts   # New - LangChain + Gemini parsing
├── ActionExecutorService.ts      # New - action handlers

backend/src/routes/
└── agentExecution.ts             # New - /execute endpoint
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 1: AI System Architecture] - InstructionParserService design
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 2: Agent Execution Architecture] - Execution flow
- [Source: backend/src/services/TestModeService.ts:737-1325] - Action simulation handlers (reuse patterns)
- [Source: backend/src/models/AgentExecution.ts:1-167] - Execution model schema

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-thinking)

### Debug Log References

None

### Completion Notes List

- Implemented full live agent execution pipeline
- InstructionParserService uses LangChain + Gemini 2.5 Pro for NL parsing
- ActionExecutorService integrates with EmailService, LinkedInService, ApolloService
- API endpoints added to agentBuilder.ts routes with RBAC
- Socket.io real-time updates deferred to Story 3.3 (Real-time Execution Dashboard)
- Tests added for core services (mocked dependencies)

### File List

| File | Action | Description |
|------|--------|-------------|
| backend/src/services/AgentExecutionService.ts | Created | Orchestrates agent execution with variable resolution |
| backend/src/services/InstructionParserService.ts | Created | LangChain + Gemini parsing of NL instructions |
| backend/src/services/ActionExecutorService.ts | Created | Handlers for all 10 action types |
| backend/src/controllers/agentController.ts | Modified | Added executeAgent, listAgentExecutions, getAgentExecution, cancelAgentExecution |
| backend/src/routes/agentBuilder.ts | Modified | Added /execute, /executions routes |
| backend/src/validations/agentValidation.ts | Modified | Added executeAgentSchema |
| backend/src/services/AgentExecutionService.test.ts | Created | Unit tests for execution service |
| backend/src/services/InstructionParserService.test.ts | Created | Unit tests for parser service |

