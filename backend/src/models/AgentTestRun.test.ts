import mongoose from 'mongoose';
import AgentTestRun, { IAgentTestRun } from './AgentTestRun';

describe('AgentTestRun Model', () => {
  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/test-agent-testrun'
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AgentTestRun.deleteMany({});
  });

  describe('Creation', () => {
    it('should create a test run with all required fields', async () => {
      const testRun = await AgentTestRun.create({
        testRunId: 'test_123456789_abc123',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            prediction: {
              targetCount: 1,
              recipients: ['john@acme.com'],
              description: 'Would send email to john@acme.com',
            },
            status: 'success',
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          estimatedCredits: 5,
          estimatedDurationMs: 2000,
        },
      });

      expect(testRun.testRunId).toBe('test_123456789_abc123');
      expect(testRun.steps).toHaveLength(1);
      expect(testRun.steps[0].prediction.recipients).toContain('john@acme.com');
      expect(testRun.summary.totalSteps).toBe(1);
    });

    it('should create a test run with test target', async () => {
      const testRun = await AgentTestRun.create({
        testRunId: 'test_target_run_001',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        testTarget: {
          type: 'contact',
          id: 'contact_12345',
          snapshotData: { email: 'test@example.com', name: 'Test User' },
        },
        steps: [
          {
            stepNumber: 1,
            action: 'update_field',
            prediction: {
              targetCount: 1,
              fieldUpdates: { status: 'qualified' },
              description: 'Would update contact status to qualified',
            },
            status: 'success',
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          estimatedCredits: 1,
          estimatedDurationMs: 500,
        },
      });

      expect(testRun.testTarget?.type).toBe('contact');
      expect(testRun.testTarget?.id).toBe('contact_12345');
      expect(testRun.testTarget?.snapshotData?.email).toBe('test@example.com');
    });

    it('should enforce unique testRunId', async () => {
      const baseData = {
        testRunId: 'test_unique_id',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          estimatedCredits: 0,
          estimatedDurationMs: 0,
        },
      };

      await AgentTestRun.create(baseData);

      await expect(AgentTestRun.create(baseData)).rejects.toThrow();
    });
  });

  describe('Querying', () => {
    it('should query by agent and workspace', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();

      await AgentTestRun.create({
        testRunId: 'test_query_001',
        agent: agentId,
        workspace: workspaceId,
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          estimatedCredits: 0,
          estimatedDurationMs: 0,
        },
      });

      await AgentTestRun.create({
        testRunId: 'test_query_002',
        agent: agentId,
        workspace: workspaceId,
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          estimatedCredits: 0,
          estimatedDurationMs: 0,
        },
      });

      const results = await AgentTestRun.find({ agent: agentId, workspace: workspaceId });
      expect(results).toHaveLength(2);
    });

    it('should find by testRunId', async () => {
      const testRunId = 'test_find_by_id_001';

      await AgentTestRun.create({
        testRunId,
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          estimatedCredits: 0,
          estimatedDurationMs: 0,
        },
      });

      const result = await AgentTestRun.findOne({ testRunId });
      expect(result).not.toBeNull();
      expect(result?.testRunId).toBe(testRunId);
    });
  });

  describe('Steps Validation', () => {
    it('should store multiple steps with different statuses', async () => {
      const testRun = await AgentTestRun.create({
        testRunId: 'test_multi_step',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            prediction: { description: 'Send welcome email' },
            status: 'success',
          },
          {
            stepNumber: 2,
            action: 'add_tag',
            prediction: { description: 'Add onboarded tag' },
            status: 'warning',
          },
          {
            stepNumber: 3,
            action: 'wait',
            prediction: { description: 'Wait 1 day' },
            status: 'skipped',
          },
        ],
        summary: {
          totalSteps: 3,
          successfulSteps: 1,
          estimatedCredits: 6,
          estimatedDurationMs: 3000,
        },
      });

      expect(testRun.steps).toHaveLength(3);
      expect(testRun.steps[0].status).toBe('success');
      expect(testRun.steps[1].status).toBe('warning');
      expect(testRun.steps[2].status).toBe('skipped');
    });

    it('should store condition results for conditional steps', async () => {
      const testRun = await AgentTestRun.create({
        testRunId: 'test_conditional',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        steps: [
          {
            stepNumber: 1,
            action: 'conditional',
            prediction: {
              conditionResult: true,
              description: 'If contact.status == "new" (evaluated to true)',
            },
            status: 'success',
          },
          {
            stepNumber: 2,
            action: 'send_email',
            prediction: {
              conditionResult: false,
              description: 'Skipped because parent condition was false',
            },
            status: 'skipped',
          },
        ],
        summary: {
          totalSteps: 2,
          successfulSteps: 1,
          estimatedCredits: 0,
          estimatedDurationMs: 100,
        },
      });

      expect(testRun.steps[0].prediction.conditionResult).toBe(true);
      expect(testRun.steps[1].prediction.conditionResult).toBe(false);
    });
  });
});
