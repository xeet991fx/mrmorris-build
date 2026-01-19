'use client';

/**
 * TestModePanel - Story 2.1: Enable Test Mode
 *
 * A sliding panel that allows users to test their agent in dry-run mode.
 * - AC1: Opens from right side with "Run Test" button
 * - AC2: Simulates execution without real actions
 * - AC5: Displays errors with actionable suggestions
 */

import React, { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TestResultsDisplay } from './TestResultsDisplay';
import { testAgent } from '@/lib/api/agents';
import { TestRunResponse } from '@/types/agent';
import { toast } from 'sonner';
import {
  PlayIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface TestModePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  agentId: string;
  agentName: string;
  hasInstructions: boolean;
}

export function TestModePanel({
  open,
  onOpenChange,
  workspaceId,
  agentId,
  agentName,
  hasInstructions,
}: TestModePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleRunTest = useCallback(async () => {
    setIsLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const result = await testAgent(workspaceId, agentId);
      setTestResult(result);

      if (result.success) {
        if (result.steps.length === 0) {
          toast.info('No actions to simulate - agent has no parsed actions');
        } else {
          toast.success(`Test completed: ${result.steps.length} step${result.steps.length !== 1 ? 's' : ''} simulated`);
        }
      } else {
        toast.error(result.error || 'Test failed');
      }
    } catch (error: any) {
      console.error('Test mode error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to run test';
      setTestError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, agentId]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setTestResult(null);
      setTestError(null);
    }, 300); // Wait for close animation
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BeakerIcon className="h-5 w-5 text-blue-500" />
            Test Mode
          </SheetTitle>
          <SheetDescription>
            Test Mode simulates execution without performing real actions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Agent Info */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Testing agent:</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{agentName}</p>
          </div>

          {/* Info Message (AC1) */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <BeakerIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">What happens in Test Mode:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-blue-600 dark:text-blue-400">
                <li>No emails will be sent</li>
                <li>No LinkedIn messages will be sent</li>
                <li>No data will be modified</li>
                <li>You&apos;ll see a preview of what would happen</li>
              </ul>
            </div>
          </div>

          {/* No Instructions Warning */}
          {!hasInstructions && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">No instructions configured</p>
                <p className="mt-1 text-amber-600 dark:text-amber-400">
                  Add instructions to your agent before testing.
                </p>
              </div>
            </div>
          )}

          {/* Run Test Button (AC1) */}
          <Button
            onClick={handleRunTest}
            disabled={isLoading || !hasInstructions}
            className="w-full"
            size="lg"
            data-testid="run-test-button"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Running Test...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>

          {/* Error Display (AC5) */}
          {testError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">Test Failed</p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{testError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Results (AC2, AC3, AC4, AC5) */}
          {testResult && (
            <TestResultsDisplay result={testResult} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TestModePanel;
