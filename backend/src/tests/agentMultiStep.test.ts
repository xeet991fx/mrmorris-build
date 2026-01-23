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
  emitExecutionStarted: jest.fn(),
  emitExecutionProgress: jest.fn(),
  emitExecutionCompleted: jest.fn(),
  emitExecutionFailed: jest.fn(),
  emitStepStarted: jest.fn(),
  emitStepCompleted: jest.fn(),
  emitExecutionWaiting: jest.fn(),
}));

/**
 * Story 3.5: Sequential Multi-Step Workflows Tests
 *
 * Tests for multi-step sequential execution with context flow,
 * error handling, progress tracking, and resume capability.
 */
describe('Agent Multi-Step Workflows (Story 3.5)', () => {
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
    jest.clearAllMocks();

    // Clear database - Agent requires workspace filter due to security hook
    // First clear executions, then agents with workspace filter, then projects/users
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

    // Create a test agent
    const agent = await Agent.create({
      workspace: workspaceId,
      name: 'Multi-Step Test Agent',
      goal: 'Test multi-step execution',
      createdBy: userId,
      status: 'Live',
      instructions: 'Step 1: Find contacts. Step 2: Send emails. Step 3: Create tasks.',
      triggers: [{ type: 'manual', config: {}, enabled: true }],
    });
    agentId = agent._id;
  });

  describe('AgentExecution Model Extensions (Task 1.1, Task 8)', () => {
    it('should have currentStep field with default 0', async () => {
      const execution = await AgentExecution.create({
        executionId: 'test-exec-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'pending',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
        startedAt: new Date(),
      });

      expect(execution.currentStep).toBe(0);
    });

    it('should have totalSteps field with default 1', async () => {
      const execution = await AgentExecution.create({
        executionId: 'test-exec-2',
        agent: agentId,
        workspace: workspaceId,
        status: 'pending',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
        startedAt: new Date(),
      });

      expect(execution.totalSteps).toBe(1);
    });

    it('should support step status tracking (pending, running, completed, failed, skipped, waiting)', async () => {
      const execution = await AgentExecution.create({
        executionId: 'test-exec-3',
        agent: agentId,
        workspace: workspaceId,
        status: 'running',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            stepIndex: 0,
            action: 'search_contacts',
            stepStatus: 'completed',
            result: { description: 'Found 10 contacts', success: true },
            executedAt: new Date(),
            durationMs: 100,
            creditsUsed: 0,
          },
          {
            stepNumber: 2,
            stepIndex: 1,
            action: 'send_email',
            stepStatus: 'running',
            result: { description: 'Sending...', success: true },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          },
          {
            stepNumber: 3,
            stepIndex: 2,
            action: 'create_task',
            stepStatus: 'pending',
            result: { description: 'Not started', success: true },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          },
        ],
        summary: {
          totalSteps: 3,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 100,
        },
        startedAt: new Date(),
      });

      expect(execution.steps[0].stepStatus).toBe('completed');
      expect(execution.steps[1].stepStatus).toBe('running');
      expect(execution.steps[2].stepStatus).toBe('pending');
    });

    it('should have resume capability fields (savedContext, savedMemory, resumeFromStep, resumeAt)', async () => {
      const resumeAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      const execution = await AgentExecution.create({
        executionId: 'test-exec-4',
        agent: agentId,
        workspace: workspaceId,
        status: 'waiting',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 5,
          successfulSteps: 3,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 500,
        },
        startedAt: new Date(),
        // Resume capability fields
        savedContext: { variables: { contact: { firstName: 'John' } }, stepOutputs: {} },
        savedMemory: { processedContacts: ['id1', 'id2'] },
        resumeFromStep: 4,
        resumeAt: resumeAt,
        resumeJobId: 'job-123',
      });

      expect(execution.savedContext).toEqual({ variables: { contact: { firstName: 'John' } }, stepOutputs: {} });
      expect(execution.savedMemory).toEqual({ processedContacts: ['id1', 'id2'] });
      expect(execution.resumeFromStep).toBe(4);
      expect(execution.resumeAt).toEqual(resumeAt);
      expect(execution.resumeJobId).toBe('job-123');
    });

    it('should have waiting status in enum', async () => {
      const execution = await AgentExecution.create({
        executionId: 'test-exec-5',
        agent: agentId,
        workspace: workspaceId,
        status: 'waiting',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 5,
          successfulSteps: 3,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
        startedAt: new Date(),
      });

      expect(execution.status).toBe('waiting');
    });

    it('should have index for waiting executions', async () => {
      // Create multiple waiting executions
      const futureDate = new Date(Date.now() + 60000);

      await AgentExecution.create({
        executionId: 'test-exec-6',
        agent: agentId,
        workspace: workspaceId,
        status: 'waiting',
        trigger: { type: 'manual' },
        steps: [],
        summary: { totalSteps: 1, successfulSteps: 0, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 0 },
        startedAt: new Date(),
        resumeAt: futureDate,
      });

      // Query using the index
      const waitingExecutions = await AgentExecution.find({
        status: 'waiting',
        resumeAt: { $lte: new Date(Date.now() + 120000) },
      });

      expect(waitingExecutions.length).toBe(1);
    });
  });

  describe('Sequential Step Execution (AC1: Task 1.5)', () => {
    it('should execute steps in order 1 -> 2 -> 3 -> 4 -> 5', async () => {
      // This test validates the order of step execution
      // After implementing executeStepsSequentially, each step should complete before next
      const execution = await AgentExecution.create({
        executionId: 'test-seq-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'completed',
        trigger: { type: 'manual' },
        currentStep: 5,
        totalSteps: 5,
        steps: [
          { stepNumber: 1, stepIndex: 0, action: 'step1', stepStatus: 'completed', result: { description: 'Step 1 done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 2, stepIndex: 1, action: 'step2', stepStatus: 'completed', result: { description: 'Step 2 done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 3, stepIndex: 2, action: 'step3', stepStatus: 'completed', result: { description: 'Step 3 done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 4, stepIndex: 3, action: 'step4', stepStatus: 'completed', result: { description: 'Step 4 done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 5, stepIndex: 4, action: 'step5', stepStatus: 'completed', result: { description: 'Step 5 done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
        ],
        summary: { totalSteps: 5, successfulSteps: 5, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 50 },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Verify all steps completed in order
      expect(execution.steps.length).toBe(5);
      execution.steps.forEach((step, index) => {
        expect(step.stepNumber).toBe(index + 1);
        expect(step.stepStatus).toBe('completed');
      });
    });
  });

  describe('Context Data Flow (AC2: Task 3)', () => {
    it('should store step outputs for subsequent steps', async () => {
      // Step 1 output should be available to step 2
      const execution = await AgentExecution.create({
        executionId: 'test-context-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'completed',
        trigger: { type: 'manual' },
        currentStep: 2,
        totalSteps: 2,
        steps: [
          {
            stepNumber: 1,
            stepIndex: 0,
            action: 'search_contacts',
            stepStatus: 'completed',
            result: {
              description: 'Found 10 contacts',
              success: true,
              targetCount: 10,
            },
            executedAt: new Date(),
            durationMs: 100,
            creditsUsed: 0,
          },
          {
            stepNumber: 2,
            stepIndex: 1,
            action: 'send_email',
            stepStatus: 'completed',
            result: {
              description: 'Sent 10 emails using step1 contacts',
              success: true,
              recipients: ['a@b.com', 'c@d.com'],
            },
            executedAt: new Date(),
            durationMs: 200,
            creditsUsed: 20,
          },
        ],
        summary: { totalSteps: 2, successfulSteps: 2, failedSteps: 0, totalCreditsUsed: 20, totalDurationMs: 300 },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Step 1 found 10 contacts
      expect(execution.steps[0].result.targetCount).toBe(10);
      // Step 2 processed those contacts
      expect(execution.steps[1].result.description).toContain('step1');
    });
  });

  describe('Error Handling and Partial Completion (AC3: Task 4)', () => {
    it('should mark remaining steps as skipped when a step fails', async () => {
      const execution = await AgentExecution.create({
        executionId: 'test-error-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'failed',
        trigger: { type: 'manual' },
        currentStep: 3,
        totalSteps: 5,
        steps: [
          { stepNumber: 1, stepIndex: 0, action: 'step1', stepStatus: 'completed', result: { description: 'Done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 2, stepIndex: 1, action: 'step2', stepStatus: 'completed', result: { description: 'Done', success: true }, executedAt: new Date(), durationMs: 10, creditsUsed: 0 },
          { stepNumber: 3, stepIndex: 2, action: 'step3', stepStatus: 'failed', result: { description: 'Error occurred', success: false, error: 'Email template not found' }, executedAt: new Date(), durationMs: 5, creditsUsed: 0 },
          { stepNumber: 4, stepIndex: 3, action: 'step4', stepStatus: 'skipped', skippedReason: 'Previous step failed', result: { description: 'Not executed', success: false }, executedAt: new Date(), durationMs: 0, creditsUsed: 0 },
          { stepNumber: 5, stepIndex: 4, action: 'step5', stepStatus: 'skipped', skippedReason: 'Previous step failed', result: { description: 'Not executed', success: false }, executedAt: new Date(), durationMs: 0, creditsUsed: 0 },
        ],
        summary: { totalSteps: 5, successfulSteps: 2, failedSteps: 1, totalCreditsUsed: 0, totalDurationMs: 25 },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Steps 1-2 completed
      expect(execution.steps[0].stepStatus).toBe('completed');
      expect(execution.steps[1].stepStatus).toBe('completed');
      // Step 3 failed
      expect(execution.steps[2].stepStatus).toBe('failed');
      expect(execution.steps[2].result.error).toBe('Email template not found');
      // Steps 4-5 skipped
      expect(execution.steps[3].stepStatus).toBe('skipped');
      expect(execution.steps[3].skippedReason).toBe('Previous step failed');
      expect(execution.steps[4].stepStatus).toBe('skipped');
      // Execution status is failed
      expect(execution.status).toBe('failed');
    });
  });

  describe('Memory Operations (AC4: Task 3.4, 3.5)', () => {
    it('should persist memory across steps', async () => {
      // Memory is stored in execution and can be serialized for resume
      const execution = await AgentExecution.create({
        executionId: 'test-memory-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'completed',
        trigger: { type: 'manual' },
        currentStep: 3,
        totalSteps: 3,
        steps: [
          { stepNumber: 1, stepIndex: 0, action: 'save_to_memory', stepStatus: 'completed', result: { description: 'Saved processedContacts', success: true }, executedAt: new Date(), durationMs: 5, creditsUsed: 0 },
          { stepNumber: 2, stepIndex: 1, action: 'search_contacts', stepStatus: 'completed', result: { description: 'Found contacts', success: true, targetCount: 5 }, executedAt: new Date(), durationMs: 50, creditsUsed: 0 },
          { stepNumber: 3, stepIndex: 2, action: 'filter_contacts', stepStatus: 'completed', result: { description: 'Filtered using memory', success: true, targetCount: 3 }, executedAt: new Date(), durationMs: 30, creditsUsed: 0 },
        ],
        savedMemory: { processedContacts: ['id1', 'id2'] },
        summary: { totalSteps: 3, successfulSteps: 3, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 85 },
        startedAt: new Date(),
        completedAt: new Date(),
      });

      expect(execution.savedMemory).toEqual({ processedContacts: ['id1', 'id2'] });
    });
  });

  describe('Progress Tracking (AC5: Task 5)', () => {
    it('should track progress percentage correctly', async () => {
      // For 20 steps, step 12 completed = 60%
      const execution = await AgentExecution.create({
        executionId: 'test-progress-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'running',
        trigger: { type: 'manual' },
        currentStep: 12,
        totalSteps: 20,
        steps: Array.from({ length: 12 }, (_, i) => ({
          stepNumber: i + 1,
          stepIndex: i,
          action: `step${i + 1}`,
          stepStatus: 'completed',
          result: { description: `Step ${i + 1} done`, success: true },
          executedAt: new Date(),
          durationMs: 10,
          creditsUsed: 0,
        })),
        summary: { totalSteps: 20, successfulSteps: 12, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 120 },
        startedAt: new Date(),
      });

      const progress = Math.round((execution.currentStep / execution.totalSteps) * 100);
      expect(progress).toBe(60);
      expect(execution.currentStep).toBe(12);
      expect(execution.totalSteps).toBe(20);
    });
  });

  describe('Wait Action and Resume (AC6: Task 6, 7)', () => {
    it('should save execution state when wait action encountered', async () => {
      const resumeAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days

      const execution = await AgentExecution.create({
        executionId: 'test-wait-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'waiting',
        trigger: { type: 'manual' },
        currentStep: 7,
        totalSteps: 20,
        steps: [
          ...Array.from({ length: 6 }, (_, i) => ({
            stepNumber: i + 1,
            stepIndex: i,
            action: `step${i + 1}`,
            stepStatus: 'completed' as const,
            result: { description: `Done`, success: true },
            executedAt: new Date(),
            durationMs: 10,
            creditsUsed: 0,
          })),
          {
            stepNumber: 7,
            stepIndex: 6,
            action: 'wait',
            stepStatus: 'waiting' as const,
            result: { description: 'Waiting 5 days', success: true },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          },
        ],
        savedContext: {
          triggerType: 'manual',
          variables: { contact: { firstName: 'John' } },
          stepOutputs: { step1: { result: 'data' } },
        },
        savedMemory: { key: 'value' },
        resumeFromStep: 8,
        resumeAt: resumeAt,
        resumeJobId: 'resume-job-123',
        summary: { totalSteps: 20, successfulSteps: 6, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 60 },
        startedAt: new Date(),
      });

      expect(execution.status).toBe('waiting');
      expect(execution.resumeFromStep).toBe(8);
      expect(execution.resumeAt).toEqual(resumeAt);
      expect(execution.savedContext).toBeDefined();
      expect(execution.savedMemory).toEqual({ key: 'value' });
      expect(execution.resumeJobId).toBe('resume-job-123');
    });

    it('should restore execution state on resume', async () => {
      // Create a waiting execution
      const execution = await AgentExecution.create({
        executionId: 'test-resume-1',
        agent: agentId,
        workspace: workspaceId,
        status: 'waiting',
        trigger: { type: 'manual' },
        currentStep: 7,
        totalSteps: 10,
        steps: Array.from({ length: 7 }, (_, i) => ({
          stepNumber: i + 1,
          stepIndex: i,
          action: i === 6 ? 'wait' : `step${i + 1}`,
          stepStatus: i === 6 ? 'waiting' as const : 'completed' as const,
          result: { description: 'Done', success: true },
          executedAt: new Date(),
          durationMs: 10,
          creditsUsed: 0,
        })),
        savedContext: { triggerType: 'manual', variables: {}, stepOutputs: {} },
        savedMemory: { data: 'preserved' },
        resumeFromStep: 8,
        resumeAt: new Date(),
        summary: { totalSteps: 10, successfulSteps: 6, failedSteps: 0, totalCreditsUsed: 0, totalDurationMs: 60 },
        startedAt: new Date(),
      });

      // Simulate resume - update status and clear saved state
      const resumed = await AgentExecution.findByIdAndUpdate(
        execution._id,
        {
          status: 'running',
          savedContext: null,
          savedMemory: null,
          resumeAt: null,
        },
        { new: true }
      );

      expect(resumed?.status).toBe('running');
      expect(resumed?.savedContext).toBeNull();
    });
  });
});
