/**
 * Zustand Store for AI Copilot Chat State Management
 *
 * Manages conversation state, streaming, and persistence for AI Copilot chat interface.
 * Handles multiple conversations (one per agent) with automatic history loading.
 */

import { create } from 'zustand';
import { streamCopilotResponse } from '@/lib/api/sse';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ValidationWarning {
  type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
  message: string;
  line: number;
}

interface GenerationRecord {
  timestamp: Date;
  description: string;
  generatedInstructions: string;
  wasExecutable: boolean;
  editsMade: boolean;
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

  // Story 4.2, Task 5.1: Generation state
  generatedInstructions: Record<string, string | null>;
  validationWarnings: Record<string, ValidationWarning[]>;
  isGenerating: Record<string, boolean>;
  generationHistory: Record<string, GenerationRecord[]>;

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

  // Story 4.2, Task 5.1: Generation actions
  generateWorkflow: (workspaceId: string, description: string) => Promise<void>;
  validateInstructions: (workspaceId: string, instructions: string) => Promise<void>;
  applyInstructions: (agentId: string, instructions: string) => void;
  clearGeneration: (agentId: string) => void;
  trackGenerationSuccess: (agentId: string, wasExecutable: boolean, durationMs?: number) => void;
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  conversations: {},
  isOpen: {},
  isLoading: {},
  isStreaming: {},
  streamingContent: {},
  generatedInstructions: {},
  validationWarnings: {},
  isGenerating: {},
  generationHistory: {},

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

  /**
   * Generate workflow from description
   * Story 4.2, Task 5.1
   */
  generateWorkflow: async (workspaceId: string, description: string) => {
    // Debounce protection: Prevent double-clicks from triggering multiple generations
    const { isGenerating } = get();
    if (isGenerating[workspaceId]) {
      console.warn('Generation already in progress, ignoring duplicate request');
      return;
    }

    set((state) => ({
      isGenerating: { ...state.isGenerating, [workspaceId]: true },
      generatedInstructions: { ...state.generatedInstructions, [workspaceId]: '' },
      validationWarnings: { ...state.validationWarnings, [workspaceId]: [] },
    }));

    // Helper function to make the generation request
    const makeGenerationRequest = async (): Promise<void> => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/workspaces/${workspaceId}/copilot/generate-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ description }),
        }
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullInstructions = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;

          const data = JSON.parse(line.replace('data: ', ''));

          if (data.token) {
            fullInstructions += data.token;
            set((state) => ({
              generatedInstructions: {
                ...state.generatedInstructions,
                [workspaceId]: fullInstructions,
              },
            }));
          } else if (data.event === 'validation') {
            set((state) => ({
              validationWarnings: {
                ...state.validationWarnings,
                [workspaceId]: data.warnings,
              },
            }));
          } else if (data.done) {
            set((state) => ({
              isGenerating: { ...state.isGenerating, [workspaceId]: false },
            }));
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      }
    };

    // Retry logic: max 1 retry on timeout (Task 9.2)
    const MAX_RETRIES = 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await makeGenerationRequest();
        return; // Success, exit
      } catch (error: any) {
        lastError = error;
        const isTimeout = error.message?.toLowerCase().includes('timeout');

        if (isTimeout && attempt < MAX_RETRIES) {
          console.warn(`Generation timeout, retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          // Reset state for retry
          set((state) => ({
            generatedInstructions: { ...state.generatedInstructions, [workspaceId]: '' },
          }));
          continue;
        }
        break; // Non-timeout error or max retries reached
      }
    }

    // All retries exhausted
    console.error('Generation error after retries:', lastError);
    set((state) => ({
      isGenerating: { ...state.isGenerating, [workspaceId]: false },
    }));
    throw lastError;
  },

  /**
   * Validate instructions
   * Story 4.2, Task 5.1
   */
  validateInstructions: async (workspaceId: string, instructions: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/workspaces/${workspaceId}/copilot/validate-instructions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instructions }),
        }
      );

      const result = await response.json();

      if (result.success) {
        set((state) => ({
          validationWarnings: {
            ...state.validationWarnings,
            [workspaceId]: result.data.warnings || [],
          },
        }));
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  },

  /**
   * Apply instructions to agent form
   * Story 4.2, Task 5.1
   */
  applyInstructions: (agentId: string, instructions: string) => {
    const instructionField = document.querySelector(
      `#agent-${agentId}-instructions`
    ) as HTMLTextAreaElement;

    if (instructionField) {
      const currentValue = instructionField.value;

      if (currentValue.trim()) {
        const action = window.confirm(
          'Instructions field has content. Click OK to append, Cancel to replace.'
        );

        if (action) {
          instructionField.value = `${currentValue}\n\n--- Generated by AI Copilot ---\n\n${instructions}`;
        } else {
          instructionField.value = instructions;
        }
      } else {
        instructionField.value = instructions;
      }

      const event = new Event('input', { bubbles: true });
      instructionField.dispatchEvent(event);

      instructionField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      instructionField.focus();

      toast.success('Instructions applied. Review and test before going live.');
    }
  },

  /**
   * Clear generation state
   * Story 4.2, Task 5.1
   */
  clearGeneration: (agentId: string) => {
    set((state) => ({
      generatedInstructions: { ...state.generatedInstructions, [agentId]: null },
      validationWarnings: { ...state.validationWarnings, [agentId]: [] },
      isGenerating: { ...state.isGenerating, [agentId]: false },
    }));
  },

  /**
   * Track generation success for metrics
   * Story 4.2, Task 5.2 + Task 9.3 (Performance Monitoring)
   */
  trackGenerationSuccess: (agentId: string, wasExecutable: boolean, durationMs?: number) => {
    set((state) => {
      const history = [...(state.generationHistory[agentId] || [])];
      const lastGeneration = history[history.length - 1];

      if (lastGeneration) {
        lastGeneration.wasExecutable = wasExecutable;
      }

      // Calculate success rate (NFR54: 85% target)
      const totalGenerations = history.length;
      const successCount = history.filter(g => g.wasExecutable).length;
      const successRate = totalGenerations > 0
        ? Math.round((successCount / totalGenerations) * 100)
        : 0;

      // Log metrics for monitoring (Task 9.3)
      console.info(`[Generation Metrics] Agent: ${agentId}`, {
        wasExecutable,
        durationMs: durationMs || 'N/A',
        totalGenerations,
        successRate: `${successRate}%`,
        targetRate: '85%'
      });

      // Alert if success rate drops below threshold (Task 9.3)
      if (totalGenerations >= 5 && successRate < 80) {
        console.warn(`[Quality Alert] Generation success rate (${successRate}%) below 80% threshold for agent ${agentId}`);
      }

      return {
        generationHistory: {
          ...state.generationHistory,
          [agentId]: history,
        },
      };
    });
  },
}));
