'use client';

/**
 * TestResultsDisplay - Story 2.1: Enable Test Mode
 *
 * Displays step-by-step test results with:
 * - AC2: Step-by-step simulation results
 * - AC3: Email action preview with content
 * - AC4: CRM update preview with values
 * - AC5: Error display with actionable suggestions
 */

import React, { useState } from 'react';
import { TestRunResponse, TestStepResult } from '@/types/agent';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';

interface TestResultsDisplayProps {
  result: TestRunResponse;
}

// Action type icons and colors
const ACTION_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
  send_email: { icon: () => <span>📧</span>, color: 'text-blue-500', label: 'Send Email' },
  linkedin_invite: { icon: () => <span>💼</span>, color: 'text-blue-600', label: 'LinkedIn Invite' },
  web_search: { icon: () => <span>🔍</span>, color: 'text-purple-500', label: 'Web Search' },
  create_task: { icon: () => <span>✅</span>, color: 'text-green-500', label: 'Create Task' },
  add_tag: { icon: () => <span>🏷️</span>, color: 'text-teal-500', label: 'Add Tag' },
  remove_tag: { icon: () => <span>🗑️</span>, color: 'text-orange-500', label: 'Remove Tag' },
  update_field: { icon: () => <span>✏️</span>, color: 'text-amber-500', label: 'Update Field' },
  update_deal_value: { icon: () => <span>💰</span>, color: 'text-emerald-500', label: 'Update Deal' },
  enrich_contact: { icon: () => <span>👤</span>, color: 'text-indigo-500', label: 'Enrich Contact' },
  wait: { icon: () => <span>⏳</span>, color: 'text-gray-500', label: 'Wait' },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: () => <span>⚙️</span>, color: 'text-gray-500', label: action };
}

function StepStatusIcon({ status }: { status: TestStepResult['status'] }) {
  switch (status) {
    case 'simulated':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'skipped':
      return <ArrowRightIcon className="h-5 w-5 text-gray-400" />;
    case 'error':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
  }
}

function StepStatusBadge({ status }: { status: TestStepResult['status'] }) {
  switch (status) {
    case 'simulated':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
          DRY RUN
        </Badge>
      );
    case 'skipped':
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
          SKIPPED
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
          ERROR
        </Badge>
      );
  }
}

function StepDetails({ step }: { step: TestStepResult }) {
  const [expanded, setExpanded] = useState(step.status === 'error');

  const actionConfig = getActionConfig(step.action);

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Step Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-6">
            #{step.stepNumber}
          </span>
          <StepStatusIcon status={step.status} />
          <span className={`${actionConfig.color} flex items-center gap-1`}>
            <actionConfig.icon />
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {actionConfig.label}
          </span>
          <StepStatusBadge status={step.status} />
        </div>
        <div className="flex items-center gap-2">
          {step.estimatedCredits > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <CurrencyDollarIcon className="h-3 w-3" />
              {step.estimatedCredits}
            </span>
          )}
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Step Content */}
      {expanded && (
        <div className="p-3 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          {/* Description */}
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
            {step.preview.description}
          </p>

          {/* Details */}
          {step.preview.details && Object.keys(step.preview.details).length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-3 space-y-2">
              {Object.entries(step.preview.details).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm text-zinc-900 dark:text-zinc-100 break-words">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 italic">
            {step.note}
          </p>
        </div>
      )}
    </div>
  );
}

export function TestResultsDisplay({ result }: TestResultsDisplayProps) {
  const simulatedCount = result.steps.filter(s => s.status === 'simulated').length;
  const skippedCount = result.steps.filter(s => s.status === 'skipped').length;
  const errorCount = result.steps.filter(s => s.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {simulatedCount} simulated
          </span>
        </div>
        {skippedCount > 0 && (
          <div className="flex items-center gap-2">
            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {skippedCount} skipped
            </span>
          </div>
        )}
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <CurrencyDollarIcon className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            ~{result.totalEstimatedCredits} credits
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {result.totalEstimatedDuration}ms
          </span>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                warning.severity === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <ExclamationTriangleIcon
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  warning.severity === 'error' ? 'text-red-500' : 'text-amber-500'
                }`}
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    warning.severity === 'error'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {warning.message}
                </p>
                {warning.suggestion && (
                  <p
                    className={`mt-1 text-xs ${
                      warning.severity === 'error'
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

      {/* Error at specific step (AC5) */}
      {!result.success && result.error && result.failedAtStep && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">
                Error at Step {result.failedAtStep}
              </p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {result.error}
              </p>
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                Fix the instructions and re-test.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Steps */}
      {result.steps.length === 0 && (
        <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
          <p>No actions to simulate.</p>
          <p className="text-sm mt-1">
            The agent doesn&apos;t have any parsed actions yet.
          </p>
        </div>
      )}

      {/* Step List */}
      {result.steps.length > 0 && (
        <div className="space-y-2">
          {result.steps.map((step) => (
            <StepDetails key={step.stepNumber} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TestResultsDisplay;
