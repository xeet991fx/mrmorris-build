/**
 * Notification API Client
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Notification {
    _id: string;
    workspaceId: string;
    userId: string;
    type: "task_due" | "task_assigned" | "deal_won" | "deal_lost" | "new_lead" | "workflow_complete" | "mention" | "system" | "custom";
    title: string;
    message: string;
    isRead: boolean;
    readAt?: string;
    relatedEntityType?: "task" | "contact" | "opportunity" | "workflow" | "campaign";
    relatedEntityId?: string;
    actionUrl?: string;
    priority: "low" | "normal" | "high";
    createdAt: string;
    updatedAt: string;
}

export interface NotificationsResponse {
    success: boolean;
    data?: {
        notifications: Notification[];
        pagination: {
            page: number;
            limit: number;
            total: number;
        };
        unreadCount: number;
    };
    error?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

export const getNotifications = async (params?: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
}): Promise<NotificationsResponse> => {
    const response = await axiosInstance.get("/notifications", { params });
    return response.data;
};

export const markNotificationRead = async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post(`/notifications/${notificationId}/read`);
    return response.data;
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post("/notifications/read-all");
    return response.data;
};

export const deleteNotification = async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await axiosInstance.delete(`/notifications/${notificationId}`);
    return response.data;
};

export const getUnreadCount = async (): Promise<{ success: boolean; data?: { count: number } }> => {
    const response = await axiosInstance.get("/notifications/unread-count");
    return response.data;
};
