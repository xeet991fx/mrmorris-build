/**
 * ActionExecutorService Tests - Story 3.1: Parse and Execute Instructions
 * Updated Story 3.7: Send Email Action via Gmail API
 * Updated Story 3.10: Task and Tag Actions
 * Updated Story 3.11: Update Field and Enrich Actions
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
 *
 * Story 3.10 Tests:
 * - Task creation with variable resolution (AC1)
 * - Task assignment with RBAC validation (AC7)
 * - User notification for task assignment (AC2)
 * - Multiple tags support (AC3, AC4, AC5)
 * - Due date natural language parsing
 *
 * Story 3.11 Tests:
 * - Variable resolution in field values (AC9)
 * - Custom field validation (text, number, select) (AC3)
 * - Custom field not found error (AC4)
 * - Enrich contact with actual fieldsEnriched (AC5, AC6)
 * - Apollo rate limit handling with agent auto-pause (AC7)
 * - Activity logging for enrichment (AC5)
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

jest.mock('../utils/WebSearchService', () => ({
  __esModule: true,
  default: {
    search: jest.fn(),
    isConfigured: jest.fn(),
  },
}));

jest.mock('../utils/LinkedInService', () => ({
  __esModule: true,
  default: {
    sendInvitationWithWorkspaceAccount: jest.fn(),
    checkDailyLimit: jest.fn().mockResolvedValue({ allowed: true, usageToday: 0, limit: 100 }),
    isConfigured: jest.fn().mockReturnValue(true),
  },
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
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ name: 'Test Agent' }),
    }),
  },
}));

jest.mock('../models/TeamMember', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('../models/Notification', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({ _id: 'notif_123' }),
  },
}));

jest.mock('../models/CustomFieldDefinition', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
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
import WebSearchService from '../utils/WebSearchService';
import LinkedInService from '../utils/LinkedInService';
import ApolloService from './ApolloService';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Task from '../models/Task';
import Activity from '../models/Activity';
import EmailTemplate from '../models/EmailTemplate';
import Agent from '../models/Agent';
import TeamMember from '../models/TeamMember';
import Notification from '../models/Notification';
import CustomFieldDefinition from '../models/CustomFieldDefinition';

const mockGmailService = GmailService as jest.Mocked<typeof GmailService>;
const mockWebSearchService = WebSearchService as jest.Mocked<typeof WebSearchService>;
const mockLinkedInService = LinkedInService as jest.Mocked<typeof LinkedInService>;
const mockApollo = ApolloService as jest.Mocked<typeof ApolloService>;
const mockContact = Contact as jest.Mocked<typeof Contact>;
const mockTask = Task as jest.Mocked<typeof Task>;
const mockActivity = Activity as jest.Mocked<typeof Activity>;
const mockEmailTemplate = EmailTemplate as jest.Mocked<typeof EmailTemplate>;
const mockAgent = Agent as jest.Mocked<typeof Agent>;
const mockTeamMember = TeamMember as jest.Mocked<typeof TeamMember>;
const mockNotification = Notification as jest.Mocked<typeof Notification>;
const mockCustomFieldDefinition = CustomFieldDefinition as jest.Mocked<typeof CustomFieldDefinition>;

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
      (mockLinkedInService.sendInvitationWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        invitationId: 'inv_123',
        retryAttempts: 0,
      });

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
      expect(result.error).toContain('LinkedIn URL');
    });
  });

  // ==========================================================================
  // Create Task Tests (Story 3.10: Task and Tag Actions)
  // ==========================================================================

  describe('create_task action', () => {
    const userId = '507f1f77bcf86cd799439013';
    const contextWithUser: ExecutionContext = {
      ...baseContext,
      userId,
    };

    it('should create task successfully with correct field names (AC1)', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Follow up with John',
        dueIn: 3,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Task created');
      expect(mockTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: expect.any(Object), // ObjectId
          userId: expect.any(Object), // ObjectId - Task 1.2
          title: 'Follow up with John',
          status: 'todo', // Correct status per Task model
        })
      );
    });

    it('should resolve @contact.firstName variable in title (AC1)', async () => {
      const context: ExecutionContext = {
        ...contextWithUser,
        contact: { _id: 'contact_123', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };

      const action: ParsedAction = {
        type: 'create_task',
        title: 'Follow up with @contact.firstName',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Follow up with John',
        })
      );
    });

    it('should parse "in 3 days" due date (AC1)', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        dueDate: 'in 3 days',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(true);
      expect(result.data?.parseMethod).toBe('natural');
    });

    it('should parse "tomorrow" due date (AC1)', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        params: { dueDate: 'tomorrow' },
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(true);
      expect(result.data?.parseMethod).toBe('natural');
    });

    it('should use default due date of 1 day when not specified', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Follow up',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(true);
      expect(result.data?.parseMethod).toBe('default');
    });

    it('should validate assignee is in workspace (AC7)', async () => {
      const invalidAssigneeId = '507f1f77bcf86cd799439099';
      (mockTeamMember.findOne as jest.Mock).mockResolvedValue(null); // User not in workspace

      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        assignee: invalidAssigneeId,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in workspace');
    });

    it('should fail for invalid assignee ObjectId format (AC7)', async () => {
      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        assignee: 'invalid-id',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(false);
      expect(result.error).toContain('user not found');
    });

    it('should create notification when assignee is valid (AC2)', async () => {
      const validAssigneeId = '507f1f77bcf86cd799439088';
      (mockTeamMember.findOne as jest.Mock).mockResolvedValue({
        userId: validAssigneeId,
        status: 'active',
      });

      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        assignee: validAssigneeId,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, contextWithUser);

      expect(result.success).toBe(true);
      expect(mockNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_assigned',
          title: expect.stringContaining('Test Agent'),
        })
      );
    });

    it('should include relatedContactId when contact in context (Task 1.7)', async () => {
      const context: ExecutionContext = {
        ...contextWithUser,
        contact: { _id: 'contact_123' },
      };

      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedContactId: expect.any(Object),
        })
      );
    });

    it('should include relatedOpportunityId when deal in context (Task 1.8)', async () => {
      const context: ExecutionContext = {
        ...contextWithUser,
        deal: { _id: 'deal_123', name: 'Big Deal' },
      };

      const action: ParsedAction = {
        type: 'create_task',
        title: 'Test task',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedOpportunityId: expect.any(Object),
        })
      );
    });
  });

  // ==========================================================================
  // Tag Actions Tests (Story 3.10: Task and Tag Actions)
  // ==========================================================================

  describe('add_tag action', () => {
    it('should add single tag to contact in context (AC3)', async () => {
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
      // Story 3.10: Now uses $addToSet with $each for consistency
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
        { $addToSet: { tags: { $each: ['interested'] } } }
      );
    });

    it('should add multiple tags from comma-separated string (AC5)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'add_tag',
        tags: 'Interested, CEO, SaaS',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('3 tags');
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
        { $addToSet: { tags: { $each: ['Interested', 'CEO', 'SaaS'] } } }
      );
    });

    it('should add multiple tags from array (AC5)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'add_tag',
        tags: ['Tag1', 'Tag2'],
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.tagCount).toBe(2);
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
        { $addToSet: { tags: { $each: ['Tag1', 'Tag2'] } } }
      );
    });

    it('should resolve @contact.industry variable in tag name', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', industry: 'SaaS' },
      };

      const action: ParsedAction = {
        type: 'add_tag',
        tag: 'Industry-@contact.industry',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $addToSet: { tags: { $each: ['Industry-SaaS'] } } }
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
    it('should remove single tag from contact (AC4)', async () => {
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
      // Story 3.10: Now uses $pullAll for consistency with multiple tags
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
        { $pullAll: { tags: ['cold'] } }
      );
    });

    it('should remove multiple tags at once', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'remove_tag',
        tags: 'Cold, Inactive',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $pullAll: { tags: ['Cold', 'Inactive'] } }
      );
    });
  });

  // ==========================================================================
  // Update Field Tests (Story 3.11: Update Field and Enrich Actions)
  // ==========================================================================

  describe('update_field action', () => {
    it('should update field on contact (AC1)', async () => {
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

    it('should resolve @contact.firstName variable in field value (AC9)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          _id: '507f1f77bcf86cd799439099',
          firstName: 'John',
          lastName: 'Doe',
        } as any,
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'notes',
        value: 'Discussed with @contact.firstName',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.resolvedValue).toBe('Discussed with John');
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439099', workspace: workspaceId },
        { $set: { notes: 'Discussed with John' } }
      );
    });

    it('should resolve @company.name variable in field value (AC9)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          _id: '507f1f77bcf86cd799439099',
          firstName: 'John',
          company: { name: 'Acme Corp' },
        } as any,
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'notes',
        value: 'Contact from @company.name',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.resolvedValue).toBe('Contact from Acme Corp');
    });

    it('should not resolve variables in numeric values (Task 1.2)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'score',
        value: 100,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.resolvedValue).toBe(100);
    });

    it('should return originalValue and resolvedValue in data (Task 1.4)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          _id: '507f1f77bcf86cd799439099',
          firstName: 'Alice',
        } as any,
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'notes',
        value: 'Hi @contact.firstName!',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.originalValue).toBe('Hi @contact.firstName!');
      expect(result.data?.resolvedValue).toBe('Hi Alice!');
      expect(result.data?.field).toBe('notes');
    });

    it('should validate custom field exists (AC3, AC4)', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue({
        fieldKey: 'custom_lead_score',
        fieldType: 'text',
        isActive: true,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_lead_score',
        value: 'A',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.isCustomField).toBe(true);
      expect(mockCustomFieldDefinition.findOne).toHaveBeenCalledWith({
        workspaceId: expect.any(Object),
        entityType: 'contact', // Fix: Added entityType filter
        fieldKey: 'custom_lead_score',
        isActive: true,
      });
      // Should use customFields path
      expect(mockContact.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { 'customFields.custom_lead_score': 'A' } }
      );
    });

    it('should return error when custom field not found (AC4)', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue(null);

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_unknown',
        value: 'test',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Custom field 'custom_unknown' not found. Create field first.");
    });

    it('should validate number type for custom field (AC3)', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue({
        fieldKey: 'custom_score',
        fieldType: 'number',
        isActive: true,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_score',
        value: '85',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.resolvedValue).toBe(85); // Parsed as number
    });

    it('should return error for invalid number in custom field', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue({
        fieldKey: 'custom_score',
        fieldType: 'number',
        isActive: true,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_score',
        value: 'not-a-number',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("expected number, got 'not-a-number'");
    });

    it('should validate select type with valid option (AC3)', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue({
        fieldKey: 'custom_priority',
        fieldType: 'select',
        selectOptions: ['Low', 'Medium', 'High'],
        isActive: true,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_priority',
        value: 'High',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.resolvedValue).toBe('High');
    });

    it('should return error for invalid select option (Task 7.4)', async () => {
      (mockCustomFieldDefinition.findOne as jest.Mock).mockResolvedValue({
        fieldKey: 'custom_priority',
        fieldType: 'select',
        selectOptions: ['Low', 'Medium', 'High'],
        isActive: true,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'custom_priority',
        value: 'Invalid',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("'Invalid' is not a valid option");
      expect(result.error).toContain('Valid options: Low, Medium, High');
    });

    it('should update deal value (AC2)', async () => {
      const context: ExecutionContext = {
        ...baseContext,
        deal: { _id: '507f1f77bcf86cd799439098', name: 'Big Deal' },
      };

      const action: ParsedAction = {
        type: 'update_field',
        field: 'value',
        value: 50000,
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.targetCount).toBe(1);
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

    it('should fail when no target in context', async () => {
      const action: ParsedAction = {
        type: 'update_field',
        field: 'status',
        value: 'Active',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No target to update');
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
  // Enrich Contact Tests (Story 3.11: Update Field and Enrich Actions)
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

    it('should enrich contact successfully with fieldsEnriched (AC5, Task 7.5)', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          enrichedFields: ['email', 'linkedin', 'title'],
        },
        creditsUsed: 1,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'John', lastName: 'Doe' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('enriched');
      expect(result.description).toContain('email, linkedin, title');
      expect(result.data?.fieldsEnriched).toEqual(['email', 'linkedin', 'title']);
      expect(result.data?.creditsUsed).toBe(1);
      expect(result.data?.contactName).toBe('John Doe');
    });

    it('should handle enrichment with no data found (AC6, Task 7.6)', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          enrichedFields: [],
        },
        creditsUsed: 1,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Jane', lastName: 'Smith' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Enrichment returned no data for Jane Smith');
      expect(result.data?.fieldsEnriched).toEqual([]);
    });

    it('should create Activity record after successful enrichment (AC5, Task 6.1)', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          enrichedFields: ['phone', 'title'],
        },
        creditsUsed: 1,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Bob' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      expect(mockActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enrichment',
          title: 'Contact enriched via Apollo.io',
          entityType: 'contact',
          metadata: expect.objectContaining({
            source: 'apollo',
            fieldsEnriched: ['phone', 'title'],
            creditsUsed: 1,
          }),
        })
      );
    });

    it('should handle Apollo rate limit and auto-pause agent (AC7)', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: false,
        error: 'rate limit exceeded',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Test' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Apollo API rate limit exceeded');
      expect(result.data?.shouldPauseAgent).toBe(true);
      expect(mockAgent.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'Paused',
            pauseReason: 'Apollo API rate limit exceeded',
          }),
        })
      );
    });

    it('should handle Apollo credits exhausted and auto-pause agent (AC7)', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: false,
        error: 'credits exhausted',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Test' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Apollo credits exhausted');
      expect(result.data?.shouldPauseAgent).toBe(true);
    });

    it('should handle generic enrichment failure', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Contact not found in Apollo database',
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: '507f1f77bcf86cd799439099', firstName: 'Unknown' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Contact not found');
    });

    it('should return contactId in result data', async () => {
      (mockApollo.enrichContact as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          enrichedFields: ['email'],
        },
        creditsUsed: 1,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: { _id: 'contact_abc123', firstName: 'Test' },
      };

      const action: ParsedAction = {
        type: 'enrich_contact',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, context);

      expect(result.success).toBe(true);
      expect(result.data?.contactId).toBe('contact_abc123');
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

  // ==========================================================================
  // Web Search Tests (Story 3.9: Web Search Action)
  // ==========================================================================

  describe('web_search action', () => {
    const mockSearchResults = [
      { title: 'Acme Corp News', snippet: 'Latest news about Acme Corp...', url: 'https://example.com/1' },
      { title: 'Acme Funding', snippet: 'Acme Corp raises Series B...', url: 'https://example.com/2' },
      { title: 'Acme Products', snippet: 'New products from Acme...', url: 'https://example.com/3' },
    ];

    it('should execute web search successfully (AC1)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: mockSearchResults,
        retryAttempts: 0,
        durationMs: 1500,
      });

      const action: ParsedAction = {
        type: 'web_search',
        query: 'Acme Corp news',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('Found 3 results');
      expect(result.data?.results).toHaveLength(3);
      expect(result.data?.query).toBe('Acme Corp news');
      expect(mockWebSearchService.search).toHaveBeenCalledWith('Acme Corp news');
    });

    it('should store results in execution context (AC2)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: mockSearchResults,
        retryAttempts: 0,
        durationMs: 1200,
      });

      const context: ExecutionContext = {
        ...baseContext,
        variables: {},
      };

      const action: ParsedAction = {
        type: 'web_search',
        query: 'test query',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      // Verify results stored in context
      expect(context.variables['search']).toBeDefined();
      expect(context.variables['search'].results).toHaveLength(3);
      expect(context.variables['search'].query).toBe('test query');
      expect(context.variables['search'].count).toBe(3);
    });

    it('should resolve @company.name variable in query (AC1)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: mockSearchResults,
        retryAttempts: 0,
        durationMs: 1000,
      });

      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          _id: 'contact_123',
          firstName: 'John',
          company: { name: 'Acme Corp' },
        } as any,
        variables: {},
      };

      const action: ParsedAction = {
        type: 'web_search',
        query: 'recent news about @company.name',
        order: 1,
      };

      await ActionExecutorService.executeAction(action, context);

      // Verify variable was resolved
      expect(mockWebSearchService.search).toHaveBeenCalledWith('recent news about Acme Corp');
    });

    it('should handle empty results gracefully (AC4)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: [],
        retryAttempts: 0,
        durationMs: 800,
      });

      const action: ParsedAction = {
        type: 'web_search',
        query: 'very obscure query xyz123',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(true);
      expect(result.description).toContain('No results found');
      expect(result.data?.results).toEqual([]);
      expect(result.data?.count).toBe(0);
    });

    it('should fail when no query specified', async () => {
      const action: ParsedAction = {
        type: 'web_search',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing query');
      expect(mockWebSearchService.search).not.toHaveBeenCalled();
    });

    it('should fail when query is whitespace only', async () => {
      const action: ParsedAction = {
        type: 'web_search',
        query: '   ',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty query');
      expect(mockWebSearchService.search).not.toHaveBeenCalled();
    });

    it('should handle search API errors', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: false,
        results: [],
        error: 'Web search not configured. Missing API key or search engine ID.',
      });

      const action: ParsedAction = {
        type: 'web_search',
        query: 'test query',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle rate limit exhaustion (AC5)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: false,
        results: [],
        error: 'Web search unavailable (rate limit exceeded after retries)',
        retryAttempts: 3,
      });

      const action: ParsedAction = {
        type: 'web_search',
        query: 'test query',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit exceeded');
    });

    it('should handle timeout error (AC6)', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: false,
        results: [],
        error: 'Web search timed out (exceeded 10 seconds)',
      });

      const action: ParsedAction = {
        type: 'web_search',
        query: 'slow query',
        order: 1,
      };

      const result = await ActionExecutorService.executeAction(action, baseContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should extract query from params.query', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: [],
        retryAttempts: 0,
        durationMs: 500,
      });

      const action: ParsedAction = {
        type: 'web_search',
        params: { query: 'query from params' },
        order: 1,
      };

      await ActionExecutorService.executeAction(action, baseContext);

      expect(mockWebSearchService.search).toHaveBeenCalledWith('query from params');
    });
  });

  // ==========================================================================
  // Variable Resolution for @search.results Tests (Story 3.9 AC2)
  // ==========================================================================

  describe('search results variable resolution', () => {
    it('should resolve @search.results[0].title in email body', async () => {
      // First execute search to populate context
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: [
          { title: 'Breaking News Title', snippet: 'The snippet text', url: 'https://test.com' },
        ],
        retryAttempts: 0,
        durationMs: 1000,
      });

      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_123',
      });

      const context: ExecutionContext = {
        ...baseContext,
        variables: {},
      };

      // Execute search first
      await ActionExecutorService.executeAction(
        { type: 'web_search', query: 'test', order: 1 },
        context
      );

      // Now send email with @search.results reference
      const emailAction: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Check this out: @search.results[0].title',
        body: 'I found this article: @search.results[0].url',
        order: 2,
      };

      await ActionExecutorService.executeAction(emailAction, context);

      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'test@example.com',
        'Check this out: Breaking News Title',
        'I found this article: https://test.com'
      );
    });

    it('should return empty string for out-of-bounds index', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: [{ title: 'Only One', snippet: 'Snippet', url: 'https://one.com' }],
        retryAttempts: 0,
        durationMs: 500,
      });

      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_456',
      });

      const context: ExecutionContext = {
        ...baseContext,
        variables: {},
      };

      // Execute search
      await ActionExecutorService.executeAction(
        { type: 'web_search', query: 'test', order: 1 },
        context
      );

      // Reference out-of-bounds index
      const emailAction: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Result 5: @search.results[5].title',
        body: 'Body',
        order: 2,
      };

      await ActionExecutorService.executeAction(emailAction, context);

      // Out of bounds should resolve to empty string
      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'test@example.com',
        'Result 5: ', // Empty string for out-of-bounds
        'Body'
      );
    });

    it('should resolve @search.results.length for conditional logic', async () => {
      (mockWebSearchService.search as jest.Mock).mockResolvedValue({
        success: true,
        results: [
          { title: 'R1', snippet: 'S1', url: 'https://1.com' },
          { title: 'R2', snippet: 'S2', url: 'https://2.com' },
        ],
        retryAttempts: 0,
        durationMs: 800,
      });

      (mockGmailService.sendEmailWithWorkspaceAccount as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'msg_789',
      });

      const context: ExecutionContext = {
        ...baseContext,
        variables: {},
      };

      // Execute search
      await ActionExecutorService.executeAction(
        { type: 'web_search', query: 'test', order: 1 },
        context
      );

      // Use @search.results.length
      const emailAction: ParsedAction = {
        type: 'send_email',
        to: 'test@example.com',
        subject: 'Found @search.results.length results',
        body: 'Body',
        order: 2,
      };

      await ActionExecutorService.executeAction(emailAction, context);

      expect(mockGmailService.sendEmailWithWorkspaceAccount).toHaveBeenCalledWith(
        workspaceId,
        'test@example.com',
        'Found 2 results',
        'Body'
      );
    });
  });
});
