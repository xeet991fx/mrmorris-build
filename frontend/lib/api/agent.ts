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

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface AgentStreamEvent {
    type: "thinking" | "planning" | "tool_start" | "tool_result" | "subagent_start" | "subagent_result" | "message" | "done" | "error";
    data: {
        content?: string;
        toolName?: string;
        toolArgs?: any;
        toolResult?: any;
        subagentName?: string;
        todos?: TodoItem[];
        timestamp?: number;
    };
}

export interface StreamChunk {
    chunk?: string;
    done: boolean;
    error?: string;
    event?: AgentStreamEvent;
    fullResponse?: string;
    action?: {
        action: string;
        params: any;
        requiresConfirmation: boolean;
    };
}

/**
 * Send a message to the AI agent and get a streaming response with events
 */
export async function sendChatMessageStreaming(
    message: string,
    context: AgentContext,
    conversationHistory: ChatMessage[] = [],
    onChunk: (chunk: StreamChunk) => void,
    onEvent?: (event: AgentStreamEvent) => void
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
                    role: msg.role,
                    content: msg.content,
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

                        // Call the chunk handler
                        onChunk(data);

                        // If there's an event and event handler, call it separately
                        if (data.event && onEvent) {
                            onEvent(data.event);
                        }

                        if (data.done) {
                            return;
                        }
                    } catch (parseError) {
                        console.error("Failed to parse SSE data:", dataStr);
                    }
                }
            }
        }
    } catch (error: any) {
        console.error("Chat streaming error:", error);
        onChunk({
            chunk: "",
            done: true,
            error: error.message || "Failed to send message",
        });
    }
}

/**
 * Get human-readable description for tool names
 */
export function getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
        search_contacts: "Searching contacts...",
        create_contact: "Creating contact...",
        update_contact: "Updating contact...",
        score_contacts: "Scoring contacts...",
        search_opportunities: "Searching deals...",
        create_opportunity: "Creating opportunity...",
        move_opportunity_stage: "Moving deal stage...",
        get_hot_deals: "Finding hot deals...",
        get_pipeline_stats: "Analyzing pipeline...",
        list_campaigns: "Getting campaigns...",
        create_campaign: "Creating campaign...",
        start_campaign: "Starting campaign...",
        list_sequences: "Getting sequences...",
        create_sequence: "Creating sequence...",
        enroll_in_sequence: "Enrolling contacts...",
        get_dashboard_metrics: "Loading metrics...",
        get_pipeline_analytics: "Analyzing pipeline...",
        generate_report: "Generating report...",
        forecast_revenue: "Forecasting revenue...",
        analyze_business: "Analyzing business...",
        list_workflows: "Getting workflows...",
        write_todos: "Creating plan...",
        read_todos: "Checking plan...",
        task: "Delegating to subagent...",
        tavily_search: "Searching the web...",
    };
    return descriptions[toolName] || `Running ${toolName}...`;
}

/**
 * Get human-readable name for subagents
 */
export function getSubagentDisplayName(name: string): string {
    const names: Record<string, string> = {
        "contact-manager": "Contact Manager",
        "sales-pipeline": "Sales Pipeline",
        "campaign-manager": "Campaign Manager",
        "analytics": "Analytics",
    };
    return names[name] || name;
}
