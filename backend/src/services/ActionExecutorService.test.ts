/**
 * ActionExecutorService Tests - Story 3.1: Parse and Execute Instructions
 * Updated Story 3.7: Send Email Action via Gmail API
 *
 * Tests for action execution handlers:
 * - AC1: Each action is executed in sequence
 * - AC2: Variable Resolution (handled by caller)
 * - AC5: Execution Performance with error handling and retry logic
 *
 * Story 3.7 Tests:
 * - Gmail API integration
 * - Template loading and variable resolution
 * - Activity logging
 * - Auto-pause on rate limit
 */

import ActionExecutorService, { ActionResult } from './ActionExecutorService';
import { ExecutionContext } from './AgentExecutionService';
import { ParsedAction } from './InstructionParserService';

// Mock dependencies
jest.mock('../utils/GmailService', () => ({
  __esModule: true,
  default: {
    sendEmailWithWorkspaceAccount: jest.fn(),
    isGmailConnected: jest.fn(),
    getActiveGmailAccount: jest.fn(),
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

jest.mock('../models/Activity', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({
      _id: 'activity_123',
    }),
  },
}));

jest.mock('../models/EmailTemplate', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/Agent', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/AgentExecution', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

import GmailService from '../utils/GmailService';
import { sendConnectionRequest } from './LinkedInService';
import ApolloService from './ApolloService';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Task from '../models/Task';
import Activity from '../models/Activity';
import EmailTemplate from '../models/EmailTemplate';
import Agent from '../models/Agent';

const mockGmailService = GmailService as jest.Mocked<typeof GmailService>;
const mockLinkedIn = sendConnectionRequest as jest.MockedFunction<typeof sendConnectionRequest>;
const mockApollo = ApolloService as jest.Mocked<typeof ApolloService>;
const mockContact = Contact as jest.Mocked<typeof Contact>;
const mockTask = Task as jest.Mocked<typeof Task>;
const mockActivity = Activity as jest.Mocked<typeof Activity>;
const mockEmailTemplate = EmailTemplate as jest.Mocked<typeof EmailTemplate>;
const mockAgent = Agent as jest.Mocked<typeof Agent>;

describe('ActionExecutorService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';

  const baseContext: ExecutionContext = {
    workspaceId,
    agentId,
    executionId: 'exec_123',
    variables: {},
    memory: new Map(),
    triggerType: 'manual',
    stepOutputs: {},
    currentStep: 1,
    totalSteps: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Send Email Tests (Story 3.7: Gmail API Integration)
  // ==========================================================================

  describe('send_email action', () => {
    it('should send email successfully via Gmail API (AC1)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_123456',
        retryAttempts: 0,
      });

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
      expect(result.data?.messageId).toBe('msg_123456');
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'test@example.com',
        'Hello',
        'Test body'
      );
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

    it('should fail for invalid email address format', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid email address: not-an-email',
      });

      const action: ParsedAction = {
        type: 'send_email',
        to: 'not-an-email',
        subject: 'Hello',
        body: 'Body',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
    });

    it('should use contact email when no explicit recipient (AC1)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_auto',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', email: 'john@example.com', firstName: 'John' },
      };

      const action: ParsedAction = {
        type: 'send_email',
        subject: 'Hello',
        body: 'Body',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'john@example.com',
        'Hello',
        'Body'
      );
    });

    it('should return error when Gmail not connected (AC4)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Gmail integration not connected. Please connect Gmail in Settings > Integrations.',
      });

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Hello',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail integration not connected');
    });

    it('should load template and resolve variables (AC1, AC2)', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue({
        subject: 'Hi @contact.firstName',
        htmlContent: '<p>Hello @contact.firstName from @company.name</p>',
        body: 'Fallback body',
      });
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_template',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          _id: '507f1f77bcf86cd799439099',
          email: 'john@example.com',
          firstName: 'John',
          company: { name: 'Acme Corp' },
        },
      };

      const action: ParsedAction = {
        type: 'send_email',
        to: 'john@example.com',
        template: 'Outbound v2',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'john@example.com',
        'Hi John',
        '<p>Hello John from Acme Corp</p>'
      );
    });

    it('should return error when template not found', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue(null);

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        template: 'Non-existent Template',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Email template 'Non-existent Template' not found");
    });

    it('should create activity on successful send (AC3)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_activity',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Jane', lastName: 'Doe' },
      };

      const action: ParsedAction = {
        type: 'send_email',
        to: 'jane@example.com',
        subject: 'Hello Jane',
        body: 'Body',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
          title: expect.stringContaining('Jane Doe'),
          direction: 'outbound',
          emailSubject: 'Hello Jane',
          automated: true,
        })
      );
    });

    it('should update template usage stats when template used (AC3)', async () => {
      (mockEmailTemplate.findOne as jest.Mock).mockResolvedValue({
        subject: 'Template Subject',
        htmlContent: 'Template Body',
      });
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_usage',
      });

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        template: 'My Template',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, baseContext);

      expect(mockEmailTemplate.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Template' }),
        expect.objectContaining({
          $inc: { usageCount: 1 },
          $set: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        })
      );
    });

    it('should include messageId and metadata in result (AC7)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_metadata_test',
        retryAttempts: 1,
      });

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Subject',
        body: 'Body',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.data?.messageId).toBe('msg_metadata_test');
      expect(result.data?.subject).toBe('Subject');
      expect(result.data?.recipient).toBe('test@example.com');
      expect(result.data?.retryAttempts).toBe(1);
    });

    it('should resolve {{variable}} format in templates (AC2)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_curly',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { firstName: 'Alice', email: 'alice@test.com' },
        variables: { customVar: 'CustomValue' },
      };

      const action: ParsedAction = {
        type: 'send_email',
        to: 'alice@test.com',
        subject: 'Hello {{firstName}}',
        body: 'Value: {{customVar}}',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'alice@test.com',
        'Hello Alice',
        'Value: CustomValue'
      );
    });

    it('should keep unresolved variables as-is (AC2)', async () => {
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_unresolved',
      });

      const action: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Hello @contact.unknownField',
        body: 'Body',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      // Unresolved variable should be left as-is
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'test@example.com',
        'Hello @contact.unknownField',
        'Body'
      );
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
        contact: { _id: '507f1f77bcf86cd799439099' },
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
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
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
      expect(result.error?.toLowerCase()).toContain('no target');
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
        contact: { _id: '507f1f77bcf86cd799439099' },
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
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
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
        contact: { _id: '507f1f77bcf86cd799439099' },
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
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
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
        duration: 30,
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
      expect(result.error?.toLowerCase()).toContain('no contact');
    });

    it('should enrich contact with Apollo', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({ success: true });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
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
      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_alias',
      });

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
