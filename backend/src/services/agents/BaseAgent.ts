/**
 * BaseAgent - Abstract base class for all agents
 * Provides common lifecycle management, event handling, and task execution
 */

import { EventEmitter } from 'events';
import {
    AgentType,
    AgentStatus,
    AgentContext,
    AgentTask,
    AgentResult,
    AgentConfig,
    AgentEvent,
    AgentEventType,
} from './types';

export interface IAgent {
    readonly id: string;
    readonly type: AgentType;
    readonly status: AgentStatus;

    // Lifecycle
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    pause(): void;
    resume(): void;

    // Task execution
    execute(task: AgentTask): Promise<AgentResult>;
    canHandle(task: AgentTask): boolean;
}

export abstract class BaseAgent extends EventEmitter implements IAgent {
    public readonly id: string;
    public readonly type: AgentType;
    protected _status: AgentStatus = 'idle';
    protected config: AgentConfig;
    protected currentTask: AgentTask | null = null;

    constructor(type: AgentType, config?: Partial<AgentConfig>) {
        super();
        this.id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.config = {
            type,
            enabled: true,
            settings: {},
            limits: {
                maxConcurrentTasks: 1,
                maxRetries: 3,
                timeoutMs: 30000,
            },
            ...config,
        };
    }

    // ============================================
    // STATUS MANAGEMENT
    // ============================================

    get status(): AgentStatus {
        return this._status;
    }

    protected setStatus(status: AgentStatus): void {
        const previousStatus = this._status;
        this._status = status;
        this.emit('status:changed', {
            agentId: this.id,
            previousStatus,
            newStatus: status
        });
    }

    // ============================================
    // LIFECYCLE METHODS
    // ============================================

    async initialize(): Promise<void> {
        console.log(`[${this.type}] Initializing agent ${this.id}`);
        this.setStatus('idle');
        await this.onInitialize();
        this.emit('agent:started', { agentId: this.id, type: this.type });
    }

    async shutdown(): Promise<void> {
        console.log(`[${this.type}] Shutting down agent ${this.id}`);
        this.setStatus('shutdown');
        await this.onShutdown();
        this.emit('agent:stopped', { agentId: this.id, type: this.type });
    }

    pause(): void {
        if (this._status === 'running' || this._status === 'idle') {
            console.log(`[${this.type}] Pausing agent ${this.id}`);
            this.setStatus('paused');
        }
    }

    resume(): void {
        if (this._status === 'paused') {
            console.log(`[${this.type}] Resuming agent ${this.id}`);
            this.setStatus('idle');
        }
    }

    // Override these in subclasses for custom initialization/shutdown
    protected async onInitialize(): Promise<void> { }
    protected async onShutdown(): Promise<void> { }

    // ============================================
    // TASK EXECUTION
    // ============================================

    async execute(task: AgentTask): Promise<AgentResult> {
        if (this._status !== 'idle') {
            return {
                success: false,
                error: `Agent is not ready. Current status: ${this._status}`,
            };
        }

        if (!this.canHandle(task)) {
            return {
                success: false,
                error: `Agent ${this.type} cannot handle task type: ${task.type}`,
            };
        }

        this.currentTask = task;
        this.setStatus('running');
        this.emit('agent:task:started', { agentId: this.id, taskId: task.id });

        try {
            const timeoutMs = task.timeout || this.config.limits?.timeoutMs || 30000;

            const result = await Promise.race([
                this.executeTask(task),
                this.createTimeout(timeoutMs),
            ]);

            this.emit('agent:task:completed', {
                agentId: this.id,
                taskId: task.id,
                result
            });

            return result;
        } catch (error: any) {
            console.error(`[${this.type}] Task execution error:`, error);

            const result: AgentResult = {
                success: false,
                error: error.message || 'Unknown error occurred',
            };

            this.emit('agent:task:failed', {
                agentId: this.id,
                taskId: task.id,
                error: result.error
            });

            this.setStatus('error');
            return result;
        } finally {
            this.currentTask = null;
            // Reset to idle only if still in running state (not error)
            if (this._status === ('running' as AgentStatus)) {
                this.setStatus('idle');
            }
        }
    }

    private createTimeout(ms: number): Promise<AgentResult> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms);
        });
    }

    // ============================================
    // ABSTRACT METHODS - MUST IMPLEMENT
    // ============================================

    /**
     * Check if this agent can handle the given task
     */
    abstract canHandle(task: AgentTask): boolean;

    /**
     * Execute the task - implement actual agent logic here
     */
    protected abstract executeTask(task: AgentTask): Promise<AgentResult>;

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Create a standardized success result
     */
    protected success(data: any, options?: Partial<AgentResult>): AgentResult {
        return {
            success: true,
            data,
            ...options,
        };
    }

    /**
     * Create a standardized error result
     */
    protected error(message: string, options?: Partial<AgentResult>): AgentResult {
        return {
            success: false,
            error: message,
            ...options,
        };
    }

    /**
     * Create a result that requires user confirmation
     */
    protected requiresConfirmation(
        message: string,
        data: any
    ): AgentResult {
        return {
            success: true,
            data,
            requiresConfirmation: true,
            confirmationMessage: message,
        };
    }

    /**
     * Create a result that routes to another agent
     */
    protected routeToAgent(
        nextAgent: AgentType,
        taskPayload: any,
        currentData?: any
    ): AgentResult {
        return {
            success: true,
            data: currentData,
            nextAgent,
            nextTask: {
                type: `${nextAgent}:task`,
                payload: taskPayload,
            },
        };
    }

    /**
     * Log with agent context
     */
    protected log(message: string, data?: any): void {
        console.log(`[${this.type}:${this.id.slice(-6)}] ${message}`, data || '');
    }
}

export default BaseAgent;
