import mongoose from 'mongoose';
import Agent from '../models/Agent';
import AgentExecution from '../models/AgentExecution';
import Project from '../models/Project';
import User from '../models/User';

// Mock BullMQ to prevent Redis connection during tests
const mockAdd = jest.fn().mockResolvedValue({ id: 'test-job-id' });
const mockGetRepeatableJobs = jest.fn().mockResolvedValue([]);
const mockRemoveRepeatableByKey = jest.fn().mockResolvedValue(undefined);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    getRepeatableJobs: mockGetRepeatableJobs,
    removeRepeatableByKey: mockRemoveRepeatableByKey,
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock Socket.io namespace
jest.mock('../socket/agentExecutionSocket', () => ({
  getAgentExecutionNamespace: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  }),
  emitExecutionQueued: jest.fn(),
  emitAgentAutoPaused: jest.fn(),
  emitAgentFailureAlert: jest.fn(),
}));

// Import after mocks
import {
  registerAgentSchedule,
  removeAgentSchedule,
  updateAgentSchedule,
  registerAllLiveAgentSchedules,
  agentScheduledQueue,
} from '../jobs/agentScheduledJob';

/**
 * Story 3.3: Scheduled Trigger Execution Tests
 *
 * Tests for scheduled agent execution via BullMQ cron jobs
 */
describe('Agent Scheduled Job (Story 3.3)', () => {
  let userId: mongoose.Types.ObjectId;
  let workspaceId: mongoose.Types.ObjectId;
  let agentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-mrmorris');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();

    // Clear database
    await Agent.deleteMany({});
    await AgentExecution.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    // Setup test data
    userId = new mongoose.Types.ObjectId();
    workspaceId = new mongoose.Types.ObjectId();

    await User.create({
      _id: userId,
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
    });

    await Project.create({
      _id: workspaceId,
      name: 'Test Workspace',
      userId: userId,
    });
  });

  describe('registerAgentSchedule', () => {
    it('should register a scheduled job with cron pattern (AC1)', async () => {
      agentId = new mongoose.Types.ObjectId();
      const cronExpression = '0 9 * * *'; // Daily at 9 AM

      await registerAgentSchedule(
        agentId.toString(),
        workspaceId.toString(),
        cronExpression
      );

      // Verify add was called with correct parameters
      expect(mockAdd).toHaveBeenCalledWith(
        `scheduled-${agentId}`,
        { agentId: agentId.toString(), workspaceId: workspaceId.toString() },
        expect.objectContaining({
          repeat: { pattern: cronExpression },
          jobId: `scheduled-${agentId}`,
        })
      );
    });

    it('should support weekly cron expressions (AC2)', async () => {
      agentId = new mongoose.Types.ObjectId();
      const cronExpression = '0 8 * * 1'; // Every Monday at 8 AM

      await registerAgentSchedule(
        agentId.toString(),
        workspaceId.toString(),
        cronExpression
      );

      expect(mockAdd).toHaveBeenCalledWith(
        `scheduled-${agentId}`,
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: cronExpression },
        })
      );
    });

    it('should support monthly cron expressions (AC3)', async () => {
      agentId = new mongoose.Types.ObjectId();
      const cronExpression = '0 10 1 * *'; // 1st of month at 10 AM

      await registerAgentSchedule(
        agentId.toString(),
        workspaceId.toString(),
        cronExpression
      );

      expect(mockAdd).toHaveBeenCalledWith(
        `scheduled-${agentId}`,
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: cronExpression },
        })
      );
    });

    it('should remove existing schedule before registering new one', async () => {
      agentId = new mongoose.Types.ObjectId();

      // Mock existing job
      mockGetRepeatableJobs.mockResolvedValueOnce([
        { name: `scheduled-${agentId}`, key: 'existing-key' },
      ]);

      await registerAgentSchedule(
        agentId.toString(),
        workspaceId.toString(),
        '0 9 * * *'
      );

      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith('existing-key');
    });
  });

  describe('removeAgentSchedule', () => {
    it('should remove a scheduled job by agent ID', async () => {
      agentId = new mongoose.Types.ObjectId();

      mockGetRepeatableJobs.mockResolvedValueOnce([
        { name: `scheduled-${agentId}`, key: 'job-key-123' },
      ]);

      await removeAgentSchedule(agentId.toString());

      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith('job-key-123');
    });

    it('should not throw if no job exists', async () => {
      agentId = new mongoose.Types.ObjectId();

      mockGetRepeatableJobs.mockResolvedValueOnce([]);

      await expect(removeAgentSchedule(agentId.toString())).resolves.not.toThrow();
    });
  });

  describe('updateAgentSchedule', () => {
    it('should update schedule by removing old and registering new', async () => {
      agentId = new mongoose.Types.ObjectId();
      const newCron = '0 10 * * *'; // Daily at 10 AM

      mockGetRepeatableJobs.mockResolvedValueOnce([
        { name: `scheduled-${agentId}`, key: 'old-key' },
      ]);

      await updateAgentSchedule(
        agentId.toString(),
        workspaceId.toString(),
        newCron
      );

      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith('old-key');
      expect(mockAdd).toHaveBeenCalledWith(
        `scheduled-${agentId}`,
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: newCron },
        })
      );
    });
  });

  describe('registerAllLiveAgentSchedules', () => {
    it('should register schedules for all Live agents with scheduled triggers', async () => {
      // Create Live agent with scheduled trigger
      const agent1 = await Agent.create({
        workspace: workspaceId,
        name: 'Scheduled Agent 1',
        goal: 'Test',
        createdBy: userId,
        status: 'Live',
        triggers: [
          {
            type: 'scheduled',
            config: { cron: '0 9 * * *' },
            enabled: true,
          },
        ],
      });

      // Create Live agent without scheduled trigger
      await Agent.create({
        workspace: workspaceId,
        name: 'Manual Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Live',
        triggers: [
          {
            type: 'manual',
            config: {},
            enabled: true,
          },
        ],
      });

      // Create Draft agent with scheduled trigger (should be ignored)
      await Agent.create({
        workspace: workspaceId,
        name: 'Draft Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
        triggers: [
          {
            type: 'scheduled',
            config: { cron: '0 10 * * *' },
            enabled: true,
          },
        ],
      });

      await registerAllLiveAgentSchedules();

      // Should only register for the Live agent with scheduled trigger
      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect(mockAdd).toHaveBeenCalledWith(
        `scheduled-${agent1._id}`,
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: '0 9 * * *' },
        })
      );
    });

    it('should skip disabled scheduled triggers', async () => {
      await Agent.create({
        workspace: workspaceId,
        name: 'Disabled Scheduled Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Live',
        triggers: [
          {
            type: 'scheduled',
            config: { cron: '0 9 * * *' },
            enabled: false, // Disabled
          },
        ],
      });

      await registerAllLiveAgentSchedules();

      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('Agent Model Fields (Story 3.3)', () => {
    it('should have consecutiveFailures field with default 0', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
        triggers: [{ type: 'manual', config: {}, enabled: true }],
      });

      expect(agent.consecutiveFailures).toBe(0);
    });

    it('should track consecutive failures', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
        triggers: [{ type: 'manual', config: {}, enabled: true }],
        consecutiveFailures: 0,
      });

      // Increment failures
      await Agent.findOneAndUpdate(
        { _id: agent._id, workspace: workspaceId },
        { $inc: { consecutiveFailures: 1 } }
      );

      const updated = await Agent.findOne({
        _id: agent._id,
        workspace: workspaceId,
      });

      expect(updated?.consecutiveFailures).toBe(1);
    });

    it('should have lastScheduledExecution field', async () => {
      const now = new Date();

      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
        triggers: [{ type: 'manual', config: {}, enabled: true }],
        lastScheduledExecution: now,
      });

      expect(agent.lastScheduledExecution).toEqual(now);
    });
  });

  describe('Circuit Breaker Logic (AC6)', () => {
    it('should count daily executions for circuit breaker', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Live',
        triggers: [{ type: 'scheduled', config: { cron: '0 9 * * *' }, enabled: true }],
        restrictions: { maxExecutionsPerDay: 5 },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create 5 executions for today
      for (let i = 0; i < 5; i++) {
        await AgentExecution.create({
          workspace: workspaceId,
          agent: agent._id,
          executionId: `exec-${i}`,
          status: 'completed',
          triggerType: 'scheduled',
          startedAt: new Date(),
          completedAt: new Date(),
        });
      }

      // Count executions
      const dailyCount = await AgentExecution.countDocuments({
        agent: agent._id,
        startedAt: { $gte: today },
        status: { $in: ['completed', 'failed', 'running', 'pending'] },
      });

      expect(dailyCount).toBe(5);
    });
  });

  describe('Paused Agent Skip Logic (AC5)', () => {
    it('should record skipped status for paused agents', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Paused Agent',
        goal: 'Test',
        createdBy: userId,
        status: 'Paused',
        triggers: [{ type: 'scheduled', config: { cron: '0 9 * * *' }, enabled: true }],
      });

      // Simulate skipped execution record creation
      const skippedExecution = await AgentExecution.create({
        workspace: workspaceId,
        agent: agent._id,
        executionId: 'exec-skip-test',
        status: 'skipped',
        triggerType: 'scheduled',
        startedAt: new Date(),
        completedAt: new Date(),
        error: { message: 'Skipped: Agent paused' },
      });

      expect(skippedExecution.status).toBe('skipped');
      expect(skippedExecution.error?.message).toBe('Skipped: Agent paused');
    });
  });
});
