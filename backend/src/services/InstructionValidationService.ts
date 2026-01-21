/**
 * InstructionValidationService.ts - Story 2.4: Validate Instructions
 *
 * Validates agent instructions for common errors before execution.
 * Checks template references, variable usage, syntax, integrations, and rate limits.
 */

import EmailTemplate from '../models/EmailTemplate';
import IntegrationCredential from '../models/IntegrationCredential';
import CustomFieldDefinition from '../models/CustomFieldDefinition';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

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

export interface ValidationContext {
  workspaceId: string;
  agentId: string;
  instructions: string;
  parsedActions?: ParsedAction[];
  triggerType?: string;
  restrictions?: {
    maxEmailsPerDay?: number;
    maxExecutionsPerDay?: number;
  };
}

interface ParsedAction {
  type: string;
  params?: Record<string, any>;
  [key: string]: any;
}

// Validation codes for each check type
export const VALIDATION_CODES = {
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

// Standard fields that are always available
const STANDARD_CONTACT_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'title', 'company',
  'linkedInUrl', 'tags', 'status', 'source', 'createdAt', 'updatedAt',
  'name', 'fullName', 'id', '_id'
];

const STANDARD_DEAL_FIELDS = [
  'name', 'value', 'stage', 'owner', 'company', 'contact',
  'probability', 'closeDate', 'createdAt', 'updatedAt', 'id', '_id'
];

// Map action types to required integrations
const ACTION_INTEGRATIONS: Record<string, string> = {
  'send_email': 'gmail',
  'email': 'gmail',
  'linkedin_invite': 'linkedin',
  'linkedin': 'linkedin',
  'enrich_contact': 'apollo',
  'enrich': 'apollo',
  'slack_message': 'slack',
  'slack': 'slack',
};

// =============================================================================
// MAIN SERVICE
// =============================================================================

export class InstructionValidationService {
  /**
   * Validate agent instructions for common errors before execution.
   */
  static async validateInstructions(
    ctx: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Check for empty instructions
    if (!ctx.instructions || ctx.instructions.trim().length === 0) {
      warnings.push({
        severity: 'warning',
        code: VALIDATION_CODES.INSTRUCTION_EMPTY,
        message: 'Instructions are empty.',
        suggestion: 'Add instructions to define what this agent should do.',
      });

      return {
        valid: true,
        errors,
        warnings,
        summary: {
          errorCount: 0,
          warningCount: warnings.length,
          validatedAt: new Date().toISOString(),
        },
      };
    }

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
   * AC2: Missing Template Warning
   */
  private static async validateTemplateReferences(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Extract template references from instructions
    // Patterns: "using template 'name'", "template: name", "Send Email using 'name'"
    const templatePatterns = [
      /using\s+template\s+['"]([^'"]+)['"]/gi,
      /template:\s*['"]?([^'"\n,]+)['"]?/gi,
      /send\s+email\s+(?:using|with)\s+['"]([^'"]+)['"]/gi,
    ];

    const foundTemplates = new Set<string>();
    const templateMatches: Array<{ name: string; match: string; index: number }> = [];

    for (const pattern of templatePatterns) {
      let match;
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;

      while ((match = pattern.exec(ctx.instructions)) !== null) {
        const templateName = match[1].trim();
        if (templateName && !foundTemplates.has(templateName.toLowerCase())) {
          foundTemplates.add(templateName.toLowerCase());
          templateMatches.push({
            name: templateName,
            match: match[0],
            index: match.index,
          });
        }
      }
    }

    // Check each template exists in workspace
    for (const tmpl of templateMatches) {
      const lineNumber = this.getLineNumber(ctx.instructions, tmpl.index);

      try {
        const template = await EmailTemplate.findOne({
          workspaceId: ctx.workspaceId,
          name: { $regex: new RegExp(`^${this.escapeRegex(tmpl.name)}$`, 'i') }
        });

        if (!template) {
          warnings.push({
            severity: 'warning',
            code: VALIDATION_CODES.TEMPLATE_NOT_FOUND,
            message: `Email template '${tmpl.name}' not found.`,
            lineNumber,
            instructionText: tmpl.match,
            suggestion: `Create template '${tmpl.name}' in Settings > Email Templates or update instruction to use an existing template.`,
            context: { templateName: tmpl.name },
          });
        }
      } catch (err) {
        // Database error - skip validation for this template
        console.error('Template validation error:', err);
      }
    }
  }

  /**
   * Check that all @variable references are valid.
   * AC3: Undefined Variable Error
   */
  private static async validateVariableReferences(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Extract variable references: @contact.field, @deal.field, @workspace.field
    const variableRegex = /@(\w+)\.(\w+)/g;
    let match;

    // Load workspace custom fields for validation
    let contactCustomFields: string[] = [];
    let dealCustomFields: string[] = [];

    try {
      const customFields = await CustomFieldDefinition.find({
        workspaceId: ctx.workspaceId,
        isActive: true,
      }).lean();

      contactCustomFields = customFields
        .filter(f => f.entityType === 'contact')
        .map(f => f.fieldKey);

      // Note: CustomFieldDefinition uses 'company' not 'deal', but we'll check both
      dealCustomFields = customFields
        .filter(f => f.entityType === 'company')
        .map(f => f.fieldKey);
    } catch (err) {
      // If we can't load custom fields, continue with standard fields only
      console.error('Custom fields load error:', err);
    }

    const validatedVariables = new Set<string>();

    while ((match = variableRegex.exec(ctx.instructions)) !== null) {
      const [fullMatch, entity, field] = match;
      const varKey = `${entity}.${field}`.toLowerCase();

      // Skip if already validated
      if (validatedVariables.has(varKey)) {
        continue;
      }
      validatedVariables.add(varKey);

      const lineNumber = this.getLineNumber(ctx.instructions, match.index);

      let isValid = false;
      let suggestion = '';

      const entityLower = entity.toLowerCase();

      if (entityLower === 'contact') {
        isValid = STANDARD_CONTACT_FIELDS.includes(field) ||
                  contactCustomFields.includes(field) ||
                  contactCustomFields.includes(`custom_${field}`);
        suggestion = `Available contact fields: ${STANDARD_CONTACT_FIELDS.slice(0, 5).join(', ')}... or add custom field '${field}'.`;
      } else if (entityLower === 'deal' || entityLower === 'opportunity') {
        isValid = STANDARD_DEAL_FIELDS.includes(field) ||
                  dealCustomFields.includes(field) ||
                  dealCustomFields.includes(`custom_${field}`);
        suggestion = `Available deal fields: ${STANDARD_DEAL_FIELDS.slice(0, 5).join(', ')}... or add custom field '${field}'.`;
      } else if (entityLower === 'workspace' || entityLower === 'current' || entityLower === 'agent') {
        // These are always valid system variables
        isValid = true;
      }

      if (!isValid) {
        errors.push({
          severity: 'error',
          code: VALIDATION_CODES.VARIABLE_UNDEFINED,
          message: `Variable ${fullMatch} is not defined.`,
          lineNumber,
          instructionText: fullMatch,
          suggestion,
          context: { entity, field },
        });
      }
    }
  }

  /**
   * Check conditional syntax for common errors.
   * AC4: Syntax Error Detection
   */
  private static validateConditionSyntax(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // Pattern: If/When conditions
    const conditionPatterns = [
      /(?:if|when)\s+(.+?)(?:\s*:|then|,|\n)/gi,
      /(?:if|when)\s+(.+?)$/gim,
    ];

    const processedConditions = new Set<string>();

    for (const pattern of conditionPatterns) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(ctx.instructions)) !== null) {
        const condition = match[1].trim();

        // Skip if already processed or too short
        if (!condition || condition.length < 3 || processedConditions.has(condition)) {
          continue;
        }
        processedConditions.add(condition);

        const lineNumber = this.getLineNumber(ctx.instructions, match.index);

        // Check for single = instead of == (but not !=, >=, <=)
        // Pattern: not preceded by !, <, >, = and not followed by =
        const singleEqualsRegex = /(?<![!<>=])=(?!=)/;
        if (singleEqualsRegex.test(condition)) {
          const corrected = condition.replace(/(?<![!<>=])=(?!=)/g, '==');
          errors.push({
            severity: 'error',
            code: VALIDATION_CODES.CONDITION_SYNTAX_ERROR,
            message: `Invalid condition syntax: '${condition}' (use == for comparison)`,
            lineNumber,
            instructionText: match[0].trim(),
            suggestion: `Did you mean: '${corrected}'?`,
            context: { condition, corrected },
          });
        }

        // Check for unbalanced quotes
        const singleQuotes = (condition.match(/'/g) || []).length;
        const doubleQuotes = (condition.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
          errors.push({
            severity: 'error',
            code: VALIDATION_CODES.CONDITION_SYNTAX_ERROR,
            message: `Unbalanced quotes in condition: '${condition}'`,
            lineNumber,
            instructionText: match[0].trim(),
            suggestion: 'Ensure all string values have matching opening and closing quotes.',
            context: { condition, singleQuotes, doubleQuotes },
          });
        }

        // Check for unbalanced parentheses
        const openParens = (condition.match(/\(/g) || []).length;
        const closeParens = (condition.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          errors.push({
            severity: 'error',
            code: VALIDATION_CODES.CONDITION_SYNTAX_ERROR,
            message: `Unbalanced parentheses in condition: '${condition}'`,
            lineNumber,
            instructionText: match[0].trim(),
            suggestion: 'Ensure all parentheses have matching opening and closing pairs.',
            context: { condition, openParens, closeParens },
          });
        }
      }
    }
  }

  /**
   * Check that required integrations are connected.
   * AC5: Integration Availability Check
   */
  private static async validateIntegrationAvailability(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): Promise<void> {
    // Detect actions in instructions
    const actionPatterns = [
      { pattern: /send\s+email/gi, integration: 'gmail' },
      { pattern: /linkedin\s+invit/gi, integration: 'linkedin' },
      { pattern: /enrich\s+(?:contact|data)/gi, integration: 'apollo' },
      { pattern: /slack\s+(?:message|notify)/gi, integration: 'slack' },
      { pattern: /google\s+sheets?/gi, integration: 'google_sheets' },
      { pattern: /calendar\s+(?:event|meeting)/gi, integration: 'calendar' },
    ];

    const requiredIntegrations = new Set<string>();

    for (const { pattern, integration } of actionPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(ctx.instructions)) {
        requiredIntegrations.add(integration);
      }
    }

    // Also check parsedActions if available
    if (ctx.parsedActions) {
      for (const action of ctx.parsedActions) {
        const integration = ACTION_INTEGRATIONS[action.type?.toLowerCase()];
        if (integration) {
          requiredIntegrations.add(integration);
        }
      }
    }

    // Check each required integration
    for (const integration of requiredIntegrations) {
      try {
        const credential = await IntegrationCredential.findOne({
          workspaceId: ctx.workspaceId,
          type: integration,
          isValid: true,
        });

        const integrationName = this.formatIntegrationName(integration);

        if (!credential) {
          warnings.push({
            severity: 'warning',
            code: VALIDATION_CODES.INTEGRATION_NOT_CONNECTED,
            message: `${integrationName} integration not connected.`,
            suggestion: `Connect ${integrationName} in Settings > Integrations before going live.`,
            context: { integration },
          });
        }
      } catch (err) {
        // Database error - skip validation for this integration
        console.error('Integration validation error:', err);
      }
    }
  }

  /**
   * Estimate rate limit usage and warn if likely to exceed.
   * AC6: Rate Limit Estimation Warning
   */
  private static validateRateLimitEstimates(
    ctx: ValidationContext,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // Count action occurrences in instructions
    const emailMatches = ctx.instructions.match(/send\s+email/gi) || [];
    const linkedInMatches = ctx.instructions.match(/linkedin\s+invit/gi) || [];

    // Also count from parsedActions if available
    let parsedEmailCount = 0;
    let parsedLinkedInCount = 0;

    if (ctx.parsedActions) {
      for (const action of ctx.parsedActions) {
        const actionType = action.type?.toLowerCase();
        if (actionType === 'send_email' || actionType === 'email') {
          parsedEmailCount++;
        }
        if (actionType === 'linkedin_invite' || actionType === 'linkedin') {
          parsedLinkedInCount++;
        }
      }
    }

    const totalEmails = Math.max(emailMatches.length, parsedEmailCount);
    const totalLinkedIn = Math.max(linkedInMatches.length, parsedLinkedInCount);

    // Use agent restrictions if available, otherwise use defaults
    const emailLimit = ctx.restrictions?.maxEmailsPerDay || 100;
    const linkedInLimit = 100; // LinkedIn daily limit (platform-imposed)

    // Email rate limit check
    if (totalEmails > emailLimit) {
      warnings.push({
        severity: 'warning',
        code: VALIDATION_CODES.RATE_LIMIT_EXCEEDED,
        message: `This agent may send ${totalEmails} emails/day, exceeding limit of ${emailLimit}.`,
        suggestion: 'Consider reducing scope, batching executions, or increasing the limit in agent restrictions.',
        context: { estimatedEmails: totalEmails, limit: emailLimit },
      });
    } else if (totalEmails > 0 && totalEmails > emailLimit * 0.8) {
      warnings.push({
        severity: 'warning',
        code: VALIDATION_CODES.DAILY_LIMIT_RISK,
        message: `This agent may send ${totalEmails} emails/day (${Math.round(totalEmails / emailLimit * 100)}% of limit).`,
        suggestion: 'Monitor execution frequency to avoid hitting daily limits.',
        context: { estimatedEmails: totalEmails, limit: emailLimit },
      });
    }

    // LinkedIn rate limit check
    if (totalLinkedIn > linkedInLimit) {
      warnings.push({
        severity: 'warning',
        code: VALIDATION_CODES.RATE_LIMIT_EXCEEDED,
        message: `This agent may send ${totalLinkedIn} LinkedIn invitations/day, exceeding limit of ${linkedInLimit}.`,
        suggestion: 'LinkedIn has strict daily limits. Consider reducing invitation frequency.',
        context: { estimatedInvitations: totalLinkedIn, limit: linkedInLimit },
      });
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get line number from character position in text.
   */
  private static getLineNumber(text: string, charIndex: number): number {
    const lines = text.slice(0, charIndex).split('\n');
    return lines.length;
  }

  /**
   * Escape special regex characters in a string.
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Format integration name for display.
   */
  private static formatIntegrationName(integration: string): string {
    const names: Record<string, string> = {
      gmail: 'Gmail',
      linkedin: 'LinkedIn',
      apollo: 'Apollo.io',
      slack: 'Slack',
      google_sheets: 'Google Sheets',
      calendar: 'Google Calendar',
    };
    return names[integration] || integration.charAt(0).toUpperCase() + integration.slice(1);
  }
}

export default InstructionValidationService;
