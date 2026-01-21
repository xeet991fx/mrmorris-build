import mongoose from 'mongoose';
import { ExecutionComparisonService } from './ExecutionComparisonService';
import AgentTestRun from '../models/AgentTestRun';
import AgentExecution from '../models/AgentExecution';

describe('ExecutionComparisonService', () => {
  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/test-comparison-service'
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AgentTestRun.deleteMany({});
    await AgentExecution.deleteMany({});
  });

  describe('compareTestToLive', () => {
    it('should return 100% match when predictions match actual results', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const testRunId = 'test_match_001';
      const executionId = 'exec_match_001';

      // Create test run with predictions
      await AgentTestRun.create({
        testRunId,
        agent: agentId,
        workspace: workspaceId,
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

      // Create execution with matching results
      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: testRunId,
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
        startedAt: new Date(),
      });

      const result = await ExecutionComparisonService.compareTestToLive(
        testRunId,
        executionId
      );

      expect(result.matchPercentage).toBe(100);
      expect(result.overallMatch).toBe(true);
      expect(result.stepComparisons).toHaveLength(1);
      expect(result.stepComparisons[0].match).toBe(true);
    });

    it('should detect target count mismatch (AC3)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const testRunId = 'test_count_mismatch';
      const executionId = 'exec_count_mismatch';

      await AgentTestRun.create({
        testRunId,
        agent: agentId,
        workspace: workspaceId,
        steps: [
          {
            stepNumber: 1,
            action: 'update_contacts',
            prediction: {
              targetCount: 5,
              description: 'Would update 5 contacts',
            },
            status: 'success',
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          estimatedCredits: 2,
          estimatedDurationMs: 1000,
        },
      });

      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: testRunId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            action: 'update_contacts',
            result: {
              targetCount: 3,
              description: 'Updated 3 contacts',
              success: true,
            },
            executedAt: new Date(),
            durationMs: 800,
            creditsUsed: 2,
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 2,
          totalDurationMs: 800,
        },
        startedAt: new Date(),
      });

      const result = await ExecutionComparisonService.compareTestToLive(
        testRunId,
        executionId
      );

      expect(result.matchPercentage).toBe(0);
      expect(result.overallMatch).toBe(false);
      expect(result.stepComparisons[0].match).toBe(false);
      expect(result.stepComparisons[0].mismatchReason).toContain('Target count mismatch');
      expect(result.stepComparisons[0].mismatchReason).toContain('predicted 5');
      expect(result.stepComparisons[0].mismatchReason).toContain('got 3');
    });

    it('should detect recipient mismatch (AC2)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const testRunId = 'test_recipient_mismatch';
      const executionId = 'exec_recipient_mismatch';

      await AgentTestRun.create({
        testRunId,
        agent: agentId,
        workspace: workspaceId,
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            prediction: {
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

      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: testRunId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            result: {
              recipients: ['jane@acme.com'],
              description: 'Sent email to jane@acme.com',
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
        startedAt: new Date(),
      });

      const result = await ExecutionComparisonService.compareTestToLive(
        testRunId,
        executionId
      );

      expect(result.overallMatch).toBe(false);
      expect(result.stepComparisons[0].mismatchReason).toBe('Recipient mismatch');
    });

    it('should detect condition evaluation mismatch (AC4)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const testRunId = 'test_condition_mismatch';
      const executionId = 'exec_condition_mismatch';

      await AgentTestRun.create({
        testRunId,
        agent: agentId,
        workspace: workspaceId,
        steps: [
          {
            stepNumber: 1,
            action: 'conditional',
            prediction: {
              conditionResult: true,
              description: 'If status == "new" (would evaluate to true)',
            },
            status: 'success',
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          estimatedCredits: 0,
          estimatedDurationMs: 100,
        },
      });

      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: testRunId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            action: 'conditional',
            result: {
              conditionResult: false,
              description: 'If status == "new" (evaluated to false)',
              success: true,
            },
            executedAt: new Date(),
            durationMs: 50,
            creditsUsed: 0,
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 50,
        },
        startedAt: new Date(),
      });

      const result = await ExecutionComparisonService.compareTestToLive(
        testRunId,
        executionId
      );

      expect(result.overallMatch).toBe(false);
      expect(result.stepComparisons[0].mismatchReason).toContain('Condition evaluation mismatch');
    });

    it('should add stale data warning when time difference exceeds 1 hour (AC7)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const testRunId = 'test_stale_data';
      const executionId = 'exec_stale_data';

      const testTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      await AgentTestRun.create({
        testRunId,
        agent: agentId,
        workspace: workspaceId,
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            prediction: { description: 'Would send email' },
            status: 'success',
          },
        ],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          estimatedCredits: 5,
          estimatedDurationMs: 2000,
        },
        createdAt: testTime,
      });

      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        linkedTestRunId: testRunId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [
          {
            stepNumber: 1,
            action: 'send_email',
            result: { description: 'Sent email', success: true },
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
        startedAt: new Date(),
      });

      const result = await ExecutionComparisonService.compareTestToLive(
        testRunId,
        executionId
      );

      expect(result.staleDataWarning).toBe(true);
      expect(result.possibleReasons).toContain(
        'Data may have changed between test and live run'
      );
    });

    it('should throw error when test run not found', async () => {
      await expect(
        ExecutionComparisonService.compareTestToLive('nonexistent', 'exec_123')
      ).rejects.toThrow('Test run or execution not found');
    });
  });

  describe('calculateAgentAccuracy', () => {
    it('should return 100% when no comparisons exist', async () => {
      const result = await ExecutionComparisonService.calculateAgentAccuracy(
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      );

      expect(result.accuracy).toBe(100);
      expect(result.totalComparisons).toBe(0);
      expect(result.status).toBe('healthy');
    });

    it('should calculate accuracy from multiple comparisons (AC6)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();

      // Create 5 executions with varying match percentages
      for (let i = 0; i < 5; i++) {
        await AgentExecution.create({
          executionId: `exec_accuracy_${i}`,
          agent: agentId,
          workspace: workspaceId,
          linkedTestRunId: `test_accuracy_${i}`,
          status: 'completed',
          trigger: { type: 'manual' },
          steps: [],
          summary: {
            totalSteps: 1,
            successfulSteps: 1,
            failedSteps: 0,
            totalCreditsUsed: 1,
            totalDurationMs: 100,
          },
          comparison: {
            linkedTestRunId: `test_accuracy_${i}`,
            overallMatch: i < 4, // First 4 match, last one doesn't
            matchPercentage: i < 4 ? 100 : 50,
            mismatches: [],
          },
          startedAt: new Date(),
        });
      }

      const result = await ExecutionComparisonService.calculateAgentAccuracy(
        agentId.toString(),
        workspaceId.toString()
      );

      expect(result.totalComparisons).toBe(5);
      expect(result.matchingComparisons).toBe(4);
      expect(result.accuracy).toBe(80);
    });

    it('should mark as degraded when accuracy falls below 90% (AC8)', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();

      // Create 10 executions with 8 failures (20% accuracy)
      for (let i = 0; i < 10; i++) {
        await AgentExecution.create({
          executionId: `exec_degraded_${i}`,
          agent: agentId,
          workspace: workspaceId,
          linkedTestRunId: `test_degraded_${i}`,
          status: 'completed',
          trigger: { type: 'manual' },
          steps: [],
          summary: {
            totalSteps: 1,
            successfulSteps: 1,
            failedSteps: 0,
            totalCreditsUsed: 1,
            totalDurationMs: 100,
          },
          comparison: {
            linkedTestRunId: `test_degraded_${i}`,
            overallMatch: i < 2, // Only first 2 match
            matchPercentage: i < 2 ? 100 : 50,
            mismatches: [],
          },
          startedAt: new Date(),
        });
      }

      const result = await ExecutionComparisonService.calculateAgentAccuracy(
        agentId.toString(),
        workspaceId.toString()
      );

      expect(result.accuracy).toBe(20);
      expect(result.status).toBe('degraded');
      expect(result.message).toContain('accuracy degraded');
    });
  });

  describe('storeComparisonResult', () => {
    it('should update execution document with comparison data', async () => {
      const agentId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();
      const executionId = 'exec_store_comparison';

      await AgentExecution.create({
        executionId,
        agent: agentId,
        workspace: workspaceId,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        summary: {
          totalSteps: 1,
          successfulSteps: 1,
          failedSteps: 0,
          totalCreditsUsed: 1,
          totalDurationMs: 100,
        },
        startedAt: new Date(),
      });

      await ExecutionComparisonService.storeComparisonResult(executionId, {
        testRunId: 'test_123',
        executionId,
        overallMatch: false,
        matchPercentage: 75,
        stepComparisons: [
          {
            stepNumber: 1,
            action: 'send_email',
            match: false,
            predicted: { description: 'Would send to A' },
            actual: { description: 'Sent to B' },
            mismatchReason: 'Recipient mismatch',
          },
        ],
        possibleReasons: [],
        staleDataWarning: false,
        timeBetweenTestAndLive: 1000,
      });

      const updated = await AgentExecution.findOne({ executionId });
      expect(updated?.comparison?.linkedTestRunId).toBe('test_123');
      expect(updated?.comparison?.overallMatch).toBe(false);
      expect(updated?.comparison?.matchPercentage).toBe(75);
      expect(updated?.comparison?.mismatches).toHaveLength(1);
    });
  });
});
