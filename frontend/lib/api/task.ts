import axiosInstance from "../axios";

/**
 * Task API
 * 
 * Frontend API functions for task management
 */

export interface Task {
    _id: string;
    workspaceId: string;
    createdBy: string;
    assigneeId?: {
        _id: string;
        name: string;
        email: string;
    };
    title: string;
    description?: string;
    type: "call" | "email" | "meeting" | "follow_up" | "review" | "other";
    status: "pending" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: string;
    dueTime?: string;
    completedAt?: string;
    contactId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
    };
    companyId?: {
        _id: string;
        name: string;
    };
    opportunityId?: {
        _id: string;
        title: string;
    };
    reminders: Array<{
        reminderAt: string;
        sent: boolean;
        type: "email" | "in_app" | "both";
    }>;
    isRecurring: boolean;
    recurrence?: {
        frequency: "daily" | "weekly" | "monthly" | "yearly";
        interval: number;
        endDate?: string;
        daysOfWeek?: number[];
    };
    notes?: string;
    tags?: string[];
    estimatedMinutes?: number;
    actualMinutes?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    dueDate?: string;
    dueTime?: string;
    assigneeId?: string;
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    reminders?: Array<{ reminderAt: string; type?: string }>;
    isRecurring?: boolean;
    recurrence?: {
        frequency: string;
        interval: number;
        endDate?: string;
        daysOfWeek?: number[];
    };
    tags?: string[];
    estimatedMinutes?: number;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    dueTime?: string;
    assigneeId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    opportunityId?: string | null;
    notes?: string;
    tags?: string[];
    estimatedMinutes?: number;
    actualMinutes?: number;
}

export interface TaskFilters {
    status?: string | string[];
    priority?: string | string[];
    assigneeId?: string;
    contactId?: string;
    companyId?: string;
    opportunityId?: string;
    dueBefore?: string;
    dueAfter?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface TaskCounts {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    total: number;
    overdue: number;
}

// Get tasks with filters
export async function getTasks(workspaceId: string, filters: TaskFilters = {}) {
    const params = new URLSearchParams();

    if (filters.status) {
        params.append("status", Array.isArray(filters.status) ? filters.status.join(",") : filters.status);
    }
    if (filters.priority) {
        params.append("priority", Array.isArray(filters.priority) ? filters.priority.join(",") : filters.priority);
    }
    if (filters.assigneeId) params.append("assigneeId", filters.assigneeId);
    if (filters.contactId) params.append("contactId", filters.contactId);
    if (filters.companyId) params.append("companyId", filters.companyId);
    if (filters.opportunityId) params.append("opportunityId", filters.opportunityId);
    if (filters.dueBefore) params.append("dueBefore", filters.dueBefore);
    if (filters.dueAfter) params.append("dueAfter", filters.dueAfter);
    if (filters.type) params.append("type", filters.type);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const queryString = params.toString();
    const url = `/workspaces/${workspaceId}/tasks${queryString ? `?${queryString}` : ""}`;

    const response = await axiosInstance.get(url);
    return response.data;
}

// Get single task
export async function getTask(workspaceId: string, taskId: string) {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data;
}

// Get task counts
export async function getTaskCounts(workspaceId: string, assigneeId?: string) {
    const params = assigneeId ? `?assigneeId=${assigneeId}` : "";
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks/counts${params}`);
    return response.data;
}

// Get overdue tasks
export async function getOverdueTasks(workspaceId: string, assigneeId?: string) {
    const params = assigneeId ? `?assigneeId=${assigneeId}` : "";
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks/overdue${params}`);
    return response.data;
}

// Get tasks due today
export async function getTasksDueToday(workspaceId: string, assigneeId?: string) {
    const params = assigneeId ? `?assigneeId=${assigneeId}` : "";
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/tasks/today${params}`);
    return response.data;
}

// Create task
export async function createTask(workspaceId: string, data: CreateTaskInput) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tasks`, data);
    return response.data;
}

// Update task
export async function updateTask(workspaceId: string, taskId: string, data: UpdateTaskInput) {
    const response = await axiosInstance.put(`/workspaces/${workspaceId}/tasks/${taskId}`, data);
    return response.data;
}

// Complete task
export async function completeTask(workspaceId: string, taskId: string, actualMinutes?: number) {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/tasks/${taskId}/complete`, {
        actualMinutes,
    });
    return response.data;
}

// Delete task
export async function deleteTask(workspaceId: string, taskId: string) {
    const response = await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
    return response.data;
}
