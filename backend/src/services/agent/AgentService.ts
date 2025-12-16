import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createCRMDeepAgent, ModelType, AgentStreamEvent, formatAgentEvent } from "./DeepAgentService";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamChunk {
  chunk?: string;
  done: boolean;
  error?: string;
  event?: AgentStreamEvent;
}

// Agent cache to reuse instances and avoid channel conflicts
const agentCache = new Map<string, ReturnType<typeof createCRMDeepAgent>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

function getOrCreateAgent(
  workspaceId: string,
  userId: string,
  autonomousMode: boolean,
  modelType: ModelType
): ReturnType<typeof createCRMDeepAgent> {
  const cacheKey = `${workspaceId}-${autonomousMode}-${modelType}`;
  const now = Date.now();

  // Check if cached agent exists and is still valid
  const cachedTime = cacheTimestamps.get(cacheKey);
  if (cachedTime && (now - cachedTime) > CACHE_TTL) {
    // Cache expired, remove old agent
    agentCache.delete(cacheKey);
    cacheTimestamps.delete(cacheKey);
  }

  if (!agentCache.has(cacheKey)) {
    console.log(`Creating new agent for workspace ${workspaceId}`);
    try {
      const agent = createCRMDeepAgent(workspaceId, userId, {
        autonomousMode,
        modelType,
      });
      agentCache.set(cacheKey, agent);
      cacheTimestamps.set(cacheKey, now);
    } catch (error: any) {
      console.error("Error creating agent:", error.message);
      // If it's a channel conflict, try clearing the cache and creating fresh
      if (error.message.includes("Channel") && error.message.includes("already exists")) {
        console.log("Channel conflict detected, clearing cache and retrying...");
        agentCache.clear();
        cacheTimestamps.clear();
        const agent = createCRMDeepAgent(workspaceId, userId, {
          autonomousMode,
          modelType,
        });
        agentCache.set(cacheKey, agent);
        cacheTimestamps.set(cacheKey, now);
      } else {
        throw error;
      }
    }
  }

  return agentCache.get(cacheKey)!;
}

export class AgentService {
  private agent: ReturnType<typeof createCRMDeepAgent>;
  private workspaceId: string;
  private userId: string;

  constructor(
    workspaceId: string,
    userId: string,
    autonomousMode: boolean = true,
    modelType: ModelType = "gemini-2.5-flash"
  ) {
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.agent = getOrCreateAgent(workspaceId, userId, autonomousMode, modelType);
  }

  /**
   * Convert chat history to LangChain messages
   */
  private convertHistory(history: ChatMessage[]): BaseMessage[] {
    const messages: BaseMessage[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((msg) => {
        if (!msg || !msg.content) return;
        const content = typeof msg.content === "string" ? msg.content : String(msg.content);

        if (msg.role === "user") {
          messages.push(new HumanMessage({ content }));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage({ content }));
        }
      });
    }

    return messages;
  }

  /**
   * Stream chat with detailed event callbacks
   */
  async chat(
    message: string,
    history: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    try {
      // Convert history and add current message
      const messages = this.convertHistory(history);
      const currentMessage = typeof message === "string" ? message : String(message);
      messages.push(new HumanMessage({ content: currentMessage }));

      // Send initial thinking event
      onChunk({
        chunk: "",
        done: false,
        event: {
          type: "thinking",
          data: { content: "Analyzing your request...", timestamp: Date.now() },
        },
      });

      let fullResponse = "";
      let isFirstChunk = true;

      // Stream the agent response with events
      try {
        for await (const event of this.agent.streamEvents(
          { messages },
          { version: "v2" }
        )) {
          // Handle different event types
          if (event.event === "on_llm_start") {
            onChunk({
              chunk: "",
              done: false,
              event: {
                type: "thinking",
                data: { content: "Processing...", timestamp: Date.now() },
              },
            });
          } else if (event.event === "on_tool_start") {
            const toolName = event.name || "unknown";
            const toolArgs = event.data?.input || {};

            // Check if it's a subagent task
            if (toolName === "task") {
              const subagentName = toolArgs.agent || toolArgs.name || "subagent";
              onChunk({
                chunk: "",
                done: false,
                event: {
                  type: "subagent_start",
                  data: {
                    subagentName,
                    content: `Delegating to ${subagentName}...`,
                    timestamp: Date.now(),
                  },
                },
              });
            } else if (toolName === "write_todos") {
              // Planning event
              onChunk({
                chunk: "",
                done: false,
                event: {
                  type: "planning",
                  data: {
                    todos: toolArgs.todos || [],
                    content: "Creating plan...",
                    timestamp: Date.now(),
                  },
                },
              });
            } else {
              // Regular tool execution
              onChunk({
                chunk: "",
                done: false,
                event: {
                  type: "tool_start",
                  data: {
                    toolName,
                    toolArgs,
                    timestamp: Date.now(),
                  },
                },
              });
            }
          } else if (event.event === "on_tool_end") {
            const toolName = event.name || "unknown";
            const output = event.data?.output;

            if (toolName === "task") {
              onChunk({
                chunk: "",
                done: false,
                event: {
                  type: "subagent_result",
                  data: {
                    subagentName: toolName,
                    toolResult: output,
                    timestamp: Date.now(),
                  },
                },
              });
            } else {
              onChunk({
                chunk: "",
                done: false,
                event: {
                  type: "tool_result",
                  data: {
                    toolName,
                    toolResult: output,
                    timestamp: Date.now(),
                  },
                },
              });
            }
          } else if (event.event === "on_llm_stream") {
            // Streaming text content
            const chunk = event.data?.chunk;
            if (chunk?.content) {
              const content = typeof chunk.content === "string"
                ? chunk.content
                : JSON.stringify(chunk.content);

              fullResponse += content;

              onChunk({
                chunk: content,
                done: false,
                event: {
                  type: "message",
                  data: { content, timestamp: Date.now() },
                },
              });
            }
          } else if (event.event === "on_chain_end" && event.name === "LangGraph") {
            // Final response
            const output = event.data?.output;
            if (output?.messages) {
              const lastMessage = output.messages[output.messages.length - 1];
              if (lastMessage?.content && !fullResponse) {
                const content = typeof lastMessage.content === "string"
                  ? lastMessage.content
                  : JSON.stringify(lastMessage.content);

                fullResponse = content;
                onChunk({
                  chunk: content,
                  done: false,
                  event: {
                    type: "message",
                    data: { content, timestamp: Date.now() },
                  },
                });
              }
            }
          }
        }
      } catch (streamError: any) {
        console.error("Stream error:", streamError);
        // Fallback to non-streaming invoke
        const result = await this.agent.invoke({ messages });
        if (result?.messages) {
          const lastMessage = result.messages[result.messages.length - 1];
          if (lastMessage?.content) {
            const content = typeof lastMessage.content === "string"
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);
            fullResponse = content;
            onChunk({
              chunk: content,
              done: false,
              event: {
                type: "message",
                data: { content, timestamp: Date.now() },
              },
            });
          }
        }
      }

      // Send completion
      onChunk({
        done: true,
        event: {
          type: "done",
          data: { timestamp: Date.now() },
        },
      });
    } catch (error: any) {
      console.error("AgentService chat error:", error);
      onChunk({
        chunk: "",
        done: true,
        error: error.message,
        event: {
          type: "error",
          data: { content: error.message, timestamp: Date.now() },
        },
      });
    }
  }

  /**
   * Simple non-streaming chat
   */
  async chatSimple(message: string, history: ChatMessage[]): Promise<string> {
    try {
      const messages = this.convertHistory(history);
      messages.push(new HumanMessage({ content: message }));

      const result = await this.agent.invoke({ messages });

      if (result?.messages) {
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage?.content) {
          return typeof lastMessage.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);
        }
      }

      return "I'm not sure how to help with that.";
    } catch (error: any) {
      console.error("AgentService chatSimple error:", error);
      throw error;
    }
  }
}
