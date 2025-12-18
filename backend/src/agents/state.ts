/**
 * Agent State Definition
 * 
 * Enhanced state with conversation memory and context management.
 */

import { Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

// Session storage for conversation memory (in-memory for speed)
const sessionStore = new Map<string, BaseMessage[]>();

/**
 * Get conversation history for a session
 */
export function getConversationHistory(sessionId: string): BaseMessage[] {
    return sessionStore.get(sessionId) || [];
}

/**
 * Add message to conversation history (keep last 10)
 */
export function addToConversation(sessionId: string, message: BaseMessage): void {
    const history = sessionStore.get(sessionId) || [];
    history.push(message);
    // Keep only last 10 messages
    if (history.length > 10) {
        history.shift();
    }
    sessionStore.set(sessionId, history);
}

/**
 * Clear conversation history for a session
 */
export function clearConversation(sessionId: string): void {
    sessionStore.delete(sessionId);
}

/**
 * Enhanced Agent State with conversation memory
 */
export const AgentState = Annotation.Root({
    // Current messages in this turn
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),

    // Conversation history (last 10 messages)
    conversationHistory: Annotation<BaseMessage[]>({
        reducer: (_, next) => next,
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
    };
}
