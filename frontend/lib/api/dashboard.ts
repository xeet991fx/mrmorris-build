/**
 * Dashboard API Client
 * 
 * Frontend API wrapper for dashboard briefing data.
 */

import { axiosInstance } from "../axios";

export interface DashboardPriority {
    title: string;
    type: "meeting" | "deal" | "task" | "email" | "follow_up";
    urgency: "high" | "medium" | "low";
    description: string;
    time?: string;
}

export interface DashboardMetric {
    label: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
}

export interface DashboardAlert {
    type: "warning" | "success" | "info";
    message: string;
}

export interface DashboardSuggestion {
    action: string;
    reason: string;
}

export interface DashboardBriefing {
    greeting: string;
    summary: string;
    priorities: DashboardPriority[];
    metrics: DashboardMetric[];
    alerts: DashboardAlert[];
    suggestedActions: DashboardSuggestion[];
    stats?: {
        contacts: number;
        opportunities: number;
        todayMeetings: number;
        pendingTasks: number;
        unreadEmails: number;
        openTickets: number;
        staleDeals: number;
    };
}

export interface DashboardBriefingResponse {
    success: boolean;
    data: DashboardBriefing;
    error?: string;
}

/**
 * Get real-time dashboard briefing with actual workspace data
 */
export const getDashboardBriefing = async (
    workspaceId: string
): Promise<DashboardBriefingResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/dashboard/briefing`
    );
    return response.data;
};
