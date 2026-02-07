import { axiosInstance } from "../axios";

/**
 * LinkedIn Integration API
 */

export interface LinkedInStatus {
    connected: boolean;
    status: "Connected" | "Expired" | "Error" | "Revoked" | "Not Connected";
    profileInfo?: {
        email?: string;
        name?: string;
        avatarUrl?: string;
    };
    expiresAt?: string;
    lastValidated?: string;
}

export interface LinkedInProfile {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    picture?: string;
}

/**
 * Get LinkedIn OAuth connect URL
 */
export const getLinkedInConnectUrl = async (workspaceId: string) => {
    const response = await axiosInstance.get(
        `/linkedin/connect?workspaceId=${workspaceId}`
    );
    return response.data;
};

/**
 * Get LinkedIn connection status for workspace
 */
export const getLinkedInStatus = async (workspaceId: string): Promise<{
    success: boolean;
    data?: LinkedInStatus;
    error?: string;
}> => {
    try {
        const response = await axiosInstance.get(
            `/linkedin/status?workspaceId=${workspaceId}`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
};

/**
 * Disconnect LinkedIn integration
 */
export const disconnectLinkedIn = async (workspaceId: string) => {
    const response = await axiosInstance.delete(
        `/linkedin/disconnect?workspaceId=${workspaceId}`
    );
    return response.data;
};

/**
 * Get connected user's LinkedIn profile
 */
export const getLinkedInProfile = async (workspaceId: string): Promise<{
    success: boolean;
    data?: { profile: LinkedInProfile };
    error?: string;
}> => {
    try {
        const response = await axiosInstance.get(
            `/linkedin/profile?workspaceId=${workspaceId}`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
};

/**
 * Sync LinkedIn URL to a contact (normalizes URL)
 */
export const syncContactLinkedIn = async (
    contactId: string,
    workspaceId: string
) => {
    const response = await axiosInstance.post(
        `/linkedin/sync-contact/${contactId}`,
        { workspaceId }
    );
    return response.data;
};

/**
 * Enrich contact from LinkedIn via Apollo.io
 */
export const enrichContactFromLinkedIn = async (
    contactId: string,
    workspaceId: string
) => {
    const response = await axiosInstance.post(
        `/linkedin/enrich-from-apollo/${contactId}`,
        { workspaceId }
    );
    return response.data;
};

// ============================================
// LINKEDIN ACTIVITY API (For Inbox Integration)
// ============================================

export type LinkedInActivityType =
    | "message_sent"
    | "message_received"
    | "connection_request_sent"
    | "connection_request_received"
    | "connection_accepted"
    | "profile_viewed"
    | "note"
    | "inmail_sent"
    | "inmail_received";

export interface LinkedInActivity {
    _id: string;
    workspaceId: string;
    contactId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        linkedin?: string;
        company?: string;
    };
    userId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    type: LinkedInActivityType;
    typeLabel: string;
    subject?: string;
    content: string;
    linkedinUrl?: string;
    direction: "inbound" | "outbound";
    isRead: boolean;
    activityDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface LinkedInConversation {
    contactId: string;
    contactName: string;
    contactEmail: string;
    contactLinkedIn?: string;
    contactCompany?: string;
    activityCount: number;
    unreadCount: number;
    latestActivity: LinkedInActivity;
    activities: LinkedInActivity[];
}

/**
 * Log a new LinkedIn activity
 */
export const logLinkedInActivity = async (data: {
    workspaceId: string;
    contactId: string;
    type: LinkedInActivityType;
    content: string;
    subject?: string;
    linkedinUrl?: string;
    direction?: "inbound" | "outbound";
    activityDate?: string;
}) => {
    const response = await axiosInstance.post("/linkedin/activities", data);
    return response.data;
};

/**
 * Get LinkedIn activities
 */
export const getLinkedInActivities = async (
    workspaceId: string,
    filters?: {
        contactId?: string;
        type?: string;
        isRead?: boolean;
        page?: number;
        limit?: number;
    }
) => {
    const params = new URLSearchParams({ workspaceId });
    if (filters?.contactId) params.set("contactId", filters.contactId);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.isRead !== undefined) params.set("isRead", String(filters.isRead));
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const response = await axiosInstance.get(`/linkedin/activities?${params}`);
    return response.data;
};

/**
 * Get LinkedIn activities grouped by contact (for inbox view)
 */
export const getGroupedLinkedInActivities = async (
    workspaceId: string
): Promise<{
    success: boolean;
    data?: { conversations: LinkedInConversation[] };
    error?: string;
}> => {
    try {
        const response = await axiosInstance.get(
            `/linkedin/activities/grouped?workspaceId=${workspaceId}`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
};

/**
 * Get LinkedIn activity stats
 */
export const getLinkedInActivityStats = async (workspaceId: string) => {
    const response = await axiosInstance.get(
        `/linkedin/activities/stats?workspaceId=${workspaceId}`
    );
    return response.data;
};

/**
 * Mark LinkedIn activity as read
 */
export const markLinkedInActivityRead = async (activityId: string) => {
    const response = await axiosInstance.put(
        `/linkedin/activities/${activityId}/read`
    );
    return response.data;
};

/**
 * Delete LinkedIn activity
 */
export const deleteLinkedInActivity = async (activityId: string) => {
    const response = await axiosInstance.delete(
        `/linkedin/activities/${activityId}`
    );
    return response.data;
};

