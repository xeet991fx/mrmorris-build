import { Server as SocketIOServer, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';

/**
 * Story 3.2: Agent Execution Socket
 *
 * Provides real-time updates for agent execution status.
 * Emits events for:
 * - execution:started - When execution begins
 * - execution:progress - For each step completion
 * - execution:completed - On successful completion
 * - execution:failed - On execution failure
 *
 * Uses workspace-scoped rooms: workspace:${workspaceId}:agent:${agentId}
 */

// Global reference to the agent execution namespace for use by services
let agentExecutionNamespace: Namespace | null = null;

/**
 * Initialize the agent execution socket namespace
 * @param httpServer - The HTTP server instance
 * @returns The Socket.IO server instance
 */
export function initializeAgentExecutionSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Namespace for agent execution updates
  agentExecutionNamespace = io.of('/agent-execution');

  agentExecutionNamespace.on('connection', (socket) => {
    console.log(`✅ Agent execution client connected: ${socket.id}`);

    /**
     * Join workspace room for agent execution updates
     * Room format: workspace:${workspaceId}:agent:${agentId}
     */
    socket.on('join', (data: { workspaceId: string; agentId: string }) => {
      const room = `workspace:${data.workspaceId}:agent:${data.agentId}`;
      socket.join(room);
      console.log(`Client joined agent execution room: ${room}`);
    });

    /**
     * Join workspace-wide room for all agent execution updates
     * Room format: workspace:${workspaceId}
     */
    socket.on('join:workspace', (data: { workspaceId: string }) => {
      const room = `workspace:${data.workspaceId}`;
      socket.join(room);
      console.log(`Client joined workspace execution room: ${room}`);
    });

    /**
     * Leave agent execution room
     */
    socket.on('leave', (data: { workspaceId: string; agentId: string }) => {
      const room = `workspace:${data.workspaceId}:agent:${data.agentId}`;
      socket.leave(room);
      console.log(`Client left agent execution room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Agent execution client disconnected: ${socket.id}`);
    });
  });

  console.log('🚀 Agent Execution Socket.IO initialized');

  return io;
}

/**
 * Get the agent execution namespace for emitting events from services
 * @returns The agent execution namespace or null if not initialized
 */
export function getAgentExecutionNamespace(): Namespace | null {
  return agentExecutionNamespace;
}

// =============================================================================
// Event Types for Agent Execution Socket
// =============================================================================

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
  status: 'pending' | 'success' | 'failed' | 'skipped';
  message?: string;
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

// =============================================================================
// Helper Functions for Emitting Events
// =============================================================================

/**
 * Emit execution:started event to workspace room
 */
export function emitExecutionStarted(
  workspaceId: string,
  agentId: string,
  event: ExecutionStartedEvent
): void {
  const namespace = getAgentExecutionNamespace();
  if (namespace) {
    const room = `workspace:${workspaceId}:agent:${agentId}`;
    namespace.to(room).emit('execution:started', event);
    // Also emit to workspace-wide room
    namespace.to(`workspace:${workspaceId}`).emit('execution:started', event);
  }
}

/**
 * Emit execution:progress event to workspace room
 */
export function emitExecutionProgress(
  workspaceId: string,
  agentId: string,
  event: ExecutionProgressEvent
): void {
  const namespace = getAgentExecutionNamespace();
  if (namespace) {
    const room = `workspace:${workspaceId}:agent:${agentId}`;
    namespace.to(room).emit('execution:progress', event);
  }
}

/**
 * Emit execution:completed event to workspace room
 */
export function emitExecutionCompleted(
  workspaceId: string,
  agentId: string,
  event: ExecutionCompletedEvent
): void {
  const namespace = getAgentExecutionNamespace();
  if (namespace) {
    const room = `workspace:${workspaceId}:agent:${agentId}`;
    namespace.to(room).emit('execution:completed', event);
    // Also emit to workspace-wide room
    namespace.to(`workspace:${workspaceId}`).emit('execution:completed', event);
  }
}

/**
 * Emit execution:failed event to workspace room
 */
export function emitExecutionFailed(
  workspaceId: string,
  agentId: string,
  event: ExecutionFailedEvent
): void {
  const namespace = getAgentExecutionNamespace();
  if (namespace) {
    const room = `workspace:${workspaceId}:agent:${agentId}`;
    namespace.to(room).emit('execution:failed', event);
    // Also emit to workspace-wide room
    namespace.to(`workspace:${workspaceId}`).emit('execution:failed', event);
  }
}

export default initializeAgentExecutionSocket;
