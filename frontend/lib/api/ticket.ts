/**
 * Ticket API Client
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPES
// ============================================

export type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "support" | "billing" | "technical" | "feature_request" | "bug" | "other";

export interface TicketComment {
    _id: string;
    userId: { _id: string; name: string; email: string };
    message: string;
    isInternal: boolean;
    createdAt: string;
}

export interface Ticket {
    _id: string;
    workspaceId: string;
    ticketNumber: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    requesterEmail: string;
    requesterName?: string;
    assignedTo?: { _id: string; name: string; email: string };
    relatedContactId?: { _id: string; firstName: string; lastName: string; email?: string };
    dueDate?: string;
    firstResponseAt?: string;
    resolvedAt?: string;
    slaBreached: boolean;
    comments: TicketComment[];
    tags?: string[];
    source: string;
    responseTimeMinutes?: number;
    resolutionTimeMinutes?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketData {
    subject: string;
    description: string;
    priority?: TicketPriority;
    category?: TicketCategory;
    requesterEmail: string;
    requesterName?: string;
    assignedTo?: string;
    dueDate?: string;
    tags?: string[];
}

export interface UpdateTicketData extends Partial<CreateTicketData> {
    status?: TicketStatus;
}

// ============================================
// API
// ============================================

export const getTickets = async (
    workspaceId: string,
    params?: { status?: string; priority?: string; search?: string; page?: number; limit?: number }
) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tickets`, { params });
    return response.data;
};

export const getTicket = async (workspaceId: string, ticketId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tickets/${ticketId}`);
    return response.data;
};

export const createTicket = async (workspaceId: string, data: CreateTicketData) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tickets`, data);
    return response.data;
};

export const updateTicket = async (workspaceId: string, ticketId: string, data: UpdateTicketData) => {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/tickets/${ticketId}`, data);
    return response.data;
};

export const deleteTicket = async (workspaceId: string, ticketId: string) => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/tickets/${ticketId}`);
    return response.data;
};

export const addTicketComment = async (
    workspaceId: string,
    ticketId: string,
    data: { message: string; isInternal?: boolean }
) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tickets/${ticketId}/comments`, data);
    return response.data;
};

export const getTicketStats = async (workspaceId: string) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tickets-stats`);
    return response.data;
};
