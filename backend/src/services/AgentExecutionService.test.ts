/**
 * AgentExecutionService Tests - Story 3.1: Parse and Execute Instructions
 *
 * Tests for live agent execution including:
 * - AC1: Instruction Parsing with Structured Output
 * - AC2: Variable Resolution
 * - AC4: Parsing Error Handling
 * - AC5: Execution Performance
 */

import AgentExecutionService, {
  resolveVariables,
  evaluateCondition,
  ExecutionContext,
} from './AgentExecutionService';

// Mock dependencies
jest.mock('../models/Agent', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/AgentExecution', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../models/Contact', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/Opportunity', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('./InstructionParserService', () => ({
  __esModule: true,
  default: {
    parseInstructions: jest.fn().mockResolvedValue({
      success: true,
      actions: [],
    }),
  },
}));

jest.mock('./InstructionValidationService', () => ({
  __esModule: true,
  default: {
    validateInstructions: jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    }),
  },
}));

jest.mock('./ActionExecutorService', () => ({
  __esModule: true,
  default: {
    executeAction: jest.fn().mockResolvedValue({
      success: true,
      description: 'Action executed',
    }),
  },
}));

import Agent from '../models/Agent';
import AgentExecution from '../models/AgentExecution';

const mockAgent = Agent as jest.Mocked<typeof Agent>;
const mockExecution = AgentExecution as jest.Mocked<typeof AgentExecution>;

describe('AgentExecutionService', () => {
  const workspaceId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Variable Resolution Tests
  // ==========================================================================

  describe('resolveVariables', () => {
    const baseContext: ExecutionContext = {
      workspaceId,
      agentId,
      executionId: 'exec_123',
      variables: {},
    };

    it('should resolve @contact.* variables', () => {
      const context: ExecutionContext = {
        ...baseContext,
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      };

      const result = resolveVariables('Hello @contact.firstName, email: @contact.email', context);
      expect(result).toBe('Hello John, email: john@example.com');
    });

    it('should resolve @deal.* variables', () => {
      const context: ExecutionContext = {
        ...baseContext,
        deal: {
          name: 'Big Deal',
          value: 50000,
          stage: 'Negotiation',
        },
      };

      const result = resolveVariables('Deal: @deal.name worth $@deal.value', context);
      expect(result).toBe('Deal: Big Deal worth $50000');
    });

    it('should resolve @memory.* variables', () => {
      const context: ExecutionContext = {
        ...baseContext,
        memory: {
          lastContact: '2024-01-15',
          followUpCount: 3,
        },
      };

      const result = resolveVariables('Last contact: @memory.lastContact, attempts: @memory.followUpCount', context);
      expect(result).toBe('Last contact: 2024-01-15, attempts: 3');
    });

    it('should resolve @current.date variable', () => {
      const result = resolveVariables('Today is @current.date', baseContext);
      expect(result).toMatch(/Today is \d{4}-\d{2}-\d{2}/);
    });

    it('should replace missing variables with placeholders', () => {
      const result = resolveVariables('Hello @contact.firstName', baseContext);
      expect(result).toBe('Hello [firstName]');
    });
  });

  // ==========================================================================
  // Condition Evaluation Tests
  // ==========================================================================

  describe('evaluateCondition', () => {
    const baseContext: ExecutionContext = {
      workspaceId,
      agentId,
      executionId: 'exec_123',
      variables: {},
      contact: {
        title: 'CEO',
        replied: true,
        score: 85,
      },
      deal: {
        value: 50000,
        stage: 'Proposal',
      },
    };

    it('should evaluate equality conditions', () => {
      const result = evaluateCondition('contact.title == CEO', baseContext);
      expect(result.result).toBe(true);
      expect(result.explanation).toContain('TRUE');
    });

    it('should evaluate contains conditions', () => {
      const result = evaluateCondition('contact.title contains CEO', baseContext);
      expect(result.result).toBe(true);
    });

    it('should evaluate greater than conditions', () => {
      const result = evaluateCondition('deal.value > 10000', baseContext);
      expect(result.result).toBe(true);
    });

    it('should evaluate less than conditions', () => {
      const result = evaluateCondition('contact.score < 100', baseContext);
      expect(result.result).toBe(true);
    });

    it('should evaluate boolean conditions', () => {
      const result = evaluateCondition('contact.replied == true', baseContext);
      expect(result.result).toBe(true);
    });

    it('should return true for empty conditions', () => {
      const result = evaluateCondition('', baseContext);
      expect(result.result).toBe(true);
    });
  });

  // ==========================================================================
  // Agent Execution Tests
  // ==========================================================================

  describe('executeAgent', () => {
    it('should return error when agent not found', async () => {
      (mockAgent.findOne as jest.Mock).mockResolvedValue(null);
      (mockExecution.create as jest.Mock).mockResolvedValue({
        save: jest.fn(),
      });

      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        { type: 'manual' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent not found');
    });

    it('should return error when agent is not Live', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        status: 'Draft',
        save: jest.fn(),
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);
      (mockExecution.create as jest.Mock).mockResolvedValue({
        status: 'pending',
        save: jest.fn(),
      });

      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        { type: 'manual' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent is not live');
    });

    it('should execute agent with parsed actions', async () => {
      const mockAgentData = {
        _id: agentId,
        workspace: workspaceId,
        status: 'Live',
        instructions: 'Send email',
        parsedActions: [
          { type: 'send_email', to: 'test@example.com', subject: 'Test', body: 'Hello' },
        ],
        memory: { enabled: false },
        save: jest.fn(),
      };

      (mockAgent.findOne as jest.Mock).mockResolvedValue(mockAgentData);
      (mockAgent.findOneAndUpdate as jest.Mock).mockResolvedValue(mockAgentData);
      (mockExecution.create as jest.Mock).mockResolvedValue({
        _id: 'exec_id',
        executionId: 'exec_123',
        status: 'pending',
        steps: [],
        save: jest.fn(),
      });

      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        { type: 'manual' }
      );

      expect(result.executionId).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // List Executions Tests
  // ==========================================================================

  describe('listExecutions', () => {
    it('should return executions for an agent', async () => {
      const mockExecutions = [
        { executionId: 'exec_1', status: 'completed' },
        { executionId: 'exec_2', status: 'failed' },
      ];

      (mockExecution.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue(mockExecutions),
          }),
        }),
      });

      const result = await AgentExecutionService.listExecutions(agentId, workspaceId);

      expect(result).toHaveLength(2);
      expect(mockExecution.find).toHaveBeenCalledWith({
        agent: agentId,
        workspace: workspaceId,
      });
    });

    it('should filter by status when provided', async () => {
      (mockExecution.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await AgentExecutionService.listExecutions(agentId, workspaceId, { status: 'completed' });

      expect(mockExecution.find).toHaveBeenCalledWith({
        agent: agentId,
        workspace: workspaceId,
        status: 'completed',
      });
    });
  });

  // ==========================================================================
  // Cancel Execution Tests
  // ==========================================================================

  describe('cancelExecution', () => {
    it('should cancel a pending execution', async () => {
      const mockExec = {
        executionId: 'exec_123',
        status: 'running',
        save: jest.fn(),
      };

      (mockExecution.findOne as jest.Mock).mockResolvedValue(mockExec);

      const result = await AgentExecutionService.cancelExecution('exec_123', workspaceId);

      expect(result).toBe(true);
      expect(mockExec.status).toBe('cancelled');
      expect(mockExec.save).toHaveBeenCalled();
    });

    it('should return false when execution not found', async () => {
      (mockExecution.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AgentExecutionService.cancelExecution('nonexistent', workspaceId);

      expect(result).toBe(false);
    });
  });
});
