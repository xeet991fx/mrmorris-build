'use client';

/**
 * TestProgressIndicator.tsx - Story 2.6: Progressive Test Progress Display
 *
 * Displays real-time test execution progress with:
 * - AC1: Elapsed time counter during test execution
 * - AC3: Progress bar showing current/total steps
 * - AC3: "Taking longer than expected" message after 10 seconds
 * - AC3: Cancel button that appears after 5 seconds
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface TestProgressIndicatorProps {
  /** Current step number (1-indexed) */
  current: number;
  /** Total number of steps */
  total: number;
  /** Elapsed time in milliseconds */
  elapsedTimeMs: number;
  /** Whether the test is currently running */
  isRunning: boolean;
  /** Callback to cancel the test (optional - if not provided, cancel button won't be shown) */
  onCancel?: () => void;
  /** Whether cancel is in progress */
  isCancelling?: boolean;
}

/**
 * Format milliseconds to human-readable time string
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function TestProgressIndicator({
  current,
  total,
  elapsedTimeMs,
  isRunning,
  onCancel,
  isCancelling = false,
}: TestProgressIndicatorProps) {
  const [showCancel, setShowCancel] = useState(false);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // AC3: Show cancel button after 5 seconds
  useEffect(() => {
    if (!isRunning) {
      setShowCancel(false);
      return;
    }

    const cancelTimer = setTimeout(() => {
      setShowCancel(true);
    }, 5000);

    return () => clearTimeout(cancelTimer);
  }, [isRunning]);

  // AC3: Show "taking longer than expected" after 10 seconds
  useEffect(() => {
    if (!isRunning) {
      setShowSlowWarning(false);
      return;
    }

    const slowTimer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 10000);

    return () => clearTimeout(slowTimer);
  }, [isRunning]);

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }, [current, total]);

  if (!isRunning) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Running Test...</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
          <ClockIcon className="h-4 w-4" />
          <span className="text-sm font-mono">{formatElapsedTime(elapsedTimeMs)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
          <span>Step {current} of {total}</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* AC3: "Taking longer than expected" warning */}
      {showSlowWarning && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
          <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This test is taking longer than expected. You can cancel and retry with fewer targets.
          </p>
        </div>
      )}

      {/* AC3: Cancel button (appears after 5 seconds) */}
      {showCancel && onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isCancelling}
          className="w-full border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
        >
          {isCancelling ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Cancelling...
            </>
          ) : (
            <>
              <XCircleIcon className="h-4 w-4 mr-2" />
              Cancel Test
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default TestProgressIndicator;
