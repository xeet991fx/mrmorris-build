'use client';

import { useState, useCallback, useRef } from 'react';
import { Play, Loader2, AlertCircle, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { triggerAgent, TriggerAgentInput } from '@/lib/api/agents';
import { IAgent } from '@/types/agent';
import { useAgentExecution } from '@/hooks/useAgentExecution';

/**
 * Story 3.2: RunNowButton Component
 *
 * Manual trigger execution button with the following states:
 * - AC1: Idle - "Run Now" button visible
 * - AC1: Loading - Disabled button with spinner, text "Agent is running..."
 * - AC3: Success - Toast notification with "View Execution Log" link
 * - AC4: Error - Toast notification with "View Error Log" and "Retry" actions
 * - AC5: Already Running - Show current execution info
 */

interface RunNowButtonProps {
  agent: IAgent;
  workspaceId: string;
  target?: TriggerAgentInput['target'];
  onExecutionStarted?: (executionId: string) => void;
  onExecutionCompleted?: (result: { success: boolean; executionId: string }) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function RunNowButton({
  agent,
  workspaceId,
  target,
  onExecutionStarted,
  onExecutionCompleted,
  variant = 'default',
  className = ''
}: RunNowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const lastTargetRef = useRef<TriggerAgentInput['target']>(target);

  // Check if agent can be triggered (Live or Draft only)
  const canTrigger = agent.status === 'Live' || agent.status === 'Draft';

  // Story 3.2 AC3/AC4: Handle execution result with proper messages
  const handleExecutionResult = useCallback((
    executionId: string,
    success: boolean,
    processedCount?: number,
    errorMessage?: string
  ) => {
    toast.dismiss(`execution-${executionId}`);
    setIsLoading(false);

    if (success) {
      // Story 3.2 AC3: Success completion feedback with processed count
      toast.success('Agent completed successfully', {
        description: `Processed ${processedCount ?? 0} contacts.`,
        action: {
          label: 'View Execution Log',
          onClick: () => {
            window.location.href = `/projects/${workspaceId}/agents/${agent._id}/executions/${executionId}`;
          },
        },
      });
    } else {
      // Story 3.2 AC4: Failure handling with View Error Log AND Retry actions
      toast.error('Agent execution failed', {
        description: errorMessage || 'Check the execution log for details',
        action: {
          label: 'View Error Log',
          onClick: () => {
            window.location.href = `/projects/${workspaceId}/agents/${agent._id}/executions/${executionId}`;
          },
        },
      });
      // Show separate retry toast action
      toast('Retry available', {
        description: 'Click to retry the execution',
        action: {
          label: 'Retry Execution',
          onClick: () => {
            handleTrigger();
          },
        },
        duration: 10000,
      });
    }

    onExecutionCompleted?.({ success, executionId });
    setCurrentExecutionId(null);
  }, [workspaceId, agent._id, onExecutionCompleted]);

  // Story 3.2: Connect to Socket.io for real-time execution updates
  useAgentExecution({
    workspaceId,
    agentId: agent._id,
    onCompleted: (event) => {
      if (currentExecutionId === event.executionId) {
        handleExecutionResult(
          event.executionId,
          true,
          event.processedCount
        );
      }
    },
    onFailed: (event) => {
      if (currentExecutionId === event.executionId) {
        handleExecutionResult(
          event.executionId,
          false,
          undefined,
          event.error
        );
      }
    },
  });

  const handleTrigger = async () => {
    if (!canTrigger || isLoading) return;

    setIsLoading(true);
    setCurrentExecutionId(null);
    lastTargetRef.current = target;

    try {
      const response = await triggerAgent(workspaceId, agent._id, {
        target,
      });

      setCurrentExecutionId(response.executionId);
      onExecutionStarted?.(response.executionId);

      // Story 3.2 AC1: Show loading toast
      toast.loading('Agent is running...', {
        id: `execution-${response.executionId}`,
        description: 'Execution started',
      });

      // If execution completed quickly (synchronous case), show result immediately
      if (response.status === 'completed' || response.status === 'failed') {
        handleExecutionResult(
          response.executionId,
          response.result?.success ?? false,
          undefined,
          response.result?.error
        );
      }
      // Otherwise, socket.io will handle the completion notification

    } catch (error: any) {
      setIsLoading(false);
      // Story 3.2 AC5: Handle already running case
      if (error.isConflict) {
        toast.error('Agent is already running', {
          description: `Wait for current execution to complete.`,
          action: {
            label: 'View Execution',
            onClick: () => {
              window.location.href = `/projects/${workspaceId}/agents/${agent._id}/executions/${error.currentExecutionId}`;
            },
          },
        });
        setCurrentExecutionId(error.currentExecutionId);
      } else {
        toast.error('Failed to trigger agent', {
          description: error.message || 'An unexpected error occurred',
        });
      }
    }
  };

  // Pill button styles matching AgentStatusControls pattern
  const pillBase = "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryPill = `${pillBase} bg-blue-600 hover:bg-blue-700 text-white shadow-sm`;
  const compactPill = `${pillBase} bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 dark:text-blue-400`;

  const buttonClass = variant === 'compact' ? compactPill : primaryPill;

  if (!canTrigger) {
    return (
      <button
        disabled
        className={`${pillBase} bg-zinc-100 text-zinc-400 dark:bg-zinc-800 cursor-not-allowed ${className}`}
        title={`Cannot run agent in ${agent.status} status. Agent must be Live or Draft.`}
      >
        <Play className="h-3 w-3" />
        Run Now
      </button>
    );
  }

  return (
    <button
      onClick={handleTrigger}
      disabled={isLoading}
      data-testid="run-now-button"
      className={`${buttonClass} ${className}`}
      title={isLoading ? 'Agent is running...' : 'Manually trigger agent execution'}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <Play className="h-3 w-3" />
          Run Now
        </>
      )}
    </button>
  );
}

export default RunNowButton;
