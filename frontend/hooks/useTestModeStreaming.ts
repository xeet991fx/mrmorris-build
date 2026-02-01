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
import { testAgent } from '@/lib/api/agents';
import { toast } from 'react-hot-toast';

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
  isFallbackMode: boolean;
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
  const [isFallbackMode, setIsFallbackMode] = useState(false);

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
   * Run test using POST endpoint (fallback mode)
   */
  const runFallbackTest = useCallback(
    async (targetIds?: string[], targetType?: 'contact' | 'deal') => {
      try {
        // Build test target input
        const testTarget = targetIds && targetIds.length > 0 && targetType
          ? { type: targetType, id: targetIds[0] }
          : undefined;

        // Call POST endpoint
        const response = await testAgent(workspaceId, agentId, { testTarget });

        // Transform response to match streaming format
        const streamResult: TestStreamResult = {
          success: response.success,
          timedOut: response.timedOut,
          totalEstimatedCredits: response.totalEstimatedCredits,
          totalEstimatedDuration: response.totalEstimatedDuration,
          executionTimeMs: response.executionTimeMs,
          warnings: response.warnings,
          estimates: response.estimates,
          error: response.error,
        };

        // Update state with all steps at once
        setSteps(response.steps);

        // Set final progress
        setProgress({
          current: response.steps.length,
          total: response.steps.length,
          executionTimeMs: response.executionTimeMs,
        });

        // Call onStep for each step
        response.steps.forEach((step) => {
          onStep?.(step);
        });

        // Call onProgress callback
        onProgress?.({
          current: response.steps.length,
          total: response.steps.length,
          executionTimeMs: response.executionTimeMs,
        });

        // Set result and complete
        setResult(streamResult);
        onComplete?.(streamResult);

        setIsRunning(false);
        stopElapsedTracking();
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Test failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsRunning(false);
        stopElapsedTracking();
      }
    },
    [workspaceId, agentId, onStep, onProgress, onComplete, onError, stopElapsedTracking]
  );

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
      setIsFallbackMode(false);

      // Cleanup any existing connection
      cleanup();

      // Start elapsed time tracking
      startElapsedTracking();

      // Check if EventSource is available
      if (typeof EventSource === 'undefined') {
        // EventSource not available, use fallback immediately
        toast('Running test in compatibility mode', {
          icon: 'ℹ️',
          duration: 3000,
        });
        setIsFallbackMode(true);
        runFallbackTest(targetIds, targetType);
        return;
      }

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
      let eventSource: EventSource;
      try {
        eventSource = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = eventSource;
      } catch (err) {
        // EventSource creation failed, use fallback
        console.error('Failed to create EventSource:', err);
        toast('Running test in compatibility mode', {
          icon: 'ℹ️',
          duration: 3000,
        });
        setIsFallbackMode(true);
        runFallbackTest(targetIds, targetType);
        return;
      }

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
          console.log('Received step:', step);
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
          console.log('Test completed with result:', resultData);
          if (resultData.warnings && resultData.warnings.length > 0) {
            console.warn('Test warnings:', resultData.warnings);
            resultData.warnings.forEach((w, i) => {
              console.warn(`Warning ${i + 1}:`, w.message, w.suggestion ? `\nSuggestion: ${w.suggestion}` : '');
            });
          }
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
      eventSource.onerror = (e) => {
        console.log('EventSource onerror fired', {
          readyState: eventSource.readyState,
          CONNECTING: EventSource.CONNECTING,
          OPEN: EventSource.OPEN,
          CLOSED: EventSource.CLOSED
        });

        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection was closed - set error state
          // Note: The 'complete' event handler will close the connection normally,
          // so this only fires for unexpected closures
          setError('Connection closed unexpectedly');
          onError?.('Connection closed unexpectedly');
          setIsRunning(false);
          stopElapsedTracking();
        }
        // Don't trigger fallback here - SSE errors are normal during shutdown
      };
    },
    [agentId, workspaceId, cleanup, startElapsedTracking, stopElapsedTracking, onStep, onProgress, onComplete, onError, runFallbackTest]
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
    setIsFallbackMode(false);
  }, [cleanup]);

  return {
    steps,
    isRunning,
    progress,
    testRunId,
    result,
    error,
    elapsedTimeMs,
    isFallbackMode,
    startTest,
    cancelTest,
    reset,
  };
}

export default useTestModeStreaming;
