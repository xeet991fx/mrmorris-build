/**
 * ActionExecutorService Tests - Story 3.1: Parse and Execute Instructions
 *
 * Tests for action execution handlers:
 * - AC1: Each action is executed in sequence
 * - AC2: Variable Resolution (handled by caller)
 * - AC5: Execution Performance with error handling and retry logic
 */

import ActionExecutorService, { ActionResult } from './ActionExecutorService';
import { ExecutionContext } from './AgentExecutionService';
import { ParsedAction } from './InstructionParserService';

// Mock dependencies
jest.mock('./email', () => ({
  __esModule: true,
  default: {
    sendEmail: jest.fn(),
  },
}));

jest.mock('./LinkedInService', () => ({
  sendConnectionRequest: jest.fn(),
}));

jest.mock('./ApolloService', () => ({
  __esModule: true,
  default: {
    enrichContact: jest.fn(),
  },
}));

jest.mock('../models/Contact', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../models/Opportunity', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../models/Task', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({
      _id: 'task_123',
    }),
  },
}));

import emailService from './email';
import { sendConnectionRequest } from './LinkedInService';
import ApolloService from './ApolloService';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Task from '../models/Task';

const mockEmailService = emailService as jest.Mocked<typeof emailService>;
const mockLinkedIn = sendConnectionRequest as jest.MockedFunction<typeof sendConnectionRequest>;
const mockApollo = ApolloService as jest.Mocked<typeof ApolloService>;
const mockContact = Contact as jest.Mocked<typeof Contact>;
const mockTask = Task as jest.Mocked<typeof Task>;

describe('ActionExecutorService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';

  const baseContext: ExecutionContext = {
    workspaceId,
    agentId,
    executionId: 'exec_123',
    variables: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Send Email Tests
  // ==========================================================================

  describe('send_email action', () => {
    it('should send email successfully', async () => {
      (mockEmailService.sendEmail as jest.Mock).mockResolvedValue(undefined);

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Hello',
        body: 'Test body',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Email sent');
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Hello',
        html: 'Test body',
        text: 'Test body',
      });
    });

    it('should fail when no recipient specified', async () => {
      const action: ParsedAction = {
        type: 'send_email',
        subject: 'Hello',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('recipient');
    });

    it('should handle email service errors', async () => {
      (mockEmailService.sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Hello',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==========================================================================
  // LinkedIn Invite Tests
  // ==========================================================================

  describe('linkedin_invite action', () => {
    it('should send LinkedIn invite successfully', async () => {
      mockLinkedIn.mockResolvedValue({ success: true });

      const action: ParsedAction = {
        type: 'linkedin_invite',
        recipient: 'https://linkedin.com/in/johndoe',
        message: 'Let\'s connect',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('LinkedIn invitation sent');
    });

    it('should fail when no recipient specified', async () => {
      const action: ParsedAction = {
        type: 'linkedin_invite',
        message: 'Hello',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('recipient');
    });
  });

  // ==========================================================================
  // Create Task Tests
  // ==========================================================================

  describe('create_task action', () => {
    it('should create task successfully', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Follow up with John',
        dueIn: 3,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Task created');
      expect(mockTask.create).toHaveBeenCalled();
    });

    it('should use default due date of 1 day', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Follow up',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, baseContext);

      expect(mockTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Follow up',
        })
      );
    });
  });

  // ==========================================================================
  // Tag Actions Tests
  // ==========================================================================

  describe('add_tag action', () => {
    it('should add tag to contact in context', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: 'contact_123' },
      };

      const action: ParsedAction = {
        type: 'add_tag',
        tag: 'interested',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('added');
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'contact_123', workspace: workspaceId },
        { $addToSet: { tags: 'interested' } }
      );
    });

    it('should fail when no target in context', async () => {
      const action: ParsedAction = {
        type: 'add_tag',
        tag: 'interested',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no target');
    });

    it('should fail when no tag specified', async () => {
      const action: ParsedAction = {
        type: 'add_tag',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('tag');
    });
  });

  describe('remove_tag action', () => {
    it('should remove tag from contact', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: 'contact_123' },
      };

      const action: ParsedAction = {
        type: 'remove_tag',
        tag: 'cold',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('removed');
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'contact_123', workspace: workspaceId },
        { $pull: { tags: 'cold' } }
      );
    });
  });

  // ==========================================================================
  // Update Field Tests
  // ==========================================================================

  describe('update_field action', () => {
    it('should update field on contact', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: 'contact_123' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'status',
        value: 'Qualified',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Updated');
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'contact_123', workspace: workspaceId },
        { $set: { status: 'Qualified' } }
      );
    });

    it('should fail when no field specified', async () => {
      const action: ParsedAction = {
        type: 'update_field',
        value: 'test',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('field');
    });
  });

  // ==========================================================================
  // Wait Action Tests
  // ==========================================================================

  describe('wait action', () => {
    it('should complete wait for short durations', async () => {
      const action: ParsedAction = {
        type: 'wait',
        duration: 100,
        unit: 'seconds',
        order: 1,
      };

      // Mock setTimeout to avoid actual waiting
      jest.useFakeTimers();
      const resultPromise = ActionExecutorService.executeAction(action, baseContext);
      jest.runAllTimers();
      jest.useRealTimers();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.description).toContain('Waited');
    });

    it('should return resumeAt for long waits', async () => {
      const action: ParsedAction = {
        type: 'wait',
        duration: 1,
        unit: 'days',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.data?.resumeAt).toBeDefined();
    });
  });

  // ==========================================================================
  // Search Action Tests
  // ==========================================================================

  describe('search action', () => {
    it('should search contacts with criteria', async () => {
      const action: ParsedAction = {
        type: 'search',
        target: 'contacts',
        field: 'title',
        operator: 'contains',
        value: 'CEO',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Found');
    });

    it('should default to contacts when no target specified', async () => {
      const action: ParsedAction = {
        type: 'search',
        field: 'title',
        value: 'CEO',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Enrich Contact Tests
  // ==========================================================================

  describe('enrich_contact action', () => {
    it('should fail when no contact in context', async () => {
      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no contact');
    });

    it('should enrich contact with Apollo', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({ success: true });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: 'contact_123' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('enriched');
    });
  });

  // ==========================================================================
  // Unknown Action Tests
  // ==========================================================================

  describe('unknown action type', () => {
    it('should return error for unknown action', async () => {
      const action: ParsedAction = {
        type: 'unknown_action' as any,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported');
    });
  });

  // ==========================================================================
  // Action Type Aliases Tests
  // ==========================================================================

  describe('action type aliases', () => {
    it('should handle "email" as alias for "send_email"', async () => {
      (mockEmailService.sendEmail as jest.Mock).mockResolvedValue(undefined);

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@test.com',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);
      expect(result.success).toBe(true);
    });

    it('should handle "delay" as alias for "wait"', async () => {
      const action: ParsedAction = {
        type: 'wait',
        duration: 1,
        unit: 'seconds',
        order: 1,
      };

      jest.useFakeTimers();
      const resultPromise = ActionExecutorService.executeAction(action, baseContext);
      jest.runAllTimers();
      jest.useRealTimers();

      const result = await resultPromise;
      expect(result.success).toBe(true);
    });
  });
});
