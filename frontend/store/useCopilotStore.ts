/**
 * Zustand Store for AI Copilot Chat State Management
 *
 * Manages conversation state, streaming, and persistence for AI Copilot chat interface.
 * Handles multiple conversations (one per agent) with automatic history loading.
 */

import { create } from 'zustand';
import { streamCopilotResponse } from '@/lib/api/sse';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface CopilotState {
  // Conversations keyed by agentId
  conversations: Record<string, Message[]>;

  // Panel open state per agent
  isOpen: Record<string, boolean>;

  // Loading state per agent
  isLoading: Record<string, boolean>;

  // Streaming state per agent
  isStreaming: Record<string, boolean>;

  // Current streaming message content per agent
  streamingContent: Record<string, string>;

  // Actions
  loadHistory: (workspaceId: string, agentId: string) => Promise<void>;
  sendMessage: (workspaceId: string, agentId: string, content: string) => void;
  addMessage: (agentId: string, message: Message) => void;
  updateStreamingMessage: (agentId: string, token: string) => void;
  finalizeStreamingMessage: (agentId: string) => void;
  clearConversation: (workspaceId: string, agentId: string) => Promise<void>;
  openPanel: (agentId: string) => void;
  closePanel: (agentId: string) => void;
  setError: (agentId: string, error: string) => void;
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  conversations: {},
  isOpen: {},
  isLoading: {},
  isStreaming: {},
  streamingContent: {},

  /**
   * Load conversation history from API (last 10 messages)
   */
  loadHistory: async (workspaceId: string, agentId: string) => {
    const { conversations } = get();

    // Skip if already loaded
    if (conversations[agentId]?.length > 0) {
      return;
    }

    set((state) => ({
      isLoading: { ...state.isLoading, [agentId]: true },
    }));

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/copilot/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();
      const messages = data.data?.messages || [];

      // Convert timestamp strings to Date objects
      const parsedMessages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      set((state) => ({
        conversations: {
          ...state.conversations,
          [agentId]: parsedMessages,
        },
        isLoading: { ...state.isLoading, [agentId]: false },
      }));
    } catch (error: any) {
      console.error('Failed to load history:', error);
      set((state) => ({
        isLoading: { ...state.isLoading, [agentId]: false },
      }));

      // Add welcome message if history load fails
      if (!conversations[agentId]) {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [agentId]: [
              {
                role: 'system' as const,
                content: "Hi! I'm your AI Copilot. How can I help you build this agent?",
                timestamp: new Date(),
              },
            ],
          },
        }));
      }
    }
  },

  /**
   * Send a message and stream the response
   */
  sendMessage: (workspaceId: string, agentId: string, content: string) => {
    const { conversations, addMessage, updateStreamingMessage, finalizeStreamingMessage, setError } = get();

    // Add user message immediately
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    addMessage(agentId, userMessage);

    // Set streaming state
    set((state) => ({
      isStreaming: { ...state.isStreaming, [agentId]: true },
      streamingContent: { ...state.streamingContent, [agentId]: '' },
    }));

    // Create empty assistant message for streaming
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    addMessage(agentId, assistantMessage);

    // Start SSE stream
    const cleanup = streamCopilotResponse(
      workspaceId,
      agentId,
      content,
      {
        onToken: (token: string) => {
          updateStreamingMessage(agentId, token);
        },
        onComplete: () => {
          finalizeStreamingMessage(agentId);
        },
        onError: (error: string) => {
          setError(agentId, error);
        },
      }
    );

    // Store cleanup function for potential cancellation
    // (Could be extended to support message cancellation)
  },

  /**
   * Add a message to conversation
   */
  addMessage: (agentId: string, message: Message) => {
    set((state) => {
      const currentMessages = state.conversations[agentId] || [];
      return {
        conversations: {
          ...state.conversations,
          [agentId]: [...currentMessages, message],
        },
      };
    });
  },

  /**
   * Update streaming message with new token
   */
  updateStreamingMessage: (agentId: string, token: string) => {
    set((state) => {
      const currentMessages = state.conversations[agentId] || [];
      const lastMessageIndex = currentMessages.length - 1;

      if (lastMessageIndex < 0) return state;

      const updatedMessages = [...currentMessages];
      const lastMessage = { ...updatedMessages[lastMessageIndex] };

      // Append token to content
      lastMessage.content += token;
      updatedMessages[lastMessageIndex] = lastMessage;

      return {
        conversations: {
          ...state.conversations,
          [agentId]: updatedMessages,
        },
        streamingContent: {
          ...state.streamingContent,
          [agentId]: lastMessage.content,
        },
      };
    });
  },

  /**
   * Finalize streaming message
   */
  finalizeStreamingMessage: (agentId: string) => {
    set((state) => ({
      isStreaming: { ...state.isStreaming, [agentId]: false },
      streamingContent: { ...state.streamingContent, [agentId]: '' },
    }));
  },

  /**
   * Clear conversation
   */
  clearConversation: async (workspaceId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/copilot/clear`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to clear conversation');
      }

      // Reset conversation with welcome message
      set((state) => ({
        conversations: {
          ...state.conversations,
          [agentId]: [
            {
              role: 'system' as const,
              content: 'Conversation cleared. How can I help?',
              timestamp: new Date(),
            },
          ],
        },
      }));
    } catch (error: any) {
      console.error('Failed to clear conversation:', error);
      alert('Failed to clear conversation. Please try again.');
    }
  },

  /**
   * Open chat panel
   */
  openPanel: (agentId: string) => {
    set((state) => ({
      isOpen: { ...state.isOpen, [agentId]: true },
    }));
  },

  /**
   * Close chat panel
   */
  closePanel: (agentId: string) => {
    set((state) => ({
      isOpen: { ...state.isOpen, [agentId]: false },
    }));
  },

  /**
   * Handle streaming error
   */
  setError: (agentId: string, error: string) => {
    console.error('Copilot error:', error);

    set((state) => {
      const currentMessages = state.conversations[agentId] || [];

      // Update last message (assistant) with error
      const updatedMessages = [...currentMessages];
      const lastIndex = updatedMessages.length - 1;

      if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          content: `❌ ${error}`,
        };
      } else {
        // Add error as new message
        updatedMessages.push({
          role: 'system',
          content: `❌ ${error}`,
          timestamp: new Date(),
        });
      }

      return {
        conversations: {
          ...state.conversations,
          [agentId]: updatedMessages,
        },
        isStreaming: { ...state.isStreaming, [agentId]: false },
        streamingContent: { ...state.streamingContent, [agentId]: '' },
      };
    });
  },
}));
