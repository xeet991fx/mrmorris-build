'use client';

/**
 * Story 4.5, Task 8: useApplyFix Hook
 *
 * Handles auto-fix application with:
 * - Diff preview modal
 * - Success toast
 * - 5-second undo window with countdown
 * - Undo functionality
 *
 * AC Coverage: AC6
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApplyFixOptions {
  workspaceId: string;
  agentId: string;
  executionId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface ApplyFixState {
  isApplying: boolean;
  showUndo: boolean;
  timeLeft: number;
  lastAppliedFix: { type: string; data: any } | null;
}

const UNDO_WINDOW_MS = 5000; // 5 seconds
const TICK_INTERVAL_MS = 100; // Update every 100ms for smooth countdown

export function useApplyFix({
  workspaceId,
  agentId,
  executionId,
  onSuccess,
  onError,
}: UseApplyFixOptions) {
  const [state, setState] = useState<ApplyFixState>({
    isApplying: false,
    showUndo: false,
    timeLeft: 0,
    lastAppliedFix: null,
  });

  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoEndTimeRef = useRef<number>(0);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }
    };
  }, []);

  /**
   * Apply a fix to the agent
   */
  const applyFix = useCallback(
    async (fixType: string, fixData: any) => {
      try {
        setState((prev) => ({ ...prev, isApplying: true }));

        const response = await fetch(
          `/api/workspaces/${workspaceId}/agents/${agentId}/apply-fix`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              executionId,
              fixType,
              fixData,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to apply fix');
        }

        // Store fix details for undo
        setState((prev) => ({
          ...prev,
          isApplying: false,
          showUndo: true,
          lastAppliedFix: { type: fixType, data: fixData },
        }));

        // Start undo countdown
        undoEndTimeRef.current = Date.now() + UNDO_WINDOW_MS;

        // Update countdown every 100ms
        undoTimerRef.current = setInterval(() => {
          const remaining = undoEndTimeRef.current - Date.now();

          if (remaining <= 0) {
            // Undo window expired
            if (undoTimerRef.current) {
              clearInterval(undoTimerRef.current);
            }
            setState((prev) => ({
              ...prev,
              showUndo: false,
              timeLeft: 0,
              lastAppliedFix: null,
            }));
          } else {
            // Update time left (in seconds with 1 decimal)
            const secondsLeft = Math.ceil(remaining / 1000);
            setState((prev) => ({
              ...prev,
              timeLeft: secondsLeft,
            }));
          }
        }, TICK_INTERVAL_MS);

        onSuccess?.();
      } catch (error: any) {
        console.error('Error applying fix:', error);
        setState((prev) => ({ ...prev, isApplying: false }));
        onError?.(error.message || 'Failed to apply fix');
      }
    },
    [workspaceId, agentId, executionId, onSuccess, onError]
  );

  /**
   * Undo the last applied fix
   */
  const handleUndo = useCallback(async () => {
    if (!state.lastAppliedFix) return;

    try {
      // Clear undo timer
      if (undoTimerRef.current) {
        clearInterval(undoTimerRef.current);
      }

      setState((prev) => ({ ...prev, showUndo: false }));

      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/undo-fix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fixType: state.lastAppliedFix.type,
            fixData: state.lastAppliedFix.data,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo fix');
      }

      setState((prev) => ({
        ...prev,
        lastAppliedFix: null,
        timeLeft: 0,
      }));

      onSuccess?.();
    } catch (error: any) {
      console.error('Error undoing fix:', error);
      onError?.(error.message || 'Failed to undo fix');
    }
  }, [workspaceId, agentId, state.lastAppliedFix, onSuccess, onError]);

  return {
    applyFix,
    isApplying: state.isApplying,
    showUndo: state.showUndo,
    timeLeft: state.timeLeft,
    handleUndo,
  };
}
