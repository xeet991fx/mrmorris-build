'use client';

/**
 * TestSummaryBanner - Story 2.3: Step-by-Step Execution Preview
 *
 * Displays overall test summary with stats:
 * - Total steps, completed, errors, warnings, skipped
 * - Overall status icon and color
 * - Execution time and estimated credits
 */

import React, { useMemo } from 'react';
import { TestStepResult } from '@/types/agent';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface TestSummaryBannerProps {
  steps: TestStepResult[];
  executionTime: number;
  totalCredits: number;
}

export function TestSummaryBanner({ steps, executionTime, totalCredits }: TestSummaryBannerProps) {
  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter((s) => s.status === 'success').length;
    const errors = steps.filter((s) => s.status === 'error').length;
    const warnings = steps.filter((s) => s.status === 'warning').length;
    const skipped = steps.filter((s) => s.status === 'skipped').length;
    const notExecuted = steps.filter((s) => s.status === 'not_executed').length;

    let overallStatus: 'success' | 'warning' | 'error' = 'success';
    if (errors > 0) {
      overallStatus = 'error';
    } else if (warnings > 0) {
      overallStatus = 'warning';
    }

    return { total, completed, errors, warnings, skipped, notExecuted, overallStatus };
  }, [steps]);

  const statusStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircleIcon,
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-700 dark:text-green-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      textColor: 'text-yellow-700 dark:text-yellow-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: XCircleIcon,
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-700 dark:text-red-300',
    },
  };

  const style = statusStyles[stats.overallStatus];
  const StatusIcon = style.icon;

  const summaryMessage = useMemo(() => {
    if (stats.errors > 0) {
      return `Test failed: ${stats.errors} error${stats.errors !== 1 ? 's' : ''}`;
    }
    if (stats.warnings > 0) {
      return `Test completed with ${stats.warnings} warning${stats.warnings !== 1 ? 's' : ''}`;
    }
    return `Test completed: ${stats.total} step${stats.total !== 1 ? 's' : ''}, 0 errors`;
  }, [stats]);

  return (
    <div className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
      {/* Main Summary */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-5 w-5 ${style.iconColor}`} />
        <span className={`font-semibold ${style.textColor}`}>
          {summaryMessage}
        </span>
      </div>

      {/* Stats Row */}
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span>{stats.completed} completed</span>
        </div>

        {stats.skipped > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">⏭️</span>
            <span>{stats.skipped} skipped</span>
          </div>
        )}

        {stats.notExecuted > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-300">⏹️</span>
            <span>{stats.notExecuted} not executed</span>
          </div>
        )}

        {stats.warnings > 0 && (
          <div className="flex items-center gap-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
            <span>{stats.warnings} warning{stats.warnings !== 1 ? 's' : ''}</span>
          </div>
        )}

        {stats.errors > 0 && (
          <div className="flex items-center gap-1">
            <XCircleIcon className="h-4 w-4 text-red-500" />
            <span>{stats.errors} error{stats.errors !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <CurrencyDollarIcon className="h-4 w-4 text-emerald-500" />
          <span>~{totalCredits} credits</span>
        </div>

        <div className="flex items-center gap-1">
          <ClockIcon className="h-4 w-4 text-blue-500" />
          <span>{executionTime}ms</span>
        </div>
      </div>
    </div>
  );
}

export default TestSummaryBanner;
