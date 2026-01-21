/**
 * ExecutionComparisonService.ts - Story 2.7: Compare Test vs Live Results
 *
 * Compares test run predictions to actual live execution results.
 * Tracks accuracy metrics per NFR36 (95% target).
 */

import AgentTestRun, { IAgentTestRun } from '../models/AgentTestRun';
import AgentExecution, { IAgentExecution } from '../models/AgentExecution';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ComparisonResult {
  testRunId: string;
  executionId: string;
  overallMatch: boolean;
  matchPercentage: number;
  stepComparisons: Array<{
    stepNumber: number;
    action: string;
    match: boolean;
    predicted: {
      targetCount?: number;
      recipients?: string[];
      conditionResult?: boolean;
      description: string;
    };
    actual: {
      targetCount?: number;
      recipients?: string[];
      conditionResult?: boolean;
      description: string;
    };
    mismatchReason?: string;
  }>;
  possibleReasons: string[];
  staleDataWarning: boolean;
  timeBetweenTestAndLive: number; // milliseconds
}

export interface AgentAccuracyMetrics {
  accuracy: number;
  totalComparisons: number;
  matchingComparisons: number;
  status: 'healthy' | 'degraded';
  message: string;
}

// =============================================================================
// EXECUTION COMPARISON SERVICE
// =============================================================================

export class ExecutionComparisonService {
  /**
   * Compare a test run prediction to actual live execution results.
   * AC1, AC2, AC3, AC4, AC5 - Step-by-step comparison with mismatch detection.
   */
  static async compareTestToLive(
    testRunId: string,
    executionId: string
  ): Promise<ComparisonResult> {
    const testRun = await AgentTestRun.findOne({ testRunId }).lean();
    const execution = await AgentExecution.findOne({ executionId }).lean();

    if (!testRun || !execution) {
      throw new Error('Test run or execution not found');
    }

    const stepComparisons: ComparisonResult['stepComparisons'] = [];
    let matchCount = 0;
    const totalSteps = Math.max(testRun.steps.length, execution.steps.length);

    // Compare each step
    for (let i = 0; i < totalSteps; i++) {
      const predicted = testRun.steps[i];
      const actual = execution.steps[i];

      if (!predicted || !actual) {
        stepComparisons.push({
          stepNumber: i + 1,
          action: predicted?.action || actual?.action || 'unknown',
          match: false,
          predicted: predicted?.prediction || { description: 'Not predicted' },
          actual: actual?.result || { description: 'Not executed' },
          mismatchReason: !predicted ? 'Step not in test' : 'Step not executed',
        });
        continue;
      }

      const match = this.compareStep(predicted, actual);
      if (match.isMatch) matchCount++;

      stepComparisons.push({
        stepNumber: i + 1,
        action: predicted.action,
        match: match.isMatch,
        predicted: predicted.prediction,
        actual: actual.result,
        mismatchReason: match.reason,
      });
    }

    // Calculate time between test and execution (AC7: Stale data warning)
    const timeBetween =
      new Date(execution.startedAt).getTime() -
      new Date(testRun.createdAt).getTime();
    const staleDataWarning = timeBetween > 60 * 60 * 1000; // > 1 hour

    // Build possible reasons for mismatches (AC5: Mismatch detection)
    const possibleReasons: string[] = [];
    if (staleDataWarning) {
      possibleReasons.push(
        'Data may have changed between test and live run'
      );
    }
    if (stepComparisons.some((s) => s.mismatchReason?.includes('count'))) {
      possibleReasons.push(
        'Record counts differ - contacts/deals may have been added or removed'
      );
    }
    if (stepComparisons.some((s) => s.mismatchReason?.includes('condition'))) {
      possibleReasons.push(
        'Condition evaluated differently - check field values at execution time'
      );
    }
    if (stepComparisons.some((s) => s.mismatchReason?.includes('Recipient'))) {
      possibleReasons.push(
        'Recipient lists differ - contact data may have been updated'
      );
    }

    const matchPercentage = totalSteps > 0 ? (matchCount / totalSteps) * 100 : 100;

    return {
      testRunId,
      executionId,
      overallMatch: matchPercentage >= 95, // NFR36: 95% accuracy threshold
      matchPercentage,
      stepComparisons,
      possibleReasons,
      staleDataWarning,
      timeBetweenTestAndLive: timeBetween,
    };
  }

  /**
   * Compare individual step prediction to actual result.
   * AC2, AC3, AC4 - Email accuracy, contact count accuracy, conditional logic consistency.
   */
  private static compareStep(
    predicted: IAgentTestRun['steps'][0],
    actual: IAgentExecution['steps'][0]
  ): { isMatch: boolean; reason?: string } {
    // Compare action type
    if (predicted.action !== actual.action) {
      return { isMatch: false, reason: 'Action type mismatch' };
    }

    // AC3: Compare target counts (with tolerance for dynamic data)
    if (
      predicted.prediction.targetCount !== undefined &&
      actual.result.targetCount !== undefined
    ) {
      if (predicted.prediction.targetCount !== actual.result.targetCount) {
        return {
          isMatch: false,
          reason: `Target count mismatch: predicted ${predicted.prediction.targetCount}, got ${actual.result.targetCount}`,
        };
      }
    }

    // AC2: Compare recipients (email accuracy)
    if (predicted.prediction.recipients && actual.result.recipients) {
      const predictedSet = new Set(predicted.prediction.recipients);
      const actualSet = new Set(actual.result.recipients);
      if (!this.setsEqual(predictedSet, actualSet)) {
        return {
          isMatch: false,
          reason: 'Recipient mismatch',
        };
      }
    }

    // AC4: Compare condition results (conditional logic consistency)
    if (
      predicted.prediction.conditionResult !== undefined &&
      actual.result.conditionResult !== undefined
    ) {
      if (
        predicted.prediction.conditionResult !== actual.result.conditionResult
      ) {
        return {
          isMatch: false,
          reason: `Condition evaluation mismatch: predicted ${predicted.prediction.conditionResult}, got ${actual.result.conditionResult}`,
        };
      }
    }

    return { isMatch: true };
  }

  /**
   * Utility: Check if two sets are equal.
   */
  private static setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  /**
   * Calculate overall accuracy for an agent.
   * AC6, AC8 - Accuracy metric tracking with degradation alerts.
   */
  static async calculateAgentAccuracy(
    agentId: string,
    workspaceId: string
  ): Promise<AgentAccuracyMetrics> {
    const executions = await AgentExecution.find({
      agent: agentId,
      workspace: workspaceId,
      linkedTestRunId: { $exists: true, $ne: null },
      'comparison.matchPercentage': { $exists: true },
    }).lean();

    if (executions.length === 0) {
      return {
        accuracy: 100,
        totalComparisons: 0,
        matchingComparisons: 0,
        status: 'healthy',
        message: 'No test comparisons available yet',
      };
    }

    const matchingComparisons = executions.filter(
      (e) => e.comparison && e.comparison.matchPercentage >= 95
    ).length;

    const accuracy = (matchingComparisons / executions.length) * 100;

    // AC8: Check if accuracy is degraded (below 90%)
    const degraded = accuracy < 90 && executions.length >= 5;

    return {
      accuracy,
      totalComparisons: executions.length,
      matchingComparisons,
      status: degraded ? 'degraded' : 'healthy',
      message: degraded
        ? 'Test Mode accuracy degraded. Review instruction parsing service.'
        : `Test predictions match live results ${accuracy.toFixed(1)}% of time`,
    };
  }

  /**
   * Store comparison result in execution record.
   * Updates the AgentExecution document with comparison data.
   */
  static async storeComparisonResult(
    executionId: string,
    comparison: ComparisonResult
  ): Promise<void> {
    await AgentExecution.findOneAndUpdate(
      { executionId },
      {
        $set: {
          comparison: {
            linkedTestRunId: comparison.testRunId,
            overallMatch: comparison.overallMatch,
            matchPercentage: comparison.matchPercentage,
            mismatches: comparison.stepComparisons
              .filter((step) => !step.match)
              .map((step) => ({
                stepNumber: step.stepNumber,
                predicted: step.predicted.description,
                actual: step.actual.description,
                reason: step.mismatchReason || 'Unknown mismatch',
              })),
          },
        },
      }
    );
  }
}

export default ExecutionComparisonService;
