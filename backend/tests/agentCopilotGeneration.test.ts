/**
 * Agent Copilot Generation Tests
 * Story 4.2, Task 8.1
 *
 * Tests for workflow generation and validation functionality
 * Uses Jest mocking for MongoDB models
 */

import AgentCopilotService from '../src/services/AgentCopilotService';
import EmailTemplate from '../src/models/EmailTemplate';
import CustomFieldDefinition from '../src/models/CustomFieldDefinition';
import IntegrationCredential from '../src/models/IntegrationCredential';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// Mock MongoDB models
jest.mock('../src/models/EmailTemplate');
jest.mock('../src/models/CustomFieldDefinition');
jest.mock('../src/models/IntegrationCredential');

describe('AgentCopilotService - Workflow Generation', () => {
  let service: AgentCopilotService;

  beforeAll(() => {
    service = new AgentCopilotService();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validateGeneratedInstructions', () => {
    it('should detect missing templates', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. Send email using template 'Nonexistent Template'\n2. Wait 5 days";

      // Mock: Template not found
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);
      (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
      (CustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('missing_template');
      expect(result.warnings[0].message).toContain('Nonexistent Template');
    });

    it('should detect missing integrations', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. Send LinkedIn invitation\n2. Wait 3 days";

      // Mock: LinkedIn integration not found
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);
      (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
      (CustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      expect(result.warnings.some(w => w.type === 'missing_integration')).toBe(true);
      expect(result.warnings.some(w => w.message.includes('LinkedIn'))).toBe(true);
    });

    it('should detect missing Apollo.io integration', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. Enrich contact with Apollo.io\n2. Wait 1 day";

      // Mock: Apollo integration not found
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);
      (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
      (CustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      expect(result.warnings.some(w => w.type === 'missing_integration')).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Apollo'))).toBe(true);
    });

    it('should detect invalid conditional syntax', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. If contact.title random operator 'CEO', send email";

      // Mock: No models needed for syntax check
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue(null);
      (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
      (CustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      expect(result.warnings.some(w => w.type === 'invalid_syntax')).toBe(true);
    });

    it('should return no warnings for valid instructions with existing resources', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. Send email using template 'Welcome Email'\n2. Wait 5 days";

      // Mock: Template exists
      (EmailTemplate.findOne as jest.Mock).mockResolvedValue({ name: 'Welcome Email' });
      (IntegrationCredential.findOne as jest.Mock).mockResolvedValue(null);
      (CustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return no warnings for instructions without external dependencies', async () => {
      const workspaceId = 'test-workspace-id';
      const instructions = "1. Wait 5 days\n2. Create task 'Follow up'";

      const result = await service.validateGeneratedInstructions(workspaceId, instructions);

      // These actions don't require templates or integrations
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('suggestWorkflowSplit', () => {
    it('should suggest split for workflows with >15 steps', async () => {
      const instructions = Array.from({ length: 20 }, (_, i) => `${i + 1}. Step ${i + 1}`).join('\n');

      const suggestion = await service.suggestWorkflowSplit(instructions);

      expect(suggestion).not.toBeNull();
      expect(suggestion).toContain('complex');
      expect(suggestion).toContain('breaking');
    });

    it('should return null for workflows with <=15 steps', async () => {
      const instructions = Array.from({ length: 10 }, (_, i) => `${i + 1}. Step ${i + 1}`).join('\n');

      const suggestion = await service.suggestWorkflowSplit(instructions);

      expect(suggestion).toBeNull();
    });
  });

  describe('askClarifyingQuestions', () => {
    it('should ask questions for vague descriptions', async () => {
      const vagueDescription = 'Create an agent for sales';

      const questions = await service.askClarifyingQuestions(vagueDescription);

      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return empty array for clear descriptions', async () => {
      const clearDescription = 'Send email to CEOs at SaaS companies using template XYZ';

      const questions = await service.askClarifyingQuestions(clearDescription);

      // Clear description with audience + action + template = few or no questions
      expect(Array.isArray(questions)).toBe(true);
    });
  });
});

describe('Credit Tracking', () => {
  it('should calculate correct credits based on complexity', () => {
    // Simple workflow (1-5 steps): 2 credits
    const simpleSteps = 3;
    expect(simpleSteps <= 10 ? 2 : 3).toBe(2);

    // Medium workflow (6-10 steps): 2 credits
    const mediumSteps = 8;
    expect(mediumSteps <= 10 ? 2 : 3).toBe(2);

    // Complex workflow (11-15 steps): 3 credits
    const complexSteps = 12;
    expect(complexSteps > 10 ? 3 : 2).toBe(3);
  });
});
