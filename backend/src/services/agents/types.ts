/**
 * Agent System Types
 * Core type definitions for the multi-agent system
 */

// ============================================
// AGENT STATUS & LIFECYCLE
// ============================================

export type AgentStatus =
    | 'idle'        // Ready to accept tasks
    | 'running'     // Currently executing
    | 'paused'      // Temporarily suspended
    | 'error'       // Failed state
    | 'shutdown';   // Stopped

export type AgentType =
    // Core Agents (Brain)
    | 'onboarding'
    | 'intent'
    | 'planner'
    | 'workflow_builder'
    | 'learning'
    // Execution Agents
    | 'enrichment'
    | 'email'
    | 'workflow_runner'
    | 'pipeline'
    | 'integration'
    | 'insights';

// ============================================
// AGENT CONTEXT & MEMORY
// ============================================

export interface AgentContext {
    workspaceId: string;
    userId: string;
    sessionId: string;
    currentPage?: string;
    selectedItems?: {
        contacts?: string[];
        companies?: string[];
        deals?: string[];
    };
    conversationHistory?: ChatMessage[];
    metadata?: Record<string, any>;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agentId?: string;
}

// ============================================
// AGENT TASK & RESULT
// ============================================

export interface AgentTask {
    id: string;
    type: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    payload: any;
    context: AgentContext;
    createdAt: Date;
    timeout?: number; // ms
    retryCount?: number;
}

export interface AgentResult {
    success: boolean;
    data?: any;
    error?: string;
    nextAgent?: AgentType;
    nextTask?: Partial<AgentTask>;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
}

// ============================================
// AGENT EVENTS
// ============================================

export type AgentEventType =
    // System events
    | 'agent:started'
    | 'agent:stopped'
    | 'agent:error'
    | 'agent:task:started'
    | 'agent:task:completed'
    | 'agent:task:failed'
    // CRM events
    | 'contact:created'
    | 'contact:updated'
    | 'contact:deleted'
    | 'company:created'
    | 'company:updated'
    | 'deal:created'
    | 'deal:stage_changed'
    | 'deal:won'
    | 'deal:lost'
    | 'workflow:triggered'
    | 'workflow:completed'
    | 'email:sent'
    | 'email:received'
    | 'email:opened'
    | 'email:clicked'
    // External events
    | 'webhook:received'
    | 'integration:connected'
    | 'integration:disconnected';

export interface AgentEvent {
    id: string;
    type: AgentEventType;
    source: AgentType | 'system' | 'user' | 'external';
    workspaceId: string;
    payload: any;
    timestamp: Date;
    metadata?: Record<string, any>;
}

// ============================================
// AGENT CONFIGURATION
// ============================================

export interface AgentConfig {
    type: AgentType;
    enabled: boolean;
    settings: Record<string, any>;
    triggers?: {
        events?: AgentEventType[];
        schedule?: string; // cron expression
    };
    limits?: {
        maxConcurrentTasks?: number;
        maxRetries?: number;
        timeoutMs?: number;
    };
}

// ============================================
// INTENT & PLAN TYPES
// ============================================

export interface ParsedIntent {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    requiresClarification?: boolean;
    clarificationQuestion?: string;
}

export interface ExecutionPlan {
    id: string;
    goal: string;
    steps: PlanStep[];
    status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}

export interface PlanStep {
    id: string;
    order: number;
    action: string;
    params: Record<string, any>;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    description?: string;
    result?: any;
    error?: string;
    dependsOn?: string[]; // step IDs
}

// ============================================
// INTEGRATION TYPES
// ============================================

export interface IntegrationCredentials {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes?: string[];
}

export interface WebhookConfig {
    id: string;
    workspaceId: string;
    integrationId: string;
    secret: string;
    events: string[];
    url: string;
    active: boolean;
}
