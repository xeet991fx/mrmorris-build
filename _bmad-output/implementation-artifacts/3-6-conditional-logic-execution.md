# Story 3.6: Conditional Logic Execution

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to execute conditional logic (if/then),
So that workflows can adapt based on data and conditions.

## Acceptance Criteria

1. **AC1: Simple Contains Condition - TRUE**
   - Given agent has condition: "If contact.title contains 'CEO'"
   - When contact title is "CEO of Sales"
   - Then condition evaluates to TRUE
   - And actions inside the if-block execute

2. **AC2: Simple Contains Condition - FALSE**
   - Given agent has condition: "If contact.title contains 'CEO'"
   - When contact title is "Sales Manager"
   - Then condition evaluates to FALSE
   - And actions inside the if-block are skipped

3. **AC3: If/Else Logic with Comparison Operators**
   - Given agent has if/else logic: "If deal.value > 50000, send urgent email, else send standard email"
   - When deal value is $75,000
   - Then "Send urgent email" action executes
   - And "Send standard email" action is skipped

4. **AC4: Nested Conditions**
   - Given agent has nested conditions: "If contact.replied == true, if contact.interested == true, schedule demo"
   - When both conditions are true
   - Then inner condition is evaluated
   - And "Schedule demo" action executes

5. **AC5: AND Logic (Multiple Conditions)**
   - Given agent has multiple conditions: "If title contains 'CEO' AND company.industry == 'SaaS'"
   - When both conditions are true → actions execute
   - When only one condition is true → actions are skipped

6. **AC6: OR Logic**
   - Given agent has OR logic: "If contact.replied == true OR contact.opened_email == true"
   - When either condition is true
   - Then actions execute

7. **AC7: Graceful Handling of Missing Fields**
   - Given condition references non-existent field
   - When condition evaluates
   - Then condition fails gracefully with warning: "Field 'contact.customField99' not found. Defaulting to false."
   - And execution continues (doesn't crash)
   - And warning is logged in execution logs for debugging

## Tasks / Subtasks

- [x] **Task 1: Enhance Condition Evaluation Engine (AC: 1, 2, 3, 5, 6, 7)**
  - [x] 1.1 Refactor `evaluateCondition()` to `ConditionEvaluator` class with single responsibility
  - [x] 1.2 Add `exists` operator: `contact.linkedinUrl exists` → check if field has value
  - [x] 1.3 Add `not_exists` operator: `contact.phone not_exists` → check if field is undefined/null
  - [x] 1.4 Implement AND logic parser: Detect `AND`/`&&`/`and` keywords between conditions
  - [x] 1.5 Implement OR logic parser: Detect `OR`/`||`/`or` keywords between conditions
  - [x] 1.6 Implement NOT logic: Support `NOT field == value` or `!field == value`
  - [x] 1.7 Add graceful handling for missing fields: Return `false` + warning instead of error
  - [x] 1.8 Add detailed logging: Log field name, resolved value, operator, expected value, result

- [x] **Task 2: Update InstructionParserService for Conditional Parsing (AC: 1-6)**
  - [x] 2.1 Enhance `SALES_PARSING_PROMPT` with examples for AND/OR/NOT logic
  - [x] 2.2 Update conditional action schema to support `conditions` array for compound logic
  - [x] 2.3 Add `logicalOperator` field to ParsedAction: `'and' | 'or' | undefined`
  - [x] 2.4 Add parsing examples for nested if/else structures
  - [x] 2.5 Validate conditional actions have either `condition` string or `conditions` array

- [x] **Task 3: Implement Compound Condition Evaluation (AC: 5, 6)**
  - [x] 3.1 Create `evaluateCompoundCondition(conditions[], operator)` method
  - [x] 3.2 For AND: All conditions must be true → return true
  - [x] 3.3 For OR: Any condition true → return true
  - [x] 3.4 Return aggregated explanation with all condition results
  - [x] 3.5 Short-circuit evaluation: Stop early if result is determined

- [x] **Task 4: Implement Nested Condition Support (AC: 4)**
  - [x] 4.1 Allow trueBranch actions to contain conditional actions (recursion)
  - [x] 4.2 Implement recursive condition evaluation depth limit (max 5 levels)
  - [x] 4.3 Update `executeConditionalAction()` to handle nested conditionals
  - [x] 4.4 Preserve parent context when evaluating nested conditions
  - [x] 4.5 Log nesting level in execution logs for debugging

- [x] **Task 5: Enhance AgentExecutionService Conditional Handling (AC: 1-7)**
  - [x] 5.1 Refactor conditional action execution to use new ConditionEvaluator
  - [x] 5.2 Add condition result to step result: `{ conditionResult: boolean, explanation: string, warnings: string[] }`
  - [x] 5.3 Execute trueBranch or falseBranch based on evaluation result
  - [x] 5.4 Handle missing fields gracefully with warning in step result
  - [x] 5.5 Emit Socket.io event with condition evaluation details

- [x] **Task 6: Create ConditionEvaluator Utility Class (AC: All)**
  - [x] 6.1 Create `backend/src/utils/ConditionEvaluator.ts` with focused responsibility
  - [x] 6.2 Implement `evaluate(condition: string, context: ExecutionContext): ConditionResult`
  - [x] 6.3 Implement `evaluateMultiple(conditions: string[], operator: 'and' | 'or', context): ConditionResult`
  - [x] 6.4 Define `ConditionResult` interface: `{ result: boolean, explanation: string, warnings: string[], fieldValues: Record<string, any> }`
  - [x] 6.5 Implement operator registry pattern for extensibility

- [x] **Task 7: Add Condition Logging to Execution Logs (AC: 7)**
  - [x] 7.1 Add `conditionLog` field to IAgentExecutionStep interface
  - [x] 7.2 Log: condition text, resolved values, operator, expected value, result, warnings
  - [x] 7.3 Include condition logs in execution detail view API response
  - [x] 7.4 Truncate long condition logs (max 500 chars per condition)

- [x] **Task 8: Add Unit and Integration Tests (AC: All)**
  - [x] 8.1 Unit test: Simple equals condition evaluates correctly
  - [x] 8.2 Unit test: Contains operator (case-insensitive)
  - [x] 8.3 Unit test: Numeric comparison operators (>, <, >=, <=)
  - [x] 8.4 Unit test: AND logic with 2-3 conditions
  - [x] 8.5 Unit test: OR logic with 2-3 conditions
  - [x] 8.6 Unit test: NOT logic
  - [x] 8.7 Unit test: Nested conditions (2-3 levels)
  - [x] 8.8 Unit test: Missing field returns false with warning
  - [x] 8.9 Integration test: Conditional action execution flow
  - [x] 8.10 Integration test: If/else branch selection

## Dev Notes

### Key Difference from Previous Stories

| Aspect | Story 3.5: Multi-Step Workflows | Story 3.6: Conditional Logic |
|--------|--------------------------------|------------------------------|
| Focus | Sequential execution pipeline | Decision branching within steps |
| State | Step outputs + memory | Condition evaluation results |
| Context | Data flows between steps | Data drives branch selection |
| Complexity | Linear progression | Tree-like branching |

### Current Implementation Status

**Already Implemented (Story 3.1):**
- Basic `evaluateCondition()` function in `AgentExecutionService.ts:317-395`
- Supports: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `is`, `is not`
- InstructionParserService already has `conditional` action type
- Basic trueBranch/falseBranch execution in `executeAgent()` loop

**Gaps to Fill (Story 3.6):**
1. **AND/OR/NOT logic** - Current implementation only handles single conditions
2. **`exists` operator** - Not currently supported
3. **Nested conditions** - trueBranch cannot contain another conditional action
4. **Graceful missing field handling** - Currently returns `[fieldName]` placeholder, needs warning + false
5. **Condition logging** - Basic explanation exists but no structured logging

### Architecture Pattern: Condition Evaluation Engine

```
┌─────────────────────────────────────────────────────────────┐
│                   ConditionEvaluator                         │
├─────────────────────────────────────────────────────────────┤
│  evaluate(condition, context)                                │
│    │                                                         │
│    ├── Parse condition string                                │
│    │   ├── Simple: "contact.title contains 'CEO'"           │
│    │   ├── Compound: "A AND B" / "A OR B"                   │
│    │   └── Negated: "NOT contact.replied"                   │
│    │                                                         │
│    ├── Resolve field values from context                     │
│    │   ├── @contact.* → context.contact[field]              │
│    │   ├── @deal.* → context.deal[field]                    │
│    │   ├── @memory.* → context.memory.get(field)            │
│    │   └── @step*.* → context.stepOutputs[step][field]      │
│    │                                                         │
│    ├── Apply operator                                        │
│    │   ├── Comparison: ==, !=, >, <, >=, <=                 │
│    │   ├── String: contains, starts_with, ends_with         │
│    │   ├── Existence: exists, not_exists                    │
│    │   └── Logical: AND, OR, NOT                            │
│    │                                                         │
│    └── Return ConditionResult                                │
│        ├── result: boolean                                   │
│        ├── explanation: "contact.title contains 'CEO' → TRUE"│
│        ├── warnings: ["Field X not found, defaulting to false"]│
│        └── fieldValues: { "contact.title": "CEO of Sales" } │
└─────────────────────────────────────────────────────────────┘
```

### ConditionEvaluator Interface

```typescript
// backend/src/utils/ConditionEvaluator.ts

export interface ConditionResult {
  result: boolean;
  explanation: string;
  warnings: string[];
  fieldValues: Record<string, any>;
}

export interface ParsedCondition {
  field: string;           // "contact.title", "deal.value"
  operator: ConditionOperator;
  value: any;              // "CEO", 50000, true
  negated?: boolean;       // NOT prefix
}

export type ConditionOperator =
  | '==' | '!=' | '>' | '<' | '>=' | '<='
  | 'contains' | 'starts_with' | 'ends_with'
  | 'exists' | 'not_exists'
  | 'is' | 'is_not';

export class ConditionEvaluator {
  /**
   * Evaluate a single condition string
   */
  static evaluate(
    condition: string,
    context: ExecutionContext
  ): ConditionResult {
    // Implementation follows pattern from existing evaluateCondition()
  }

  /**
   * Evaluate multiple conditions with AND/OR logic
   */
  static evaluateCompound(
    conditions: string[],
    operator: 'and' | 'or',
    context: ExecutionContext
  ): ConditionResult {
    // Short-circuit evaluation
    // Aggregate explanations and warnings
  }

  /**
   * Parse condition string into structured format
   */
  private static parseCondition(condition: string): ParsedCondition {
    // Regex patterns for different condition formats
  }

  /**
   * Resolve field value from context
   */
  private static resolveField(
    field: string,
    context: ExecutionContext
  ): { value: any; found: boolean } {
    // Handle missing fields gracefully
  }

  /**
   * Apply operator to compare field value with expected value
   */
  private static applyOperator(
    fieldValue: any,
    operator: ConditionOperator,
    expectedValue: any
  ): boolean {
    // Switch on operator type
  }
}
```

### Enhanced ParsedAction for Compound Conditions

```typescript
// InstructionParserService.ts - enhanced ActionSchema

const ActionSchema = z.object({
  type: ActionTypeEnum,
  condition: z.string().optional(),  // Simple condition

  // NEW: Compound condition support
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })).optional(),
  logicalOperator: z.enum(['and', 'or']).optional(),

  // Existing fields...
  trueBranch: z.array(z.lazy(() => ActionSchema)).optional(),
  falseBranch: z.array(z.lazy(() => ActionSchema)).optional(),
});
```

### Nested Condition Execution Pattern

```typescript
// AgentExecutionService.ts - enhanced conditional handling

private static async executeConditionalAction(
  action: ParsedAction,
  context: ExecutionContext,
  execution: IAgentExecution,
  nestingLevel: number = 0
): Promise<{ stepResults: IAgentExecutionStep[], branchExecuted: 'true' | 'false' | 'none' }> {

  // Prevent infinite nesting (Task 4.2)
  const MAX_NESTING_DEPTH = 5;
  if (nestingLevel >= MAX_NESTING_DEPTH) {
    throw new Error(`Maximum condition nesting depth (${MAX_NESTING_DEPTH}) exceeded`);
  }

  // Evaluate condition(s)
  let evalResult: ConditionResult;

  if (action.conditions && action.logicalOperator) {
    // Compound condition (AC5, AC6)
    evalResult = ConditionEvaluator.evaluateCompound(
      action.conditions.map(c => `${c.field} ${c.operator} ${c.value}`),
      action.logicalOperator,
      context
    );
  } else if (action.condition) {
    // Simple condition (AC1, AC2, AC3)
    evalResult = ConditionEvaluator.evaluate(action.condition, context);
  } else {
    throw new Error('Conditional action missing condition');
  }

  // Log condition evaluation
  const conditionStep: IAgentExecutionStep = {
    stepNumber: context.currentStep,
    action: 'conditional',
    result: {
      success: true,
      description: evalResult.explanation,
      conditionResult: evalResult.result,
      warnings: evalResult.warnings,
      fieldValues: evalResult.fieldValues,
    },
    executedAt: new Date(),
    durationMs: 0,
    creditsUsed: 0,
  };

  const stepResults: IAgentExecutionStep[] = [conditionStep];

  // Execute appropriate branch
  const activeBranch = evalResult.result ? action.trueBranch : action.falseBranch;
  const branchExecuted = evalResult.result ? 'true' : 'false';

  if (activeBranch?.length) {
    for (const branchAction of activeBranch) {
      context.currentStep++;

      // Handle nested conditionals (AC4)
      if (branchAction.type === 'conditional') {
        const nestedResult = await this.executeConditionalAction(
          branchAction,
          context,
          execution,
          nestingLevel + 1  // Increment nesting level
        );
        stepResults.push(...nestedResult.stepResults);
      } else {
        // Execute regular action
        const actionResult = await this.executeAction(branchAction, context);
        stepResults.push({
          stepNumber: context.currentStep,
          action: branchAction.type,
          result: actionResult,
          executedAt: new Date(),
          durationMs: actionResult.durationMs || 0,
          creditsUsed: getCreditCost(branchAction.type),
        });
      }
    }
  }

  return { stepResults, branchExecuted: activeBranch?.length ? branchExecuted : 'none' };
}
```

### Graceful Missing Field Handling

```typescript
// ConditionEvaluator.ts - AC7 implementation

private static resolveField(
  field: string,
  context: ExecutionContext
): { value: any; found: boolean; warning?: string } {
  let value: any = undefined;
  let found = false;

  if (field.startsWith('contact.') && context.contact) {
    const key = field.replace('contact.', '');
    value = context.contact[key];
    found = key in context.contact;
  } else if (field.startsWith('deal.') && context.deal) {
    const key = field.replace('deal.', '');
    value = context.deal[key];
    found = key in context.deal;
  } else if (field.startsWith('memory.') && context.memory) {
    const key = field.replace('memory.', '');
    value = context.memory.get(key);
    found = context.memory.has(key);
  } else if (field.startsWith('step') && context.stepOutputs) {
    // @step1.result, @step2.contacts, etc.
    const match = field.match(/^step(\d+)\.(.+)$/);
    if (match) {
      const [, stepNum, prop] = match;
      const stepKey = `step${stepNum}`;
      const stepOutput = context.stepOutputs[stepKey];
      if (stepOutput?.result && typeof stepOutput.result === 'object') {
        value = stepOutput.result[prop];
        found = prop in stepOutput.result;
      }
    }
  }

  // AC7: Graceful handling of missing fields
  if (!found) {
    return {
      value: undefined,
      found: false,
      warning: `Field '${field}' not found. Defaulting to false.`
    };
  }

  return { value, found };
}
```

### AND/OR Logic Evaluation

```typescript
// ConditionEvaluator.ts - AC5/AC6 implementation

static evaluateCompound(
  conditions: string[],
  operator: 'and' | 'or',
  context: ExecutionContext
): ConditionResult {
  const results: ConditionResult[] = [];
  const allWarnings: string[] = [];
  const allFieldValues: Record<string, any> = {};

  for (const condition of conditions) {
    const result = this.evaluate(condition, context);
    results.push(result);
    allWarnings.push(...result.warnings);
    Object.assign(allFieldValues, result.fieldValues);

    // Short-circuit evaluation
    if (operator === 'and' && !result.result) {
      // AND fails fast on first false
      return {
        result: false,
        explanation: `(${conditions.join(' AND ')}) → FALSE (failed at: ${condition})`,
        warnings: allWarnings,
        fieldValues: allFieldValues,
      };
    }
    if (operator === 'or' && result.result) {
      // OR succeeds fast on first true
      return {
        result: true,
        explanation: `(${conditions.join(' OR ')}) → TRUE (matched: ${condition})`,
        warnings: allWarnings,
        fieldValues: allFieldValues,
      };
    }
  }

  // All conditions evaluated
  const finalResult = operator === 'and'
    ? results.every(r => r.result)
    : results.some(r => r.result);

  const explanations = results.map(r => r.explanation).join(` ${operator.toUpperCase()} `);

  return {
    result: finalResult,
    explanation: `(${explanations}) → ${finalResult ? 'TRUE' : 'FALSE'}`,
    warnings: allWarnings,
    fieldValues: allFieldValues,
  };
}
```

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Execution Service | `backend/src/services/AgentExecutionService.ts:317-395` (evaluateCondition) |
| Instruction Parser | `backend/src/services/InstructionParserService.ts:23-76` (schemas) |
| Action Executor | `backend/src/services/ActionExecutorService.ts` |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` |
| Socket Events | `backend/src/socket/agentExecutionSocket.ts` |
| Previous Story | `_bmad-output/implementation-artifacts/3-5-sequential-multi-step-workflows.md` |
| Epic Requirements | `_bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.6` |

### Project Structure Notes

- New utility class: `backend/src/utils/ConditionEvaluator.ts`
- Refactor `evaluateCondition()` from AgentExecutionService to use new ConditionEvaluator
- Update IAgentExecutionStep interface in AgentExecution model for condition logs
- Tests in `backend/src/tests/conditionEvaluator.test.ts`

### Critical Implementation Notes from Previous Stories

From Story 3.5 learnings:
- Use explicit typing for all new interfaces
- Emit Socket.io events after state changes, not before
- Save to database before emitting events for consistency
- Include traceability in all logs and step results
- Use pattern established for step execution and context flow

From Story 3.1 learnings:
- InstructionParserService already handles `conditional` type - extend, don't replace
- Variable resolution pattern established in `resolveVariables()` - reuse for conditions
- Credit cost for `conditional` is 0 (logic evaluation is free)

### Operator Reference Table

| Operator | Example | Description |
|----------|---------|-------------|
| `==` | `contact.status == 'Active'` | Exact equality (string comparison) |
| `!=` | `deal.stage != 'Closed Lost'` | Not equal |
| `>` | `deal.value > 50000` | Greater than (numeric) |
| `<` | `contact.score < 50` | Less than (numeric) |
| `>=` | `deal.value >= 10000` | Greater than or equal |
| `<=` | `contact.age <= 65` | Less than or equal |
| `contains` | `contact.title contains 'CEO'` | Substring match (case-insensitive) |
| `exists` | `contact.phone exists` | Field has truthy value |
| `not_exists` | `contact.linkedIn not_exists` | Field is null/undefined/empty |
| `is` | `contact.replied is true` | Boolean check |
| `is_not` | `contact.bounced is_not true` | Negated boolean |

### Logical Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `AND` / `&&` | `title contains CEO AND industry == SaaS` | Both conditions must be true |
| `OR` / `||` | `replied == true OR opened == true` | Either condition must be true |
| `NOT` / `!` | `NOT contact.unsubscribed` | Negates the condition |

### NFR Compliance

- **NFR1:** Condition evaluation adds negligible latency (<5ms per condition)
- **NFR35:** 90% success rate - Graceful missing field handling prevents crashes
- **Credit Cost:** Conditional actions cost 0 credits (internal logic only)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.6] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: backend/src/services/AgentExecutionService.ts:317-395] - Current evaluateCondition implementation
- [Source: backend/src/services/InstructionParserService.ts:23-76] - Conditional action schema
- [Source: _bmad-output/implementation-artifacts/3-5-sequential-multi-step-workflows.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude claude-opus-4-5-thinking (Opus 4.5)

### Debug Log References

- TypeScript compilation: PASS (no errors)
- Test file created with comprehensive coverage

### Completion Notes List

- **Task 6 Complete**: Created `ConditionEvaluator.ts` utility class with full feature set including:
  - Single and compound condition evaluation
  - AND/OR/NOT logical operators
  - exists/not_exists operators
  - Graceful missing field handling with warnings
  - Short-circuit evaluation for performance
  - Detailed explanations and field value tracking

- **Task 1 Complete**: Refactored `evaluateCondition()` in AgentExecutionService to delegate to ConditionEvaluator

- **Task 2 Complete**: Enhanced InstructionParserService with:
  - Updated ConditionSchema with all operators
  - Added conditions array and logicalOperator to ActionSchema
  - Enhanced SALES_PARSING_PROMPT with AND/OR/NOT examples
  - Added nested condition parsing examples
  - Enhanced validation for conditional actions

- **Task 3 Complete**: Implemented compound condition evaluation with short-circuit optimization

- **Task 4 Complete**: Implemented nested condition support with:
  - Max nesting depth of 5 levels
  - `executeNestedConditional()` recursive method
  - Parent context preservation
  - Nesting level logging

- **Task 5 Complete**: Enhanced AgentExecutionService conditional handling:
  - Uses ConditionEvaluator for all condition evaluation
  - Enhanced step results with warnings and field values
  - Socket.io events with condition evaluation details

- **Task 7 Complete**: Added condition logging to execution logs:
  - conditionLog field in IAgentExecutionStep interface
  - MongoDB schema updated with conditionLog subdocument
  - Logs condition, resolved values, operator, result, warnings, nesting level

- **Task 8 Complete**: Created comprehensive test suite with 30+ test cases covering all ACs

### File List

**New Files:**
- backend/src/utils/ConditionEvaluator.ts
- backend/src/tests/conditionEvaluator.test.ts

**Modified Files:**
- backend/src/services/AgentExecutionService.ts
- backend/src/services/InstructionParserService.ts
- backend/src/models/AgentExecution.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-6-conditional-logic-execution.md

