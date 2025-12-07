import { AgentContext } from "@/store/useAgentStore";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token") || Cookies.get("token")
    : null;

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  chunk: string;
  done: boolean;
  action?: {
    action: string;
    params: any;
    requiresConfirmation: boolean;
  };
  fullResponse?: string;
  error?: string;
}

/**
 * Send a message to the AI agent and get a streaming response
 */
export async function sendChatMessageStreaming(
  message: string,
  context: AgentContext,
  conversationHistory: ChatMessage[] = [],
  onChunk: (chunk: StreamChunk) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/agent/chat`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        message,
        context,
        conversationHistory: conversationHistory.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: msg.content,
        })),
        streaming: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    // Read the SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response stream available");
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          try {
            const data: StreamChunk = JSON.parse(dataStr);
            onChunk(data);

            if (data.done) {
              return;
            }
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        }
      }
    }
  } catch (error: any) {
    throw new Error(error.message || "Failed to send message");
  }
}

/**
 * Send a message to the AI agent and get a non-streaming response
 */
export async function sendChatMessage(
  message: string,
  context: AgentContext,
  conversationHistory: ChatMessage[] = []
): Promise<{ response: string; action?: any }> {
  try {
    const response = await fetch(`${API_URL}/agent/chat`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        message,
        context,
        conversationHistory: conversationHistory.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: msg.content,
        })),
        streaming: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || "Failed to send message");
  }
}

/**
 * Execute an action suggested by the AI
 */
export async function executeAction(
  action: string,
  params: any,
  workspaceId: string
): Promise<{ success: boolean; message: string; result: any }> {
  try {
    const response = await fetch(`${API_URL}/agent/execute`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({
        action,
        params,
        workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to execute action");
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || "Failed to execute action");
  }
}

/**
 * Get AI-powered suggestions based on context
 */
export async function getSuggestions(
  workspaceId: string,
  currentPage: "dashboard" | "contacts" | "companies" | "pipelines",
  selectedCount: number = 0
): Promise<string[]> {
  try {
    const response = await fetch(
      `${API_URL}/agent/suggestions?workspaceId=${workspaceId}&currentPage=${currentPage}&selectedCount=${selectedCount}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get suggestions");
    }

    const data = await response.json();
    return data.suggestions;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get suggestions");
  }
}
