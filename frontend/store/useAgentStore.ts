import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AgentStreamEvent, TodoItem } from "@/lib/api/agent";

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
  autonomousMode?: boolean;
  selectedModel?: string;
}

export type AIModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro';

// Activity tracking for DeepAgent visualization
export interface AgentActivity {
  id: string;
  type: "thinking" | "planning" | "tool" | "subagent";
  status: "active" | "completed" | "failed";
  name?: string;
  description?: string;
  args?: any;
  result?: any;
  startTime: number;
  endTime?: number;
}

interface AgentState {
  // UI State
  isOpen: boolean;
  isMinimized: boolean;
  showActivityPanel: boolean;

  // Conversation State
  messages: AgentMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  isLoading: boolean;

  // DeepAgent Activity State
  activities: AgentActivity[];
  currentTodos: TodoItem[];
  activeSubagent: string | null;
  currentPhase: "idle" | "thinking" | "planning" | "executing" | "responding";

  // Context State
  context: AgentContext;

  // Error State
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  minimize: () => void;
  toggleActivityPanel: () => void;
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

  // Activity actions
  addActivity: (activity: AgentActivity) => void;
  updateActivity: (id: string, updates: Partial<AgentActivity>) => void;
  setTodos: (todos: TodoItem[]) => void;
  setActiveSubagent: (name: string | null) => void;
  setCurrentPhase: (phase: "idle" | "thinking" | "planning" | "executing" | "responding") => void;
  clearActivities: () => void;
  handleAgentEvent: (event: AgentStreamEvent) => void;

  // Autonomous mode
  autonomousMode: boolean;
  toggleAutonomousMode: () => void;
  setAutonomousMode: (enabled: boolean) => void;

  // Model selection
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      isMinimized: false,
      showActivityPanel: true,
      messages: [],
      conversationId: null,
      isStreaming: false,
      isLoading: false,
      activities: [],
      currentTodos: [],
      activeSubagent: null,
      currentPhase: "idle",
      context: {
        workspaceId: null,
        workspaceName: null,
        currentPage: "dashboard",
        selectedItems: {},
        autonomousMode: false,
      },
      error: null,
      autonomousMode: false,
      selectedModel: 'gemini-2.5-flash',

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

      // Toggle activity panel
      toggleActivityPanel: () => {
        set((state) => ({ showActivityPanel: !state.showActivityPanel }));
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
          activities: [],
          currentTodos: [],
          activeSubagent: null,
          currentPhase: "idle",
        });
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Activity management
      addActivity: (activity: AgentActivity) => {
        set((state) => ({
          activities: [...state.activities, activity],
        }));
      },

      updateActivity: (id: string, updates: Partial<AgentActivity>) => {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },

      setTodos: (todos: TodoItem[]) => {
        set({ currentTodos: todos });
      },

      setActiveSubagent: (name: string | null) => {
        set({ activeSubagent: name });
      },

      setCurrentPhase: (phase) => {
        set({ currentPhase: phase });
      },

      clearActivities: () => {
        set({
          activities: [],
          currentTodos: [],
          activeSubagent: null,
          currentPhase: "idle",
        });
      },

      // Handle agent events from SSE stream
      handleAgentEvent: (event: AgentStreamEvent) => {
        const { type, data } = event;

        switch (type) {
          case "thinking":
            set({ currentPhase: "thinking" });
            break;

          case "planning":
            set({ currentPhase: "planning" });
            if (data.todos) {
              set({ currentTodos: data.todos });
            }
            break;

          case "tool_start":
            set({ currentPhase: "executing" });
            if (data.toolName) {
              const activity: AgentActivity = {
                id: `tool-${Date.now()}`,
                type: "tool",
                status: "active",
                name: data.toolName,
                args: data.toolArgs,
                startTime: data.timestamp || Date.now(),
              };
              get().addActivity(activity);
            }
            break;

          case "tool_result":
            if (data.toolName) {
              const activities = get().activities;
              const activeToolActivity = activities.find(
                (a) => a.type === "tool" && a.name === data.toolName && a.status === "active"
              );
              if (activeToolActivity) {
                get().updateActivity(activeToolActivity.id, {
                  status: "completed",
                  result: data.toolResult,
                  endTime: data.timestamp || Date.now(),
                });
              }
            }
            break;

          case "subagent_start":
            set({ currentPhase: "executing" });
            if (data.subagentName) {
              set({ activeSubagent: data.subagentName });
              const activity: AgentActivity = {
                id: `subagent-${Date.now()}`,
                type: "subagent",
                status: "active",
                name: data.subagentName,
                description: data.content,
                startTime: data.timestamp || Date.now(),
              };
              get().addActivity(activity);
            }
            break;

          case "subagent_result":
            set({ activeSubagent: null });
            if (data.subagentName) {
              const activities = get().activities;
              const activeSubagentActivity = activities.find(
                (a) => a.type === "subagent" && a.status === "active"
              );
              if (activeSubagentActivity) {
                get().updateActivity(activeSubagentActivity.id, {
                  status: "completed",
                  result: data.toolResult,
                  endTime: data.timestamp || Date.now(),
                });
              }
            }
            break;

          case "message":
            set({ currentPhase: "responding" });
            break;

          case "done":
            set({ currentPhase: "idle", activeSubagent: null });
            break;

          case "error":
            set({ currentPhase: "idle", activeSubagent: null });
            break;
        }
      },

      // Send message to agent
      sendMessage: async (content: string) => {
        const { context, messages, selectedModel, autonomousMode } = get();

        // Clear previous activities
        get().clearActivities();

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
          currentPhase: "thinking",
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

          // Merge current settings into context for API call
          const apiContext = {
            ...context,
            selectedModel,
            autonomousMode,
          };

          // Stream the response
          await sendChatMessageStreaming(
            content,
            apiContext,
            conversationHistory,
            (chunk) => {
              if (chunk.error) {
                throw new Error(chunk.error);
              }

              // Handle agent events
              if (chunk.event) {
                get().handleAgentEvent(chunk.event);
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
                    currentPhase: "idle",
                  };
                });
              }
            }
          );
        } catch (error: any) {
          set({
            error: error.message || "Failed to send message",
            isStreaming: false,
            currentPhase: "idle",
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

      // Autonomous mode controls
      toggleAutonomousMode: () => {
        set((state) => ({
          autonomousMode: !state.autonomousMode,
          context: { ...state.context, autonomousMode: !state.autonomousMode },
        }));
      },

      setAutonomousMode: (enabled: boolean) => {
        set({
          autonomousMode: enabled,
          context: { ...get().context, autonomousMode: enabled },
        });
      },

      // Model selection
      setSelectedModel: (model: AIModel) => {
        set({
          selectedModel: model,
          context: { ...get().context, selectedModel: model },
        });
      },
    }),
    {
      name: "agent-storage",
      partialize: (state) => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        showActivityPanel: state.showActivityPanel,
        messages: state.messages.slice(-50), // Keep last 50 messages
        autonomousMode: state.autonomousMode,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
