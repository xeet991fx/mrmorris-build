# Story 3.11: Update Field and Enrich Actions

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to update contact fields and enrich contact data,
So that CRM data stays current and complete.

## Acceptance Criteria

1. **AC1: Update Standard Contact Field**
   - Given agent instruction: "Update contact field 'status' to 'Qualified'"
   - When action executes
   - Then Contact.status field is updated to "Qualified"
   - And Contact.updatedAt timestamp is updated
   - And Update is logged in execution results

2. **AC2: Update Deal Value**
   - Given agent instruction: "Update deal value to $50,000"
   - When action executes on a deal
   - Then Deal.value field is updated to 50000
   - And Deal stage progression logic is triggered (if configured)

3. **AC3: Update Custom Field with Validation**
   - Given agent instruction: "Set custom field 'leadScore' to 'A'"
   - When action executes
   - Then Contact custom field is updated using CustomFieldDefinition
   - And Field value is validated against field type (text, number, select)
   - And If field type is 'select', value must be in selectOptions

4. **AC4: Custom Field Not Found Error**
   - Given custom field doesn't exist
   - When update action executes
   - Then Execution fails with error: "Custom field 'leadScore' not found. Create field first."
   - And User is notified to add the custom field definition

5. **AC5: Enrich Contact with Apollo**
   - Given agent instruction: "Enrich contact using Apollo"
   - When action executes
   - Then Apollo.io API is called with contact email/name
   - And Enriched data is returned: job title, company info, phone, social links
   - And Contact fields are updated with enriched data
   - And Enrichment is logged in Activity
   - And 1 AI credit is consumed

6. **AC6: Apollo Enrichment No Data**
   - Given Apollo enrichment finds no data
   - When API returns empty result
   - Then Action completes without error (no data available)
   - And Log shows: "Enrichment returned no data for [contact]"
   - And Execution continues (doesn't fail)

7. **AC7: Apollo Rate Limit Handling**
   - Given Apollo API rate limit is reached
   - When enrichment action executes
   - Then Action fails with error: "Apollo API rate limit exceeded"
   - And Agent auto-pauses
   - And User is notified

8. **AC8: Bulk Update Optimization**
   - Given agent updates 50 contact fields in one execution
   - When execution runs
   - Then All updates are applied efficiently
   - And Bulk update completes in <5 seconds

9. **AC9: Variable Resolution in Field Values**
   - Given agent instruction: "Update field 'notes' to 'Discussed with @contact.firstName about @company.name'"
   - When action executes
   - Then Variables are resolved: "Discussed with John about Acme Corp"
   - And Field is updated with resolved value

## Tasks / Subtasks

- [x] **Task 1: Enhance executeUpdateField for Variable Resolution (AC: 1, 2, 9)**
  - [x] 1.1 Import and apply `resolveEmailVariables()` to field value before update
  - [x] 1.2 Handle numeric values (don't resolve variables in numbers)
  - [x] 1.3 Support variable resolution: "Update notes to 'Talked with @contact.firstName'" -> "Talked with John"
  - [x] 1.4 Return resolved value in ActionResult data for transparency

- [x] **Task 2: Add Custom Field Validation (AC: 3, 4)**
  - [x] 2.1 Detect custom fields by checking if field starts with 'custom_' or matches a CustomFieldDefinition
  - [x] 2.2 For custom fields, query CustomFieldDefinition: `{ workspaceId, fieldKey, isActive: true }`
  - [x] 2.3 If custom field not found, return error: "Custom field '[fieldKey]' not found. Create field first."
  - [x] 2.4 Validate field type:
    - For 'text': Accept string values
    - For 'number': Validate value is numeric, parse if string
    - For 'select': Validate value is in selectOptions array
  - [x] 2.5 If validation fails, return error: "Invalid value for custom field '[fieldKey]': expected [type]"
  - [x] 2.6 Store custom field values in contact.customFields Map

- [x] **Task 3: Fix Deal Update and Stage Progression (AC: 2)**
  - [x] 3.1 When updating deal.value, check if current stage has value thresholds
  - [x] 3.2 If value change triggers stage progression, update deal.stage accordingly
  - [x] 3.3 Log stage change in execution result: "Deal value updated to $50,000. Stage updated to 'Negotiation'"
  - [x] 3.4 Ensure workspace isolation: query includes `{ workspace: workspaceId }`

- [x] **Task 4: Enhance executeEnrichContact for Better Feedback (AC: 5, 6)**
  - [x] 4.1 After ApolloService.enrichContact() completes, get actual fieldsEnriched from result
  - [x] 4.2 Return fieldsEnriched in ActionResult.data (not hardcoded list)
  - [x] 4.3 If enrichment returns success but no fields enriched, log: "Enrichment returned no data for [contact.firstName] [contact.lastName]"
  - [x] 4.4 Create Activity record after successful enrichment: type = 'enrichment', details = fieldsEnriched

- [x] **Task 5: Add Apollo Rate Limit and Credit Handling (AC: 7)**
  - [x] 5.1 Check ApolloService response for rate limit errors (429 status or credits exhausted)
  - [x] 5.2 If rate limit hit, return specific error: "Apollo API rate limit exceeded"
  - [x] 5.3 If credits exhausted, return: "Apollo credits exhausted. Please add more credits to your Apollo.io account."
  - [x] 5.4 Set execution result flag `shouldPauseAgent: true` when rate limit or credits exhausted
  - [x] 5.5 AgentExecutionService should check this flag and auto-pause agent if set

- [x] **Task 6: Add Activity Logging for Enrichment (AC: 5)**
  - [x] 6.1 After successful enrichment, create Activity record:
    ```typescript
    Activity.create({
      workspaceId: context.workspaceId,
      contactId: context.contact._id,
      type: 'enrichment',
      activityType: 'enrichment',
      description: `Contact enriched via Apollo.io: ${fieldsEnriched.join(', ')}`,
      metadata: { source: 'apollo', fieldsEnriched, creditsUsed: result.creditsUsed }
    })
    ```
  - [x] 6.2 Handle case where Activity model doesn't exist (log warning, continue)

- [x] **Task 7: Unit and Integration Tests (AC: All)**
  - [x] 7.1 Unit test: Field update with variable resolution
  - [x] 7.2 Unit test: Custom field validation (text, number, select)
  - [x] 7.3 Unit test: Custom field not found error
  - [x] 7.4 Unit test: Select field with invalid option
  - [x] 7.5 Unit test: Enrich contact success with fieldsEnriched
  - [x] 7.6 Unit test: Enrich contact no data found
  - [x] 7.7 Integration test: Full update_field action flow
  - [x] 7.8 Integration test: Full enrich_contact action flow (mock Apollo)
  - [x] 7.9 Integration test: Custom field validation against CustomFieldDefinition

## Dev Notes

### Current Implementation Gap Analysis

| Aspect | Current State | Required State (3.11) |
|--------|---------------|----------------------|
| Variable resolution | Not applied to field values | Apply `resolveEmailVariables()` |
| Custom field validation | None - blindly sets any field | Validate against CustomFieldDefinition |
| Custom field type checking | None | Validate text/number/select types |
| Select field options | None | Validate value is in selectOptions |
| Enrich fieldsEnriched | Hardcoded placeholder list | Return actual fieldsEnriched from ApolloService |
| Activity logging | Not implemented | Create Activity record after enrichment |
| Rate limit handling | Retry with withRetry() | Specific rate limit error + agent auto-pause |
| Credit exhausted | Generic error | Specific error + agent auto-pause flag |

### Architecture Pattern: Update Field Flow (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│                    executeUpdateField Flow (Enhanced)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Extract Parameters                                           │
│     │                                                            │
│     ├── Get action.field or action.params.field                 │
│     └── Get action.value or action.params.value                 │
│                                                                  │
│  2. Variable Resolution (NEW)                                    │
│     │                                                            │
│     ├── Check if value is string (not number/boolean)           │
│     └── Apply resolveEmailVariables(value, context)             │
│         "Notes for @contact.firstName" → "Notes for John"       │
│                                                                  │
│  3. Custom Field Detection & Validation (NEW)                    │
│     │                                                            │
│     ├── Check if field starts with 'custom_'                    │
│     ├── If custom field:                                         │
│     │   ├── Query CustomFieldDefinition                          │
│     │   │   { workspaceId, fieldKey: field, isActive: true }    │
│     │   │                                                        │
│     │   ├── If not found → Return error                         │
│     │   │   "Custom field '[field]' not found. Create first."   │
│     │   │                                                        │
│     │   └── Validate field type:                                 │
│     │       ├── text: value is string                            │
│     │       ├── number: parseFloat(value) is not NaN            │
│     │       └── select: value in selectOptions                  │
│     │                                                            │
│     └── Standard field: proceed without validation               │
│                                                                  │
│  4. Apply Updates                                                │
│     │                                                            │
│     ├── For custom fields: use customFields Map                  │
│     │   { $set: { [`customFields.${fieldKey}`]: value } }       │
│     │                                                            │
│     └── For standard fields: direct update                       │
│         { $set: { [field]: resolvedValue } }                    │
│                                                                  │
│  5. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true/false                                      │
│     ├── description: "Updated [field] to [value] on [target]"   │
│     ├── data: { field, value, resolvedValue, targetCount }      │
│     └── durationMs: execution time                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Pattern: Enrich Contact Flow (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│                executeEnrichContact Flow (Enhanced)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Validate Context                                             │
│     │                                                            │
│     └── If no contact in context → Return error                 │
│                                                                  │
│  2. Call ApolloService.enrichContact()                           │
│     │                                                            │
│     ├── Uses withRetry() for transient failures                 │
│     └── ApolloService handles API call and contact update       │
│                                                                  │
│  3. Handle Apollo Response (ENHANCED)                            │
│     │                                                            │
│     ├── If success:                                              │
│     │   ├── Extract fieldsEnriched from result.data             │
│     │   ├── Extract creditsUsed from result                     │
│     │   └── If no fields enriched:                               │
│     │       Log: "Enrichment returned no data for [contact]"    │
│     │                                                            │
│     ├── If rate limit error (429):                               │
│     │   ├── Return error: "Apollo API rate limit exceeded"      │
│     │   └── Set shouldPauseAgent: true                          │
│     │                                                            │
│     └── If credits exhausted:                                    │
│         ├── Return error: "Apollo credits exhausted..."         │
│         └── Set shouldPauseAgent: true                          │
│                                                                  │
│  4. Create Activity Record (NEW)                                 │
│     │                                                            │
│     └── Activity.create({                                        │
│           workspaceId, contactId, type: 'enrichment',           │
│           description: "Enriched via Apollo: [fields]",         │
│           metadata: { source: 'apollo', fieldsEnriched }        │
│         })                                                       │
│                                                                  │
│  5. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true/false                                      │
│     ├── description: "Contact enriched with Apollo.io data"     │
│     ├── data: { contactId, fieldsEnriched, creditsUsed }        │
│     └── durationMs: execution time                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CustomFieldDefinition Model Reference (CRITICAL)

```typescript
// From backend/src/models/CustomFieldDefinition.ts
interface ICustomFieldDefinition {
  workspaceId: Types.ObjectId;
  entityType: "contact" | "company";
  fieldKey: string;          // MUST start with 'custom_', lowercase, alphanumeric + underscore
  fieldLabel: string;        // Display name
  fieldType: "text" | "number" | "select";
  selectOptions?: string[];  // For 'select' type - validate value is in this array
  isRequired: boolean;
  defaultValue?: any;
  order: number;
  isActive: boolean;
}

// Compound unique index: { workspaceId, entityType, fieldKey }
```

### Custom Field Validation Implementation

```typescript
// Add to executeUpdateField in ActionExecutorService.ts

async function validateCustomField(
  workspaceId: string,
  entityType: 'contact' | 'company',
  fieldKey: string,
  value: any
): Promise<{ valid: boolean; error?: string; parsedValue?: any }> {

  // Query CustomFieldDefinition
  const fieldDef = await CustomFieldDefinition.findOne({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    entityType,
    fieldKey,
    isActive: true,
  });

  if (!fieldDef) {
    return {
      valid: false,
      error: `Custom field '${fieldKey}' not found. Create field first.`,
    };
  }

  // Validate based on field type
  switch (fieldDef.fieldType) {
    case 'text':
      // Accept any string value
      return { valid: true, parsedValue: String(value) };

    case 'number':
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return {
          valid: false,
          error: `Invalid value for custom field '${fieldKey}': expected number, got '${value}'`,
        };
      }
      return { valid: true, parsedValue: numValue };

    case 'select':
      if (!fieldDef.selectOptions?.includes(value)) {
        return {
          valid: false,
          error: `Invalid value for custom field '${fieldKey}': '${value}' is not a valid option. Valid options: ${fieldDef.selectOptions?.join(', ')}`,
        };
      }
      return { valid: true, parsedValue: value };

    default:
      return { valid: true, parsedValue: value };
  }
}
```

### Contact Model Custom Fields Storage

```typescript
// Contact model has customFields as a Map
// From backend/src/models/Contact.ts

customFields: {
  type: Map,
  of: Schema.Types.Mixed,
  default: {},
}

// To set a custom field:
Contact.findOneAndUpdate(
  { _id: contactId, workspace: workspaceId },
  { $set: { [`customFields.${fieldKey}`]: validatedValue } }
);

// To read a custom field:
const contact = await Contact.findById(contactId);
const value = contact.customFields?.get('custom_lead_score');
```

### Key Files to Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| Update Field | `backend/src/services/ActionExecutorService.ts` | **Modify** - Enhance executeUpdateField |
| Enrich Contact | `backend/src/services/ActionExecutorService.ts` | **Modify** - Enhance executeEnrichContact |
| Action Tests | `backend/src/services/ActionExecutorService.test.ts` | **Modify** - Add tests |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| CustomFieldDefinition | `backend/src/models/CustomFieldDefinition.ts` | Validation schema for custom fields |
| Contact Model | `backend/src/models/Contact.ts` | customFields Map storage |
| Opportunity Model | `backend/src/models/Opportunity.ts` | Deal updates |
| ApolloService | `backend/src/services/ApolloService.ts` | enrichContact() method |
| Variable Resolution | `backend/src/services/ActionExecutorService.ts:200-236` | resolveEmailVariables function |
| Previous Story | `_bmad-output/implementation-artifacts/3-10-task-and-tag-actions.md` | Pattern reference |
| Activity Model | `backend/src/models/Activity.ts` | For logging enrichment (if exists) |

### ApolloService.enrichContact() Response Structure

```typescript
// From backend/src/services/ApolloService.ts:377-452

interface EnrichmentResult {
  success: boolean;
  data?: {
    contact: object;           // Updated contact object
    enrichedFields: string[];  // Array of field names that were enriched
  };
  error?: string;
  creditsUsed?: number;        // Always 1 for person enrichment
}

// fieldsEnriched examples: ['email', 'linkedin', 'title', 'phone']
// These are the ACTUAL fields that were updated (not already set)
```

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| No field specified | "Update field failed: no field specified" |
| No target | "Update field failed: no target contact or deal" |
| Custom field not found | "Custom field '[fieldKey]' not found. Create field first." |
| Invalid number value | "Invalid value for custom field '[fieldKey]': expected number, got '[value]'" |
| Invalid select option | "Invalid value for custom field '[fieldKey]': '[value]' is not a valid option. Valid options: [options]" |
| No contact for enrich | "Enrich contact failed: no contact in context" |
| Apollo rate limit | "Apollo API rate limit exceeded" |
| Apollo credits exhausted | "Apollo credits exhausted. Please add more credits to your Apollo.io account." |
| Enrichment no data | "Enrichment returned no data for [contact]" (not an error, just logged) |

### Project Structure Notes

- No new files needed - enhance existing executeUpdateField and executeEnrichContact
- CustomFieldDefinition model already exists at `backend/src/models/CustomFieldDefinition.ts`
- ApolloService already exists at `backend/src/services/ApolloService.ts`
- Activity model may or may not exist - check before creating records
- Tests go in `backend/src/services/ActionExecutorService.test.ts`

### Critical Implementation Notes from Previous Stories

**From Story 3.10 (Task and Tag Actions) - Follow These Patterns:**
- Apply variable resolution using `resolveEmailVariables()` function
- Return structured ActionResult with success, description, error, data, durationMs
- Handle errors gracefully with user-friendly messages
- Use same testing patterns (unit tests for validation, integration tests for action)
- Handle multiple targets (contact and deal) in same action

**From Story 3.9 (Web Search Action):**
- AI credit tracking (1 credit per enrichment)
- Rate limiting considerations
- Retry logic with withRetry()

**From Story 3.8 (LinkedIn Invitation Action):**
- Rate limit handling with agent auto-pause
- Skip records without required fields (log warning, continue)

### NFR Compliance

- **NFR1:** Target 80% executions under 30s - Update operations are fast (~100ms), enrichment ~2-5s
- **NFR35:** 90% success rate - Validation prevents most failures
- **NFR84:** Actions logged in AgentExecution for 30-day retention
- **Apollo Rate Limit:** Service respects Apollo plan limits (checked in ApolloService)

### Similarity to Story 3.10 Checklist

| Component | 3.10 (Task/Tag) | 3.11 (Update/Enrich) |
|-----------|-----------------|---------------------|
| External API | None | Apollo.io for enrichment |
| Rate Limit | None | **Yes - Apollo plan limits** |
| Variable Resolution | In title and tags | **In field values** |
| Validation | Assignee RBAC | **Custom field type validation** |
| Activity Logging | No | **Yes (enrichment)** |
| AI Credits | None | **1 credit per enrichment** |
| Agent Auto-Pause | No | **Yes (on rate limit/credits)** |

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.11] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: _bmad-output/planning-artifacts/prd.md#FR31] - Update Field and Enrich are 2 of 8 core actions
- [Source: backend/src/models/CustomFieldDefinition.ts] - Custom field schema
- [Source: backend/src/services/ApolloService.ts:377-452] - enrichContact implementation
- [Source: backend/src/services/ActionExecutorService.ts:1060-1178] - Current implementations to enhance
- [Source: _bmad-output/implementation-artifacts/3-10-task-and-tag-actions.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

