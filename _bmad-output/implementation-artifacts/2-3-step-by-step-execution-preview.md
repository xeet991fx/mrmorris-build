# Story 2.3: Step-by-Step Execution Preview

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-3-step-by-step-execution-preview
**Status:** done
**Priority:** High - Core UX for understanding agent behavior before going live
**FRs Covered:** FR38 (Step-by-step test preview with action details)

---

## User Story

**As a** workspace owner,
**I want to** see a detailed step-by-step breakdown of what my agent will do,
**So that** I can verify the logic before going live.

---

## Acceptance Criteria

### AC1: Sequential Step Display

**Given** I run a test with selected target
**When** The test executes
**Then** I see each step displayed sequentially with status icon
**And** Each step shows: Step number, action type, parameters, result

### AC2: Search Action Preview

**Given** An agent has instruction: "Find contacts where title contains 'CEO'"
**When** Test Mode executes
**Then** Step 1 shows: "🔍 Search Contacts: title contains 'CEO'"
**And** Result shows: "Found 5 contacts matching criteria"
**And** I see a preview of the matched contacts (name, title, company)

### AC3: Email Action Preview (Dry Run)

**Given** An agent has instruction: "Send email using template 'Outbound v2'"
**When** Test Mode reaches this step
**Then** Step 2 shows: "📧 Send Email (DRY RUN)"
**And** Result shows: "Would send email to: john@acme.com"
**And** I see the email subject preview
**And** I see the email body preview with variables resolved
**And** A badge says "DRY RUN - Not actually sent"

### AC4: Wait Action Preview

**Given** An agent has instruction: "Wait 5 days"
**When** Test Mode reaches this step
**Then** Step 3 shows: "⏰ Wait 5 days (SIMULATED)"
**And** Result shows: "Execution would pause for 5 days, then resume"

### AC5: Conditional Logic Display

**Given** An agent has conditional logic: "If contact replied, send thank you email"
**When** Test Mode executes
**Then** Step 4 shows: "🔀 Conditional: If contact.replied == true"
**And** Result shows: "Condition evaluated to FALSE (contact has not replied)"
**And** Step 5 (thank you email) is skipped with note: "Skipped due to condition"

### AC6: Error Handling Display

**Given** Test execution encounters an error
**When** Step 3 fails (e.g., invalid template)
**Then** Step 3 shows: "❌ Error: Email template 'xyz' not found"
**And** Subsequent steps are marked as "Not executed"
**And** I see suggestions: "Create template 'xyz' or update instruction"

### AC7: Success Summary

**Given** Test completes successfully
**When** All steps finish
**Then** I see a summary: "✅ Test completed: 5 steps, 0 errors, 0 warnings"
**And** Each step can be expanded to see full details

---

## Tasks / Subtasks

- [x] Task 1: Enhance TestModeService step result structure (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 1.1: Create `TestStepResult` interface with enhanced fields (stepNumber, actionType, icon, status, params, result, preview, isExpandable)
  - [x] 1.2: Add `preview` field to each action simulation handler in `simulateExecution()`
  - [x] 1.3: Implement `getActionIcon(actionType)` helper for consistent icons
  - [x] 1.4: Add `isSkipped` and `skipReason` fields for conditional logic steps
  - [x] 1.5: Add `suggestions` array to error results

- [x] Task 2: Implement Search Action Preview (AC: 2)
  - [x] 2.1: Update `simulateSearchAction()` to return preview of matched contacts/deals
  - [x] 2.2: Limit preview to first 5 matches with "... and X more" indicator
  - [x] 2.3: Include minimal contact data in preview (name, title, company)

- [x] Task 3: Implement Email Action Preview (AC: 3)
  - [x] 3.1: Update `simulateEmailAction()` to return subject and body preview
  - [x] 3.2: Resolve all variables in email template before preview
  - [x] 3.3: Add `isDryRun: true` flag to email step results
  - [x] 3.4: Truncate body preview to 500 chars with "..." if longer

- [x] Task 4: Implement Conditional Logic Evaluation (AC: 5)
  - [x] 4.1: Update `simulateConditionalAction()` to evaluate condition against test context
  - [x] 4.2: Return `conditionResult: boolean` and `conditionExplanation` in result
  - [x] 4.3: Mark subsequent branch steps as skipped with reason when condition is false
  - [x] 4.4: Show both branches in preview with active/inactive state

- [x] Task 5: Enhance Error Results (AC: 6)
  - [x] 5.1: Add `suggestions: string[]` to `TestStepResult` for actionable fixes
  - [x] 5.2: Add error detection for common issues (missing template, invalid variable, bad syntax)
  - [x] 5.3: Mark all subsequent steps as `status: 'not_executed'` after error
  - [x] 5.4: Include step number context in error messages

- [x] Task 6: Create TestStepCard frontend component (AC: 1, 7)
  - [x] 6.1: Create `frontend/components/agents/TestStepCard.tsx`
  - [x] 6.2: Implement status icon display (✅, ⚠️, ❌, ⏭️, 🔍, 📧, ⏰, 🔀)
  - [x] 6.3: Implement expandable/collapsible step details
  - [x] 6.4: Show step number, action type, and summary in collapsed state
  - [x] 6.5: Show full params, result, and preview in expanded state

- [x] Task 7: Create TestResultsList component (AC: 1, 7)
  - [x] 7.1: Create `frontend/components/agents/TestResultsList.tsx`
  - [x] 7.2: Render steps sequentially using TestStepCard components
  - [x] 7.3: Add "expand all / collapse all" toggle
  - [x] 7.4: Group steps visually (completed, in-progress, skipped, not-executed)

- [x] Task 8: Create TestSummaryBanner component (AC: 7)
  - [x] 8.1: Create `frontend/components/agents/TestSummaryBanner.tsx`
  - [x] 8.2: Calculate and display: total steps, completed, errors, warnings, skipped
  - [x] 8.3: Show overall status icon (✅ success, ⚠️ warnings, ❌ errors)
  - [x] 8.4: Display execution time

- [x] Task 9: Create Step Preview Subcomponents (AC: 2, 3, 4, 5)
  - [x] 9.1: Create `StepPreviewContacts.tsx` - preview table for search results
  - [x] 9.2: Create `StepPreviewEmail.tsx` - subject/body preview with variable highlighting
  - [x] 9.3: Create `StepPreviewConditional.tsx` - branch visualization
  - [x] 9.4: Create `StepPreviewError.tsx` - error message with suggestions

- [x] Task 10: Update TestModePanel to use new components (AC: 1, 7)
  - [x] 10.1: Replace current results display with TestResultsList
  - [x] 10.2: Add TestSummaryBanner above results
  - [x] 10.3: Update types in frontend/types/agent.ts for enhanced TestStepResult
  - [x] 10.4: Ensure backward compatibility with Story 2.1/2.2 data

---

## Dev Notes

### Critical Architecture Patterns

**Enhanced TestStepResult Interface (EXTEND existing):**

```typescript
// File: backend/src/services/TestModeService.ts
// EXTEND the existing TestStepResult interface

export interface TestStepResult {
  // Existing from Story 2.1
  stepNumber: number;
  action: string;                    // Action type identifier
  params: Record<string, any>;       // Action parameters
  result: string;                    // Human-readable result message
  status: TestStepStatus;            // 'success' | 'warning' | 'error' | 'skipped' | 'not_executed'
  estimatedCredits: number;
  estimatedDuration: number;

  // NEW for Story 2.3 - Enhanced step preview
  actionLabel: string;               // Human-readable action name (e.g., "Send Email")
  icon: StepIcon;                    // Icon identifier for UI
  preview?: StepPreview;             // Rich preview content (type-specific)
  isExpandable: boolean;             // Whether step has preview content

  // For conditional logic
  conditionResult?: boolean;         // Result of condition evaluation
  conditionExplanation?: string;     // Human-readable explanation
  skipReason?: string;               // Why step was skipped

  // For error handling
  suggestions?: string[];            // Actionable fix suggestions
  errorContext?: {
    lineNumber?: number;
    instructionText?: string;
  };
}

type TestStepStatus = 'success' | 'warning' | 'error' | 'skipped' | 'not_executed';

type StepIcon =
  | 'search'      // 🔍
  | 'email'       // 📧
  | 'wait'        // ⏰
  | 'conditional' // 🔀
  | 'linkedin'    // 💼
  | 'task'        // 📋
  | 'tag'         // 🏷️
  | 'update'      // ✏️
  | 'enrich'      // 🔬
  | 'handoff'     // 🤝
  | 'success'     // ✅
  | 'warning'     // ⚠️
  | 'error'       // ❌
  | 'skipped';    // ⏭️

// Type-specific preview content
type StepPreview =
  | SearchPreview
  | EmailPreview
  | ConditionalPreview
  | WaitPreview
  | LinkedInPreview
  | TaskPreview
  | TagPreview
  | UpdatePreview
  | EnrichPreview;

interface SearchPreview {
  type: 'search';
  matchedCount: number;
  matches: Array<{
    id: string;
    name: string;
    subtitle: string;  // title for contacts, value for deals
    company?: string;
  }>;
  hasMore: boolean;    // More than 5 matches
}

interface EmailPreview {
  type: 'email';
  recipient: string;
  subject: string;
  bodyPreview: string;         // First 500 chars
  templateName?: string;
  variablesResolved: Record<string, string>;
  isDryRun: true;
}

interface ConditionalPreview {
  type: 'conditional';
  condition: string;           // Raw condition text
  evaluatedTo: boolean;
  explanation: string;         // "contact.replied == true → FALSE (contact has not replied)"
  trueBranchSteps: number[];   // Step numbers in true branch
  falseBranchSteps: number[];  // Step numbers in false branch
}

interface WaitPreview {
  type: 'wait';
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  resumeNote: string;
}

interface LinkedInPreview {
  type: 'linkedin';
  recipient: string;
  messagePreview?: string;
  connectionNote?: string;
  isDryRun: true;
}

interface TaskPreview {
  type: 'task';
  taskTitle: string;
  assignee?: string;
  dueDate?: string;
}

interface TagPreview {
  type: 'tag';
  tagName: string;
  operation: 'add' | 'remove';
  targetCount: number;
}

interface UpdatePreview {
  type: 'update';
  fieldName: string;
  oldValue?: string;
  newValue: string;
  targetCount: number;
}

interface EnrichPreview {
  type: 'enrich';
  source: string;          // e.g., "Apollo.io"
  fieldsToEnrich: string[];
  targetCount: number;
}
```

### Project Structure Notes

**Backend Files to Update:**

```
backend/src/
├── services/
│   └── TestModeService.ts  [UPDATE] - Enhance step result structure
└── types/
    └── testMode.ts         [UPDATE or CREATE] - Export TestStepResult types
```

**Frontend Files to Create:**

```
frontend/
├── components/agents/
│   ├── TestStepCard.tsx        [NEW] - Individual step display with expand/collapse
│   ├── TestResultsList.tsx     [NEW] - List of all steps
│   ├── TestSummaryBanner.tsx   [NEW] - Overall test summary
│   └── step-previews/
│       ├── StepPreviewContacts.tsx    [NEW] - Search results table
│       ├── StepPreviewEmail.tsx       [NEW] - Email content preview
│       ├── StepPreviewConditional.tsx [NEW] - Branch visualization
│       └── StepPreviewError.tsx       [NEW] - Error with suggestions
├── components/agents/
│   └── TestModePanel.tsx       [UPDATE] - Use new components
└── types/
    └── agent.ts                [UPDATE] - Add new step types
```

### Existing Patterns to Reuse

**From Stories 2.1 and 2.2 - DO NOT reinvent:**

1. **TestModeService Pattern** (`backend/src/services/TestModeService.ts`):
   ```typescript
   // EXTEND existing simulateExecution() and action handlers
   // Each handler already returns basic result - add preview field

   private async simulateEmailAction(
     action: ParsedAction,
     context: TestContext
   ): Promise<TestStepResult> {
     // EXISTING: Basic simulation logic
     // ADD: Email preview with resolved variables
     const preview: EmailPreview = {
       type: 'email',
       recipient: resolvedRecipient,
       subject: resolvedSubject,
       bodyPreview: resolvedBody.slice(0, 500),
       templateName: action.params.template,
       variablesResolved: resolvedVars,
       isDryRun: true
     };

     return {
       ...baseResult,
       preview,
       isExpandable: true
     };
   }
   ```

2. **TestModePanel Pattern** (`frontend/components/agents/TestModePanel.tsx`):
   - Already has sliding Sheet panel
   - Already displays TestResultsDisplay
   - Replace TestResultsDisplay with new TestResultsList component

3. **Frontend Icon Pattern** - Use Lucide React icons:
   ```typescript
   import {
     Search, Mail, Clock, GitBranch, Linkedin,
     CheckSquare, Tag, Edit, Beaker, Users,
     CheckCircle, AlertTriangle, XCircle, SkipForward
   } from 'lucide-react';

   const STEP_ICONS: Record<StepIcon, React.ComponentType> = {
     search: Search,
     email: Mail,
     wait: Clock,
     conditional: GitBranch,
     linkedin: Linkedin,
     task: CheckSquare,
     tag: Tag,
     update: Edit,
     enrich: Beaker,
     handoff: Users,
     success: CheckCircle,
     warning: AlertTriangle,
     error: XCircle,
     skipped: SkipForward
   };
   ```

4. **Accordion Pattern** - Use shadcn Accordion or Collapsible:
   ```typescript
   // Use shadcn Collapsible for individual step expansion
   import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
   ```

### Action Type to Icon Mapping

| Action Type | Icon | Label |
|-------------|------|-------|
| search | 🔍 | Search Contacts/Deals |
| send_email | 📧 | Send Email |
| wait | ⏰ | Wait |
| conditional | 🔀 | Conditional |
| linkedin_invite | 💼 | LinkedIn Invitation |
| create_task | 📋 | Create Task |
| add_tag | 🏷️ | Add Tag |
| remove_tag | 🏷️ | Remove Tag |
| update_field | ✏️ | Update Field |
| enrich_contact | 🔬 | Enrich Contact |
| human_handoff | 🤝 | Human Handoff |

### Frontend Types to Add

```typescript
// In frontend/types/agent.ts - ADD these types

export type TestStepStatus = 'success' | 'warning' | 'error' | 'skipped' | 'not_executed';

export type StepIcon =
  | 'search' | 'email' | 'wait' | 'conditional'
  | 'linkedin' | 'task' | 'tag' | 'update'
  | 'enrich' | 'handoff' | 'success' | 'warning'
  | 'error' | 'skipped';

export interface TestStepResult {
  stepNumber: number;
  action: string;
  actionLabel: string;
  icon: StepIcon;
  params: Record<string, any>;
  result: string;
  status: TestStepStatus;
  estimatedCredits: number;
  estimatedDuration: number;
  preview?: StepPreview;
  isExpandable: boolean;
  conditionResult?: boolean;
  conditionExplanation?: string;
  skipReason?: string;
  suggestions?: string[];
  errorContext?: {
    lineNumber?: number;
    instructionText?: string;
  };
}

export type StepPreview =
  | SearchPreview
  | EmailPreview
  | ConditionalPreview
  | WaitPreview
  | LinkedInPreview
  | TaskPreview
  | TagPreview
  | UpdatePreview
  | EnrichPreview;

// Add individual preview interfaces as shown above
```

### TestStepCard Component Structure

```tsx
// frontend/components/agents/TestStepCard.tsx

interface TestStepCardProps {
  step: TestStepResult;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TestStepCard({ step, isExpanded, onToggle }: TestStepCardProps) {
  const Icon = STEP_ICONS[step.icon];
  const StatusIcon = STATUS_ICONS[step.status];

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        "border rounded-lg p-3",
        step.status === 'error' && "border-red-300 bg-red-50",
        step.status === 'warning' && "border-yellow-300 bg-yellow-50",
        step.status === 'skipped' && "border-gray-200 bg-gray-50 opacity-60",
        step.status === 'not_executed' && "border-gray-200 bg-gray-100 opacity-40"
      )}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step.stepNumber}
            </span>
            <Icon className="h-4 w-4" />
            <span className="font-medium">{step.actionLabel}</span>
            <span className="flex-1 text-sm text-muted-foreground truncate">
              {step.result}
            </span>
            <StatusIcon className="h-4 w-4" />
            {step.isExpandable && <ChevronDown className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>

        {step.isExpandable && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t">
              {/* Render type-specific preview */}
              {step.preview && <StepPreviewRenderer preview={step.preview} />}

              {/* Show skip reason if skipped */}
              {step.skipReason && (
                <div className="text-sm text-muted-foreground italic">
                  {step.skipReason}
                </div>
              )}

              {/* Show suggestions if error */}
              {step.suggestions && step.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm">
                    {step.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
```

### TestSummaryBanner Component

```tsx
// frontend/components/agents/TestSummaryBanner.tsx

interface TestSummaryBannerProps {
  steps: TestStepResult[];
  executionTime: number;
}

export function TestSummaryBanner({ steps, executionTime }: TestSummaryBannerProps) {
  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter(s => s.status === 'success').length;
    const errors = steps.filter(s => s.status === 'error').length;
    const warnings = steps.filter(s => s.status === 'warning').length;
    const skipped = steps.filter(s => s.status === 'skipped').length;

    const overallStatus = errors > 0
      ? 'error'
      : warnings > 0
        ? 'warning'
        : 'success';

    return { total, completed, errors, warnings, skipped, overallStatus };
  }, [steps]);

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      stats.overallStatus === 'error' && "bg-red-50 border-red-200",
      stats.overallStatus === 'warning' && "bg-yellow-50 border-yellow-200",
      stats.overallStatus === 'success' && "bg-green-50 border-green-200"
    )}>
      <div className="flex items-center gap-2">
        {stats.overallStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
        {stats.overallStatus === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
        {stats.overallStatus === 'error' && <XCircle className="h-5 w-5 text-red-600" />}

        <span className="font-semibold">
          {stats.overallStatus === 'success' && `✅ Test completed: ${stats.total} steps, 0 errors`}
          {stats.overallStatus === 'warning' && `⚠️ Test completed with warnings: ${stats.warnings} warning(s)`}
          {stats.overallStatus === 'error' && `❌ Test failed: ${stats.errors} error(s)`}
        </span>
      </div>

      <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
        <span>✅ {stats.completed} completed</span>
        {stats.skipped > 0 && <span>⏭️ {stats.skipped} skipped</span>}
        {stats.warnings > 0 && <span>⚠️ {stats.warnings} warnings</span>}
        {stats.errors > 0 && <span>❌ {stats.errors} errors</span>}
        <span>⏱️ {executionTime}ms</span>
      </div>
    </div>
  );
}
```

### Backend Enhancement Pattern

```typescript
// In TestModeService.ts - Enhance each action handler

private getActionIcon(actionType: string): StepIcon {
  const iconMap: Record<string, StepIcon> = {
    'search': 'search',
    'send_email': 'email',
    'wait': 'wait',
    'conditional': 'conditional',
    'linkedin_invite': 'linkedin',
    'create_task': 'task',
    'add_tag': 'tag',
    'remove_tag': 'tag',
    'update_field': 'update',
    'enrich_contact': 'enrich',
    'human_handoff': 'handoff'
  };
  return iconMap[actionType] || 'success';
}

private getActionLabel(actionType: string): string {
  const labelMap: Record<string, string> = {
    'search': 'Search Contacts',
    'send_email': 'Send Email',
    'wait': 'Wait',
    'conditional': 'Conditional',
    'linkedin_invite': 'LinkedIn Invitation',
    'create_task': 'Create Task',
    'add_tag': 'Add Tag',
    'remove_tag': 'Remove Tag',
    'update_field': 'Update Field',
    'enrich_contact': 'Enrich Contact',
    'human_handoff': 'Human Handoff'
  };
  return labelMap[actionType] || actionType;
}

// Example: Enhanced simulateSearchAction
private async simulateSearchAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { field, operator, value } = action.params;

  // Build query based on test context
  const query = { workspace: context.workspaceId, [field]: { $regex: value, $options: 'i' } };

  // Execute search with limit for preview
  const results = await Contact.find(query).limit(6).select('_id firstName lastName title company').populate('company', 'name');
  const matchedCount = await Contact.countDocuments(query);

  const preview: SearchPreview = {
    type: 'search',
    matchedCount,
    matches: results.slice(0, 5).map(c => ({
      id: c._id.toString(),
      name: `${c.firstName} ${c.lastName}`,
      subtitle: c.title || '',
      company: c.company?.name
    })),
    hasMore: matchedCount > 5
  };

  return {
    stepNumber,
    action: 'search',
    actionLabel: 'Search Contacts',
    icon: 'search',
    params: { field, operator, value },
    result: `Found ${matchedCount} contacts matching criteria`,
    status: 'success',
    estimatedCredits: 0,
    estimatedDuration: 500,
    preview,
    isExpandable: true
  };
}
```

### Error Suggestions Pattern

```typescript
// Common error patterns and suggestions

private getErrorSuggestions(error: Error, context: ErrorContext): string[] {
  const suggestions: string[] = [];

  // Template not found
  if (error.message.includes('template') && error.message.includes('not found')) {
    const templateName = extractTemplateName(error.message);
    suggestions.push(`Create email template '${templateName}' in Settings > Email Templates`);
    suggestions.push(`Update instruction to use an existing template`);
  }

  // Variable not defined
  if (error.message.includes('variable') && error.message.includes('not defined')) {
    const varName = extractVariableName(error.message);
    suggestions.push(`Add custom field '${varName}' to contact/deal`);
    suggestions.push(`Check spelling of variable '@${varName}'`);
    suggestions.push(`Use manual test data to provide value for '${varName}'`);
  }

  // Condition syntax error
  if (error.message.includes('condition') && error.message.includes('syntax')) {
    suggestions.push(`Use '==' for comparison (not '=')`);
    suggestions.push(`Check that variable names are valid`);
    suggestions.push(`Wrap string values in quotes: 'value'`);
  }

  // Integration not connected
  if (error.message.includes('integration') && error.message.includes('not connected')) {
    const integration = extractIntegrationName(error.message);
    suggestions.push(`Connect ${integration} in Settings > Integrations`);
    suggestions.push(`Remove this action if integration is not needed`);
  }

  return suggestions;
}
```

---

## Previous Story Intelligence (Story 2.1 & 2.2)

### Patterns Established:

1. **TestModeService Architecture:**
   - `simulateExecution()` method with action handlers for all 10 action types
   - Variable resolution using test context (Story 2.2)
   - Workspace isolation in all queries
   - Returns `TestRunResult` with steps array

2. **TestModePanel Frontend:**
   - Sheet component sliding from right side
   - TestTargetSelector for contact/deal/manual selection (Story 2.2)
   - Loading states with spinner
   - Error handling with toast notifications

3. **API Response Format:**
   ```typescript
   interface TestRunResult {
     success: boolean;
     steps: TestStepResult[];
     totalEstimatedCredits: number;
     totalEstimatedDuration: number;
     warnings: Array<...>;
     error?: string;
   }
   ```

### Files Modified in Stories 2.1/2.2:

| File | Changes from 2.1/2.2 | 2.3 Action |
|------|----------------------|------------|
| `backend/src/services/TestModeService.ts` | Core simulation logic, target injection | EXTEND with enhanced step results |
| `frontend/components/agents/TestModePanel.tsx` | Panel, target selector, results display | UPDATE to use new components |
| `frontend/types/agent.ts` | TestTarget, TestRunResult types | EXTEND with new step types |

### Git Intelligence (commit e22bd09):

Files touched in 2-1/2-2 implementation:
- `backend/src/services/TestModeService.ts` - 143 lines added (simulation handlers)
- `frontend/components/agents/TestModePanel.tsx` - 111 lines added
- `frontend/components/agents/TestTargetSelector.tsx` - 305 lines (new)
- `frontend/components/agents/ManualTestDataInput.tsx` - 128 lines (new)

---

## Architecture Compliance Requirements

### Component Organization

All new frontend components follow existing pattern:
- Shadcn UI components for base elements (Collapsible, Badge, Card)
- Lucide icons for consistency
- TypeScript with strict types
- Named exports

### Backend Patterns

- Extend existing interfaces, don't create separate ones
- Use existing model queries (Contact, Deal) with populate
- Maintain backward compatibility - old clients should still work
- All database queries include workspace filter

### Error Handling

```typescript
// Error result structure
if (error) {
  return {
    stepNumber,
    action: action.type,
    actionLabel: this.getActionLabel(action.type),
    icon: 'error',
    params: action.params,
    result: `Error: ${error.message}`,
    status: 'error',
    estimatedCredits: 0,
    estimatedDuration: 0,
    preview: undefined,
    isExpandable: true,
    suggestions: this.getErrorSuggestions(error, context),
    errorContext: {
      lineNumber: action.lineNumber,
      instructionText: action.rawInstruction
    }
  };
}
```

---

## Developer Guardrails - Critical Patterns

### DO:

1. **Extend existing TestStepResult interface:**
   ```typescript
   // CORRECT - add new fields to existing interface
   export interface TestStepResult {
     // Keep all existing fields
     stepNumber: number;
     action: string;
     // ... existing fields ...

     // ADD new fields
     actionLabel: string;
     icon: StepIcon;
     preview?: StepPreview;
     isExpandable: boolean;
   }
   ```

2. **Use discriminated unions for preview types:**
   ```typescript
   // CORRECT - type field determines structure
   type StepPreview =
     | { type: 'search'; matchedCount: number; matches: ... }
     | { type: 'email'; recipient: string; subject: ... }
   ```

3. **Keep backward compatibility:**
   ```typescript
   // CORRECT - new fields are optional
   preview?: StepPreview;  // Optional, old clients ignore
   isExpandable: boolean;  // Has sensible default
   ```

### DO NOT:

1. **Don't break existing TestRunResult structure:**
   ```typescript
   // WRONG - changing existing field types
   steps: EnhancedTestStepResult[];  // Breaking change!

   // CORRECT - extend existing type
   steps: TestStepResult[];  // Same type, extended interface
   ```

2. **Don't create duplicate components:**
   ```typescript
   // WRONG - creating parallel component
   TestResultsDisplayV2.tsx

   // CORRECT - update existing or create new with clear purpose
   TestResultsList.tsx  // Clear new purpose
   ```

3. **Don't hardcode icon strings in multiple places:**
   ```typescript
   // WRONG - duplicated icon logic
   if (action === 'email') return '📧';  // In multiple files

   // CORRECT - centralized mapping
   const STEP_ICONS = { email: Mail, ... };  // Single source
   ```

---

## Implementation Order

1. **Backend Types** (Task 1.1)
   - Define enhanced TestStepResult interface
   - Export StepIcon, StepPreview types

2. **Backend Icon/Label Helpers** (Task 1.3)
   - Add getActionIcon(), getActionLabel() to TestModeService

3. **Backend Preview Generation** (Tasks 2, 3, 4)
   - Update each simulateXxxAction() to return preview
   - Start with search, then email, then conditionals

4. **Backend Error Suggestions** (Task 5)
   - Add suggestions logic for common errors
   - Mark subsequent steps as not_executed

5. **Frontend Types** (part of Task 6)
   - Add TestStepResult, StepPreview to agent.ts

6. **Frontend Components** (Tasks 6, 7, 8, 9)
   - Build bottom-up: preview components → TestStepCard → TestResultsList → TestSummaryBanner

7. **Frontend Integration** (Task 10)
   - Replace current results display in TestModePanel
   - Test with various agent configurations

8. **Test & Verify**
   - Test each action type shows correct preview
   - Test error handling and suggestions
   - Test conditional skip display
   - Verify backward compatibility

---

## Testing Requirements

### Backend Tests

```typescript
describe('TestModeService enhanced step results', () => {
  it('should return actionLabel and icon for each step type');
  it('should return search preview with matched contacts');
  it('should return email preview with resolved variables');
  it('should return conditional preview with evaluation result');
  it('should mark skipped steps with skipReason');
  it('should return suggestions for common errors');
  it('should mark subsequent steps as not_executed after error');
});

describe('Search action preview', () => {
  it('should limit preview to 5 matches');
  it('should include hasMore flag when more than 5');
  it('should populate company name in preview');
});

describe('Email action preview', () => {
  it('should resolve all template variables');
  it('should truncate body to 500 chars');
  it('should include isDryRun flag');
});

describe('Conditional action preview', () => {
  it('should evaluate condition against test context');
  it('should include human-readable explanation');
  it('should identify true/false branch steps');
});
```

### Frontend Tests

```typescript
describe('TestStepCard', () => {
  it('should display step number and action label');
  it('should show correct status icon');
  it('should expand/collapse on click');
  it('should render type-specific preview');
  it('should show skip reason for skipped steps');
  it('should show suggestions for error steps');
});

describe('TestResultsList', () => {
  it('should render all steps in order');
  it('should support expand all / collapse all');
  it('should visually distinguish step statuses');
});

describe('TestSummaryBanner', () => {
  it('should calculate correct stats from steps');
  it('should show success style when no errors');
  it('should show error style when errors exist');
  it('should display execution time');
});
```

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-02-safe-agent-testing.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Test Mode Architecture]
- [Source: _bmad-output/implementation-artifacts/2-1-enable-test-mode.md - TestModeService patterns]
- [Source: _bmad-output/implementation-artifacts/2-2-select-test-target.md - Variable resolution, context injection]
- [Source: backend/src/services/TestModeService.ts - Existing simulation handlers]
- [Source: frontend/components/agents/TestModePanel.tsx - Current panel implementation]

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-thinking (initial), claude-opus-4-5 (code review fix)

### Debug Log References

**Critical Issue Found During Code Review (2026-01-19):**
- Original TestModeService.ts was a STUB placeholder returning dummy data
- All backend tasks (1-5) were marked [x] but NOT actually implemented
- Code review by Amelia (dev agent) identified and fixed all issues

### Completion Notes List

1. **Backend Enhancement** (Re-implemented during code review):
   - Complete rewrite of `TestModeService.ts` (~1200 lines)
   - New type definitions: `TestStepStatus`, `StepIcon`, and 10 preview interfaces
   - Helper functions: `getActionIcon()`, `getActionLabel()`, `getEstimatedCredits()`, `getErrorSuggestions()`, `evaluateCondition()`, `resolveVariables()`, `truncateText()`
   - 11 action simulation handlers: search, email, wait, conditional, linkedin, task, tag, update, enrich, web_search, handoff
   - Enhanced `simulateExecution()` with:
     - Test target injection (contact/deal/manual data)
     - Conditional logic evaluation with branch execution
     - Error handling with suggestions
     - Steps marked as not_executed after errors
     - Rich preview generation for all action types

2. **Frontend Types**: Added all new type definitions to `frontend/types/agent.ts`:
   - `TestStepStatus` and `StepIcon` types
   - All preview interfaces (SearchPreview, EmailPreview, ConditionalPreview, WaitPreview, LinkedInPreview, TaskPreview, TagPreview, UpdatePreview, EnrichPreview, WebSearchPreview)
   - Enhanced `TestStepResult` interface with all new fields

3. **Frontend Components**: Created 3 new React components:
   - `TestStepCard.tsx` (420 lines): Individual step display with expand/collapse, status icons, and type-specific preview rendering via embedded `StepPreviewRenderer`
   - `TestResultsList.tsx` (112 lines): Sequential step rendering with expand all/collapse all toggle
   - `TestSummaryBanner.tsx` (143 lines): Overall test summary with stats, status styling, credits, and execution time

4. **Integration**: Updated `TestModePanel.tsx` to use new components (TestResultsList, TestSummaryBanner) instead of previous inline rendering

5. **Note on Task 9**: Step preview subcomponents (9.1-9.4) were implemented inline within `TestStepCard.tsx` as `StepPreviewRenderer` function rather than separate files, following the existing codebase pattern for related preview components

6. **Tests Updated** (During code review):
   - Expanded `TestModeService.test.ts` to cover Story 2.3 functionality
   - Added tests for: enhanced step results, action-specific previews, conditional logic, error suggestions, target injection

### File List

**Modified Files:**
- `backend/src/services/TestModeService.ts` - **REWRITTEN** with complete Story 2.3 implementation (~1200 lines)
- `backend/src/services/TestModeService.test.ts` - Updated with Story 2.3 test coverage
- `frontend/types/agent.ts` - Added new type definitions for enhanced step results and previews
- `frontend/components/agents/TestModePanel.tsx` - Updated to use new TestResultsList and TestSummaryBanner components

**New Files:**
- `frontend/components/agents/TestStepCard.tsx` - Individual step display component with StepPreviewRenderer
- `frontend/components/agents/TestResultsList.tsx` - Step list component with expand/collapse controls
- `frontend/components/agents/TestSummaryBanner.tsx` - Summary banner component with stats display

