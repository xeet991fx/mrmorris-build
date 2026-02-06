'use client';

/**
 * Story 4.5, Task 10: Pattern Detection Banner
 *
 * Displays warning when agent has repeated failures with same error.
 * Shows on agent dashboard with quick action buttons.
 *
 * AC Coverage: AC5
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  PauseIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface PatternDetection {
  errorMessage: string;
  failureCount: number;
  firstOccurred: string;
  lastOccurred: string;
  agentId: string;
  agentName: string;
}

interface PatternDetectionBannerProps {
  workspaceId: string;
  agentId: string;
  onAnalyze?: () => void;
  onPauseAgent?: () => void;
}

export function PatternDetectionBanner({
  workspaceId,
  agentId,
  onAnalyze,
  onPauseAgent,
}: PatternDetectionBannerProps) {
  const [pattern, setPattern] = useState<PatternDetection | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCheckingPattern, setIsCheckingPattern] = useState(false);

  useEffect(() => {
    checkForPattern();
  }, [workspaceId, agentId]);

  // Check localStorage for dismissed patterns
  useEffect(() => {
    if (pattern) {
      const dismissedKey = `pattern-dismissed-${agentId}-${pattern.errorMessage}`;
      const dismissed = localStorage.getItem(dismissedKey);
      if (dismissed) {
        setIsDismissed(true);
      }
    }
  }, [pattern, agentId]);

  const checkForPattern = async () => {
    try {
      setIsCheckingPattern(true);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/pattern-detection`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (response.ok && data.success && data.pattern?.isPattern) {
        setPattern(data.pattern);
      }
    } catch (error: any) {
      console.error('Error checking pattern:', error);
    } finally {
      setIsCheckingPattern(false);
    }
  };

  const handleDismiss = () => {
    if (pattern) {
      const dismissedKey = `pattern-dismissed-${agentId}-${pattern.errorMessage}`;
      localStorage.setItem(dismissedKey, 'true');
      setIsDismissed(true);
    }
  };

  const handlePauseAgent = async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/pause`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Agent paused successfully');
        onPauseAgent?.();
      } else {
        throw new Error(data.error || 'Failed to pause agent');
      }
    } catch (error: any) {
      console.error('Error pausing agent:', error);
      toast.error(error.message || 'Failed to pause agent');
    }
  };

  if (!pattern || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6"
      >
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                  ⚠️ Repeated Failure Pattern Detected
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This agent has failed <strong>{pattern.failureCount} times</strong> with the same error
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors flex-shrink-0"
                title="Dismiss this warning"
              >
                <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </div>

            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800 mb-3">
              <p className="text-xs font-mono text-red-800 dark:text-red-200">
                {pattern.errorMessage}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-red-600 dark:text-red-400 mb-3">
              <span>First occurred: {new Date(pattern.firstOccurred).toLocaleDateString()}</span>
              <span>•</span>
              <span>Latest: {new Date(pattern.lastOccurred).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseAgent}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <PauseIcon className="w-3.5 h-3.5" />
                Pause Agent
              </button>

              <button
                onClick={onAnalyze}
                className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                Analyze Failures
              </button>

              <button
                onClick={() => {
                  // Navigate to executions filtered by failed status
                  toast.info('Showing failed executions...');
                }}
                className="px-3 py-1.5 text-xs font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                Fix Now
              </button>
            </div>

            <p className="text-xs text-red-600 dark:text-red-400 mt-3">
              💡 <strong>Recommendation:</strong> Pause this agent until the underlying issue is resolved to avoid wasting credits.
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
