'use client';

/**
 * TestResultsList - Story 2.3: Step-by-Step Execution Preview
 *
 * Renders all test steps sequentially using TestStepCard components.
 * Includes expand all / collapse all functionality.
 */

import React, { useState, useCallback } from 'react';
import { TestStepResult } from '@/types/agent';
import { TestStepCard } from './TestStepCard';
import { Button } from '@/components/ui/button';
import {
  ChevronDoubleDownIcon,
  ChevronDoubleUpIcon,
} from '@heroicons/react/24/outline';

interface TestResultsListProps {
  steps: TestStepResult[];
}

export function TestResultsList({ steps }: TestResultsListProps) {
  // Track which steps are expanded
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(() => {
    // Default: expand error steps
    const errorSteps = new Set<number>();
    steps.forEach((step) => {
      if (step.status === 'error') {
        errorSteps.add(step.stepNumber);
      }
    });
    return errorSteps;
  });

  const toggleStep = useCallback((stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  }, []);

  const expandableSteps = steps.filter((s) => s.isExpandable);
  const allExpanded = expandableSteps.every((s) => expandedSteps.has(s.stepNumber));

  const handleExpandAll = useCallback(() => {
    setExpandedSteps(new Set(expandableSteps.map((s) => s.stepNumber)));
  }, [expandableSteps]);

  const handleCollapseAll = useCallback(() => {
    setExpandedSteps(new Set());
  }, []);

  if (steps.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
        <p>No actions to simulate.</p>
        <p className="text-sm mt-1">
          The agent doesn&apos;t have any parsed actions yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Expand/Collapse Controls */}
      {expandableSteps.length > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            className="text-xs"
          >
            {allExpanded ? (
              <>
                <ChevronDoubleUpIcon className="h-3 w-3 mr-1" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDoubleDownIcon className="h-3 w-3 mr-1" />
                Expand All
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step Cards */}
      <div className="space-y-2">
        {steps.map((step) => (
          <TestStepCard
            key={step.stepNumber}
            step={step}
            isExpanded={expandedSteps.has(step.stepNumber)}
            onToggle={() => toggleStep(step.stepNumber)}
          />
        ))}
      </div>
    </div>
  );
}

export default TestResultsList;
