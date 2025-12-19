import { axiosInstance } from "../axios";

// Activity type definitions for contacts
export interface ContactActivity {
    _id: string;
    workspaceId: string;
    userId?: {
        _id: string;
        name: string;
        email: string;
    };
    entityType: "contact";
    entityId: string;
    type:
    | "email"
    | "call"
    | "meeting"
    | "note"
    | "stage_change"
    | "file_upload"
    | "task"
    | "ai_suggestion"
    | "workflow_action";
    title: string;
    description?: string;
    direction?: "inbound" | "outbound";
    duration?: number;
    emailSubject?: string;
    emailBody?: string;
    dueDate?: string;
    completed?: boolean;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    workflowId?: string;
    workflowEnrollmentId?: string;
    workflowStepId?: string;
    automated?: boolean;
    metadata?: Record<string, any>;
    isAutoLogged?: boolean;
    aiConfidence?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateContactActivityData {
    type: ContactActivity["type"];
    title: string;
    description?: string;
    direction?: "inbound" | "outbound";
    duration?: number;
    emailSubject?: string;
    emailBody?: string;
    dueDate?: string;
    completed?: boolean;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    metadata?: Record<string, any>;
}

export interface ContactActivitiesResponse {
    success: boolean;
    data?: {
        activities: ContactActivity[];
        total: number;
        limit: number;
        offset: number;
    };
    error?: string;
}

export interface ContactActivityResponse {
    success: boolean;
    data?: {
        activity: ContactActivity;
    };
    error?: string;
}

/**
 * Get all activities for a contact
 */
export const getContactActivities = async (
    workspaceId: string,
    contactId: string,
    options?: {
        type?: string;
        limit?: number;
        offset?: number;
    }
): Promise<ContactActivitiesResponse> => {
    const params = new URLSearchParams();
    if (options?.type) params.append("type", options.type);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/contacts/${contactId}/activities?${params}`
    );
    return response.data;
};

/**
 * Create a new activity for a contact
 */
export const createContactActivity = async (
    workspaceId: string,
    contactId: string,
    data: CreateContactActivityData
): Promise<ContactActivityResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/${contactId}/activities`,
        data
    );
    return response.data;
};
