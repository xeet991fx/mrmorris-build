import { axiosInstance } from "../axios";

/**
 * Agent Chat API
 * 
 * Connects to the backend LangGraph agent system.
 */

export interface AgentChatResponse {
    success: boolean;
    data?: {
        response: string;
        toolResults?: Record<string, any>;
        error?: string;
    };
    error?: string;
}

export interface AgentStatusResponse {
    success: boolean;
    data?: {
        status: string;
        model: string;
        availableAgents: {
            name: string;
            description: string;
            capabilities: string[];
        }[];
        examples: string[];
    };
    error?: string;
}

/**
 * Send a message to the AI agent
 */
export const sendAgentMessage = async (
    workspaceId: string,
    message: string
): Promise<AgentChatResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/agent/chat`,
        { message }
    );
    return response.data;
};

/**
 * Get agent system status
 */
export const getAgentStatus = async (
    workspaceId: string
): Promise<AgentStatusResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/agent/status`
    );
    return response.data;
};
