/**
 * AgentOrchestrator - Central coordinator for all agents
 * Manages agent lifecycle, task routing, and coordination
 */

import { BaseAgent, IAgent } from './BaseAgent';
import { eventBus, EventBus } from './EventBus';
import { memoryStore, MemoryStore } from './MemoryStore';
import {
    AgentType,
    AgentTask,
    AgentResult,
    AgentEvent,
    AgentEventType,
    AgentContext,
} from './types';

interface AgentRegistry {
    agent: IAgent;
    enabled: boolean;
    taskQueue: AgentTask[];
}

export class AgentOrchestrator {
    private static instance: AgentOrchestrator;
    private agents: Map<AgentType, AgentRegistry> = new Map();
    private eventBus: EventBus;
    private memoryStore: MemoryStore;
    private isRunning: boolean = false;
    private taskIdCounter: number = 0;

    private constructor() {
        this.eventBus = eventBus;
        this.memoryStore = memoryStore;
    }

    // ============================================
    // SINGLETON PATTERN
    // ============================================

    static getInstance(): AgentOrchestrator {
        if (!AgentOrchestrator.instance) {
            AgentOrchestrator.instance = new AgentOrchestrator();
        }
        return AgentOrchestrator.instance;
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    /**
     * Start the orchestrator and all registered agents
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[Orchestrator] Already running');
            return;
        }

        console.log('[Orchestrator] Starting...');
        this.isRunning = true;

        // Initialize all agents
        for (const [type, registry] of this.agents) {
            if (registry.enabled) {
                try {
                    await registry.agent.initialize();
                    console.log(`[Orchestrator] Agent ${type} initialized`);
                } catch (error) {
                    console.error(`[Orchestrator] Failed to initialize ${type}:`, error);
                }
            }
        }

        // Subscribe to system events
        this.setupEventListeners();

        console.log('[Orchestrator] Started with', this.agents.size, 'agents');
    }

    /**
     * Stop the orchestrator and all agents
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        console.log('[Orchestrator] Stopping...');
        this.isRunning = false;

        // Shutdown all agents
        for (const [type, registry] of this.agents) {
            try {
                await registry.agent.shutdown();
            } catch (error) {
                console.error(`[Orchestrator] Error shutting down ${type}:`, error);
            }
        }

        // Unsubscribe from events
        this.eventBus.unsubscribeAll();

        console.log('[Orchestrator] Stopped');
    }

    // ============================================
    // AGENT REGISTRATION
    // ============================================

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: IAgent, enabled: boolean = true): void {
        if (this.agents.has(agent.type)) {
            console.warn(`[Orchestrator] Agent ${agent.type} already registered, replacing...`);
        }

        this.agents.set(agent.type, {
            agent,
            enabled,
            taskQueue: [],
        });

        console.log(`[Orchestrator] Registered agent: ${agent.type}`);

        // Initialize if orchestrator is already running
        if (this.isRunning && enabled) {
            agent.initialize().catch(error => {
                console.error(`[Orchestrator] Failed to initialize ${agent.type}:`, error);
            });
        }
    }

    /**
     * Unregister an agent
     */
    async unregisterAgent(type: AgentType): Promise<void> {
        const registry = this.agents.get(type);
        if (registry) {
            await registry.agent.shutdown();
            this.agents.delete(type);
            console.log(`[Orchestrator] Unregistered agent: ${type}`);
        }
    }

    /**
     * Enable/disable an agent
     */
    setAgentEnabled(type: AgentType, enabled: boolean): void {
        const registry = this.agents.get(type);
        if (registry) {
            registry.enabled = enabled;
            if (!enabled) {
                registry.agent.pause();
            } else {
                registry.agent.resume();
            }
        }
    }

    /**
     * Get registered agent types
     */
    getRegisteredAgents(): AgentType[] {
        return Array.from(this.agents.keys());
    }

    // ============================================
    // TASK EXECUTION
    // ============================================

    /**
     * Execute a task with the appropriate agent
     */
    async executeTask(
        agentType: AgentType,
        taskType: string,
        payload: any,
        context: AgentContext
    ): Promise<AgentResult> {
        const registry = this.agents.get(agentType);

        if (!registry) {
            return {
                success: false,
                error: `Agent ${agentType} not found`,
            };
        }

        if (!registry.enabled) {
            return {
                success: false,
                error: `Agent ${agentType} is disabled`,
            };
        }

        const task: AgentTask = {
            id: this.generateTaskId(),
            type: taskType,
            priority: 'normal',
            payload,
            context,
            createdAt: new Date(),
        };

        // Publish task started event
        this.eventBus.publish({
            type: 'agent:task:started',
            source: agentType,
            workspaceId: context.workspaceId,
            payload: { taskId: task.id, taskType },
        });

        // Execute the task
        const result = await registry.agent.execute(task);

        // Publish task completed/failed event
        this.eventBus.publish({
            type: result.success ? 'agent:task:completed' : 'agent:task:failed',
            source: agentType,
            workspaceId: context.workspaceId,
            payload: { taskId: task.id, result },
        });

        // Handle agent chaining
        if (result.nextAgent && result.nextTask) {
            console.log(`[Orchestrator] Routing to next agent: ${result.nextAgent}`);
            return this.executeTask(
                result.nextAgent,
                result.nextTask.type || 'task',
                result.nextTask.payload,
                context
            );
        }

        return result;
    }

    /**
     * Route a user message through the agent chain
     * Intent → Planner → Workflow Builder (or other execution agents)
     */
    async processUserMessage(
        message: string,
        context: AgentContext
    ): Promise<AgentResult> {
        // Store message in memory
        this.memoryStore.addMessage(context.workspaceId, {
            role: 'user',
            content: message,
        });

        // Start with Intent Agent
        const result = await this.executeTask(
            'intent',
            'parse_intent',
            { message },
            context
        );

        // Store response in memory
        if (result.success && result.data?.response) {
            this.memoryStore.addMessage(context.workspaceId, {
                role: 'assistant',
                content: result.data.response,
                agentId: 'intent',
            });
        }

        return result;
    }

    // ============================================
    // EVENT HANDLING
    // ============================================

    private setupEventListeners(): void {
        // Listen for CRM events that should trigger agents
        const triggerEvents: AgentEventType[] = [
            'contact:created',
            'contact:updated',
            'deal:created',
            'deal:stage_changed',
            'email:received',
            'webhook:received',
        ];

        for (const eventType of triggerEvents) {
            this.eventBus.subscribe(eventType, async (event) => {
                await this.handleTriggerEvent(event);
            });
        }
    }

    private async handleTriggerEvent(event: AgentEvent): Promise<void> {
        console.log(`[Orchestrator] Handling trigger event: ${event.type}`);

        // Determine which agents should handle this event
        const handlers = this.getEventHandlers(event.type);

        for (const agentType of handlers) {
            const registry = this.agents.get(agentType);
            if (registry && registry.enabled) {
                const context: AgentContext = {
                    workspaceId: event.workspaceId,
                    userId: '',
                    sessionId: event.id,
                };

                await this.executeTask(
                    agentType,
                    `handle_${event.type}`,
                    event.payload,
                    context
                );
            }
        }
    }

    private getEventHandlers(eventType: AgentEventType): AgentType[] {
        const handlers: AgentType[] = [];

        switch (eventType) {
            case 'contact:created':
                handlers.push('enrichment');
                handlers.push('workflow_runner');
                break;
            case 'deal:stage_changed':
                handlers.push('pipeline');
                handlers.push('workflow_runner');
                break;
            case 'email:received':
                handlers.push('email');
                break;
            case 'webhook:received':
                handlers.push('integration');
                break;
            default:
                handlers.push('workflow_runner');
        }

        return handlers;
    }

    // ============================================
    // UTILITY
    // ============================================

    private generateTaskId(): string {
        return `task-${++this.taskIdCounter}-${Date.now()}`;
    }

    /**
     * Get orchestrator status
     */
    getStatus(): {
        isRunning: boolean;
        agentCount: number;
        enabledAgents: AgentType[];
        memoryStats: ReturnType<MemoryStore['getStats']>;
        eventSubscriptions: number;
    } {
        return {
            isRunning: this.isRunning,
            agentCount: this.agents.size,
            enabledAgents: Array.from(this.agents.entries())
                .filter(([_, r]) => r.enabled)
                .map(([type]) => type),
            memoryStats: this.memoryStore.getStats(),
            eventSubscriptions: this.eventBus.getSubscriptionCount(),
        };
    }
}

// Export singleton instance
export const agentOrchestrator = AgentOrchestrator.getInstance();
export default agentOrchestrator;
