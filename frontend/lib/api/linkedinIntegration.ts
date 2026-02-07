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
