/**
 * InstructionParserService Tests - Story 3.1: Parse and Execute Instructions
 *
 * Tests for natural language instruction parsing:
 * - AC1: Instruction Parsing with Structured Output
 * - AC3: Sales-Specific Parsing Intelligence
 * - AC4: Parsing Error Handling
 */

import InstructionParserService, { ParseResult, ActionType } from './InstructionParserService';

// Mock LangChain
jest.mock('@langchain/google-vertexai', () => ({
  ChatVertexAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

import { ChatVertexAI } from '@langchain/google-vertexai';

const mockChatVertexAI = ChatVertexAI as jest.MockedClass<typeof ChatVertexAI>;

describe('InstructionParserService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear parse cache between tests
    InstructionParserService.clearCache();
  });

  // ==========================================================================
  // Empty/Invalid Input Tests
  // ==========================================================================

  describe('Empty and Invalid Inputs', () => {
    it('should return error for empty instructions', async () => {
      const result = await InstructionParserService.parseInstructions('', workspaceId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
      expect(result.actions).toHaveLength(0);
    });

    it('should return error for whitespace-only instructions', async () => {
      const result = await InstructionParserService.parseInstructions('   \n\t  ', workspaceId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  // ==========================================================================
  // Parsing Success Tests
  // ==========================================================================

  describe('Successful Parsing', () => {
    it('should parse simple send_email instruction', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'send_email', to: '@contact.email', subject: 'Hello', body: 'Test', order: 1 },
        ]),
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Send an email to the contact',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('send_email');
    });

    it('should parse multi-step workflow', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'search', target: 'contacts', field: 'title', operator: 'contains', value: 'CEO', order: 1 },
          { type: 'send_email', to: '@contact.email', subject: 'Hello CEO', body: 'Dear @contact.firstName', order: 2 },
          { type: 'add_tag', tag: 'contacted', order: 3 },
        ]),
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Find all CEOs, send them an email, and tag them as contacted',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(3);
      expect(result.actions[0].type).toBe('search');
      expect(result.actions[1].type).toBe('send_email');
      expect(result.actions[2].type).toBe('add_tag');
    });

    it('should parse conditional instructions', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            type: 'conditional',
            condition: 'contact.title contains CEO',
            trueBranch: [{ type: 'send_email', to: '@contact.email', subject: 'For CEO', order: 1 }],
            falseBranch: [{ type: 'add_tag', tag: 'non-executive', order: 1 }],
            order: 1,
          },
        ]),
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'If contact is a CEO, send email. Otherwise tag as non-executive.',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('conditional');
      expect(result.actions[0].trueBranch).toHaveLength(1);
      expect(result.actions[0].falseBranch).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Type Mapping Tests
  // ==========================================================================

  describe('Action Type Mapping', () => {
    it('should map "email" to "send_email"', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'email', to: 'test@example.com', order: 1 },
        ]),
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Email the contact',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions[0].type).toBe('send_email');
    });

    it('should map "delay" to "wait"', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'delay', duration: 1, unit: 'days', order: 1 },
        ]),
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Wait for 1 day',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions[0].type).toBe('wait');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        content: 'This is not valid JSON',
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Some instructions',
        workspaceId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to parse');
    });

    it('should handle API errors gracefully', async () => {
      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Some instructions',
        workspaceId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to parse');
    });

    it('should handle markdown code blocks in response', async () => {
      const mockResponse = {
        content: '```json\n[{"type": "send_email", "to": "test@test.com", "order": 1}]\n```',
      };

      mockChatVertexAI.mockImplementation(() => ({
        invoke: jest.fn().mockResolvedValue(mockResponse),
      }) as any);

      const result = await InstructionParserService.parseInstructions(
        'Send email',
        workspaceId
      );

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Caching Tests
  // ==========================================================================

  describe('Parse Result Caching', () => {
    it('should return cached result for identical instructions', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'send_email', to: 'test@test.com', order: 1 },
        ]),
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockResponse);
      mockChatVertexAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }) as any);

      // First call
      await InstructionParserService.parseInstructions('Send email', workspaceId);

      // Second call with same instructions
      await InstructionParserService.parseInstructions('Send email', workspaceId);

      // Should only have called the API once
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should not cache different instructions', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { type: 'send_email', to: 'test@test.com', order: 1 },
        ]),
      };

      const mockInvoke = jest.fn().mockResolvedValue(mockResponse);
      mockChatVertexAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }) as any);

      await InstructionParserService.parseInstructions('Send email', workspaceId);
      await InstructionParserService.parseInstructions('Add tag', workspaceId);

      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validateActions', () => {
    it('should pass validation for valid send_email action', () => {
      const actions = [
        { type: 'send_email' as ActionType, to: 'test@test.com', order: 1 },
      ];

      const result = InstructionParserService.validateActions(actions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for send_email without recipient', () => {
      const actions = [
        { type: 'send_email' as ActionType, subject: 'Hello', order: 1 },
      ];

      const result = InstructionParserService.validateActions(actions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Missing recipient'));
    });

    it('should fail validation for add_tag without tag name', () => {
      const actions = [
        { type: 'add_tag' as ActionType, order: 1 },
      ];

      const result = InstructionParserService.validateActions(actions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Missing tag'));
    });

    it('should default search target to contacts', () => {
      const actions = [
        { type: 'search' as ActionType, field: 'title', value: 'CEO', order: 1 },
      ];

      InstructionParserService.validateActions(actions);
      expect(actions[0].target).toBe('contacts');
    });
  });
});
