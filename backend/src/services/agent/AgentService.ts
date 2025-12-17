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
   * Build a message string from history for the simplified agent
   */
  private buildMessageContext(history: ChatMessage[], currentMessage: string): string {
    let context = "";

    if (history && history.length > 0) {
      const recentHistory = history.slice(-10); // Last 10 messages for context
      recentHistory.forEach((msg) => {
        if (msg.role === "user") {
          context += `User: ${msg.content}\n`;
        } else if (msg.role === "assistant") {
          context += `Assistant: ${msg.content}\n`;
        }
      });
    }

    context += `User: ${currentMessage}`;
    return context;
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
      const currentMessage = typeof message === "string" ? message : String(message);

      // Send initial thinking event
      onChunk({
        chunk: "",
        done: false,
        event: {
          type: "thinking",
          data: { content: "Analyzing your request...", timestamp: Date.now() },
        },
      });

      // Build context with history
      const contextMessage = this.buildMessageContext(history, currentMessage);

      // Use the simplified agent invoke
      const result = await this.agent.invoke(contextMessage);

      // Extract content from the result
      let responseContent = "";

      if (result) {
        // Handle AIMessageChunk response
        if (typeof result.content === "string") {
          responseContent = result.content;
        } else if (result.content && typeof result.content === "object") {
          // Content might be an array of content blocks
          if (Array.isArray(result.content)) {
            responseContent = result.content
              .map((block: any) => {
                if (typeof block === "string") return block;
                if (block.text) return block.text;
                return JSON.stringify(block);
              })
              .join("");
          } else {
            responseContent = JSON.stringify(result.content);
          }
        }

        // Check for tool calls
        if (result.tool_calls && result.tool_calls.length > 0) {
          for (const toolCall of result.tool_calls) {
            onChunk({
              chunk: "",
              done: false,
              event: {
                type: "tool_start",
                data: {
                  toolName: toolCall.name,
                  toolArgs: toolCall.args,
                  timestamp: Date.now(),
                },
              },
            });

            // Execute the tool
            const tool = this.agent.tools.find((t: any) => t.name === toolCall.name);
            if (tool) {
              try {
                const toolResult = await tool.invoke(toolCall.args);
                onChunk({
                  chunk: "",
                  done: false,
                  event: {
                    type: "tool_result",
                    data: {
                      toolName: toolCall.name,
                      toolResult: toolResult,
                      timestamp: Date.now(),
                    },
                  },
                });

                // Append tool result context
                responseContent += `\n\nTool ${toolCall.name} result: ${typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)}`;
              } catch (toolError: any) {
                console.error(`Tool ${toolCall.name} error:`, toolError);
              }
            }
          }
        }
      }

      // Send the response
      if (responseContent) {
        onChunk({
          chunk: responseContent,
          done: false,
          event: {
            type: "message",
            data: { content: responseContent, timestamp: Date.now() },
          },
        });
      } else {
        responseContent = "I processed your request. Let me know if you need anything else.";
        onChunk({
          chunk: responseContent,
          done: false,
          event: {
            type: "message",
            data: { content: responseContent, timestamp: Date.now() },
          },
        });
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
      const contextMessage = this.buildMessageContext(history, message);
      const result = await this.agent.invoke(contextMessage);

      if (result) {
        if (typeof result.content === "string") {
          return result.content;
        } else if (result.content && Array.isArray(result.content)) {
          return result.content
            .map((block: any) => {
              if (typeof block === "string") return block;
              if (block.text) return block.text;
              return JSON.stringify(block);
            })
            .join("");
        }
      }

      return "I'm not sure how to help with that.";
    } catch (error: any) {
      console.error("AgentService chatSimple error:", error);
      throw error;
    }
  }
}

