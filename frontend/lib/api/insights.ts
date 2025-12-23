/**
 * Insights API Client
 * 
 * Frontend API wrapper for AI-powered proactive insights.
 */

import { axiosInstance } from "../axios";

// Types
export interface Insight {
    _id: string;
    contextType: 'contact' | 'deal' | 'campaign' | 'email' | 'workflow' | 'pipeline' | 'sequence' | 'ticket' | 'meeting' | 'lead_score' | 'email_template' | 'data_quality' | 'email_analytics' | 'email_account' | 'daily_briefing';
    contextId?: string;
    agentType: string;
    insights: {
        type: string;
        title: string;
        description: string;
        data?: Record<string, any>;
    };
    suggestedActions?: {
        id: string;
        type: string;
        label: string;
        priority: number;
        metadata?: Record<string, any>;
    }[];
    confidence: number;
    priority: 'high' | 'medium' | 'low';
    displayType: 'inline_panel' | 'inline_alert' | 'toast_notification';
    status: 'pending' | 'shown' | 'acted' | 'dismissed';
    createdAt: string;
}

export interface InsightsResponse {
    success: boolean;
    data: Insight[];
    error?: string;
}

export interface GenerateInsightsResponse {
    success: boolean;
    data: Insight[];
    error?: string;
}

/**
 * Get insights for a context
 */
export const getInsights = async (
    workspaceId: string,
    contextType?: string,
    contextId?: string
): Promise<InsightsResponse> => {
    const params = new URLSearchParams();
    if (contextType) params.append('contextType', contextType);
    if (contextId) params.append('contextId', contextId);

    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/insights?${params.toString()}`
    );
    return response.data;
};

/**
 * Generate insights for a specific context
 */
export const generateInsights = async (
    workspaceId: string,
    contextType: string,
    contextId?: string
): Promise<GenerateInsightsResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/insights/generate`,
        { contextType, contextId }
    );
    return response.data;
};

/**
 * Mark an insight as acted upon
 */
export const markInsightActed = async (
    workspaceId: string,
    insightId: string,
    actionType: string
): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/insights/${insightId}/act`,
        { actionType }
    );
    return response.data;
};

/**
 * Dismiss an insight
 */
export const dismissInsight = async (
    workspaceId: string,
    insightId: string
): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/insights/${insightId}/dismiss`
    );
    return response.data;
};

/**
 * Provide feedback on an insight
 */
export const provideFeedback = async (
    workspaceId: string,
    insightId: string,
    helpful: boolean,
    feedback?: string
): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/insights/${insightId}/feedback`,
        { helpful, feedback }
    );
    return response.data;
};

/**
 * Track a user action (for pattern detection)
 */
export const trackAction = async (
    workspaceId: string,
    actionType: string,
    page: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; data: { actionId: string } }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/actions/track`,
        { actionType, page, resourceType, resourceId, metadata }
    );
    return response.data;
};
