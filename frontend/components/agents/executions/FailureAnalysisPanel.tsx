'use client';

/**
 * Story 4.5, Task 7: FailureAnalysisPanel Component
 *
 * Displays AI Copilot failure analysis for failed agent executions.
 * Shows error explanation, root cause, suggested fixes, and pattern warnings.
 *
 * AC Coverage: AC1-AC6
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useApplyFix } from '@/hooks/useApplyFix';

/**
 * Types matching backend response from POST /api/workspaces/:id/executions/:id/analyze
 */
interface SuggestedFix {
  type: string;
  description: string;
  action: string;
  autoFixAvailable: boolean;
  preview?: string;
}

interface PatternDetected {
  isPattern: boolean;
  errorMessage: string;
  failureCount: number;
  firstOccurred: string;
  lastOccurred: string;
  recommendation: string;
}

interface FailureAnalysis {
  explanation: string;
  rootCause: string;
  failedStep: {
    stepNumber: number;
    action: string;
    error: string;
    timestamp: string;
  };
  suggestedFixes: SuggestedFix[];
  patternDetected: PatternDetected | null;
  availableTemplates: string[];
  integrationStatus: Record<string, string>;
}

interface FailureAnalysisPanelProps {
  workspaceId: string;
  agentId: string;
  executionId: string;
  onClose: () => void;
  onApplyFix?: (fixType: string, fixData: any) => void;
}

export function FailureAnalysisPanel({
  workspaceId,
  agentId,
  executionId,
  onClose,
  onApplyFix,
}: FailureAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { applyFix, isApplying, showUndo, handleUndo, timeLeft } = useApplyFix({
    workspaceId,
    agentId,
    executionId,
    onSuccess: () => {
      toast.success('Fix applied successfully!');
      onApplyFix?.('' , {});
    },
  });

  useEffect(() => {
    analyzeFailure();
  }, [workspaceId, executionId]);

  const analyzeFailure = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/executions/${executionId}/analyze`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze execution');
      }

      if (data.success) {
        setAnalysis(data.analysis);
      }
    } catch (err: any) {
      console.error('Error analyzing failure:', err);
      setError(err.message || 'Failed to analyze execution failure');
      toast.error(err.message || 'Failed to analyze execution failure');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFix = async (fix: SuggestedFix) => {
    if (!fix.autoFixAvailable) {
      toast.error('This fix cannot be auto-applied');
      return;
    }

    await applyFix(fix.type, {
      description: fix.description,
      preview: fix.preview,
    });
  };

  const getRootCauseIcon = (rootCause: string) => {
    switch (rootCause) {
      case 'missing_template':
      case 'missing_field':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'missing_integration':
      case 'auth_error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'rate_limit':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-zinc-500" />;
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-50 overflow-y-auto"
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-3 text-zinc-400">
            <SparklesIcon className="w-6 h-6 animate-pulse" />
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">AI Copilot is analyzing the failure...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error || !analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Failure Analysis
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              {error || 'Failed to analyze execution'}
            </p>
            <button
              onClick={analyzeFailure}
              className="mt-4 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry Analysis
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-50 overflow-y-auto"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI Copilot Failure Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Pattern Warning Banner (AC5) */}
        {analysis.patternDetected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                  ⚠️ This agent has failed {analysis.patternDetected.failureCount} times with the same error
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                  {analysis.patternDetected.recommendation}
                </p>
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <span>First: {new Date(analysis.patternDetected.firstOccurred).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Latest: {new Date(analysis.patternDetected.lastOccurred).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Explanation (AC1-AC4) */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What Went Wrong
          </h3>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <p className="text-sm text-zinc-900 dark:text-zinc-100">
              {analysis.explanation}
            </p>
          </div>
        </div>

        {/* Root Cause */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Root Cause
          </h3>
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            {getRootCauseIcon(analysis.rootCause)}
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {analysis.rootCause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Step {analysis.failedStep.stepNumber}: {analysis.failedStep.action}
              </p>
            </div>
          </div>
        </div>

        {/* Failed Step Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Error Details
          </h3>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs font-mono text-red-700 dark:text-red-300">
              {analysis.failedStep.error}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {new Date(analysis.failedStep.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Suggested Fixes (AC6) */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Suggested Fixes
          </h3>
          <div className="space-y-2">
            {analysis.suggestedFixes.map((fix, index) => (
              <div
                key={index}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      {fix.description}
                    </p>
                    {fix.preview && (
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-900/30 p-2 rounded mt-2">
                        {fix.preview}
                      </p>
                    )}
                  </div>
                  {fix.autoFixAvailable && (
                    <button
                      onClick={() => handleApplyFix(fix)}
                      disabled={isApplying}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {isApplying ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                          {fix.action}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Status (AC2) */}
        {Object.keys(analysis.integrationStatus).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Integration Status
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(analysis.integrationStatus).map(([integration, status]) => (
                <div
                  key={integration}
                  className={`px-3 py-2 rounded-lg border ${
                    status === 'connected'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status === 'connected' ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-xs font-medium capitalize ${
                      status === 'connected'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {integration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Templates */}
        {analysis.availableTemplates.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Available Templates
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.availableTemplates.map((template, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700"
                >
                  {template}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Undo Banner (AC6 - 5-second undo window) */}
        {showUndo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 p-4 bg-green-600 text-white rounded-lg shadow-lg flex items-center gap-3"
          >
            <CheckCircleIcon className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Fix applied successfully!</p>
              <p className="text-xs opacity-90">Undo available for {timeLeft}s</p>
            </div>
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              Undo
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
