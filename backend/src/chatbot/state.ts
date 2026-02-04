/**
 * Agent State Definition
 *
 * Enhanced state with conversation memory, context management, and multi-agent coordination.
 */

import { Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

// Session storage with TTL (Time To Live) tracking
interface SessionData {
    messages: BaseMessage[];
    lastAccessed: number;
}

const sessionStore = new Map<string, SessionData>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

/**
 * Cleanup expired sessions (sessions not accessed in last 30 minutes)
 */
function cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, data] of sessionStore.entries()) {
        if (now - data.lastAccessed > SESSION_TTL_MS) {
            sessionStore.delete(sessionId);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired session(s). Active sessions: ${sessionStore.size}`);
    }
}

// Start periodic cleanup
setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

/**
 * Get conversation history for a session
 */
export function getConversationHistory(sessionId: string): BaseMessage[] {
    const sessionData = sessionStore.get(sessionId);
    if (sessionData) {
        // Update last accessed time
        sessionData.lastAccessed = Date.now();
        return sessionData.messages;
    }
    return [];
}

/**
 * Add message to conversation history (keep last 10)
 */
export function addToConversation(sessionId: string, message: BaseMessage): void {
    let sessionData = sessionStore.get(sessionId);

    if (!sessionData) {
        sessionData = {
            messages: [],
            lastAccessed: Date.now(),
        };
        sessionStore.set(sessionId, sessionData);
    }

    sessionData.messages.push(message);
    sessionData.lastAccessed = Date.now();

    // Keep only last 10 messages
    if (sessionData.messages.length > 10) {
        sessionData.messages.shift();
    }
}

/**
 * Clear conversation history for a session
 */
export function clearConversation(sessionId: string): void {
    sessionStore.delete(sessionId);
}

/**
 * Get session store stats (for monitoring)
 */
export function getSessionStats(): { activeSessions: number; totalSessions: number } {
    return {
        activeSessions: sessionStore.size,
        totalSessions: sessionStore.size,
    };
}

/**
 * Enhanced Agent State with conversation memory and multi-agent coordination
 */
export const AgentState = Annotation.Root({
    // Current messages in this turn
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),

    // Conversation history (last 10 messages)
    conversationHistory: Annotation<BaseMessage[]>({
        reducer: (prev, next) => {
            // Accumulate messages and keep last 10
            const combined = [...prev, ...next];
            return combined.slice(-10);
        },
        default: () => [],
    }),

    // Session ID for memory persistence
    sessionId: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Workspace and user context
    workspaceId: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),
    userId: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Routing
    nextAgent: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Tool execution results
    toolResults: Annotation<Record<string, any>>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({}),
    }),

    // Final response to user
    finalResponse: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Does agent need more info from user?
    needsUserInput: Annotation<boolean>({
        reducer: (_, next) => next,
        default: () => false,
    }),

    // Question to ask user (if needsUserInput)
    userQuestion: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Error tracking
    error: Annotation<string>({
        reducer: (_, next) => next,
        default: () => "",
    }),

    // Was the task verified?
    verified: Annotation<boolean>({
        reducer: (_, next) => next,
        default: () => false,
    }),

    // Multi-agent coordination fields
    isComplexTask: Annotation<boolean>({
        reducer: (_, next) => next,
        default: () => false,
    }),

    coordinationMode: Annotation<'single' | 'parallel' | 'sequential'>({
        reducer: (_, next) => next,
        default: () => 'single',
    }),

    executionPlan: Annotation<any>({
        reducer: (_, next) => next,
        default: () => null,
    }),
});

export type AgentStateType = typeof AgentState.State;

/**
 * Create initial state with conversation context
 */
export function createInitialState(
    message: string,
    workspaceId: string,
    userId: string,
    sessionId?: string
): AgentStateType {
    const sid = sessionId || `${workspaceId}-${userId}`;
    const history = getConversationHistory(sid);

    // Add current message to history
    const userMessage = new HumanMessage(message);
    addToConversation(sid, userMessage);

    return {
        messages: [userMessage],
        conversationHistory: history,
        sessionId: sid,
        workspaceId,
        userId,
        nextAgent: "",
        toolResults: {},
        finalResponse: "",
        needsUserInput: false,
        userQuestion: "",
        error: "",
        verified: false,
        isComplexTask: false,
        coordinationMode: 'single',
        executionPlan: null,
    };
}
