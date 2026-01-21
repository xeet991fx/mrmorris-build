# Story 2.7: Compare Test vs Live Results

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-7-compare-test-vs-live-results
**Status:** ready-for-dev
**Priority:** High - Final story in Epic 2 for test accuracy validation (NFR36: 95% accuracy)
**FRs Covered:** FR42 (Compare test predictions to live execution results)

---

## User Story

**As a** workspace owner,
**I want to** verify that Test Mode predictions match actual live execution,
**So that** I can trust the test results.

---

## Acceptance Criteria

### AC1: Side-by-Side Comparison View

**Given** I run a test, then run the same agent live
**When** Both executions complete
**Then** I can compare test vs live results side-by-side

### AC2: Email Prediction Accuracy

**Given** Test Mode predicted "Would send email to john@acme.com"
**When** The agent runs live
**Then** Email is actually sent to john@acme.com
**And** The test prediction was accurate (matches live result)

### AC3: Contact Count Accuracy

**Given** Test Mode predicted "Would update 5 contacts"
**When** The agent runs live
**Then** Exactly 5 contacts are updated
**And** Test prediction matches live result

### AC4: Conditional Logic Consistency

**Given** Test Mode showed conditional logic skipping Step 4
**When** The agent runs live with same conditions
**Then** Step 4 is skipped in live execution too
**And** Condition evaluation is consistent

### AC5: Mismatch Detection and Warning

**Given** Test Mode and live execution have different results
**When** A mismatch is detected (e.g., test said 5 contacts, live found 3)
**Then** I see a warning: "⚠️ Test vs Live mismatch detected"
**And** I see details: "Test predicted 5 contacts, but 3 were found in live execution"
**And** I see possible reasons: "Data may have changed between test and live run"

### AC6: Accuracy Metric Tracking (NFR36)

**Given** I run multiple tests and live executions
**When** Comparing results over time
**Then** System tracks accuracy: "Test predictions match live results 95% of time" (NFR36)
**And** Accuracy metric is displayed in agent dashboard

### AC7: Stale Data Warning

**Given** A test uses stale data
**When** Contact data changed after test but before live run
**Then** Live execution uses current data (not test snapshot)
**And** I see note: "Live execution uses real-time data, which may differ from test"

### AC8: System Alert for Degraded Accuracy

**Given** Test Mode has prediction errors
**When** Accuracy drops below 90%
**Then** System alert: "Test Mode accuracy degraded. Review instruction parsing service."

---

## Tasks / Subtasks

- [ ] Task 1: Create AgentTestRun Model for Storing Test Results (AC: 1, 6)
  - [ ] 1.1: Create AgentTestRun schema in backend/src/models/AgentTestRun.ts
  - [ ] 1.2: Define fields: testRunId, agentId, workspaceId, steps, predictions, timestamp, testTarget
  - [ ] 1.3: Add index on (agentId, workspaceId, createdAt) for efficient querying
  - [ ] 1.4: Add TTL index for automatic cleanup (30 days retention)

- [ ] Task 2: Create AgentExecution Model for Storing Live Results (AC: 1, 2, 3, 4)
  - [ ] 2.1: Create AgentExecution schema in backend/src/models/AgentExecution.ts
  - [ ] 2.2: Define fields: executionId, agentId, workspaceId, steps, results, linkedTestRunId, status
  - [ ] 2.3: Add reference to testRunId for comparison linking
  - [ ] 2.4: Add index on (agentId, linkedTestRunId) for comparison queries

- [ ] Task 3: Persist Test Results in TestModeService (AC: 1, 6)
  - [ ] 3.1: Modify TestModeService.simulateExecution to save results to AgentTestRun
  - [ ] 3.2: Generate persistent testRunId and store with full step predictions
  - [ ] 3.3: Store prediction metadata: action type, expected counts, expected recipients
  - [ ] 3.4: Return testRunId in TestRunResult for frontend reference

- [ ] Task 4: Create Comparison Service (AC: 1, 2, 3, 4, 5)
  - [ ] 4.1: Create ExecutionComparisonService in backend/src/services/ExecutionComparisonService.ts
  - [ ] 4.2: Implement compareTestToLive(testRunId, executionId) method
  - [ ] 4.3: Compare step-by-step: action type, target counts, recipients, condition results
  - [ ] 4.4: Calculate match percentage per step and overall
  - [ ] 4.5: Generate mismatch reasons based on comparison analysis

- [ ] Task 5: Create Comparison API Endpoint (AC: 1, 5)
  - [ ] 5.1: Add GET `/api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test` route
  - [ ] 5.2: Implement comparison controller in agentController.ts
  - [ ] 5.3: Return detailed comparison with match/mismatch indicators
  - [ ] 5.4: Include possible reasons for any detected mismatches

- [ ] Task 6: Implement Accuracy Metric Tracking (AC: 6, 8)
  - [ ] 6.1: Create AgentAccuracyMetric model or add to Agent schema
  - [ ] 6.2: Track fields: matchingExecutions, totalExecutions, lastCalculated, accuracyPercentage
  - [ ] 6.3: Update accuracy on each comparison completion
  - [ ] 6.4: Add endpoint: GET `/api/workspaces/:workspaceId/agents/:agentId/accuracy`
  - [ ] 6.5: Implement accuracy degradation alert when below 90%

- [ ] Task 7: Frontend - Comparison View Component (AC: 1, 5, 7)
  - [ ] 7.1: Create TestVsLiveComparison.tsx component
  - [ ] 7.2: Side-by-side step display with test predictions vs live results
  - [ ] 7.3: Visual indicators: ✅ match, ⚠️ mismatch, ℹ️ info
  - [ ] 7.4: Mismatch explanation panel with possible reasons
  - [ ] 7.5: Stale data warning banner when timestamps differ significantly

- [ ] Task 8: Frontend - Accuracy Badge on Agent Card (AC: 6)
  - [ ] 8.1: Add accuracy percentage badge to AgentCard component
  - [ ] 8.2: Color coding: green (>95%), yellow (90-95%), red (<90%)
  - [ ] 8.3: Tooltip showing "Test predictions match live results X% of time"
  - [ ] 8.4: Loading state while accuracy is being calculated

- [ ] Task 9: Frontend - API Integration and Hooks (AC: all)
  - [ ] 9.1: Add comparison API functions to frontend/lib/api/agents.ts
  - [ ] 9.2: Create useTestComparison hook for managing comparison state
  - [ ] 9.3: Create useAgentAccuracy hook for accuracy metrics
  - [ ] 9.4: Integrate comparison view into TestModePanel or agent detail page

- [ ] Task 10: Write Unit and Integration Tests (AC: all)
  - [ ] 10.1: Test AgentTestRun model creation and querying
  - [ ] 10.2: Test AgentExecution model with testRunId linking
  - [ ] 10.3: Test ExecutionComparisonService comparison logic
  - [ ] 10.4: Test accuracy calculation and threshold alerts
  - [ ] 10.5: Test comparison API endpoint with various scenarios
  - [ ] 10.6: Frontend component tests for TestVsLiveComparison

---

## Dev Notes

### Critical Architecture Patterns

**EXISTING INFRASTRUCTURE - Built in Stories 2.1-2.6:**

The TestModeService (backend/src/services/TestModeService.ts) already provides:

```typescript
// File: backend/src/services/TestModeService.ts

// Core interfaces available (lines 17-227):
export interface TestStepResult {
  stepNumber: number;
  action: string;
  actionLabel: string;
  icon: StepIcon;
  status: TestStepStatus;
  preview: { description: string; details?: Record<string, any> };
  richPreview?: StepPreview;
  duration: number;
  estimatedCredits: number;
  // ... extensive step result data
}

export interface TestRunResult {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: Array<{ step: number; severity: string; message: string }>;
  estimates?: ExecutionEstimate;
  timedOut?: boolean;
  executionTimeMs?: number;
  fromCache?: boolean;
}

// Active test runs registry (agentController.ts lines 973-981):
const activeTestRuns = new Map<string, AbortController>();
function generateTestRunId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

**NEW: AgentTestRun Model**

```typescript
// File: backend/src/models/AgentTestRun.ts (NEW)

import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentTestRun extends Document {
  testRunId: string;             // Unique test run identifier
  agent: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  testTarget?: {
    type: 'contact' | 'deal' | 'none';
    id?: string;
    snapshotData?: Record<string, any>;  // Snapshot of target at test time
  };
  steps: Array<{
    stepNumber: number;
    action: string;
    prediction: {
      targetCount?: number;          // Expected contacts/deals affected
      recipients?: string[];         // Expected email/linkedin recipients
      conditionResult?: boolean;     // Condition evaluation result
      fieldUpdates?: Record<string, any>;
      description: string;
    };
    status: 'success' | 'warning' | 'error' | 'skipped';
  }>;
  summary: {
    totalSteps: number;
    successfulSteps: number;
    estimatedCredits: number;
    estimatedDurationMs: number;
  };
  createdAt: Date;
}

const AgentTestRunSchema = new Schema<IAgentTestRun>({
  testRunId: { type: String, required: true, unique: true, index: true },
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  workspace: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  testTarget: {
    type: { type: String, enum: ['contact', 'deal', 'none'] },
    id: String,
    snapshotData: Schema.Types.Mixed,
  },
  steps: [{
    stepNumber: Number,
    action: String,
    prediction: {
      targetCount: Number,
      recipients: [String],
      conditionResult: Boolean,
      fieldUpdates: Schema.Types.Mixed,
      description: String,
    },
    status: { type: String, enum: ['success', 'warning', 'error', 'skipped'] },
  }],
  summary: {
    totalSteps: Number,
    successfulSteps: Number,
    estimatedCredits: Number,
    estimatedDurationMs: Number,
  },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
  // TTL index: auto-delete after 30 days
  expireAfterSeconds: 30 * 24 * 60 * 60,
});

// Compound index for efficient queries
AgentTestRunSchema.index({ agent: 1, workspace: 1, createdAt: -1 });

export default mongoose.model<IAgentTestRun>('AgentTestRun', AgentTestRunSchema);
```

**NEW: AgentExecution Model**

```typescript
// File: backend/src/models/AgentExecution.ts (NEW)

import mongoose, { Document, Schema } from 'mongoose';

export interface IAgentExecution extends Document {
  executionId: string;           // Unique execution identifier
  agent: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  linkedTestRunId?: string;      // Reference to prior test run for comparison
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
    eventDetails?: Record<string, any>;
  };
  target?: {
    type: 'contact' | 'deal';
    id: string;
    currentData?: Record<string, any>;  // Data at execution time
  };
  steps: Array<{
    stepNumber: number;
    action: string;
    result: {
      targetCount?: number;          // Actual contacts/deals affected
      recipients?: string[];         // Actual email/linkedin recipients
      conditionResult?: boolean;     // Actual condition evaluation
      fieldUpdates?: Record<string, any>;
      description: string;
      success: boolean;
      error?: string;
    };
    executedAt: Date;
    durationMs: number;
    creditsUsed: number;
  }>;
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalCreditsUsed: number;
    totalDurationMs: number;
  };
  comparison?: {
    linkedTestRunId: string;
    overallMatch: boolean;
    matchPercentage: number;
    mismatches: Array<{
      stepNumber: number;
      predicted: string;
      actual: string;
      reason: string;
    }>;
  };
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const AgentExecutionSchema = new Schema<IAgentExecution>({
  executionId: { type: String, required: true, unique: true, index: true },
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  workspace: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  linkedTestRunId: { type: String, index: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  trigger: {
    type: { type: String, enum: ['manual', 'scheduled', 'event'] },
    eventDetails: Schema.Types.Mixed,
  },
  target: {
    type: { type: String, enum: ['contact', 'deal'] },
    id: String,
    currentData: Schema.Types.Mixed,
  },
  steps: [{
    stepNumber: Number,
    action: String,
    result: {
      targetCount: Number,
      recipients: [String],
      conditionResult: Boolean,
      fieldUpdates: Schema.Types.Mixed,
      description: String,
      success: Boolean,
      error: String,
    },
    executedAt: Date,
    durationMs: Number,
    creditsUsed: Number,
  }],
  summary: {
    totalSteps: Number,
    successfulSteps: Number,
    failedSteps: Number,
    totalCreditsUsed: Number,
    totalDurationMs: Number,
  },
  comparison: {
    linkedTestRunId: String,
    overallMatch: Boolean,
    matchPercentage: Number,
    mismatches: [{
      stepNumber: Number,
      predicted: String,
      actual: String,
      reason: String,
    }],
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

// Compound indexes for efficient queries
AgentExecutionSchema.index({ agent: 1, workspace: 1, createdAt: -1 });
AgentExecutionSchema.index({ agent: 1, linkedTestRunId: 1 });

export default mongoose.model<IAgentExecution>('AgentExecution', AgentExecutionSchema);
```

**NEW: ExecutionComparisonService**

```typescript
// File: backend/src/services/ExecutionComparisonService.ts (NEW)

import AgentTestRun, { IAgentTestRun } from '../models/AgentTestRun';
import AgentExecution, { IAgentExecution } from '../models/AgentExecution';

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
  timeBetweenTestAndLive: number;  // milliseconds
}

export class ExecutionComparisonService {
  /**
   * Compare a test run prediction to actual live execution results.
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

    // Calculate time between test and execution
    const timeBetween = new Date(execution.startedAt).getTime() -
                        new Date(testRun.createdAt).getTime();
    const staleDataWarning = timeBetween > 60 * 60 * 1000; // > 1 hour

    // Build possible reasons for mismatches
    const possibleReasons: string[] = [];
    if (staleDataWarning) {
      possibleReasons.push('Data may have changed between test and live run');
    }
    if (stepComparisons.some(s => s.mismatchReason?.includes('count'))) {
      possibleReasons.push('Record counts differ - contacts/deals may have been added or removed');
    }
    if (stepComparisons.some(s => s.mismatchReason?.includes('condition'))) {
      possibleReasons.push('Condition evaluated differently - check field values at execution time');
    }

    const matchPercentage = totalSteps > 0 ? (matchCount / totalSteps) * 100 : 100;

    return {
      testRunId,
      executionId,
      overallMatch: matchPercentage >= 95,
      matchPercentage,
      stepComparisons,
      possibleReasons,
      staleDataWarning,
      timeBetweenTestAndLive: timeBetween,
    };
  }

  /**
   * Compare individual step prediction to actual result.
   */
  private static compareStep(
    predicted: IAgentTestRun['steps'][0],
    actual: IAgentExecution['steps'][0]
  ): { isMatch: boolean; reason?: string } {
    // Compare action type
    if (predicted.action !== actual.action) {
      return { isMatch: false, reason: 'Action type mismatch' };
    }

    // Compare target counts (with tolerance for dynamic data)
    if (predicted.prediction.targetCount !== undefined &&
        actual.result.targetCount !== undefined) {
      if (predicted.prediction.targetCount !== actual.result.targetCount) {
        return {
          isMatch: false,
          reason: `Target count mismatch: predicted ${predicted.prediction.targetCount}, got ${actual.result.targetCount}`,
        };
      }
    }

    // Compare recipients
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

    // Compare condition results
    if (predicted.prediction.conditionResult !== undefined &&
        actual.result.conditionResult !== undefined) {
      if (predicted.prediction.conditionResult !== actual.result.conditionResult) {
        return {
          isMatch: false,
          reason: `Condition evaluation mismatch: predicted ${predicted.prediction.conditionResult}, got ${actual.result.conditionResult}`,
        };
      }
    }

    return { isMatch: true };
  }

  private static setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  /**
   * Calculate overall accuracy for an agent.
   */
  static async calculateAgentAccuracy(
    agentId: string,
    workspaceId: string
  ): Promise<{ accuracy: number; totalComparisons: number; matchingComparisons: number }> {
    const executions = await AgentExecution.find({
      agent: agentId,
      workspace: workspaceId,
      linkedTestRunId: { $exists: true, $ne: null },
      'comparison.matchPercentage': { $exists: true },
    }).lean();

    if (executions.length === 0) {
      return { accuracy: 100, totalComparisons: 0, matchingComparisons: 0 };
    }

    const matchingComparisons = executions.filter(
      e => e.comparison && e.comparison.matchPercentage >= 95
    ).length;

    return {
      accuracy: (matchingComparisons / executions.length) * 100,
      totalComparisons: executions.length,
      matchingComparisons,
    };
  }
}

export default ExecutionComparisonService;
```

**NEW: API Endpoint**

```typescript
// File: backend/src/controllers/agentController.ts (ADD)

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test
 * @desc Compare live execution to its linked test run (Story 2.7)
 * @access Private (requires authentication, workspace access)
 */
export const compareExecutionToTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId, executionId } = req.params;
    const userId = (req as any).user?._id;

    // RBAC check...
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Find execution
    const execution = await AgentExecution.findOne({
      executionId,
      agent: agentId,
      workspace: workspaceId,
    });

    if (!execution) {
      res.status(404).json({ success: false, error: 'Execution not found' });
      return;
    }

    if (!execution.linkedTestRunId) {
      res.status(400).json({
        success: false,
        error: 'No linked test run found for this execution',
      });
      return;
    }

    const comparison = await ExecutionComparisonService.compareTestToLive(
      execution.linkedTestRunId,
      executionId
    );

    res.json({ success: true, comparison });
  } catch (error: any) {
    console.error('Error comparing execution to test:', error);
    res.status(500).json({ success: false, error: 'Failed to compare execution' });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/accuracy
 * @desc Get agent test prediction accuracy metric (Story 2.7)
 * @access Private
 */
export const getAgentAccuracy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;

    const accuracy = await ExecutionComparisonService.calculateAgentAccuracy(
      agentId,
      workspaceId
    );

    // Check if accuracy is degraded (NFR36)
    const degraded = accuracy.accuracy < 90 && accuracy.totalComparisons >= 5;

    res.json({
      success: true,
      accuracy: {
        percentage: accuracy.accuracy,
        totalComparisons: accuracy.totalComparisons,
        matchingComparisons: accuracy.matchingComparisons,
        status: degraded ? 'degraded' : 'healthy',
        message: degraded
          ? 'Test Mode accuracy degraded. Review instruction parsing service.'
          : `Test predictions match live results ${accuracy.accuracy.toFixed(1)}% of time`,
      },
    });
  } catch (error: any) {
    console.error('Error getting agent accuracy:', error);
    res.status(500).json({ success: false, error: 'Failed to get accuracy' });
  }
};
```

### Frontend Components

**TestVsLiveComparison Component:**

```tsx
// File: frontend/components/agents/TestVsLiveComparison.tsx (NEW)

import React from 'react';
import { ComparisonResult } from '@/types/agent';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  comparison: ComparisonResult;
}

export function TestVsLiveComparison({ comparison }: Props) {
  return (
    <div className="space-y-4">
      {/* Header with overall match status */}
      <div className={`p-4 rounded-lg ${comparison.overallMatch ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center gap-2">
          {comparison.overallMatch ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <span className="font-medium">
            {comparison.matchPercentage.toFixed(1)}% Match
          </span>
        </div>
      </div>

      {/* Stale data warning */}
      {comparison.staleDataWarning && (
        <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
          <span className="text-sm text-blue-700">
            Live execution uses real-time data, which may differ from test
          </span>
        </div>
      )}

      {/* Step-by-step comparison */}
      <div className="space-y-2">
        {comparison.stepComparisons.map((step) => (
          <div
            key={step.stepNumber}
            className={`p-3 rounded border ${
              step.match ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="flex justify-between">
              <span className="font-medium">Step {step.stepNumber}: {step.action}</span>
              <span>{step.match ? '✅' : '⚠️'}</span>
            </div>
            {!step.match && step.mismatchReason && (
              <p className="text-sm text-yellow-700 mt-1">{step.mismatchReason}</p>
            )}
          </div>
        ))}
      </div>

      {/* Possible reasons */}
      {comparison.possibleReasons.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-sm mb-2">Possible Reasons for Differences:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside">
            {comparison.possibleReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Accuracy Badge Component:**

```tsx
// File: frontend/components/agents/AccuracyBadge.tsx (NEW)

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  accuracy: number;
  totalComparisons: number;
}

export function AccuracyBadge({ accuracy, totalComparisons }: Props) {
  if (totalComparisons === 0) return null;

  const getColor = () => {
    if (accuracy >= 95) return 'bg-green-100 text-green-700';
    if (accuracy >= 90) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
          {accuracy.toFixed(0)}% Accuracy
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Test predictions match live results {accuracy.toFixed(1)}% of time</p>
        <p className="text-xs text-gray-400">Based on {totalComparisons} comparisons</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Comparison calculation | < 500ms | P95 latency |
| Accuracy metric retrieval | < 100ms | P95 latency |
| Test result persistence | < 200ms | Added to test execution time |
| Match percentage accuracy | 95% | NFR36 threshold |

---

## Project Structure Notes

**Backend Files:**

```
backend/src/
├── models/
│   ├── AgentTestRun.ts  [NEW] - Test run persistence model
│   └── AgentExecution.ts  [NEW] - Live execution result model
├── services/
│   ├── TestModeService.ts  [UPDATE] - Save test runs to DB
│   └── ExecutionComparisonService.ts  [NEW] - Comparison logic
├── controllers/
│   └── agentController.ts  [UPDATE] - Add comparison endpoints
└── routes/
    └── agentBuilder.ts  [UPDATE] - Add comparison routes
```

**Frontend Files:**

```
frontend/
├── components/agents/
│   ├── TestVsLiveComparison.tsx  [NEW] - Side-by-side comparison view
│   ├── AccuracyBadge.tsx  [NEW] - Accuracy badge for agent cards
│   └── AgentCard.tsx  [UPDATE] - Add accuracy badge
├── hooks/
│   ├── useTestComparison.ts  [NEW] - Comparison state hook
│   └── useAgentAccuracy.ts  [NEW] - Accuracy metrics hook
├── lib/api/
│   └── agents.ts  [UPDATE] - Add comparison API functions
└── types/
    └── agent.ts  [UPDATE] - Add comparison types
```

---

## References

- [Source: Epic 2 Story 2.7](C:\app\morrisB\_bmad-output\planning-artifacts\epics\epic-02-safe-agent-testing.md#story-27-compare-test-vs-live-results)
- [Source: Story 2-6 Implementation](C:\app\morrisB\_bmad-output\implementation-artifacts\2-6-test-result-performance.md)
- [Source: TestModeService](C:\app\morrisB\backend\src\services\TestModeService.ts)
- [Source: agentController.ts](C:\app\morrisB\backend\src\controllers\agentController.ts)
- [Source: PRD NFR36 - 95% accuracy requirement]

---

## Previous Story Intelligence

**From Story 2-6 (Test Result Performance):**

- TestModeService already has testRunId generation via `generateTestRunId()` in agentController.ts
- SSE streaming implemented with activeTestRuns Map for tracking
- TestRunResult interface includes all step data needed for persistence
- Caching layer via testModeCache.ts for instruction and web search results
- Timeout handling with 30-second limit and partial results

**Key Patterns to Maintain:**

1. TestRunResult interface structure for step results
2. Active test runs tracked via Map<testRunId, AbortController>
3. RBAC checks on all agent endpoints (Owner/Admin only)
4. Workspace isolation on all queries
5. Error handling with suggestions pattern

**Critical Integration Point:**

Story 2-7 depends on Epic 3 (Live Agent Execution) for actual live execution results. This story creates the infrastructure for comparison, but full integration requires Epic 3 to be implemented. For testing purposes:
- AgentExecution records can be created manually or via a stub execution service
- The comparison logic is independent and can be tested with mock data

---

## Git Intelligence Summary

**Recent Commits:**

- `61a149a` - implemented 2-5 (execution estimates)
- `125804b` - implemented 2-4 (validate instructions)
- `e31c6b3` - code review 2-3 done
- `e22bd09` - implemented 2-1, 2-2 (test mode basics)

**Pattern:** Stories implemented incrementally, each building on previous. Commit messages use "implemented X-Y" format.

**Files Modified Across Epic 2:**

- backend/src/services/TestModeService.ts (heavily modified in all stories)
- backend/src/controllers/agentController.ts (test endpoints added)
- frontend/components/agents/TestModePanel.tsx (UI enhancements)
- frontend/types/agent.ts (extended with new types)

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Story 2.7 is the final story in Epic 2: Safe Agent Testing
- Creates foundation for test accuracy tracking (NFR36: 95% target)
- New models: AgentTestRun and AgentExecution for persistent storage
- ExecutionComparisonService handles step-by-step comparison logic
- Frontend gets comparison view and accuracy badge components
- Full integration requires Epic 3 for live execution data
- Consider MongoDB TTL indexes for automatic data cleanup (30 days)

### File List

- backend/src/models/AgentTestRun.ts (NEW)
- backend/src/models/AgentExecution.ts (NEW)
- backend/src/services/ExecutionComparisonService.ts (NEW)
- backend/src/services/ExecutionComparisonService.test.ts (NEW)
- backend/src/services/TestModeService.ts (UPDATE) - persist test results
- backend/src/controllers/agentController.ts (UPDATE) - add comparison endpoints
- backend/src/routes/agentBuilder.ts (UPDATE) - add routes
- frontend/components/agents/TestVsLiveComparison.tsx (NEW)
- frontend/components/agents/AccuracyBadge.tsx (NEW)
- frontend/components/agents/AgentCard.tsx (UPDATE) - add accuracy badge
- frontend/hooks/useTestComparison.ts (NEW)
- frontend/hooks/useAgentAccuracy.ts (NEW)
- frontend/lib/api/agents.ts (UPDATE) - add comparison API functions
- frontend/types/agent.ts (UPDATE) - add comparison types
