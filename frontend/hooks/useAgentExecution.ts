'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Story 3.2: useAgentExecution Hook
 *
 * Provides real-time execution status updates via Socket.io.
 * Connects to /agent-execution namespace and joins workspace-scoped rooms.
 *
 * Events:
 * - execution:started - When execution begins
 * - execution:progress - For each step completion
 * - execution:completed - On successful completion
 * - execution:failed - On execution failure
 */

// Event types from backend
export interface ExecutionStartedEvent {
  executionId: string;
  agentId: string;
  agentName: string;
  startedAt: Date;
  triggerType: 'manual' | 'scheduled' | 'event';
}

export interface ExecutionProgressEvent {
  executionId: string;
  step: number;
  total: number;
  action: string;
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'started' | 'resumed';  // Story 3.5: Added started, resumed
  message?: string;
  progress?: number;  // Story 3.5: Progress percentage (0-100)
}

export interface ExecutionCompletedEvent {
  executionId: string;
  success: true;
  processedCount: number;
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    duration: number;
  };
  completedAt: Date;
}

export interface ExecutionFailedEvent {
  executionId: string;
  success: false;
  error: string;
  failedAtStep?: number;
  completedAt: Date;
}

interface UseAgentExecutionOptions {
  workspaceId: string;
  agentId?: string; // Optional: if provided, joins specific agent room
  onStarted?: (event: ExecutionStartedEvent) => void;
  onProgress?: (event: ExecutionProgressEvent) => void;
  onCompleted?: (event: ExecutionCompletedEvent) => void;
  onFailed?: (event: ExecutionFailedEvent) => void;
}

export function useAgentExecution({
  workspaceId,
  agentId,
  onStarted,
  onProgress,
  onCompleted,
  onFailed,
}: UseAgentExecutionOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<ExecutionStartedEvent | null>(null);
  const [progress, setProgress] = useState<ExecutionProgressEvent | null>(null);

  // Use refs for callbacks to avoid re-connecting socket when callbacks change
  const onStartedRef = useRef(onStarted);
  const onProgressRef = useRef(onProgress);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onStartedRef.current = onStarted;
    onProgressRef.current = onProgress;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  }, [onStarted, onProgress, onCompleted, onFailed]);

  useEffect(() => {
    // Get backend URL from environment or use default
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    // Connect to agent-execution namespace
    const newSocket = io(`${backendUrl}/agent-execution`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);

      // Join workspace room
      newSocket.emit('join:workspace', { workspaceId });

      // Join specific agent room if agentId provided
      if (agentId) {
        newSocket.emit('join', { workspaceId, agentId });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Event listeners
    newSocket.on('execution:started', (event: ExecutionStartedEvent) => {
      setCurrentExecution(event);
      onStartedRef.current?.(event);
    });

    newSocket.on('execution:progress', (event: ExecutionProgressEvent) => {
      setProgress(event);
      onProgressRef.current?.(event);
    });

    newSocket.on('execution:completed', (event: ExecutionCompletedEvent) => {
      setCurrentExecution(null);
      setProgress(null);
      onCompletedRef.current?.(event);
    });

    newSocket.on('execution:failed', (event: ExecutionFailedEvent) => {
      setCurrentExecution(null);
      setProgress(null);
      onFailedRef.current?.(event);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (agentId) {
        newSocket.emit('leave', { workspaceId, agentId });
      }
      newSocket.disconnect();
    };
  }, [workspaceId, agentId]);

  // Join a specific agent room dynamically
  const joinAgentRoom = useCallback((targetAgentId: string) => {
    if (socket && isConnected) {
      socket.emit('join', { workspaceId, agentId: targetAgentId });
    }
  }, [socket, isConnected, workspaceId]);

  // Leave a specific agent room
  const leaveAgentRoom = useCallback((targetAgentId: string) => {
    if (socket && isConnected) {
      socket.emit('leave', { workspaceId, agentId: targetAgentId });
    }
  }, [socket, isConnected, workspaceId]);

  return {
    isConnected,
    currentExecution,
    progress,
    joinAgentRoom,
    leaveAgentRoom,
  };
}

export default useAgentExecution;
