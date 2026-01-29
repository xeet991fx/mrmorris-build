'use client';

/**
 * Story 3.15 Task 4.2: Performance Warning Card Component
 *
 * Displays performance warnings with:
 * - Warning icon and severity indicator
 * - Warning message
 * - Actionable recommendation
 * - Link to view failed executions (AC6)
 */

import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export type WarningSeverity = 'low' | 'medium' | 'high';

export interface PerformanceWarning {
  severity: WarningSeverity;
  message: string;
  recommendation: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface PerformanceWarningCardProps {
  warning: PerformanceWarning;
}

export function PerformanceWarningCard({ warning }: PerformanceWarningCardProps) {
  const getSeverityStyles = (severity: WarningSeverity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          icon: 'text-red-600 dark:text-red-500',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-400',
          icon: 'text-yellow-600 dark:text-yellow-500',
        };
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-400',
          icon: 'text-blue-600 dark:text-blue-500',
        };
    }
  };

  const styles = getSeverityStyles(warning.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${styles.bg} ${styles.border} border rounded-lg p-4`}
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className={`w-5 h-5 mt-0.5 ${styles.icon} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.text}`}>
            {warning.message}
          </p>
          <p className={`text-sm ${styles.text} opacity-90 mt-1`}>
            {warning.recommendation}
          </p>
          {warning.onAction && warning.actionLabel && (
            <button
              onClick={warning.onAction}
              className={`mt-3 text-sm font-medium ${styles.text} underline hover:no-underline`}
            >
              {warning.actionLabel}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Story 3.15 Task 4.3: Warning detection logic
 * Maps metrics to warning conditions and recommendations
 */
export function detectPerformanceWarnings(
  metrics: {
    totalExecutions: number;
    successRate: number;
    avgDurationSeconds: number;
    lastExecutionDate?: Date;
  },
  dateRange: string
): PerformanceWarning[] {
  const warnings: PerformanceWarning[] = [];

  // Task 4.1: Success rate warnings
  if (metrics.totalExecutions > 0) {
    if (metrics.successRate < 70) {
      warnings.push({
        severity: 'high',
        message: `⚠️ Critical: Success rate significantly below target (${metrics.successRate.toFixed(1)}%)`,
        recommendation: 'Review recent failures immediately. Check execution logs and update agent instructions.',
        actionLabel: 'View Failed Executions',
      });
    } else if (metrics.successRate < 80) {
      warnings.push({
        severity: 'medium',
        message: `⚠️ Success rate below target (${metrics.successRate.toFixed(1)}%)`,
        recommendation: 'Review recent failures and update instructions. Target: 90%+',
        actionLabel: 'View Failed Executions',
      });
    } else if (metrics.successRate < 90) {
      warnings.push({
        severity: 'low',
        message: `ℹ️ Success rate approaching target (${metrics.successRate.toFixed(1)}%)`,
        recommendation: 'Monitor failures and consider instruction improvements.',
      });
    }
  }

  // Task 4.1: Execution time warnings
  if (metrics.totalExecutions > 0) {
    if (metrics.avgDurationSeconds > 60) {
      warnings.push({
        severity: 'high',
        message: `⚠️ Agent running slowly (${metrics.avgDurationSeconds}s avg)`,
        recommendation: 'Optimize agent steps or reduce actions per run. Target: <30s',
      });
    } else if (metrics.avgDurationSeconds > 30) {
      warnings.push({
        severity: 'low',
        message: `ℹ️ Agent execution time acceptable but could improve (${metrics.avgDurationSeconds}s avg)`,
        recommendation: 'Consider optimizing for faster execution.',
      });
    }
  }

  // Task 4.1: Inactivity warnings (only for non-"all" date ranges)
  if (dateRange !== 'all' && metrics.lastExecutionDate) {
    const daysSinceLastExecution = Math.floor(
      (Date.now() - metrics.lastExecutionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastExecution >= 30) {
      warnings.push({
        severity: 'high',
        message: `⚠️ Agent inactive for over a month`,
        recommendation: 'Review agent configuration or consider archiving.',
      });
    } else if (daysSinceLastExecution >= 7) {
      warnings.push({
        severity: 'medium',
        message: `⚠️ Agent inactive - no executions in ${daysSinceLastExecution} days`,
        recommendation: 'Check triggers and agent status. Verify agent is Live.',
      });
    }
  }

  // No executions warning
  if (metrics.totalExecutions === 0) {
    warnings.push({
      severity: 'low',
      message: 'ℹ️ No executions yet for this time period',
      recommendation: 'Agent has not run yet. Check triggers and agent status.',
    });
  }

  return warnings;
}
