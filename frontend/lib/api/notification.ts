import axiosInstance from "../axios";

/**
 * Notification API
 * 
 * Frontend API functions for notification management
 */

export interface Notification {
    _id: string;
    userId: string;
    workspaceId?: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    readAt?: string;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    priority?: "low" | "normal" | "high";
    createdAt: string;
    updatedAt: string;
}

// Get notifications
export async function getNotifications(page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    });
    if (unreadOnly) {
        params.append("unreadOnly", "true");
    }

    const response = await axiosInstance.get(`/notifications?${params.toString()}`);
    return response.data;
}

// Get unread count
export async function getUnreadCount() {
    const response = await axiosInstance.get("/notifications/unread-count");
    return response.data;
}

// Mark notification as read
export async function markAsRead(notificationId: string) {
    const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
    return response.data;
}

// Mark all notifications as read
export async function markAllAsRead() {
    const response = await axiosInstance.put("/notifications/read-all");
    return response.data;
}

// Delete notification
export async function deleteNotification(notificationId: string) {
    const response = await axiosInstance.delete(`/notifications/${notificationId}`);
    return response.data;
}
