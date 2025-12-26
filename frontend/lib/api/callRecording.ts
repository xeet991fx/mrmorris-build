/**
 * Call Recording API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface CallRecording {
    _id: string;
    workspaceId: string;
    userId: string;
    contactId?: { _id: string; firstName: string; lastName: string; email: string };
    opportunityId?: { _id: string; title: string; value: number };
    companyId?: { _id: string; name: string };
    title: string;
    audioUrl?: string;
    duration?: number;
    recordedAt: Date;
    source?: "upload" | "zoom" | "google_meet" | "teams" | "phone";
    transcript?: string;
    transcribedAt?: Date;
    language?: string;
    summary?: string;
    actionItems?: Array<{
        task: string;
        assignee?: string;
        dueDate?: Date;
        completed?: boolean;
    }>;
    keyInsights?: {
        budget?: {
            mentioned: boolean;
            details?: string;
            quote?: string;
        };
        authority?: {
            decisionMaker: boolean;
            details?: string;
            quote?: string;
        };
        need?: {
            identified: boolean;
            painPoints?: string[];
            quote?: string;
        };
        timeline?: {
            mentioned: boolean;
            details?: string;
            quote?: string;
        };
    };
    overallSentiment?: "positive" | "neutral" | "negative";
    keyMoments?: Array<{
        timestamp?: number;
        type: "objection" | "interest" | "concern" | "commitment";
        quote: string;
    }>;
    nextSteps?: string[];
    participants?: string[];
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get all call recordings
 */
export async function getCallRecordings(
    workspaceId: string,
    params?: {
        contactId?: string;
        opportunityId?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }
): Promise<{
    success: boolean;
    data: CallRecording[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}> {
    const queryParams = new URLSearchParams();
    if (params?.contactId) queryParams.append("contactId", params.contactId);
    if (params?.opportunityId) queryParams.append("opportunityId", params.opportunityId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings?${queryParams}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch call recordings");
    }

    return response.json();
}

/**
 * Get a specific call recording
 */
export async function getCallRecording(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; data: CallRecording }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings/${id}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch call recording");
    }

    return response.json();
}

/**
 * Upload a new call recording
 */
export async function uploadCallRecording(
    workspaceId: string,
    data: {
        title: string;
        audio?: File;
        contactId?: string;
        opportunityId?: string;
        companyId?: string;
        recordedAt?: Date;
        source?: string;
        transcript?: string;
        participants?: string[];
        tags?: string[];
    }
): Promise<{ success: boolean; data: CallRecording; message: string }> {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.audio) formData.append("audio", data.audio);
    if (data.contactId) formData.append("contactId", data.contactId);
    if (data.opportunityId) formData.append("opportunityId", data.opportunityId);
    if (data.companyId) formData.append("companyId", data.companyId);
    if (data.recordedAt) formData.append("recordedAt", data.recordedAt.toISOString());
    if (data.source) formData.append("source", data.source);
    if (data.transcript) formData.append("transcript", data.transcript);
    if (data.participants) formData.append("participants", JSON.stringify(data.participants));
    if (data.tags) formData.append("tags", JSON.stringify(data.tags));

    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings`,
        {
            method: "POST",
            credentials: "include",
            body: formData,
        }
    );

    if (!response.ok) {
        throw new Error("Failed to upload call recording");
    }

    return response.json();
}

/**
 * Update a call recording
 */
export async function updateCallRecording(
    workspaceId: string,
    id: string,
    updates: Partial<CallRecording>
): Promise<{ success: boolean; data: CallRecording; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to update call recording");
    }

    return response.json();
}

/**
 * Delete a call recording
 */
export async function deleteCallRecording(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to delete call recording");
    }

    return response.json();
}

/**
 * Trigger transcription for a call recording
 */
export async function transcribeCallRecording(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; message: string; data: any }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/call-recordings/${id}/transcribe`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to trigger transcription");
    }

    return response.json();
}
