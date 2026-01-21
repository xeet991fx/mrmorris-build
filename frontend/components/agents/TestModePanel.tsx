'use client';

/**
 * TestModePanel - Story 2.1, 2.2, 2.3 & 2.5: Test Mode with Enhanced Previews
 *
 * A sliding panel that allows users to test their agent in dry-run mode.
 * - AC1: Opens from right side with "Run Test" button
 * - AC2: Simulates execution without real actions
 * - AC5: Displays errors with actionable suggestions
 *
 * Story 2.2:
 * - AC1: Test button with selected target initiates test
 * - AC7: Trigger-based default target type and required target validation
 *
 * Story 2.3:
 * - Enhanced step-by-step preview with rich previews
 * - Summary banner with stats
 * - Expandable step cards with type-specific previews
 *
 * Story 2.5:
 * - ExecutionEstimatesPanel with credit/time breakdown
 * - Previous test comparison
 * - Scheduled agent projections
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TestResultsList } from './TestResultsList';
import { TestSummaryBanner } from './TestSummaryBanner';
import { TestTargetSelector } from './TestTargetSelector';
import { ManualTestDataInput } from './ManualTestDataInput';
import { ExecutionEstimatesPanel } from './ExecutionEstimatesPanel';
import { testAgent } from '@/lib/api/agents';
import { TestRunResponse, TestTarget, ITriggerConfig, StoredEstimate } from '@/types/agent';
import { saveTestEstimate, getPreviousEstimate } from '@/lib/utils/testEstimatesStorage';
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
  instructions?: string | null;
  triggers?: ITriggerConfig[];
}

export function TestModePanel({
  open,
  onOpenChange,
  workspaceId,
  agentId,
  agentName,
  hasInstructions,
  instructions,
  triggers,
}: TestModePanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  // Story 2.2: Test target state
  const [testTarget, setTestTarget] = useState<TestTarget | null>(null);
  const [manualData, setManualData] = useState<Record<string, any>>({});
  // Story 2.5: Previous estimates for comparison
  const [previousEstimates, setPreviousEstimates] = useState<StoredEstimate | null>(null);

  // Story 2.5: Load previous estimates on mount
  useEffect(() => {
    const stored = getPreviousEstimate(agentId);
    setPreviousEstimates(stored);
  }, [agentId]);

  // Story 2.2 AC7: Determine default target type based on trigger
  const defaultTargetType = useMemo(() => {
    if (!triggers || triggers.length === 0) return 'none';
    for (const trigger of triggers) {
      if (trigger.type === 'event') {
        const event = (trigger.config as any).event;
        if (event === 'contact.created' || event === 'form.submitted') {
          return 'contact';
        }
        if (event === 'deal.stage_updated') {
          return 'deal';
        }
      }
    }
    return 'none';
  }, [triggers]);

  // Story 2.2: Determine if target is required based on @contact.* or @deal.* in instructions
  const targetRequired = useMemo(() => {
    if (!instructions) return false;
    return instructions.includes('@contact.') || instructions.includes('@deal.');
  }, [instructions]);

  // Story 2.2: Check if test can run (target selected if required)
  const canRunTest = useMemo(() => {
    if (!hasInstructions) return false;
    if (!targetRequired) return true;
    // If target is required, check if a valid target is selected
    if (!testTarget) return false;
    if (testTarget.type === 'none') {
      // Manual mode - check if any data entered
      return Object.keys(manualData).length > 0;
    }
    // Contact or deal selected
    return !!testTarget.id;
  }, [hasInstructions, targetRequired, testTarget, manualData]);

  const handleRunTest = useCallback(async () => {
    setIsLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      // Story 2.2: Build test target with optional manual data
      let targetToSend: TestTarget | undefined;
      if (testTarget) {
        if (testTarget.type === 'none') {
          // Manual mode - include manual data
          targetToSend = {
            type: 'none',
            manualData: Object.keys(manualData).length > 0 ? manualData : undefined,
          };
        } else {
          targetToSend = testTarget;
        }
      }

      const result = await testAgent(workspaceId, agentId, targetToSend ? { testTarget: targetToSend } : undefined);
      setTestResult(result);

      // Story 2.5: Save estimates for future comparison
      if (result.estimates) {
        saveTestEstimate(agentId, {
          time: result.estimates.activeTimeMs,
          credits: result.estimates.totalCredits,
          timestamp: new Date().toISOString(),
        });
      }

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
  }, [workspaceId, agentId, testTarget, manualData]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setTestResult(null);
      setTestError(null);
      setTestTarget(null);
      setManualData({});
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

          {/* Story 2.2: Test Target Selection */}
          {hasInstructions && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-4">
              <TestTargetSelector
                workspaceId={workspaceId}
                value={testTarget}
                onChange={setTestTarget}
                disabled={isLoading}
                defaultType={defaultTargetType}
              />

              {/* Show ManualTestDataInput when manual mode is selected */}
              {testTarget?.type === 'none' && (
                <ManualTestDataInput
                  value={manualData}
                  onChange={setManualData}
                  disabled={isLoading}
                  instructions={instructions}
                />
              )}

              {/* Story 2.2: Warning when target is required but not selected */}
              {targetRequired && !canRunTest && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This agent uses @contact or @deal variables. Please select a test target or enter manual data.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Run Test Button (AC1) */}
          <Button
            onClick={handleRunTest}
            disabled={isLoading || !canRunTest}
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

          {/* Test Results (Story 2.3: Enhanced step-by-step preview) */}
          {testResult && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <TestSummaryBanner
                steps={testResult.steps}
                executionTime={testResult.totalEstimatedDuration}
                totalCredits={testResult.totalEstimatedCredits}
              />

              {/* Story 2.5: Execution Estimates Panel */}
              {testResult.estimates && (
                <ExecutionEstimatesPanel
                  estimates={testResult.estimates}
                  previousEstimates={previousEstimates}
                  showProjections={triggers?.some(t => t.type === 'scheduled')}
                />
              )}

              {/* Warnings */}
              {testResult.warnings.length > 0 && (
                <div className="space-y-2">
                  {testResult.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg ${warning.severity === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                        }`}
                    >
                      <ExclamationTriangleIcon
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${warning.severity === 'error' ? 'text-red-500' : 'text-amber-500'
                          }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${warning.severity === 'error'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-amber-700 dark:text-amber-300'
                            }`}
                        >
                          {warning.message}
                        </p>
                        {warning.suggestion && (
                          <p
                            className={`mt-1 text-xs ${warning.severity === 'error'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                              }`}
                          >
                            Suggestion: {warning.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step-by-Step Results */}
              <TestResultsList steps={testResult.steps} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TestModePanel;
