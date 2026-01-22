/**
 * useTestModeStreaming.ts - Story 2.6: SSE-based test execution hook
 *
 * Provides progressive streaming of test results using Server-Sent Events.
 * Features:
 * - AC2: Progressive display of steps as they complete
 * - AC3: Progress indicator and cancel functionality
 * - AC1: Loading states during execution
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TestStepResult, ExecutionEstimate } from '@/types/agent';

// =============================================================================
// TYPES
// =============================================================================

export interface TestProgress {
  current: number;
  total: number;
  executionTimeMs?: number;
}

export interface TestStreamResult {
  success: boolean;
  timedOut?: boolean;
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  executionTimeMs?: number;
  warnings: Array<{
    step: number;
    severity: 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  estimates?: ExecutionEstimate;
  error?: string;
}

export interface UseTestModeStreamingOptions {
  agentId: string;
  workspaceId: string;
  onStep?: (step: TestStepResult) => void;
  onProgress?: (progress: TestProgress) => void;
  onComplete?: (result: TestStreamResult) => void;
  onError?: (error: string) => void;
}

export interface UseTestModeStreamingReturn {
  steps: TestStepResult[];
  isRunning: boolean;
  progress: TestProgress | null;
  testRunId: string | null;
  result: TestStreamResult | null;
  error: string | null;
  elapsedTimeMs: number;
  startTest: (targetIds?: string[], targetType?: 'contact' | 'deal') => void;
  cancelTest: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTestModeStreaming({
  agentId,
  workspaceId,
  onStep,
  onProgress,
  onComplete,
  onError,
}: UseTestModeStreamingOptions): UseTestModeStreamingReturn {
  const [steps, setSteps] = useState<TestStepResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [result, setResult] = useState<TestStreamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start elapsed time tracking
  const startElapsedTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    elapsedIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTimeMs(Date.now() - startTimeRef.current);
      }
    }, 100);
  }, []);

  // Stop elapsed time tracking
  const stopElapsedTracking = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  /**
   * Start streaming test execution
   */
  const startTest = useCallback(
    (targetIds?: string[], targetType?: 'contact' | 'deal') => {
      // Reset state
      setSteps([]);
      setProgress(null);
      setResult(null);
      setError(null);
      setTestRunId(null);
      setElapsedTimeMs(0);
      setIsRunning(true);

      // Cleanup any existing connection
      cleanup();

      // Start elapsed time tracking
      startElapsedTracking();

      // Build URL with query params
      const params = new URLSearchParams();
      if (targetIds && targetIds.length > 0) {
        params.set('targetIds', targetIds.join(','));
      }
      if (targetType) {
        params.set('targetType', targetType);
      }

      // EventSource doesn't support custom headers, so pass token as query param
      const token = localStorage.getItem('token');
      if (token) {
        params.set('token', token);
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const url = `${backendUrl}/workspaces/${workspaceId}/agents/${agentId}/test/stream?${params.toString()}`;

      // Create EventSource for SSE
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      // Handle 'started' event
      eventSource.addEventListener('started', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setTestRunId(data.testRunId);
        } catch (err) {
          console.error('Failed to parse started event:', err);
        }
      });

      // Handle 'step' event - progressive display
      eventSource.addEventListener('step', (e: MessageEvent) => {
        try {
          const step: TestStepResult = JSON.parse(e.data);
          setSteps((prev) => [...prev, step]);
          onStep?.(step);
        } catch (err) {
          console.error('Failed to parse step event:', err);
        }
      });

      // Handle 'progress' event
      eventSource.addEventListener('progress', (e: MessageEvent) => {
        try {
          const progressData: TestProgress = JSON.parse(e.data);
          setProgress(progressData);
          onProgress?.(progressData);
        } catch (err) {
          console.error('Failed to parse progress event:', err);
        }
      });

      // Handle 'complete' event
      eventSource.addEventListener('complete', (e: MessageEvent) => {
        try {
          const resultData: TestStreamResult = JSON.parse(e.data);
          setResult(resultData);
          setIsRunning(false);
          stopElapsedTracking();
          onComplete?.(resultData);
          eventSource.close();
        } catch (err) {
          console.error('Failed to parse complete event:', err);
          setIsRunning(false);
          stopElapsedTracking();
        }
      });

      // Handle 'error' event
      eventSource.addEventListener('error', (e: MessageEvent) => {
        // Check if it's a data error or connection error
        if (e.data) {
          try {
            const errorData = JSON.parse(e.data);
            setError(errorData.error || 'Test failed');
            onError?.(errorData.error || 'Test failed');
          } catch {
            setError('Test failed with unknown error');
            onError?.('Test failed with unknown error');
          }
        } else {
          // Connection error
          setError('Connection to server lost');
          onError?.('Connection to server lost');
        }
        setIsRunning(false);
        stopElapsedTracking();
        eventSource.close();
      });

      // Handle EventSource errors (connection issues)
      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection was closed normally by server
          if (!result && !error) {
            setError('Connection closed unexpectedly');
            onError?.('Connection closed unexpectedly');
          }
          setIsRunning(false);
          stopElapsedTracking();
        }
      };
    },
    [agentId, workspaceId, cleanup, startElapsedTracking, stopElapsedTracking, onStep, onProgress, onComplete, onError, result, error]
  );

  /**
   * Cancel the current test run
   */
  const cancelTest = useCallback(async () => {
    if (!testRunId) {
      console.warn('No test run to cancel');
      return;
    }

    // Close the EventSource immediately
    cleanup();

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${backendUrl}/workspaces/${workspaceId}/agents/${agentId}/test/${testRunId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.cancelled) {
        setResult({
          success: false,
          totalEstimatedCredits: steps.reduce((sum, s) => sum + (s.estimatedCredits || 0), 0),
          totalEstimatedDuration: steps.reduce((sum, s) => sum + (s.duration || 0), 0),
          executionTimeMs: elapsedTimeMs,
          warnings: [],
          error: 'Test cancelled by user',
        });
      }
    } catch (err) {
      console.error('Failed to cancel test:', err);
    } finally {
      setIsRunning(false);
      stopElapsedTracking();
    }
  }, [testRunId, workspaceId, agentId, cleanup, steps, elapsedTimeMs, stopElapsedTracking]);

  /**
   * Reset all state for a fresh test
   */
  const reset = useCallback(() => {
    cleanup();
    setSteps([]);
    setIsRunning(false);
    setProgress(null);
    setTestRunId(null);
    setResult(null);
    setError(null);
    setElapsedTimeMs(0);
  }, [cleanup]);

  return {
    steps,
    isRunning,
    progress,
    testRunId,
    result,
    error,
    elapsedTimeMs,
    startTest,
    cancelTest,
    reset,
  };
}

export default useTestModeStreaming;
