# Story 2.4: Validate Instructions

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-4-validate-instructions
**Status:** review
**Priority:** High - Critical for preventing runtime errors before agents go live
**FRs Covered:** FR40 (System can validate instructions and warn about potential errors)

---

## User Story

**As a** workspace owner,
**I want to** get warnings about potential errors in my instructions,
**So that** I can fix issues before going live.

---

## Acceptance Criteria

### AC1: Manual Validation Trigger

**Given** I have written agent instructions
**When** I click "Validate Instructions" or run Test Mode
**Then** The system validates instructions for common errors
**And** I see warnings or errors highlighted

### AC2: Missing Template Warning

**Given** My instructions reference a non-existent email template
**When** Validation runs
**Then** I see warning: "Email template 'Outbound v2' not found. Create template or update instruction."
**And** The warning includes the line number where the issue occurs

### AC3: Undefined Variable Error

**Given** My instructions use a variable that doesn't exist
**When** Validation runs
**Then** I see error: "Variable @contact.customField1 not defined. Add custom field or check spelling."
**And** The instruction is highlighted

### AC4: Syntax Error Detection

**Given** My instructions have conditional logic with syntax errors
**When** Validation runs
**Then** I see error: "Invalid condition syntax: 'if contact.replied = true' (use == for comparison)"
**And** I see a suggestion: "Did you mean: 'if contact.replied == true'?"

### AC5: Integration Availability Check

**Given** My instructions reference an integration not connected
**When** Validation runs
**Then** I see warning: "LinkedIn integration not connected. Connect integration before going live."

### AC6: Rate Limit Estimation Warning

**Given** My instructions exceed rate limits
**When** Validation runs
**Then** I see warning: "This agent may send 200 emails/day, exceeding limit of 100. Consider reducing scope or increasing limit."

### AC7: Success Validation

**Given** All instructions are valid
**When** Validation runs
**Then** I see success message: "Instructions validated successfully. No errors found."

### AC8: Warning Confirmation Before Live

**Given** I have validation warnings but no errors
**When** I try to go Live
**Then** I see a confirmation: "Agent has 2 warnings. Review warnings before going live."
**And** I can choose to continue or fix warnings first

---

## Tasks / Subtasks

- [x] Task 1: Create InstructionValidationService (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 1.1: Create `backend/src/services/InstructionValidationService.ts` with `validateInstructions()` method
  - [x] 1.2: Define `ValidationResult`, `ValidationWarning`, `ValidationError` interfaces
  - [x] 1.3: Implement template existence check against EmailTemplate model
  - [x] 1.4: Implement variable reference validation against Contact/Deal schemas and custom fields
  - [x] 1.5: Implement conditional syntax validation with common error patterns
  - [x] 1.6: Implement integration availability check against IntegrationCredential model
  - [x] 1.7: Implement rate limit estimation based on action counts and agent restrictions

- [x] Task 2: Create Validation Endpoint (AC: 1)
  - [x] 2.1: Add `POST /api/workspaces/:workspaceId/agents/:agentId/validate` route
  - [x] 2.2: Create controller method in `agentController.ts`
  - [x] 2.3: Add request/response validation with Zod schema

- [x] Task 3: Integrate Validation with Test Mode (AC: 1)
  - [x] 3.1: Call `InstructionValidationService.validateInstructions()` at start of `TestModeService.simulateExecution()`
  - [x] 3.2: Include validation results in `TestRunResult.warnings` array
  - [x] 3.3: Add validation status to test summary

- [x] Task 4: Create ValidationResultsPanel Frontend Component (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 4.1: Create `frontend/components/agents/ValidationResultsPanel.tsx`
  - [x] 4.2: Display validation warnings with severity icons (warning, error)
  - [x] 4.3: Show line numbers linking to instruction editor position
  - [x] 4.4: Display suggestions for each issue
  - [x] 4.5: Implement "View in Editor" action to scroll to error location

- [x] Task 5: Create ValidationInlineMarkers Component (AC: 2, 3, 4)
  - [x] 5.1: Create `frontend/components/agents/ValidationInlineMarkers.tsx`
  - [x] 5.2: Render error/warning underlines in instruction textarea
  - [x] 5.3: Show tooltip on hover with error details and suggestions

- [x] Task 6: Update InstructionsEditor Component (AC: 1, 2, 3)
  - [x] 6.1: Add "Validate" button next to Save in `InstructionsEditor.tsx`
  - [x] 6.2: Integrate ValidationInlineMarkers for real-time highlighting
  - [x] 6.3: Call validation API on button click
  - [x] 6.4: Display validation results below editor

- [x] Task 7: Update Agent Status Change Flow (AC: 8)
  - [x] 7.1: Before changing status to "Live", call validation endpoint
  - [x] 7.2: If warnings exist, show confirmation dialog with warning count
  - [x] 7.3: If errors exist, block status change with error message
  - [x] 7.4: Allow bypass for warnings only (not errors)

- [x] Task 8: Add Validation Types to Frontend (AC: all)
  - [x] 8.1: Add `ValidationResult`, `ValidationWarning`, `ValidationError` types to `frontend/types/agent.ts`
  - [x] 8.2: Add `ValidateAgentResponse` interface
  - [x] 8.3: Create API function `validateAgentInstructions()` in `frontend/lib/api/agents.ts`

- [x] Task 9: Write Backend Tests (AC: all)
  - [x] 9.1: Create `InstructionValidationService.test.ts`
  - [x] 9.2: Test template existence validation
  - [x] 9.3: Test variable reference validation
  - [x] 9.4: Test conditional syntax validation
  - [x] 9.5: Test integration availability validation
  - [x] 9.6: Test rate limit estimation

---

## Dev Notes

### Critical Architecture Patterns

**InstructionValidationService Interface:**

```typescript
// File: backend/src/services/InstructionValidationService.ts

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;              // e.g., 'TEMPLATE_NOT_FOUND', 'INVALID_VARIABLE'
  message: string;           // Human-readable message
  lineNumber?: number;       // Line in instructions where issue occurs
  column?: number;           // Column position for precise highlighting
  instructionText?: string;  // The problematic instruction text
  suggestion?: string;       // Actionable fix suggestion
  context?: Record<string, any>; // Additional context for the issue
}

export interface ValidationResult {
  valid: boolean;            // true if no errors (warnings allowed)
  errors: ValidationIssue[]; // Blocking issues (cannot go Live)
  warnings: ValidationIssue[]; // Non-blocking issues (can go Live with confirmation)
  summary: {
    errorCount: number;
    warningCount: number;
    validatedAt: string;     // ISO timestamp
  };
}

export interface ValidationContext {
  workspaceId: string;
  agentId: string;
  instructions: string;
  parsedActions?: ParsedAction[];
  triggerType?: string;
}
```

**Validation Check Categories:**

```typescript
// Validation codes for each check type
const VALIDATION_CODES = {
  // Template checks
  TEMPLATE_NOT_FOUND: 'template_not_found',
  TEMPLATE_INVALID: 'template_invalid',

  // Variable checks
  VARIABLE_UNDEFINED: 'variable_undefined',
  VARIABLE_INVALID_FORMAT: 'variable_invalid_format',
  VARIABLE_TYPE_MISMATCH: 'variable_type_mismatch',

  // Syntax checks
  CONDITION_SYNTAX_ERROR: 'condition_syntax_error',
  ACTION_SYNTAX_ERROR: 'action_syntax_error',
  MISSING_REQUIRED_PARAM: 'missing_required_param',

  // Integration checks
  INTEGRATION_NOT_CONNECTED: 'integration_not_connected',
  INTEGRATION_EXPIRED: 'integration_expired',

  // Rate limit checks
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  DAILY_LIMIT_RISK: 'daily_limit_risk',

  // General
  INSTRUCTION_EMPTY: 'instruction_empty',
  INSTRUCTION_TOO_LONG: 'instruction_too_long',
} as const;
```

### Backend Service Implementation Pattern

```typescript
// File: backend/src/services/InstructionValidationService.ts

import EmailTemplate from '../models/EmailTemplate';
import IntegrationCredential from '../models/IntegrationCredential';
import Contact from '../models/Contact';
import CustomFieldDefinition from '../models/CustomFieldDefinition';

export class InstructionValidationService {
  /**
   * Validate agent instructions for common errors before execution.
   */
  static async validateInstructions(
    ctx: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Run all validation checks
    await this.validateTemplateReferences(ctx, errors, warnings);
    await this.validateVariableReferences(ctx, errors, warnings);
    this.validateConditionSyntax(ctx, errors, warnings);
    await this.validateIntegrationAvailability(ctx, errors, warnings);
    this.validateRateLimitEstimates(ctx, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length,
        validatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Check that all referenced email templates exist.
   */
  private static async validateTemplateReferences(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Extract template references from instructions
    // Pattern: "using template 'name'" or "template: name" or "Send Email using 'name'"
    const templateRegex = /(?:using\s+template\s+['"]?([^'"]+)['"]?|template:\s*['"]?([^'"]+)['"]?)/gi;
    let match;

    while ((match = templateRegex.exec(ctx.instructions)) !== null) {
      const templateName = match[1] || match[2];
      const lineNumber = this.getLineNumber(ctx.instructions, match.index);

      // Check if template exists in workspace
      const template = await EmailTemplate.findOne({
        workspace: ctx.workspaceId,
        name: { $regex: new RegExp(`^${templateName}$`, 'i') }
      });

      if (!template) {
        warnings.push({
          severity: 'warning',
          code: 'TEMPLATE_NOT_FOUND',
          message: `Email template '${templateName}' not found.`,
          lineNumber,
          instructionText: match[0],
          suggestion: `Create template '${templateName}' in Settings > Email Templates or update instruction to use an existing template.`,
        });
      }
    }
  }

  /**
   * Check that all @variable references are valid.
   */
  private static async validateVariableReferences(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Standard contact/deal fields
    const STANDARD_CONTACT_FIELDS = [
      'firstName', 'lastName', 'email', 'phone', 'title', 'company',
      'linkedInUrl', 'tags', 'status', 'source', 'createdAt'
    ];
    const STANDARD_DEAL_FIELDS = [
      'name', 'value', 'stage', 'owner', 'company', 'contact',
      'probability', 'closeDate', 'createdAt'
    ];

    // Extract variable references: @contact.field, @deal.field, @workspace.field
    const variableRegex = /@(\w+)\.(\w+)/g;
    let match;

    // Load workspace custom fields for validation
    const customFields = await CustomFieldDefinition.find({
      workspace: ctx.workspaceId
    }).lean();
    const contactCustomFields = customFields
      .filter(f => f.entityType === 'contact')
      .map(f => f.fieldName);
    const dealCustomFields = customFields
      .filter(f => f.entityType === 'deal')
      .map(f => f.fieldName);

    while ((match = variableRegex.exec(ctx.instructions)) !== null) {
      const [fullMatch, entity, field] = match;
      const lineNumber = this.getLineNumber(ctx.instructions, match.index);

      let isValid = false;
      let suggestion = '';

      if (entity === 'contact') {
        isValid = STANDARD_CONTACT_FIELDS.includes(field) ||
                  contactCustomFields.includes(field);
        suggestion = `Available contact fields: ${STANDARD_CONTACT_FIELDS.slice(0, 5).join(', ')}... or add custom field '${field}'.`;
      } else if (entity === 'deal') {
        isValid = STANDARD_DEAL_FIELDS.includes(field) ||
                  dealCustomFields.includes(field);
        suggestion = `Available deal fields: ${STANDARD_DEAL_FIELDS.slice(0, 5).join(', ')}... or add custom field '${field}'.`;
      } else if (entity === 'workspace' || entity === 'current') {
        // These are always valid
        isValid = true;
      }

      if (!isValid) {
        errors.push({
          severity: 'error',
          code: 'VARIABLE_UNDEFINED',
          message: `Variable ${fullMatch} is not defined.`,
          lineNumber,
          instructionText: fullMatch,
          suggestion,
        });
      }
    }
  }

  /**
   * Check conditional syntax for common errors.
   */
  private static validateConditionSyntax(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // Pattern: If/When conditions
    const conditionRegex = /(?:if|when)\s+(.+?)(?::|then|,)/gi;
    let match;

    while ((match = conditionRegex.exec(ctx.instructions)) !== null) {
      const condition = match[1].trim();
      const lineNumber = this.getLineNumber(ctx.instructions, match.index);

      // Check for single = instead of ==
      if (/[^=!<>]=[^=]/.test(condition) && !/==|!=|>=|<=/.test(condition)) {
        errors.push({
          severity: 'error',
          code: 'CONDITION_SYNTAX_ERROR',
          message: `Invalid condition syntax: '${condition}'`,
          lineNumber,
          instructionText: match[0],
          suggestion: `Use '==' for comparison. Did you mean: '${condition.replace(/([^=!<>])=([^=])/, '$1==$2')}'?`,
        });
      }

      // Check for unbalanced quotes
      const singleQuotes = (condition.match(/'/g) || []).length;
      const doubleQuotes = (condition.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        errors.push({
          severity: 'error',
          code: 'CONDITION_SYNTAX_ERROR',
          message: `Unbalanced quotes in condition: '${condition}'`,
          lineNumber,
          instructionText: match[0],
          suggestion: 'Ensure all string values have matching opening and closing quotes.',
        });
      }
    }
  }

  /**
   * Check that required integrations are connected.
   */
  private static async validateIntegrationAvailability(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Map action types to required integrations
    const ACTION_INTEGRATIONS: Record<string, string> = {
      'send_email': 'gmail',
      'email': 'gmail',
      'linkedin_invite': 'linkedin',
      'linkedin': 'linkedin',
      'enrich_contact': 'apollo',
      'enrich': 'apollo',
    };

    // Detect actions in instructions
    const actionPatterns = [
      { pattern: /send\s+email/gi, integration: 'gmail' },
      { pattern: /linkedin\s+invit/gi, integration: 'linkedin' },
      { pattern: /enrich\s+contact/gi, integration: 'apollo' },
      { pattern: /slack\s+message/gi, integration: 'slack' },
    ];

    const requiredIntegrations = new Set<string>();

    for (const { pattern, integration } of actionPatterns) {
      if (pattern.test(ctx.instructions)) {
        requiredIntegrations.add(integration);
      }
    }

    // Also check parsedActions if available
    if (ctx.parsedActions) {
      for (const action of ctx.parsedActions) {
        const integration = ACTION_INTEGRATIONS[action.type];
        if (integration) {
          requiredIntegrations.add(integration);
        }
      }
    }

    // Check each required integration
    for (const integration of requiredIntegrations) {
      const credential = await IntegrationCredential.findOne({
        workspace: ctx.workspaceId,
        provider: integration,
        status: 'active'
      });

      if (!credential) {
        warnings.push({
          severity: 'warning',
          code: 'INTEGRATION_NOT_CONNECTED',
          message: `${integration.charAt(0).toUpperCase() + integration.slice(1)} integration not connected.`,
          suggestion: `Connect ${integration} in Settings > Integrations before going live.`,
          context: { integration },
        });
      } else if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
        warnings.push({
          severity: 'warning',
          code: 'INTEGRATION_EXPIRED',
          message: `${integration.charAt(0).toUpperCase() + integration.slice(1)} integration credentials have expired.`,
          suggestion: `Re-authorize ${integration} in Settings > Integrations.`,
          context: { integration, expiredAt: credential.expiresAt },
        });
      }
    }
  }

  /**
   * Estimate rate limit usage and warn if likely to exceed.
   */
  private static validateRateLimitEstimates(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // Count action occurrences
    const emailCount = (ctx.instructions.match(/send\s+email/gi) || []).length;
    const linkedInCount = (ctx.instructions.match(/linkedin\s+invit/gi) || []).length;

    // Also count from parsedActions if available
    let parsedEmailCount = 0;
    let parsedLinkedInCount = 0;

    if (ctx.parsedActions) {
      for (const action of ctx.parsedActions) {
        if (action.type === 'send_email' || action.type === 'email') {
          parsedEmailCount++;
        }
        if (action.type === 'linkedin_invite' || action.type === 'linkedin') {
          parsedLinkedInCount++;
        }
      }
    }

    const totalEmails = Math.max(emailCount, parsedEmailCount);
    const totalLinkedIn = Math.max(linkedInCount, parsedLinkedInCount);

    // Default limits from RESTRICTIONS_DEFAULTS
    const emailLimit = 100; // Default maxEmailsPerDay
    const linkedInLimit = 100; // Daily LinkedIn limit

    if (totalEmails > emailLimit) {
      warnings.push({
        severity: 'warning',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `This agent may send ${totalEmails} emails/day, exceeding limit of ${emailLimit}.`,
        suggestion: 'Consider reducing scope, batching executions, or increasing the limit in agent restrictions.',
        context: { estimatedEmails: totalEmails, limit: emailLimit },
      });
    } else if (totalEmails > emailLimit * 0.8) {
      warnings.push({
        severity: 'warning',
        code: 'DAILY_LIMIT_RISK',
        message: `This agent may send ${totalEmails} emails/day (${Math.round(totalEmails / emailLimit * 100)}% of limit).`,
        suggestion: 'Monitor execution frequency to avoid hitting daily limits.',
        context: { estimatedEmails: totalEmails, limit: emailLimit },
      });
    }

    if (totalLinkedIn > linkedInLimit) {
      warnings.push({
        severity: 'warning',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `This agent may send ${totalLinkedIn} LinkedIn invitations/day, exceeding limit of ${linkedInLimit}.`,
        suggestion: 'LinkedIn has strict daily limits. Consider reducing invitation frequency.',
        context: { estimatedInvitations: totalLinkedIn, limit: linkedInLimit },
      });
    }
  }

  /**
   * Helper: Get line number from character position.
   */
  private static getLineNumber(text: string, charIndex: number): number {
    const lines = text.slice(0, charIndex).split('\n');
    return lines.length;
  }
}
```

### API Endpoint Pattern

```typescript
// File: backend/src/routes/agentBuilder.ts (ADD to existing)

// POST /api/workspaces/:workspaceId/agents/:agentId/validate
router.post(
  '/:agentId/validate',
  requireAuth,
  requireWorkspaceAccess,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId, agentId } = req.params;

      const agent = await Agent.findOne({
        _id: agentId,
        workspace: workspaceId
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const result = await InstructionValidationService.validateInstructions({
        workspaceId,
        agentId,
        instructions: agent.instructions || '',
        parsedActions: agent.parsedActions || [],
        triggerType: agent.triggers?.[0]?.type
      });

      return res.json({
        success: true,
        validation: result
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  }
);
```

### Frontend Types

```typescript
// File: frontend/types/agent.ts (ADD)

// Story 2.4: Validation types
export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  lineNumber?: number;
  column?: number;
  instructionText?: string;
  suggestion?: string;
  context?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    validatedAt: string;
  };
}

export interface ValidateAgentResponse {
  success: boolean;
  validation: ValidationResult;
  error?: string;
}
```

### Frontend Component Structure

```tsx
// File: frontend/components/agents/ValidationResultsPanel.tsx

interface ValidationResultsPanelProps {
  validation: ValidationResult | null;
  isLoading: boolean;
  onIssueClick?: (issue: ValidationIssue) => void;
}

export function ValidationResultsPanel({
  validation,
  isLoading,
  onIssueClick
}: ValidationResultsPanelProps) {
  if (isLoading) {
    return <div className="flex items-center gap-2"><Spinner /> Validating...</div>;
  }

  if (!validation) return null;

  if (validation.valid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
        <CheckCircle className="h-5 w-5" />
        <span>Instructions validated successfully. No errors found.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className={cn(
        "p-3 rounded-lg flex items-center gap-2",
        validation.errors.length > 0 ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
      )}>
        {validation.errors.length > 0 ? (
          <>
            <XCircle className="h-5 w-5" />
            <span>{validation.summary.errorCount} error(s), {validation.summary.warningCount} warning(s)</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5" />
            <span>{validation.summary.warningCount} warning(s) found</span>
          </>
        )}
      </div>

      {/* Error list */}
      {validation.errors.map((error, i) => (
        <ValidationIssueCard
          key={`error-${i}`}
          issue={error}
          onClick={() => onIssueClick?.(error)}
        />
      ))}

      {/* Warning list */}
      {validation.warnings.map((warning, i) => (
        <ValidationIssueCard
          key={`warning-${i}`}
          issue={warning}
          onClick={() => onIssueClick?.(warning)}
        />
      ))}
    </div>
  );
}

function ValidationIssueCard({
  issue,
  onClick
}: {
  issue: ValidationIssue;
  onClick?: () => void;
}) {
  const isError = issue.severity === 'error';

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
        isError ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={cn("font-medium text-sm", isError ? "text-red-700" : "text-yellow-700")}>
            {issue.message}
          </p>
          {issue.lineNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Line {issue.lineNumber}
              {issue.instructionText && `: "${issue.instructionText.slice(0, 50)}..."`}
            </p>
          )}
          {issue.suggestion && (
            <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {issue.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Integration with Status Change

```typescript
// In status update handler (agentController.ts or frontend)

async function updateAgentStatus(agentId: string, newStatus: AgentStatus) {
  if (newStatus === 'Live') {
    // Validate before going live
    const validation = await validateAgentInstructions(workspaceId, agentId);

    if (validation.errors.length > 0) {
      // Block with errors
      throw new Error(
        `Cannot go live: ${validation.summary.errorCount} validation error(s). ` +
        `Fix errors before activating agent.`
      );
    }

    if (validation.warnings.length > 0) {
      // Require confirmation for warnings
      const confirmed = await showConfirmDialog({
        title: 'Validation Warnings',
        message: `Agent has ${validation.summary.warningCount} warning(s). Review warnings before going live.`,
        confirmLabel: 'Go Live Anyway',
        cancelLabel: 'Review Warnings'
      });

      if (!confirmed) {
        return; // User chose to review warnings
      }
    }
  }

  // Proceed with status update
  await updateAgent(agentId, { status: newStatus });
}
```

---

## Project Structure Notes

**Backend Files:**

```
backend/src/
├── services/
│   ├── InstructionValidationService.ts  [NEW] - Core validation logic
│   └── InstructionValidationService.test.ts  [NEW] - Tests
├── routes/
│   └── agentBuilder.ts  [UPDATE] - Add /validate endpoint
└── controllers/
    └── agentController.ts  [UPDATE] - Add validation controller method
```

**Frontend Files:**

```
frontend/
├── components/agents/
│   ├── ValidationResultsPanel.tsx  [NEW] - Validation results display
│   ├── ValidationInlineMarkers.tsx  [NEW] - Inline error highlighting
│   └── InstructionsEditor.tsx  [UPDATE] - Add Validate button
├── types/
│   └── agent.ts  [UPDATE] - Add validation types
└── lib/api/
    └── agents.ts  [UPDATE] - Add validateAgentInstructions function
```

---

## Previous Story Intelligence (Stories 2.1, 2.2, 2.3)

### Patterns Established:

1. **TestModeService Architecture** (`backend/src/services/TestModeService.ts`):
   - `simulateExecution()` returns `TestRunResult` with steps and warnings
   - Warnings array structure already exists - validation warnings should match
   - Action simulation pattern with context injection

2. **Frontend Types Pattern** (`frontend/types/agent.ts`):
   - TestStepStatus, StepIcon, StepPreview unions
   - TestStepResult interface with suggestions array
   - TestRunResponse interface with warnings

3. **Frontend Components**:
   - TestStepCard with expand/collapse pattern
   - TestSummaryBanner for status summary
   - Use Lucide icons (CheckCircle, AlertTriangle, XCircle)
   - Use shadcn/ui components (Collapsible, Badge, Card)

### Files Modified in Stories 2.1-2.3:

| File | Purpose | 2.4 Action |
|------|---------|------------|
| `backend/src/services/TestModeService.ts` | Test execution simulation | ADD validation call at start |
| `frontend/types/agent.ts` | TypeScript types | ADD validation types |
| `frontend/components/agents/TestModePanel.tsx` | Test mode UI | ADD validation display |

### Reusable Patterns:

- **Error suggestions pattern** from `TestModeService.getErrorSuggestions()`
- **Line number extraction** pattern from TestModeService
- **Warning/error severity icons** from TestStepCard
- **Expandable card pattern** from TestStepCard for validation issues

---

## Architecture Compliance Requirements

### Workspace Isolation

All validation queries MUST include workspace filter:

```typescript
// CORRECT
await EmailTemplate.findOne({ workspace: workspaceId, name: templateName });

// WRONG - missing workspace filter
await EmailTemplate.findOne({ name: templateName });
```

### Error Response Pattern

Follow existing error response pattern:

```typescript
// Standard error response
return res.status(400).json({
  success: false,
  error: 'Validation failed',
  validationErrors: result.errors
});
```

### Model References

Use existing models:

- `EmailTemplate` - For template validation
- `IntegrationCredential` - For integration availability
- `CustomFieldDefinition` - For custom field validation
- `Contact` / `Opportunity` - For standard field lists

---

## Testing Requirements

### Backend Tests

```typescript
describe('InstructionValidationService', () => {
  describe('validateTemplateReferences', () => {
    it('should return warning for non-existent template');
    it('should pass for existing template');
    it('should extract line number correctly');
  });

  describe('validateVariableReferences', () => {
    it('should error for undefined @contact.* variable');
    it('should pass for standard contact fields');
    it('should pass for custom fields defined in workspace');
    it('should error for @deal.* when custom field not defined');
  });

  describe('validateConditionSyntax', () => {
    it('should error for single = instead of ==');
    it('should error for unbalanced quotes');
    it('should pass for valid condition syntax');
    it('should suggest corrected syntax');
  });

  describe('validateIntegrationAvailability', () => {
    it('should warn when Gmail not connected for email action');
    it('should warn when LinkedIn not connected for invite action');
    it('should warn when credentials expired');
    it('should pass when all required integrations connected');
  });

  describe('validateRateLimitEstimates', () => {
    it('should warn when estimated emails exceed limit');
    it('should warn at 80% of limit');
    it('should not warn for low-volume agents');
  });
});
```

### Frontend Tests

```typescript
describe('ValidationResultsPanel', () => {
  it('should display success message when valid with no warnings');
  it('should display error count and list');
  it('should display warning count and list');
  it('should call onIssueClick when issue clicked');
  it('should show suggestions for each issue');
  it('should show line numbers when available');
});
```

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-02-safe-agent-testing.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#AI System Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#FR40]
- [Source: backend/src/services/TestModeService.ts - Error handling patterns]
- [Source: backend/src/validations/agentValidation.ts - Zod validation patterns]
- [Source: frontend/types/agent.ts - Type definitions]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None

### Completion Notes List

- Implementation completed for all 9 tasks and 25 subtasks
- All acceptance criteria (AC1-AC8) verified through code review
- Backend validation service: 564 lines, full coverage of template, variable, syntax, integration, and rate limit validation
- Frontend components: ValidationResultsPanel (161 lines), ValidationInlineMarkers (225 lines)
- Test coverage: Backend tests (405 lines), Frontend tests (859 lines total)
- AC8 "Go Live" flow implemented with warning confirmation dialog in AgentStatusControls

### File List

**NEW Files Created:**
- `backend/src/services/InstructionValidationService.ts` - Core validation service (564 lines)
- `backend/src/services/__tests__/InstructionValidationService.test.ts` - Backend unit tests (405 lines)
- `frontend/components/agents/ValidationResultsPanel.tsx` - Validation display component (161 lines)
- `frontend/components/agents/ValidationInlineMarkers.tsx` - Inline markers component (225 lines)
- `frontend/components/agents/__tests__/ValidationResultsPanel.test.tsx` - Frontend tests (443 lines)
- `frontend/components/agents/__tests__/ValidationInlineMarkers.test.tsx` - Frontend tests (416 lines)

**MODIFIED Files:**
- `backend/src/controllers/agentController.ts` - Added `validateAgent` controller method
- `backend/src/routes/agentBuilder.ts` - Added `/validate` POST endpoint
- `backend/src/services/TestModeService.ts` - Integrated validation at test start
- `frontend/components/agents/InstructionsEditor.tsx` - Added Validate button and results display
- `frontend/components/agents/AgentStatusControls.tsx` - Added AC8 validation before Go Live
- `frontend/lib/api/agents.ts` - Added `validateAgentInstructions()` function
- `frontend/types/agent.ts` - Added validation types (ValidationResult, ValidationIssue, etc.)
