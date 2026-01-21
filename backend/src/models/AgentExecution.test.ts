import mongoose from 'mongoose';
import AgentExecution, { IAgentExecution } from './AgentExecution';

describe('AgentExecution Model', () => {
  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/test-agent-execution'
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AgentExecution.deleteMany({});
  });

  describe('Creation', () => {
    it('should create an execution with all required fields', async () => {
      const execution = await AgentExecution.create({
        executionId: 'exec_123456789_abc123',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            result: {
              targetCount: 1,
              recipients: ['john@acme.com'],
              description: 'Sent email to john@acme.com',
              success: true,
            },
            executedAt: new Date(),
            durationMs: 1500,
            creditsUsed: 5,
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 5,
          totalDurationMs: 1500,
        },
      });

      expect(execution.executionId).toBe('exec_123456789_abc123');
      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(1);
      expect(execution.steps[0].result.recipients).toContain('john@acme.com');
    });

    it('should create an execution linked to a test run', async () => {
      const execution = await AgentExecution.create({
        executionId: 'exec_linked_001',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        linkedTestRunId: 'test_123456789_abc123',
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
      });

      expect(execution.linkedTestRunId).toBe('test_123456789_abc123');
    });

    it('should store comparison results', async () => {
      const execution = await AgentExecution.create({
        executionId: 'exec_with_comparison',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        linkedTestRunId: 'test_comparison_001',
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 3,
          successfulSteps: 3,
          failedSteps: 0,
          totalCreditsUsed: 10,
          totalDurationMs: 3000,
        },
        comparison: {
          linkedTestRunId: 'test_comparison_001',
          overallMatch: true,
          matchPercentage: 100,
          mismatches: [],
        },
      });

      expect(execution.comparison?.overallMatch).toBe(true);
      expect(execution.comparison?.matchPercentage).toBe(100);
    });

    it('should store comparison with mismatches', async () => {
      const execution = await AgentExecution.create({
        executionId: 'exec_with_mismatches',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        linkedTestRunId: 'test_mismatch_001',
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 3,
          successfulSteps: 2,
          failedSteps: 1,
          totalCreditsUsed: 8,
          totalDurationMs: 2500,
        },
        comparison: {
          linkedTestRunId: 'test_mismatch_001',
          overallMatch: false,
          matchPercentage: 66.7,
          mismatches: [
            {
              stepNumber: 2,
              predicted: 'Would update 5 contacts',
              actual: 'Updated 3 contacts',
              reason: 'Target count mismatch: predicted 5, got 3',
            },
          ],
        },
      });

      expect(execution.comparison?.overallMatch).toBe(false);
      expect(execution.comparison?.mismatches).toHaveLength(1);
      expect(execution.comparison?.mismatches[0].stepNumber).toBe(2);
    });

    it('should enforce unique executionId', async () => {
      const baseData = {
        executionId: 'exec_unique_id',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        status: 'pending' as const,
        trigger: { type: 'manual' as const },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
      };

      await AgentExecution.create(baseData);
      await expect(AgentExecution.create(baseData)).rejects.toThrow();
    });
  });

  describe('Querying', () => {
    it('should query by linkedTestRunId', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const testRunId = 'test_linked_query';

      await AgentExecution.create({
        executionId: 'exec_query_001',
        agent: agentId,
        workspace: new mongoose.Types.ObjectId(),
        linkedTestRunId: testRunId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
      });

      const result = await AgentExecution.findOne({ agent: agentId, linkedTestRunId: testRunId });
      expect(result).not.toBeNull();
      expect(result?.linkedTestRunId).toBe(testRunId);
    });

    it('should query executions with comparisons for accuracy calculation', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();

      // Create executions with varying match percentages
      await AgentExecution.create({
        executionId: 'exec_accuracy_001',
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: 'test_acc_001',
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 5,
          totalDurationMs: 1000,
        },
        comparison: { linkedTestRunId: 'test_acc_001', overallMatch: true, matchPercentage: 100, mismatches: [] },
      });

      await AgentExecution.create({
        executionId: 'exec_accuracy_002',
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: 'test_acc_002',
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 2,
          successfulSteps: 1,
          failedSteps: 1,
          totalCreditsUsed: 3,
          totalDurationMs: 1500,
        },
        comparison: {
          linkedTestRunId: 'test_acc_002',
          overallMatch: false,
          matchPercentage: 50,
          mismatches: [{ stepNumber: 2, predicted: 'A', actual: 'B', reason: 'Mismatch' }],
        },
      });

      const results = await AgentExecution.find({
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: { $exists: true, $ne: null },
        'comparison.matchPercentage': { $exists: true },
      });

      expect(results).toHaveLength(2);

      // Calculate accuracy
      const matchingComparisons = results.filter((e) => e.comparison && e.comparison.matchPercentage >= 95).length;
      const accuracy = (matchingComparisons / results.length) * 100;
      expect(accuracy).toBe(50);
    });
  });

  describe('Status Transitions', () => {
    it('should support all status values', async () => {
      const statuses: Array<'pending' | 'running' | 'completed' | 'failed' | 'cancelled'> = [
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
      ];

      for (const status of statuses) {
        const execution = await AgentExecution.create({
          executionId: `exec_status_${status}`,
          agent: new mongoose.Types.ObjectId(),
          workspace: new mongoose.Types.ObjectId(),
          status,
          trigger: { type: 'manual' },
          steps: [],
          summary: {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            totalCreditsUsed: 0,
            totalDurationMs: 0,
          },
        });

        expect(execution.status).toBe(status);
      }
    });
  });

  describe('Trigger Types', () => {
    it('should support all trigger types', async () => {
      const triggers: Array<'manual' | 'scheduled' | 'event'> = ['manual', 'scheduled', 'event'];

      for (const triggerType of triggers) {
        const execution = await AgentExecution.create({
          executionId: `exec_trigger_${triggerType}`,
          agent: new mongoose.Types.ObjectId(),
          workspace: new mongoose.Types.ObjectId(),
          status: 'completed',
          trigger: { type: triggerType },
          steps: [],
          summary: {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            totalCreditsUsed: 0,
            totalDurationMs: 0,
          },
        });

        expect(execution.trigger.type).toBe(triggerType);
      }
    });

    it('should store event trigger details', async () => {
      const execution = await AgentExecution.create({
        executionId: 'exec_event_trigger',
        agent: new mongoose.Types.ObjectId(),
        workspace: new mongoose.Types.ObjectId(),
        status: 'completed',
        trigger: {
          type: 'event',
          eventDetails: { eventType: 'contact_created', contactId: '12345' },
        },
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
      });

      expect(execution.trigger.eventDetails?.eventType).toBe('contact_created');
    });
  });
});
