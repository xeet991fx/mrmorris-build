/**
 * TestModeService Tests - Story 2.1: Enable Test Mode
 */
import { TestModeService, TestStepResult, TestRunResult } from './TestModeService';

// Mock Agent model
jest.mock('../models/Agent', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

import Agent from '../models/Agent';

const mockAgent = Agent as jest.Mocked<typeof Agent>;

describe('TestModeService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('simulateExecution', () => {
    it('should return agent not found when agent does not exist', async () => {
      (mockAgent.findOne as jest.Mock).mockResolvedValue(null);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent not found');
      expect(result.steps).toHaveLength(0);
    });

    it('should simulate all actions without side effects', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        name: 'Test Agent',
        instructions: 'Send email to contact',
        parsedActions: [
          { type: 'send_email', to: 'john@acme.com', subject: 'Hello', body: 'Test email' },
          { type: 'add_tag', tag: 'contacted' },
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].status).toBe('simulated');
      expect(result.steps[1].status).toBe('simulated');
      // No real emails sent - only simulation
      expect(result.steps[0].note).toContain('DRY RUN');
    });

    it('should return step-by-step results with correct structure', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [
          { type: 'send_email', to: 'test@example.com', subject: 'Test', body: 'Body' },
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.steps[0]).toMatchObject({
        stepNumber: 1,
        action: 'send_email',
        status: 'simulated',
        preview: expect.objectContaining({
          description: expect.stringContaining('Would send email'),
          details: expect.objectContaining({
            to: 'test@example.com',
            subject: 'Test',
          }),
        }),
        estimatedCredits: 2,
        note: expect.stringContaining('DRY RUN'),
      });
    });

    it('should calculate estimated credits correctly', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [
          { type: 'send_email' },     // 2 credits
          { type: 'linkedin_invite' }, // 2 credits
          { type: 'enrich_contact' },  // 3 credits
          { type: 'add_tag' },         // 0 credits
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.totalEstimatedCredits).toBe(7); // 2 + 2 + 3 + 0
    });

    it('should return empty steps array when agent has no parsed actions', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        instructions: '',
        parsedActions: [],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
    });

    it('should add warning when instructions exist but no parsed actions', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        instructions: 'Send email to contact',
        parsedActions: [],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].severity).toBe('warning');
      expect(result.warnings[0].message).toContain('no parsed actions');
    });

    it('should simulate email action with AC3 format', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [
          {
            type: 'send_email',
            to: 'john@example.com',
            subject: 'Follow up',
            body: 'Hi John, following up...',
          },
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      // AC3: The result shows: "Would send email to [contact name] (DRY RUN)"
      expect(result.steps[0].preview.description).toContain('Would send email to john@example.com');
      // AC3: The email content preview is displayed
      expect(result.steps[0].preview.details).toMatchObject({
        to: 'john@example.com',
        subject: 'Follow up',
        body: 'Hi John, following up...',
      });
      // AC3: No actual email is sent
      expect(result.steps[0].note).toContain('DRY RUN');
    });

    it('should simulate update_deal_value action with AC4 format', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [
          {
            type: 'update_deal_value',
            value: 50000,
          },
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      // AC4: The result shows: "Would update deal value to $50,000 (DRY RUN)"
      expect(result.steps[0].preview.description).toContain('Would update deal value');
      expect(result.steps[0].preview.details?.newValue).toBe(50000);
      // AC4: The actual deal value in the database is not changed
      expect(result.steps[0].note).toContain('DRY RUN');
    });

    it('should complete within 10 seconds for simple agents', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: Array(10).fill({ type: 'add_tag', tag: 'test' }),
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const startTime = Date.now();
      const result = await TestModeService.simulateExecution(agentId, workspaceId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // NFR: <10 seconds
      expect(result.success).toBe(true);
    });

    it('should simulate all supported action types', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [
          { type: 'send_email', to: 'test@test.com' },
          { type: 'linkedin_invite', recipient: 'John Doe' },
          { type: 'web_search', query: 'test query' },
          { type: 'create_task', title: 'Follow up' },
          { type: 'add_tag', tag: 'contacted' },
          { type: 'remove_tag', tag: 'prospect' },
          { type: 'update_field', field: 'status', value: 'active' },
          { type: 'enrich_contact' },
          { type: 'wait', duration: 5, unit: 'minutes' },
        ],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      const result = await TestModeService.simulateExecution(agentId, workspaceId);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(9);
      result.steps.forEach((step) => {
        expect(step.status).toBe('simulated');
        expect(step.note).toContain('DRY RUN');
      });
    });

    it('should enforce workspace isolation in query', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        parsedActions: [],
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);

      await TestModeService.simulateExecution(agentId, workspaceId);

      // Verify workspace filter was used
      expect(mockAgent.findOne).toHaveBeenCalledWith({
        _id: agentId,
        workspace: workspaceId,
      });
    });
  });
});
