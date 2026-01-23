# Story 3.10: Task and Tag Actions

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to create tasks and manage contact tags,
So that workflows can organize work and segment contacts.

## Acceptance Criteria

1. **AC1: Create Task with Variable Resolution**
   - Given agent instruction: "Create task: Follow up with @contact.firstName in 3 days"
   - When action executes
   - Then Task is created in CRM with:
     - Title: "Follow up with John in 3 days" (variables resolved)
     - Due date: Today + 3 days
     - Assigned to: Agent creator (or specified user)
     - Related contact: Contact ID from context
   - And Task appears in user's task list

2. **AC2: Assign Task to Specified User**
   - Given agent instruction: "Assign task to @user.salesRep"
   - When action executes
   - Then Task is assigned to the specified user (if variable is defined)
   - And User receives notification: "New task assigned by agent [name]"

3. **AC3: Add Single Tag to Contact**
   - Given agent instruction: "Add tag 'Interested' to contact"
   - When action executes
   - Then Tag "Interested" is added to the contact
   - And If tag doesn't exist on contact, it's added
   - And Contact appears in "Interested" segment (tag filtering)

4. **AC4: Remove Tag from Contact**
   - Given agent instruction: "Remove tag 'Cold Lead' from contact"
   - When action executes
   - Then Tag "Cold Lead" is removed from the contact
   - And Contact no longer appears in "Cold Lead" segment

5. **AC5: Add Multiple Tags at Once**
   - Given agent instruction: "Add tags 'Interested', 'CEO', 'SaaS'"
   - When action executes
   - Then All three tags are added to the contact
   - And Each tag is added using $addToSet (no duplicates)

6. **AC6: Bulk Task Creation (No Rate Limit)**
   - Given agent creates 100 tasks in one execution
   - When execution runs
   - Then All 100 tasks are created successfully
   - And No rate limiting applied to task creation (internal CRM operation)

7. **AC7: Task Assignment Validation (RBAC)**
   - Given task creation fails (e.g., invalid user assignment)
   - When error occurs
   - Then Execution fails with error: "Cannot assign task to user [userId]: user not found"
   - And Error is logged for debugging
   - And RBAC enforced: Tasks assigned to users within workspace only

## Tasks / Subtasks

- [x] **Task 1: Fix executeCreateTask Implementation (AC: 1, 2, 6, 7)**
  - [x] 1.1 Fix field name mismatch: use `workspaceId` (not `workspace`) per Task model schema
  - [x] 1.2 Fix field name: use `userId` (not `createdBy`) per Task model required field
  - [x] 1.3 Apply variable resolution to task title using `resolveEmailVariables()` (AC1)
  - [x] 1.4 Parse due date from natural language: "in X days", "in X hours", "tomorrow" (AC1)
  - [x] 1.5 Validate assignee is valid user in workspace before assignment (AC7)
  - [x] 1.6 Support @user.salesRep variable resolution for assignee (AC2)
  - [x] 1.7 Use correct field: `relatedContactId` (not `relatedContact`) per Task model
  - [x] 1.8 Use correct field: `relatedOpportunityId` (not `relatedDeal`) per Task model

- [x] **Task 2: Add User Notification for Task Assignment (AC: 2)**
  - [x] 2.1 Check if existing notification system in codebase (likely Socket.io or email)
  - [x] 2.2 Emit notification when task is assigned: "New task assigned by agent [agentName]"
  - [x] 2.3 Include task details in notification: title, due date, agent name
  - [x] 2.4 Handle case where assigned user doesn't exist (skip notification, log warning)

- [x] **Task 3: Enhance executeTagAction for Multiple Tags (AC: 3, 4, 5)**
  - [x] 3.1 Support parsing multiple tags from comma-separated string: "Interested, CEO, SaaS"
  - [x] 3.2 Support array of tags in action.tags or action.params.tags (AC5)
  - [x] 3.3 Apply variable resolution to tag names using `resolveEmailVariables()`
  - [x] 3.4 Process multiple tags in single MongoDB operation using $addToSet with $each
  - [x] 3.5 Return count of tags added/removed in result

- [x] **Task 4: Due Date Parsing Enhancement (AC: 1)**
  - [x] 4.1 Create parseDueDate utility function to handle natural language
  - [x] 4.2 Support patterns: "in X days", "in X hours", "tomorrow", "next week", "next month"
  - [x] 4.3 Support explicit date formats: "2026-01-30", "January 30, 2026"
  - [x] 4.4 Default to 1 day if no due date specified

- [x] **Task 5: Unit and Integration Tests (AC: All)**
  - [x] 5.1 Unit test: Task creation with variable resolution
  - [x] 5.2 Unit test: Due date parsing (natural language, explicit dates)
  - [x] 5.3 Unit test: Assignee validation (valid user, invalid user, missing user)
  - [x] 5.4 Unit test: Single tag add/remove
  - [x] 5.5 Unit test: Multiple tags add/remove
  - [x] 5.6 Unit test: Variable resolution in tag names
  - [x] 5.7 Integration test: Full create_task action flow
  - [x] 5.8 Integration test: Full add_tag/remove_tag action flow
  - [x] 5.9 Integration test: RBAC enforcement for task assignment

## Dev Notes

### Current Implementation Gap Analysis

| Aspect | Current State | Required State (3.10) |
|--------|---------------|----------------------|
| Task.create() | Wrong field names (`workspace`, `relatedContact`) | Correct field names per Task model (`workspaceId`, `relatedContactId`) |
| Title resolution | No variable resolution | Apply `resolveEmailVariables()` to title |
| Due date parsing | Simple `dueIn` days only | Natural language: "in X days", "tomorrow", explicit dates |
| Assignee validation | No validation | Validate user exists in workspace (RBAC) |
| User notification | Not implemented | Notify assigned user via Socket.io |
| Multiple tags | Single tag only | Support comma-separated or array of tags |
| Tag variable resolution | Not implemented | Apply `resolveEmailVariables()` to tag names |

### Architecture Pattern: Task Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    executeCreateTask Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Extract Parameters                                           │
│     │                                                            │
│     ├── Get action.title or action.params.title                 │
│     ├── Get action.dueIn or action.params.dueDate               │
│     └── Get action.assignee or action.params.assignedTo         │
│                                                                  │
│  2. Variable Resolution                                          │
│     │                                                            │
│     ├── Apply resolveEmailVariables() to title                  │
│     │   "Follow up with @contact.firstName" → "Follow up with John" │
│     │                                                            │
│     └── Resolve @user.salesRep if present in assignee           │
│                                                                  │
│  3. Due Date Parsing                                             │
│     │                                                            │
│     ├── Natural language: "in 3 days" → Date + 3 days           │
│     ├── Natural language: "tomorrow" → Date + 1 day             │
│     ├── Explicit: "2026-01-30" → parsed Date                    │
│     └── Default: 1 day if not specified                         │
│                                                                  │
│  4. Assignee Validation (RBAC)                                   │
│     │                                                            │
│     ├── Query User model: findOne({ _id: assigneeId })          │
│     ├── Check user belongs to workspace                         │
│     └── If invalid → Return error, don't create task            │
│                                                                  │
│  5. Create Task                                                  │
│     │                                                            │
│     └── Task.create({                                            │
│           workspaceId: context.workspaceId,                      │
│           userId: context.userId,                                │
│           title: resolvedTitle,                                  │
│           dueDate: parsedDueDate,                                │
│           status: 'todo',                                        │
│           priority: 'medium',                                    │
│           assignedTo: validatedAssigneeId,                       │
│           relatedContactId: context.contact?._id,                │
│           relatedOpportunityId: context.deal?._id,               │
│           createdBy: context.userId                              │
│         })                                                       │
│                                                                  │
│  6. Send Notification (if assignee specified)                    │
│     │                                                            │
│     └── Emit via Socket.io or notification service               │
│                                                                  │
│  7. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true/false                                      │
│     ├── description: "Task created: [title] (due: [date])"      │
│     ├── data: { taskId, title, dueDate, assignedTo }            │
│     └── durationMs: execution time                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Pattern: Tag Action Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    executeTagAction Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Extract Tags                                                 │
│     │                                                            │
│     ├── Single: action.tag = "Interested"                       │
│     ├── Multiple string: action.tags = "Interested, CEO, SaaS"  │
│     ├── Multiple array: action.tags = ["Interested", "CEO"]     │
│     └── Parse comma-separated to array                          │
│                                                                  │
│  2. Variable Resolution                                          │
│     │                                                            │
│     └── For each tag: resolveEmailVariables(tag, context)       │
│         "Tag for @company.industry" → "Tag for SaaS"            │
│                                                                  │
│  3. Apply Tags to Contact                                        │
│     │                                                            │
│     ├── If operation === 'add':                                  │
│     │   Contact.findOneAndUpdate(                                │
│     │     { _id: context.contact._id, workspace: workspaceId },  │
│     │     { $addToSet: { tags: { $each: tagsArray } } }          │
│     │   )                                                        │
│     │                                                            │
│     └── If operation === 'remove':                               │
│         Contact.findOneAndUpdate(                                │
│           { _id: context.contact._id, workspace: workspaceId },  │
│           { $pullAll: { tags: tagsArray } }                      │
│         )                                                        │
│                                                                  │
│  4. Apply Tags to Deal (if in context)                           │
│     │                                                            │
│     └── Same pattern as Contact using Opportunity model          │
│                                                                  │
│  5. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true/false                                      │
│     ├── description: "Added 3 tags to 2 record(s)"              │
│     ├── data: { tags: [...], targetCount }                      │
│     └── durationMs: execution time                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task Model Reference (CRITICAL - Use Exact Field Names)

```typescript
// From backend/src/models/Task.ts - MUST use these exact field names

interface ITask {
  workspaceId: Types.ObjectId;      // NOT "workspace"
  userId: Types.ObjectId;           // REQUIRED - NOT "createdBy" (that's separate)
  title: string;                    // Required, max 500 chars
  description?: string;             // Optional, max 5000 chars
  status: "todo" | "in_progress" | "completed" | "cancelled";  // Default: "todo"
  priority: "low" | "medium" | "high" | "urgent";              // Default: "medium"
  dueDate?: Date;
  reminderDate?: Date;
  relatedContactId?: Types.ObjectId;     // NOT "relatedContact"
  relatedCompanyId?: Types.ObjectId;
  relatedOpportunityId?: Types.ObjectId; // NOT "relatedDeal"
  assignedTo?: Types.ObjectId;           // User to assign task to
  createdBy: Types.ObjectId;             // REQUIRED - User who created task
  tags?: string[];
  completedAt?: Date;
}
```

### Due Date Parsing Implementation

```typescript
// Create backend/src/utils/dueDateParser.ts

interface ParsedDueDate {
  dueDate: Date;
  originalInput: string;
  parseMethod: 'natural' | 'explicit' | 'default';
}

/**
 * Parse due date from natural language or explicit format
 *
 * Supported patterns:
 * - "in X days" / "in X day"
 * - "in X hours" / "in X hour"
 * - "tomorrow"
 * - "next week" (7 days)
 * - "next month" (30 days)
 * - Explicit: "2026-01-30", "January 30, 2026"
 *
 * Returns Date object with default 1 day if unparseable
 */
function parseDueDate(input: string): ParsedDueDate {
  const now = new Date();
  const lowerInput = input.toLowerCase().trim();

  // Pattern: "in X days"
  const daysMatch = lowerInput.match(/in\s+(\d+)\s+days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + days);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "in X hours"
  const hoursMatch = lowerInput.match(/in\s+(\d+)\s+hours?/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10);
    const dueDate = new Date(now);
    dueDate.setHours(dueDate.getHours() + hours);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "tomorrow"
  if (lowerInput === 'tomorrow') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 1);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "next week"
  if (lowerInput === 'next week') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Pattern: "next month"
  if (lowerInput === 'next month') {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);
    return { dueDate, originalInput: input, parseMethod: 'natural' };
  }

  // Try explicit date parsing
  const explicitDate = new Date(input);
  if (!isNaN(explicitDate.getTime())) {
    return { dueDate: explicitDate, originalInput: input, parseMethod: 'explicit' };
  }

  // Default: 1 day from now
  const defaultDate = new Date(now);
  defaultDate.setDate(defaultDate.getDate() + 1);
  return { dueDate: defaultDate, originalInput: input, parseMethod: 'default' };
}
```

### Multiple Tags Parsing Implementation

```typescript
// Add to executeTagAction in ActionExecutorService.ts

function parseTags(action: ParsedAction): string[] {
  // Priority 1: Array of tags
  if (Array.isArray(action.tags)) {
    return action.tags.map(t => t.trim()).filter(Boolean);
  }
  if (Array.isArray(action.params?.tags)) {
    return action.params.tags.map(t => t.trim()).filter(Boolean);
  }

  // Priority 2: Comma-separated string
  const tagsString = action.tags || action.params?.tags;
  if (typeof tagsString === 'string' && tagsString.includes(',')) {
    return tagsString.split(',').map(t => t.trim()).filter(Boolean);
  }

  // Priority 3: Single tag
  const singleTag = action.tag || action.params?.tag;
  if (singleTag) {
    return [singleTag.trim()];
  }

  return [];
}

// Updated MongoDB operation for multiple tags
const updateOp = operation === 'add'
  ? { $addToSet: { tags: { $each: tagsArray } } }
  : { $pullAll: { tags: tagsArray } };
```

### Key Files to Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| Task Creation | `backend/src/services/ActionExecutorService.ts` | **Modify** - Fix executeCreateTask |
| Tag Action | `backend/src/services/ActionExecutorService.ts` | **Modify** - Enhance executeTagAction |
| Due Date Parser | `backend/src/utils/dueDateParser.ts` | **Create** - Natural language parsing |
| Due Date Tests | `backend/src/utils/dueDateParser.test.ts` | **Create** - Unit tests |
| Action Tests | `backend/src/services/ActionExecutorService.test.ts` | **Modify** - Add tests |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| Task Model | `backend/src/models/Task.ts` | **CRITICAL** - Use exact field names |
| Contact Model | `backend/src/models/Contact.ts` | Tags field for tag operations |
| Opportunity Model | `backend/src/models/Opportunity.ts` | Tags field for deal tag operations |
| User Model | `backend/src/models/User.ts` | Validate assignee exists in workspace |
| Variable Resolution | `backend/src/services/ActionExecutorService.ts:200-236` | resolveEmailVariables function |
| Previous Story | `_bmad-output/implementation-artifacts/3-9-web-search-action.md` | Pattern reference |

### Project Structure Notes

- Due date parser goes in `backend/src/utils/dueDateParser.ts` (follows GmailService, WebSearchService pattern)
- Tests co-located in same directory: `dueDateParser.test.ts`
- No new models needed - uses existing Task, Contact, Opportunity models
- Notification may use existing Socket.io infrastructure or email service

### Critical Implementation Notes from Previous Stories

**From Story 3.9 (Web Search Action) - Follow These Patterns:**
- Apply variable resolution using `resolveEmailVariables()` function
- Return structured ActionResult with success, description, error, data, durationMs
- Handle errors gracefully with user-friendly messages
- Use same testing patterns (unit tests for utility, integration tests for action)

**From Story 3.8 (LinkedIn Invitation Action):**
- Skip records without required fields (log warning, continue execution)
- Return count of successful operations
- RBAC validation before external operations

**From Story 3.7 (Send Email Action):**
- GmailService.ts pattern for utility functions
- Token/credential handling for user validation
- Rate limit handling (not needed for Task/Tag - internal operations)

**From Story 3.1 (Parse and Execute):**
- ActionExecutorService pattern is established - extend, don't replace
- Error messages should be user-friendly and actionable

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| No title specified | "Create task failed: no title specified" |
| Invalid assignee | "Cannot assign task to user [userId]: user not found" |
| Assignee not in workspace | "Cannot assign task to user [userId]: user not in workspace" |
| No tag specified | "Add/Remove tag failed: no tag specified" |
| No target for tag | "Add/Remove tag failed: no target contact or deal" |
| Invalid due date | "Create task failed: invalid due date format" (fallback to default) |

### NFR Compliance

- **NFR1:** Target 80% executions under 30s - Task/Tag operations are fast internal DB ops (~50-200ms)
- **NFR35:** 90% success rate - Validation prevents most failures
- **NFR84:** Actions logged in AgentExecution for 30-day retention

### Similarity to Story 3.7/3.8/3.9 Checklist

| Component | 3.9 (Web Search) | 3.10 (Task/Tag) |
|-----------|-----------------|-----------------|
| External API | Google Custom Search | None (internal CRM) |
| Rate Limit | 100 queries/day | **None required** |
| Timeout | 10 seconds | N/A |
| Retry Logic | 3 attempts | N/A |
| Context Storage | @search.results | N/A |
| AI Credits | 1 credit/search | **None** |
| Variable Resolution | In query | In title and tags |
| User Notification | No | **Yes (task assignment)** |

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.10] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: _bmad-output/planning-artifacts/prd.md#FR31] - Task/Tag are 2 of 8 core actions
- [Source: backend/src/models/Task.ts] - **CRITICAL** - Task model schema
- [Source: backend/src/services/ActionExecutorService.ts:799-847] - **FIX THIS** - executeCreateTask
- [Source: backend/src/services/ActionExecutorService.ts:852-923] - **ENHANCE THIS** - executeTagAction
- [Source: backend/src/services/ActionExecutorService.ts:200-236] - resolveEmailVariables function
- [Source: _bmad-output/implementation-artifacts/3-9-web-search-action.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-thinking)

### Debug Log References

- TypeScript compilation: 0 errors related to Story 3.10 changes
- Pre-existing errors in other files (redis module, GmailService, other test files) not related to this story

### Completion Notes List

1. **Task 1 Complete**: Fixed executeCreateTask with correct Task model field names (workspaceId, userId, relatedContactId, relatedOpportunityId, status='todo')
2. **Task 1 Complete**: Added variable resolution for task title using existing resolveEmailVariables()
3. **Task 1 Complete**: Added RBAC validation - checks TeamMember.findOne() for active workspace membership
4. **Task 2 Complete**: Added Notification.create() for task_assigned type when assignee is valid
5. **Task 3 Complete**: Enhanced executeTagAction to support single tag, comma-separated string, and array of tags
6. **Task 3 Complete**: Uses $addToSet with $each for add, $pullAll for remove (handles multiple tags atomically)
7. **Task 3 Complete**: Added variable resolution to tag names
8. **Task 4 Complete**: Created dueDateParser.ts utility with natural language parsing (in X days, tomorrow, next week, explicit dates)
9. **Task 5 Complete**: Added comprehensive unit tests for dueDateParser (15 test cases)
10. **Task 5 Complete**: Updated ActionExecutorService.test.ts with Story 3.10 tests (task creation, variable resolution, assignee validation, multiple tags, RBAC)
11. **Schema Update**: Added `tags` and `dueDate` fields to ParsedAction (InstructionParserService.ts)
12. **Bonus**: Also fixed executeHumanHandoff to use correct Task model field names

### File List

| File | Action | Description |
|------|--------|-------------|
| `backend/src/utils/dueDateParser.ts` | **Created** | Natural language due date parsing utility |
| `backend/src/utils/dueDateParser.test.ts` | **Created** | Unit tests for dueDateParser (15 test cases) |
| `backend/src/services/ActionExecutorService.ts` | **Modified** | Fixed executeCreateTask, enhanced executeTagAction, fixed executeHumanHandoff |
| `backend/src/services/ActionExecutorService.test.ts` | **Modified** | Added Story 3.10 tests for task creation and tag actions |
| `backend/src/services/InstructionParserService.ts` | **Modified** | Added tags and dueDate fields to ActionSchema |

