/**
 * Task API Client
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Task {
    _id: string;
    workspaceId: string;
    userId: string;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: string;
    reminderDate?: string;
    relatedContactId?: string | { _id: string; firstName: string; lastName: string; email?: string };
    relatedCompanyId?: string | { _id: string; name: string };
    relatedOpportunityId?: string | { _id: string; name: string; value?: number };
    assignedTo?: string | { _id: string; firstName: string; lastName: string; email?: string };
    createdBy: string;
    tags?: string[];
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskData {
    title: string;
    description?: string;
    status?: "todo" | "in_progress" | "completed" | "cancelled";
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string;
    reminderDate?: string;
    relatedContactId?: string;
    relatedCompanyId?: string;
    relatedOpportunityId?: string;
    assignedTo?: string;
    tags?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> { }

export interface TasksResponse {
    success: boolean;
    message?: string;
    data?: {
        tasks: Task[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
    error?: string;
}

export interface TaskResponse {
    success: boolean;
    message?: string;
    data?: { task: Task };
    error?: string;
}

export interface TaskStatsResponse {
    success: boolean;
    data?: {
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        overdue: number;
        dueToday: number;
    };
    error?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

export const getTasks = async (
    workspaceId: string,
    params?: {
        status?: string;
        priority?: string;
        assignedTo?: string;
        search?: string;
        page?: number;
        limit?: number;
    }
): Promise<TasksResponse> => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks`, { params });
    return response.data;
};

export const getTask = async (workspaceId: string, taskId: string): Promise<TaskResponse> => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data;
};

export const createTask = async (workspaceId: string, data: CreateTaskData): Promise<TaskResponse> => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tasks`, data);
    return response.data;
};

export const updateTask = async (
    workspaceId: string,
    taskId: string,
    data: UpdateTaskData
): Promise<TaskResponse> => {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
    return response.data;
};

export const deleteTask = async (workspaceId: string, taskId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await axiosInstance.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data;
};

export const completeTask = async (workspaceId: string, taskId: string): Promise<TaskResponse> => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tasks/${taskId}/complete`);
    return response.data;
};

export const getTaskStats = async (workspaceId: string): Promise<TaskStatsResponse> => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks-stats`);
    return response.data;
};
