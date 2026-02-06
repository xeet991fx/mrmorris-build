import axiosInstance from "@/lib/axios";
import {
    CreateGoogleMeetResponse,
    GetGoogleMeetResponse,
    GoogleAuthUrlResponse,
    GoogleConnectionStatusResponse,
    ListRecordingsResponse,
    GetRecordingResponse,
    ShareRecordingRequest,
    ShareRecordingResponse,
    UpdateRecordingStatusRequest,
    UpdateRecordingStatusResponse,
} from "./googleMeet.types";

// ==========================================
// Google OAuth / Connection APIs
// ==========================================

/**
 * Get Google OAuth URL for connecting account
 * @param returnUrl - URL to redirect after OAuth completion
 */
export async function getGoogleAuthUrl(returnUrl?: string): Promise<GoogleAuthUrlResponse> {
    try {
        const response = await axiosInstance.get("/workspaces/google/auth-url", {
            params: { returnUrl },
        });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to get Google auth URL",
        };
    }
}

/**
 * Check Google account connection status
 */
export async function getGoogleConnectionStatus(): Promise<GoogleConnectionStatusResponse> {
    try {
        const response = await axiosInstance.get("/workspaces/google/status");
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to check Google status",
        };
    }
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await axiosInstance.post("/workspaces/google/disconnect");
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to disconnect Google",
        };
    }
}

// ==========================================
// Google Meet APIs
// ==========================================

/**
 * Create a Google Meet for an existing meeting
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID to add Google Meet to
 */
export async function createGoogleMeet(
    workspaceId: string,
    meetingId: string
): Promise<CreateGoogleMeetResponse> {
    try {
        const response = await axiosInstance.post(
            `/workspaces/${workspaceId}/meetings/${meetingId}/google-meet`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to create Google Meet",
        };
    }
}

/**
 * Get Google Meet details for a meeting
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID
 */
export async function getGoogleMeet(
    workspaceId: string,
    meetingId: string
): Promise<GetGoogleMeetResponse> {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/meetings/${meetingId}/google-meet`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to get Google Meet details",
        };
    }
}

/**
 * Remove Google Meet from a meeting
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID
 */
export async function deleteGoogleMeet(
    workspaceId: string,
    meetingId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await axiosInstance.delete(
            `/workspaces/${workspaceId}/meetings/${meetingId}/google-meet`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to delete Google Meet",
        };
    }
}

// ==========================================
// Recording APIs
// ==========================================

/**
 * List all recordings for a workspace
 * @param workspaceId - Workspace ID
 * @param options - Optional query parameters
 */
export async function listRecordings(
    workspaceId: string,
    options?: {
        status?: string;
        limit?: number;
        offset?: number;
        sortBy?: "date" | "duration";
        sortOrder?: "asc" | "desc";
    }
): Promise<ListRecordingsResponse> {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/recordings`,
            { params: options }
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to list recordings",
        };
    }
}

/**
 * Get recording details for a specific meeting
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID
 */
export async function getRecording(
    workspaceId: string,
    meetingId: string
): Promise<GetRecordingResponse> {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/meetings/${meetingId}/recording`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to get recording",
        };
    }
}

/**
 * Share a recording with users
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID
 * @param shareData - Sharing configuration
 */
export async function shareRecording(
    workspaceId: string,
    meetingId: string,
    shareData: ShareRecordingRequest
): Promise<ShareRecordingResponse> {
    try {
        const response = await axiosInstance.post(
            `/workspaces/${workspaceId}/meetings/${meetingId}/recording/share`,
            shareData
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to share recording",
        };
    }
}

/**
 * Update recording status (for webhook callbacks)
 * @param workspaceId - Workspace ID
 * @param meetingId - Meeting ID
 * @param statusData - New recording status
 */
export async function updateRecordingStatus(
    workspaceId: string,
    meetingId: string,
    statusData: UpdateRecordingStatusRequest
): Promise<UpdateRecordingStatusResponse> {
    try {
        const response = await axiosInstance.post(
            `/workspaces/${workspaceId}/meetings/${meetingId}/recording/status`,
            statusData
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to update recording status",
        };
    }
}

/**
 * Delete a recording
 * @param workspaceId - Workspace ID
 * @param recordingId - Recording ID
 */
export async function deleteRecording(
    workspaceId: string,
    recordingId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await axiosInstance.delete(
            `/workspaces/${workspaceId}/recordings/${recordingId}`
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to delete recording",
        };
    }
}
