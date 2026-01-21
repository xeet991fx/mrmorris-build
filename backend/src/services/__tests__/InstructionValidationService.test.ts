/**
 * InstructionValidationService.test.ts - Story 2.4: Validate Instructions
 *
 * Tests for instruction validation service covering:
 * - Template existence validation (AC2)
 * - Variable reference validation (AC3)
 * - Conditional syntax validation (AC4)
 * - Integration availability validation (AC5)
 * - Rate limit estimation validation (AC6)
 * - Success validation (AC7)
 */

// Mock models before importing the service
jest.mock('../../models/EmailTemplate', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/IntegrationCredential', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/CustomFieldDefinition', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  },
}));

import InstructionValidationService, {
  ValidationContext,
  VALIDATION_CODES,
} from '../InstructionValidationService';
import EmailTemplate from '../../models/EmailTemplate';
import IntegrationCredential from '../../models/IntegrationCredential';
import CustomFieldDefinition from '../../models/CustomFieldDefinition';

const mockEmailTemplate = EmailTemplate as jest.Mocked<typeof EmailTemplate>;
const mockIntegrationCredential = IntegrationCredential as jest.Mocked<typeof IntegrationCredential>;
const mockCustomFieldDefinition = CustomFieldDefinition as jest.Mocked<typeof CustomFieldDefinition>;

describe('InstructionValidationService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';

  const createContext = (instructions: string, overrides?: Partial<ValidationContext>): ValidationContext => ({
    workspaceId,
    agentId,
    instructions,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock returns
    (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue(null);
    (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
    (mockCustomFieldDefinition.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  describe('validateInstructions - general', () => {
    it('should return valid result for empty instructions with warning', async () => {
      const ctx = createContext('');

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(VALIDATION_CODES.INSTRUCTION_EMPTY);
    });

    it('should return success for valid instructions (AC7)', async () => {
      // Mock template exists
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue({ name: 'Welcome Email' });
      // Mock integration exists
      (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue({ type: 'gmail', isValid: true });

      const ctx = createContext(`
        1. Find contacts where title contains "CEO"
        2. Send email using template "Welcome Email"
        3. Use @contact.firstName in personalization
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTemplateReferences (AC2)', () => {
    it('should return warning for non-existent template', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

      const ctx = createContext(`
        Send email using template "Outbound v2"
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.some(w => w.code === VALIDATION_CODES.TEMPLATE_NOT_FOUND)).toBe(true);
      expect(result.warnings.find(w => w.code === VALIDATION_CODES.TEMPLATE_NOT_FOUND)?.message)
        .toContain('Outbound v2');
    });

    it('should pass for existing template', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue({ name: 'Outbound v2' });
      (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue({ type: 'gmail', isValid: true });

      const ctx = createContext(`
        Send email using template "Outbound v2"
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.filter(w => w.code === VALIDATION_CODES.TEMPLATE_NOT_FOUND)).toHaveLength(0);
    });

    it('should extract line number correctly', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

      const ctx = createContext(`Line 1
Line 2
Send email using template "Missing Template"
Line 4`);

      const result = await InstructionValidationService.validateInstructions(ctx);

      const templateWarning = result.warnings.find(w => w.code === VALIDATION_CODES.TEMPLATE_NOT_FOUND);
      expect(templateWarning?.lineNumber).toBe(3);
    });
  });

  describe('validateVariableReferences (AC3)', () => {
    it('should error for undefined @contact.* variable', async () => {
      const ctx = createContext(`
        Send email with @contact.customField1 in the body
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.some(e => e.code === VALIDATION_CODES.VARIABLE_UNDEFINED)).toBe(true);
      expect(result.errors.find(e => e.code === VALIDATION_CODES.VARIABLE_UNDEFINED)?.message)
        .toContain('@contact.customField1');
    });

    it('should pass for standard contact fields', async () => {
      const ctx = createContext(`
        Send email to @contact.email with @contact.firstName @contact.lastName
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.filter(e => e.code === VALIDATION_CODES.VARIABLE_UNDEFINED)).toHaveLength(0);
    });

    it('should pass for custom fields defined in workspace', async () => {
      (mockCustomFieldDefinition.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { entityType: 'contact', fieldKey: 'custom_industry' }
        ]),
      });

      const ctx = createContext(`
        Filter by @contact.custom_industry
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.filter(e => e.code === VALIDATION_CODES.VARIABLE_UNDEFINED)).toHaveLength(0);
    });

    it('should pass for @workspace and @current variables', async () => {
      const ctx = createContext(`
        Use @workspace.name and @current.user
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.filter(e => e.code === VALIDATION_CODES.VARIABLE_UNDEFINED)).toHaveLength(0);
    });

    it('should error for @deal.* when custom field not defined', async () => {
      const ctx = createContext(`
        Check @deal.customStage value
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.some(e =>
        e.code === VALIDATION_CODES.VARIABLE_UNDEFINED &&
        e.message.includes('@deal.customStage')
      )).toBe(true);
    });
  });

  describe('validateConditionSyntax (AC4)', () => {
    it('should error for single = instead of ==', async () => {
      const ctx = createContext(`
        If contact.replied = true then send email
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.some(e => e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR)).toBe(true);
      expect(result.errors.find(e => e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR)?.suggestion)
        .toContain('==');
    });

    it('should error for unbalanced quotes', async () => {
      const ctx = createContext(`
        If contact.status == "active then proceed
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.some(e =>
        e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR &&
        e.message.includes('Unbalanced quotes')
      )).toBe(true);
    });

    it('should pass for valid condition syntax', async () => {
      const ctx = createContext(`
        If contact.replied == true then send follow-up
        When deal.value >= 10000: notify sales
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.filter(e => e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR)).toHaveLength(0);
    });

    it('should suggest corrected syntax', async () => {
      const ctx = createContext(`
        if contact.status = "active":
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      const syntaxError = result.errors.find(e => e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR);
      expect(syntaxError?.suggestion).toMatch(/Did you mean.*==/);
    });

    it('should error for unbalanced parentheses', async () => {
      const ctx = createContext(`
        If (contact.replied == true then send email
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.errors.some(e =>
        e.code === VALIDATION_CODES.CONDITION_SYNTAX_ERROR &&
        e.message.includes('Unbalanced parentheses')
      )).toBe(true);
    });
  });

  describe('validateIntegrationAvailability (AC5)', () => {
    it('should warn when Gmail not connected for email action', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);

      const ctx = createContext(`
        Send email to the contact
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.some(w =>
        w.code === VALIDATION_CODES.INTEGRATION_NOT_CONNECTED &&
        w.message.includes('Gmail')
      )).toBe(true);
    });

    it('should warn when LinkedIn not connected for invite action', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);

      const ctx = createContext(`
        Send LinkedIn invitation to @contact.linkedInUrl
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.some(w =>
        w.code === VALIDATION_CODES.INTEGRATION_NOT_CONNECTED &&
        w.message.includes('LinkedIn')
      )).toBe(true);
    });

    it('should pass when all required integrations connected', async () => {
      (mockIntegrationCredential.findOne as jest.Mock).mockResolvedValue({ type: 'gmail', isValid: true });

      const ctx = createContext(`
        Send email to the contact
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.filter(w => w.code === VALIDATION_CODES.INTEGRATION_NOT_CONNECTED)).toHaveLength(0);
    });
  });

  describe('validateRateLimitEstimates (AC6)', () => {
    it('should warn when estimated emails exceed limit', async () => {
      // Create instructions that exceed rate limit
      const emailLines = Array(150).fill('Send email to contact').join('\n');
      const ctx = createContext(emailLines, {
        restrictions: { maxEmailsPerDay: 100 }
      });

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.some(w => w.code === VALIDATION_CODES.RATE_LIMIT_EXCEEDED)).toBe(true);
    });

    it('should warn at 80% of limit', async () => {
      // Create instructions at 85% of limit
      const emailLines = Array(85).fill('Send email to contact').join('\n');
      const ctx = createContext(emailLines, {
        restrictions: { maxEmailsPerDay: 100 }
      });

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.some(w => w.code === VALIDATION_CODES.DAILY_LIMIT_RISK)).toBe(true);
    });

    it('should not warn for low-volume agents', async () => {
      const ctx = createContext(`
        Send email to contact
        Wait 5 days
        Send follow-up email
      `, {
        restrictions: { maxEmailsPerDay: 100 }
      });

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.warnings.filter(w =>
        w.code === VALIDATION_CODES.RATE_LIMIT_EXCEEDED ||
        w.code === VALIDATION_CODES.DAILY_LIMIT_RISK
      )).toHaveLength(0);
    });
  });

  describe('validation result structure', () => {
    it('should include summary with counts and timestamp', async () => {
      const ctx = createContext(`
        Send email using template "Missing"
        Check @contact.unknownField
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary.errorCount).toBe('number');
      expect(typeof result.summary.warningCount).toBe('number');
      expect(result.summary.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should set valid to false when errors exist', async () => {
      const ctx = createContext(`
        If contact.status = "active":
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should set valid to true when only warnings exist', async () => {
      const ctx = createContext(`
        Send email using template "Missing Template"
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include suggestion in validation issues', async () => {
      const ctx = createContext(`
        Send email using template "Missing Template"
      `);

      const result = await InstructionValidationService.validateInstructions(ctx);

      const templateWarning = result.warnings.find(w => w.code === VALIDATION_CODES.TEMPLATE_NOT_FOUND);
      expect(templateWarning?.suggestion).toBeDefined();
      expect(templateWarning?.suggestion).toContain('Settings');
    });
  });
});
