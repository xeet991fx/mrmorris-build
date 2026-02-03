'use client';

/**
 * Story 5.4 Task 9: Email Execution Progress Component
 *
 * Displays email-specific execution monitoring:
 * - Real-time email sending progress (AC3)
 * - Sent/failed counts during execution (AC5)
 * - Rate limit warnings if detected (AC4)
 * - Activity log after completion (AC6)
 * - Gmail Sent folder link for verification
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Execution, ExecutionStep } from '@/lib/api/agents';

interface EmailExecutionProgressProps {
  execution: Execution;
  liveProgress?: {
    step: number;
    total: number;
    action: string;
    progress?: number;
  };
  isExpanded: boolean;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  rateLimitHits: number;
}

export function EmailExecutionProgress({
  execution,
  liveProgress,
  isExpanded
}: EmailExecutionProgressProps) {
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    rateLimitHits: 0,
  });

  // Calculate email statistics from execution steps
  useEffect(() => {
    if (!execution.steps || execution.steps.length === 0) {
      return;
    }

    const emailSteps = execution.steps.filter(
      (step) =>
        step.action.toLowerCase().includes('email') ||
        step.action.toLowerCase().includes('send')
    );

    const stats: EmailStats = {
      total: emailSteps.length,
      sent: 0,
      failed: 0,
      pending: 0,
      rateLimitHits: 0,
    };

    emailSteps.forEach((step) => {
      if (step.result.success) {
        stats.sent++;
      } else {
        stats.failed++;
        // Check for rate limit errors (AC4)
        if (
          step.result.error?.includes('429') ||
          step.result.error?.toLowerCase().includes('rate limit') ||
          step.result.error?.toLowerCase().includes('too many requests')
        ) {
          stats.rateLimitHits++;
        }
      }
    });

    // Calculate pending based on live progress
    if (execution.status === 'running' && liveProgress) {
      stats.pending = Math.max(0, stats.total - stats.sent - stats.failed);
    }

    setEmailStats(stats);
  }, [execution.steps, execution.status, liveProgress]);

  // Only show for executions that involve email sending
  const hasEmailActions = useMemo(() => {
    if (!execution.steps || execution.steps.length === 0) return false;
    return execution.steps.some(
      (step) =>
        step.action.toLowerCase().includes('email') ||
        step.action.toLowerCase().includes('send')
    );
  }, [execution.steps]);

  if (!hasEmailActions) {
    return null;
  }

  const successRate = emailStats.total > 0
    ? Math.round((emailStats.sent / emailStats.total) * 100)
    : 0;

  const isRunning = execution.status === 'running';

  return (
    <div className="space-y-3">
      {/* Email Statistics Bar - Task 9.2 */}
      <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />

        <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
          {/* Total Emails */}
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">Total</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {emailStats.total}
            </div>
          </div>

          {/* Sent Count */}
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">Sent</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
              {emailStats.sent}
              {isRunning && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Failed Count */}
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">Failed</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
              {emailStats.failed}
              {emailStats.failed > 0 && <XCircleIcon className="w-4 h-4" />}
            </div>
          </div>

          {/* Success Rate */}
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 mb-0.5">Success</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {successRate}%
            </div>
          </div>
        </div>

        {/* Gmail Sent Folder Link - Task 9.5 */}
        {!isRunning && emailStats.sent > 0 && (
          <a
            href="https://mail.google.com/mail/u/0/#sent"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5"
          >
            View in Gmail
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Real-time Progress Bar - Task 9.1 */}
      {isRunning && liveProgress && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Sending emails...
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {liveProgress.step} / {liveProgress.total}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{
                width: `${((liveProgress.step / liveProgress.total) * 100)}%`
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Current Action */}
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>{liveProgress.action}</span>
          </div>
        </motion.div>
      )}

      {/* Rate Limit Warning - Task 9.3 */}
      {emailStats.rateLimitHits > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                Rate Limit Detected
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {emailStats.rateLimitHits} email{emailStats.rateLimitHits !== 1 ? 's' : ''} hit Gmail rate limits (429 Too Many Requests).
                The system automatically retried with exponential backoff (1s → 2s → 4s).
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                💡 Consider spreading sends over time or reducing batch size to avoid hitting Gmail's 250 units/sec/user limit.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Email Steps Detail - Task 9.4 */}
      {isExpanded && execution.steps && execution.steps.length > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Email Activity Log ({emailStats.total} emails)
            </div>

            {execution.steps
              .filter(step =>
                step.action.toLowerCase().includes('email') ||
                step.action.toLowerCase().includes('send')
              )
              .map((step) => {
                const isRateLimited =
                  step.result.error?.includes('429') ||
                  step.result.error?.toLowerCase().includes('rate limit') ||
                  step.result.error?.toLowerCase().includes('too many requests');

                return (
                  <motion.div
                    key={step.stepNumber}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: step.stepNumber * 0.02 }}
                    className={`px-3 py-2 bg-white dark:bg-zinc-900 border rounded text-xs ${
                      step.result.success
                        ? 'border-green-200 dark:border-green-800'
                        : isRateLimited
                        ? 'border-yellow-200 dark:border-yellow-800'
                        : 'border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {step.result.success ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : isRateLimited ? (
                          <ClockIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                          #{step.stepNumber}
                        </span>
                        <span className="text-zinc-900 dark:text-zinc-100 truncate">
                          {step.result.description || step.action}
                        </span>
                      </div>
                      <span className="text-zinc-400 text-[10px] ml-2 flex-shrink-0">
                        {step.durationMs ? `${step.durationMs}ms` : ''}
                      </span>
                    </div>

                    {/* Show retry info for rate limited emails */}
                    {isRateLimited && (
                      <div className="mt-1 pl-6 text-[10px] text-yellow-600 dark:text-yellow-400">
                        ⚠️ Rate limit hit - retried with backoff
                      </div>
                    )}

                    {/* Show error details */}
                    {!step.result.success && step.result.error && (
                      <div className="mt-1 pl-6 text-[10px] text-red-600 dark:text-red-400">
                        {step.result.error}
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Completion Summary - Task 9.4 */}
      {!isRunning && emailStats.total > 0 && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            <strong>Email Campaign Complete:</strong> {emailStats.sent} sent, {emailStats.failed} failed
            {emailStats.rateLimitHits > 0 && ` (${emailStats.rateLimitHits} rate limit retries)`}
          </div>
        </div>
      )}
    </div>
  );
}
