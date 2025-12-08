/**
 * MemoryStore - Agent context and conversation memory
 * Stores agent state, conversation history, and execution context per workspace
 */

import { AgentContext, ChatMessage, ExecutionPlan, AgentType } from './types';

interface WorkspaceMemory {
    context: AgentContext;
    conversationHistory: ChatMessage[];
    activePlans: Map<string, ExecutionPlan>;
    agentStates: Map<AgentType, any>;
    lastUpdated: Date;
}

export class MemoryStore {
    private static instance: MemoryStore;
    private workspaceMemory: Map<string, WorkspaceMemory> = new Map();
    private readonly maxConversationLength = 50;

    private constructor() { }

    // ============================================
    // SINGLETON PATTERN
    // ============================================

    static getInstance(): MemoryStore {
        if (!MemoryStore.instance) {
            MemoryStore.instance = new MemoryStore();
        }
        return MemoryStore.instance;
    }

    // ============================================
    // WORKSPACE CONTEXT
    // ============================================

    /**
     * Get or create memory for a workspace
     */
    getWorkspaceMemory(workspaceId: string): WorkspaceMemory {
        if (!this.workspaceMemory.has(workspaceId)) {
            this.workspaceMemory.set(workspaceId, {
                context: {
                    workspaceId,
                    userId: '',
                    sessionId: '',
                },
                conversationHistory: [],
                activePlans: new Map(),
                agentStates: new Map(),
                lastUpdated: new Date(),
            });
        }
        return this.workspaceMemory.get(workspaceId)!;
    }

    /**
     * Update workspace context
     */
    updateContext(
        workspaceId: string,
        updates: Partial<AgentContext>
    ): AgentContext {
        const memory = this.getWorkspaceMemory(workspaceId);
        memory.context = { ...memory.context, ...updates };
        memory.lastUpdated = new Date();
        return memory.context;
    }

    /**
     * Get current context for a workspace
     */
    getContext(workspaceId: string): AgentContext {
        return this.getWorkspaceMemory(workspaceId).context;
    }

    // ============================================
    // CONVERSATION HISTORY
    // ============================================

    /**
     * Add a message to conversation history
     */
    addMessage(workspaceId: string, message: Omit<ChatMessage, 'timestamp'>): void {
        const memory = this.getWorkspaceMemory(workspaceId);

        memory.conversationHistory.push({
            ...message,
            timestamp: new Date(),
        });

        // Trim history if too long
        if (memory.conversationHistory.length > this.maxConversationLength) {
            memory.conversationHistory = memory.conversationHistory.slice(
                -this.maxConversationLength
            );
        }

        memory.lastUpdated = new Date();
    }

    /**
     * Get conversation history for a workspace
     */
    getConversationHistory(
        workspaceId: string,
        limit?: number
    ): ChatMessage[] {
        const memory = this.getWorkspaceMemory(workspaceId);
        const history = memory.conversationHistory;

        if (limit) {
            return history.slice(-limit);
        }
        return [...history];
    }

    /**
     * Clear conversation history
     */
    clearConversation(workspaceId: string): void {
        const memory = this.getWorkspaceMemory(workspaceId);
        memory.conversationHistory = [];
        memory.lastUpdated = new Date();
    }

    // ============================================
    // EXECUTION PLANS
    // ============================================

    /**
     * Store an execution plan
     */
    storePlan(workspaceId: string, plan: ExecutionPlan): void {
        const memory = this.getWorkspaceMemory(workspaceId);
        memory.activePlans.set(plan.id, plan);
        memory.lastUpdated = new Date();
    }

    /**
     * Get an execution plan by ID
     */
    getPlan(workspaceId: string, planId: string): ExecutionPlan | undefined {
        return this.getWorkspaceMemory(workspaceId).activePlans.get(planId);
    }

    /**
     * Update a plan's status
     */
    updatePlanStatus(
        workspaceId: string,
        planId: string,
        status: ExecutionPlan['status']
    ): void {
        const plan = this.getPlan(workspaceId, planId);
        if (plan) {
            plan.status = status;
            plan.updatedAt = new Date();
        }
    }

    /**
     * Get all active plans for a workspace
     */
    getActivePlans(workspaceId: string): ExecutionPlan[] {
        const memory = this.getWorkspaceMemory(workspaceId);
        return Array.from(memory.activePlans.values()).filter(
            plan => plan.status === 'draft' || plan.status === 'executing'
        );
    }

    /**
     * Remove a plan
     */
    removePlan(workspaceId: string, planId: string): boolean {
        const memory = this.getWorkspaceMemory(workspaceId);
        return memory.activePlans.delete(planId);
    }

    // ============================================
    // AGENT STATE
    // ============================================

    /**
     * Store state for a specific agent
     */
    setAgentState(
        workspaceId: string,
        agentType: AgentType,
        state: any
    ): void {
        const memory = this.getWorkspaceMemory(workspaceId);
        memory.agentStates.set(agentType, state);
        memory.lastUpdated = new Date();
    }

    /**
     * Get state for a specific agent
     */
    getAgentState<T = any>(
        workspaceId: string,
        agentType: AgentType
    ): T | undefined {
        return this.getWorkspaceMemory(workspaceId).agentStates.get(agentType);
    }

    /**
     * Clear agent state
     */
    clearAgentState(workspaceId: string, agentType: AgentType): void {
        const memory = this.getWorkspaceMemory(workspaceId);
        memory.agentStates.delete(agentType);
    }

    // ============================================
    // CLEANUP
    // ============================================

    /**
     * Clear all memory for a workspace
     */
    clearWorkspaceMemory(workspaceId: string): void {
        this.workspaceMemory.delete(workspaceId);
    }

    /**
     * Clear stale workspaces (not updated in given hours)
     */
    clearStaleMemory(hours: number = 24): number {
        const threshold = Date.now() - (hours * 60 * 60 * 1000);
        let cleared = 0;

        for (const [workspaceId, memory] of this.workspaceMemory) {
            if (memory.lastUpdated.getTime() < threshold) {
                this.workspaceMemory.delete(workspaceId);
                cleared++;
            }
        }

        return cleared;
    }

    /**
     * Get memory statistics
     */
    getStats(): {
        workspaceCount: number;
        totalMessages: number;
        totalPlans: number;
    } {
        let totalMessages = 0;
        let totalPlans = 0;

        for (const memory of this.workspaceMemory.values()) {
            totalMessages += memory.conversationHistory.length;
            totalPlans += memory.activePlans.size;
        }

        return {
            workspaceCount: this.workspaceMemory.size,
            totalMessages,
            totalPlans,
        };
    }
}

// Export singleton instance
export const memoryStore = MemoryStore.getInstance();
export default memoryStore;
