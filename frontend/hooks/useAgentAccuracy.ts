/**
 * useAgentAccuracy - Story 2.7: Agent Test Accuracy Metrics
 *
 * Hook for fetching and managing agent accuracy metrics.
 * AC6: Accuracy metric tracking (NFR36: 95% target)
 * AC8: System alert for degraded accuracy (<90%)
 */

import { useState, useEffect, useCallback } from 'react';
import { getAgentAccuracy } from '@/lib/api/agents';
import { AgentAccuracyMetrics } from '@/types/agent';

interface UseAgentAccuracyOptions {
  workspaceId: string;
  agentId: string;
  enabled?: boolean;
}

interface UseAgentAccuracyReturn {
  accuracy: AgentAccuracyMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgentAccuracy({
  workspaceId,
  agentId,
  enabled = true,
}: UseAgentAccuracyOptions): UseAgentAccuracyReturn {
  const [accuracy, setAccuracy] = useState<AgentAccuracyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = useCallback(async () => {
    if (!workspaceId || !agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getAgentAccuracy(workspaceId, agentId);

      if (response.success) {
        setAccuracy(response.accuracy);
      } else {
        setError(response.error || 'Failed to fetch accuracy');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Failed to fetch agent accuracy';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, agentId]);

  useEffect(() => {
    if (enabled) {
      fetchAccuracy();
    }
  }, [enabled, fetchAccuracy]);

  return {
    accuracy,
    isLoading,
    error,
    refetch: fetchAccuracy,
  };
}

export default useAgentAccuracy;
