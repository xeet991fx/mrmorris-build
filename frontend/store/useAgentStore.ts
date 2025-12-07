import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    action?: string;
    actionStatus?: "pending" | "executing" | "completed" | "failed";
    actionResult?: any;
  };
}

export interface AgentContext {
  workspaceId: string | null;
  workspaceName: string | null;
  currentPage: "dashboard" | "contacts" | "companies" | "pipelines";
  selectedItems: {
    contacts?: string[];
    companies?: string[];
  };
}

interface AgentState {
  // UI State
  isOpen: boolean;
  isMinimized: boolean;

  // Conversation State
  messages: AgentMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  isLoading: boolean;

  // Context State
  context: AgentContext;

  // Error State
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  minimize: () => void;
  sendMessage: (content: string) => Promise<void>;
  updateContext: (context: Partial<AgentContext>) => void;
  clearConversation: () => void;
  clearError: () => void;
  executeAction: (action: string, params: any) => Promise<any>;
  updateMessageAction: (
    messageId: string,
    status: "pending" | "executing" | "completed" | "failed",
    result?: any
  ) => void;
  retryMessage: (messageId: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      isMinimized: false,
      messages: [],
      conversationId: null,
      isStreaming: false,
      isLoading: false,
      context: {
        workspaceId: null,
        workspaceName: null,
        currentPage: "dashboard",
        selectedItems: {},
      },
      error: null,

      // Toggle sidebar open/close
      toggleSidebar: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      // Set sidebar open state
      setSidebarOpen: (isOpen: boolean) => {
        set({ isOpen });
      },

      // Minimize sidebar
      minimize: () => {
        set((state) => ({ isMinimized: !state.isMinimized }));
      },

      // Update context from pages
      updateContext: (newContext: Partial<AgentContext>) => {
        set((state) => ({
          context: { ...state.context, ...newContext },
        }));
      },

      // Clear conversation history
      clearConversation: () => {
        set({
          messages: [],
          conversationId: null,
          error: null,
        });
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Send message to agent
      sendMessage: async (content: string) => {
        const { context, messages } = get();

        // Add user message
        const userMessage: AgentMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: "user",
          content,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isStreaming: true,
          error: null,
        }));

        try {
          // Import the API client dynamically to avoid circular dependencies
          const { sendChatMessageStreaming } = await import("@/lib/api/agent");

          // Prepare conversation history for API
          const conversationHistory = messages.slice(-10).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));

          let assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          let fullResponse = "";

          // Stream the response
          await sendChatMessageStreaming(
            content,
            context,
            conversationHistory,
            (chunk) => {
              if (chunk.error) {
                throw new Error(chunk.error);
              }

              if (chunk.chunk) {
                fullResponse += chunk.chunk;

                // Update or add assistant message
                set((state) => {
                  const existingIndex = state.messages.findIndex(
                    (m) => m.id === assistantMessageId
                  );

                  if (existingIndex >= 0) {
                    // Update existing message
                    const updatedMessages = [...state.messages];
                    updatedMessages[existingIndex] = {
                      ...updatedMessages[existingIndex],
                      content: fullResponse,
                    };
                    return { messages: updatedMessages };
                  } else {
                    // Add new assistant message
                    return {
                      messages: [
                        ...state.messages,
                        {
                          id: assistantMessageId,
                          role: "assistant",
                          content: fullResponse,
                          timestamp: Date.now(),
                        },
                      ],
                    };
                  }
                });
              }

              if (chunk.done) {
                // Update message with action if present
                set((state) => {
                  const updatedMessages = [...state.messages];
                  const messageIndex = updatedMessages.findIndex(
                    (m) => m.id === assistantMessageId
                  );

                  if (messageIndex >= 0 && chunk.action) {
                    updatedMessages[messageIndex] = {
                      ...updatedMessages[messageIndex],
                      metadata: {
                        action: chunk.action.action,
                        actionStatus: "pending",
                      },
                    };
                  }

                  return {
                    messages: updatedMessages,
                    isStreaming: false,
                  };
                });
              }
            }
          );
        } catch (error: any) {
          set({
            error: error.message || "Failed to send message",
            isStreaming: false,
          });
          throw error;
        }
      },

      // Execute an action
      executeAction: async (action: string, params: any) => {
        set({ isLoading: true, error: null });

        try {
          // TODO: Implement actual action execution
          console.log("Executing action:", action, params);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          set({ isLoading: false });

          return { success: true, action, params };
        } catch (error: any) {
          set({
            error: error.message || "Failed to execute action",
            isLoading: false,
          });
          throw error;
        }
      },

      // Update message action metadata
      updateMessageAction: (
        messageId: string,
        status: "pending" | "executing" | "completed" | "failed",
        result?: any
      ) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                metadata: {
                  ...msg.metadata,
                  actionStatus: status,
                  ...(result && { actionResult: result }),
                },
              };
            }
            return msg;
          });

          return { messages: updatedMessages };
        });
      },

      // Retry a failed message
      retryMessage: async (messageId: string) => {
        const { messages } = get();
        const message = messages.find((m) => m.id === messageId);

        if (message && message.role === "user") {
          await get().sendMessage(message.content);
        }
      },
    }),
    {
      name: "agent-storage",
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        messages: state.messages.slice(-50), // Keep last 50 messages
      }),
    }
  )
);
