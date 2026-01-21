'use client';

/**
 * AccuracyBadge - Story 2.7: Agent Test Accuracy Display
 *
 * Badge component showing agent test prediction accuracy.
 * AC6: Accuracy metric tracking with color coding
 * AC8: Visual indicator for degraded accuracy (<90%)
 *
 * Color coding:
 * - Green (>95%): Excellent accuracy
 * - Yellow (90-95%): Good accuracy
 * - Red (<90%): Degraded accuracy - requires attention
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AgentAccuracyMetrics } from '@/types/agent';

interface AccuracyBadgeProps {
  accuracy: AgentAccuracyMetrics;
  size?: 'sm' | 'md';
}

export function AccuracyBadge({ accuracy, size = 'sm' }: AccuracyBadgeProps) {
  // Don't show badge if no comparisons yet
  if (accuracy.totalComparisons === 0) {
    return null;
  }

  const getColorClasses = (): string => {
    if (accuracy.accuracy >= 95) {
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    }
    if (accuracy.accuracy >= 90) {
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    }
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded font-medium ${getColorClasses()} ${sizeClasses}`}
          >
            {accuracy.accuracy.toFixed(0)}% Accuracy
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{accuracy.message}</p>
            <p className="text-xs text-zinc-400">
              Based on {accuracy.totalComparisons} comparison
              {accuracy.totalComparisons !== 1 ? 's' : ''}
            </p>
            {accuracy.status === 'degraded' && (
              <p className="text-xs text-red-400 font-medium">
                Review instruction parsing service
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AccuracyBadge;
