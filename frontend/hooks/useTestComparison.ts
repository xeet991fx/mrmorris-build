/**
 * useTestComparison - Story 2.7: Compare Test vs Live Results
 *
 * Hook for managing test vs live comparison state.
 * AC1: Side-by-side comparison view
 * AC5: Mismatch detection and warning
 * AC7: Stale data warning
 */

import { useState, useCallback } from 'react';
import { compareExecutionToTest } from '@/lib/api/agents';
import { ComparisonResult } from '@/types/agent';

interface UseTestComparisonOptions {
  workspaceId: string;
  agentId: string;
}

interface UseTestComparisonReturn {
  comparison: ComparisonResult | null;
  isLoading: boolean;
  error: string | null;
  compare: (executionId: string) => Promise<void>;
  reset: () => void;
}

export function useTestComparison({
  workspaceId,
  agentId,
}: UseTestComparisonOptions): UseTestComparisonReturn {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(
    async (executionId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await compareExecutionToTest(
          workspaceId,
          agentId,
          executionId
        );

        if (response.success) {
          setComparison(response.comparison);
        } else {
          setError(response.error || 'Failed to compare execution');
        }
      } catch (err: any) {
        const message =
          err.response?.data?.error ||
          err.message ||
          'Failed to compare execution to test';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, agentId]
  );

  const reset = useCallback(() => {
    setComparison(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    comparison,
    isLoading,
    error,
    compare,
    reset,
  };
}

export default useTestComparison;
