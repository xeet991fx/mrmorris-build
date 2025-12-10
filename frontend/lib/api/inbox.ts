/**
 * Inbox API Client
 * Handles all unified inbox (Unibox) related API calls
 */

import { axiosInstance } from "../axios";

export interface InboxMessage {
    _id: string;
    workspaceId: string;
    campaignId?: string;
    contactId: string;
    contact?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    fromEmail: string;
    toEmail: string;
    subject: string;
    body: string;
    snippet?: string;
    isRead: boolean;
    sentiment?: "positive" | "neutral" | "negative";
    labels?: string[];
    assignedTo?: string;
    threadId?: string;
    messageId?: string;
    receivedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface InboxMessagesResponse {
    success: boolean;
    message?: string;
    data?: {
        messages: InboxMessage[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
    error?: string;
}

export interface InboxFilters {
    campaign?: string;
    sentiment?: "positive" | "neutral" | "negative";
    assignedTo?: string;
    isRead?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Get all inbox messages for a workspace
 */
export const getInboxMessages = async (
    workspaceId: string,
    filters?: InboxFilters
): Promise<InboxMessagesResponse> => {
    const response = await axiosInstance.get(`/inbox`, {
        params: { workspaceId, ...filters },
    });
    return response.data;
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (
    messageId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.put(`/inbox/${messageId}/read`);
    return response.data;
};

/**
 * Assign a message to a user
 */
export const assignMessage = async (
    messageId: string,
    userId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.put(`/inbox/${messageId}/assign`, {
        userId,
    });
    return response.data;
};

/**
 * Add a label to a message
 */
export const labelMessage = async (
    messageId: string,
    label: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.put(`/inbox/${messageId}/label`, {
        label,
    });
    return response.data;
};

/**
 * Send a reply to a message
 */
export const sendReply = async (
    messageId: string,
    body: string,
    subject?: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post(`/inbox/${messageId}/reply`, {
        body,
        subject,
    });
    return response.data;
};

/**
 * Mark multiple messages as read
 */
export const markMultipleAsRead = async (
    messageIds: string[]
): Promise<{ success: boolean; updated: number }> => {
    const results = await Promise.all(
        messageIds.map((id) => markMessageAsRead(id))
    );
    return {
        success: results.every((r) => r.success),
        updated: results.filter((r) => r.success).length,
    };
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (
    workspaceId: string
): Promise<{ success: boolean; count: number }> => {
    const response = await getInboxMessages(workspaceId, {
        isRead: false,
        limit: 1,
    });
    return {
        success: response.success,
        count: response.data?.pagination?.total || 0,
    };
};

/**
 * Generate AI draft response for a message
 */
export const generateAIDraft = async (
    messageId: string
): Promise<{ success: boolean; draft?: string; message?: string }> => {
    const response = await axiosInstance.post(`/inbox/${messageId}/draft`);
    return response.data;
};

/**
 * Get existing AI draft for a message
 */
export const getAIDraft = async (
    messageId: string
): Promise<{ success: boolean; draft?: string; generatedAt?: string }> => {
    const response = await axiosInstance.get(`/inbox/${messageId}/draft`);
    return response.data;
};

