'use client';

/**
 * TestStepSkeleton.tsx - Story 2.6: Skeleton Loader for Pending Test Steps
 *
 * Displays placeholder skeleton cards for steps that haven't completed yet.
 * - AC2: Shows skeleton loaders for remaining steps during progressive streaming
 * - Provides visual indication of how many steps are pending
 */

import React from 'react';

interface TestStepSkeletonProps {
  /** Number of skeleton steps to show */
  count: number;
  /** Starting step number (for numbering display) */
  startingStep?: number;
}

/**
 * Single skeleton step card
 */
function SkeletonStep({ stepNumber }: { stepNumber: number }) {
  return (
    <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Step number circle skeleton */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            {stepNumber}
          </span>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Title skeleton */}
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />

          {/* Description skeleton */}
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
        </div>

        {/* Status indicator skeleton */}
        <div className="flex-shrink-0">
          <div className="w-16 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TestStepSkeleton({
  count,
  startingStep = 1,
}: TestStepSkeletonProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonStep
          key={`skeleton-${startingStep + i}`}
          stepNumber={startingStep + i}
        />
      ))}
    </div>
  );
}

export default TestStepSkeleton;
