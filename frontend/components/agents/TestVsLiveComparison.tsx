'use client';

/**
 * TestVsLiveComparison - Story 2.7: Compare Test vs Live Results
 *
 * Side-by-side comparison view for test predictions vs live execution results.
 * AC1: Side-by-side comparison view
 * AC5: Mismatch detection and warning with possible reasons
 * AC7: Stale data warning when timestamps differ significantly
 */

import React from 'react';
import { ComparisonResult } from '@/types/agent';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface TestVsLiveComparisonProps {
  comparison: ComparisonResult;
}

export function TestVsLiveComparison({ comparison }: TestVsLiveComparisonProps) {
  const formatTimeDifference = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return 'less than a minute';
  };

  return (
    <div className="space-y-4">
      {/* Header with overall match status */}
      <div
        className={`p-4 rounded-lg ${
          comparison.overallMatch
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {comparison.overallMatch ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          )}
          <span
            className={`font-medium ${
              comparison.overallMatch
                ? 'text-green-700 dark:text-green-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}
          >
            {comparison.matchPercentage.toFixed(1)}% Match
          </span>
          <span
            className={`text-sm ${
              comparison.overallMatch
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          >
            ({comparison.overallMatch ? 'Predictions accurate' : 'Mismatches detected'})
          </span>
        </div>
      </div>

      {/* AC7: Stale data warning */}
      {comparison.staleDataWarning && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <InformationCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Stale Data Warning</p>
            <p className="text-blue-600 dark:text-blue-400">
              Live execution used real-time data (
              {formatTimeDifference(comparison.timeBetweenTestAndLive)} after test).
              Results may differ from test predictions.
            </p>
          </div>
        </div>
      )}

      {/* AC5: Possible reasons for mismatches */}
      {comparison.possibleReasons.length > 0 && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-2">
            Possible Reasons for Differences:
          </p>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside space-y-1">
            {comparison.possibleReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AC1: Step-by-step comparison */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
          Step-by-Step Comparison
        </h4>
        {comparison.stepComparisons.map((step) => (
          <div
            key={step.stepNumber}
            className={`p-3 rounded-lg border ${
              step.match
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Step {step.stepNumber}: {step.action}
                  </span>
                  <span>{step.match ? '✅' : '⚠️'}</span>
                </div>

                {/* Show predicted vs actual for mismatches */}
                {!step.match && (
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Predicted
                      </p>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {step.predicted.description}
                      </p>
                      {step.predicted.targetCount !== undefined && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Count: {step.predicted.targetCount}
                        </p>
                      )}
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Actual
                      </p>
                      <p className="text-zinc-700 dark:text-zinc-300">
                        {step.actual.description}
                      </p>
                      {step.actual.targetCount !== undefined && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Count: {step.actual.targetCount}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mismatch reason */}
                {!step.match && step.mismatchReason && (
                  <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    {step.mismatchReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>Test Run ID: {comparison.testRunId}</span>
          <span>Execution ID: {comparison.executionId}</span>
        </div>
      </div>
    </div>
  );
}

export default TestVsLiveComparison;
