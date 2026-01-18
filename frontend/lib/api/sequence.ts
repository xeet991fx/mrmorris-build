/**
 * Sequence API Client
 * Handles all email sequence-related API calls
 */

import { axiosInstance } from "../axios";

export interface SequenceStep {
    id: string;
    type: "email" | "delay" | "task" | "linkedin";
    subject?: string;
    body?: string;
    delayDays?: number;
    delayHours?: number;
    taskTitle?: string;
    taskDescription?: string;
    linkedinAction?: "connect" | "message" | "view_profile";
    emailTemplateId?: string;
}

export interface SequenceSettings {
    unenrollOnReply: boolean;
    sendOnWeekends: boolean;
    sendWindowStart: string; // e.g. "09:00"
    sendWindowEnd: string; // e.g. "17:00"
    timezone: string; // e.g. "America/New_York"
    fromAccountId?: string;
}

export interface Sequence {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused";
    steps: SequenceStep[];
    settings?: SequenceSettings;
    enrollmentCount: number;
    completedCount: number;
    stats?: {
        totalEnrolled: number;
        currentlyActive: number;
        completed: number;
        replied: number;
        sent: number;
        opened: number;
        clicked: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateSequenceData {
    name: string;
    description?: string;
    steps: SequenceStep[];
    settings?: Partial<SequenceSettings>;
}

export interface UpdateSequenceData {
    name?: string;
    description?: string;
    steps?: SequenceStep[];
    settings?: Partial<SequenceSettings>;
}

export interface SequenceResponse {
    success: boolean;
    message?: string;
    data?: {
        sequence: Sequence;
    };
    error?: string;
}

export interface SequencesResponse {
    success: boolean;
    message?: string;
    data?: {
        sequences: Sequence[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
    error?: string;
}

/**
 * Create a new sequence
 */
export const createSequence = async (
    workspaceId: string,
    data: CreateSequenceData
): Promise<SequenceResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences`,
        data
    );
    return response.data;
};

/**
 * Get all sequences for a workspace
 */
export const getSequences = async (
    workspaceId: string,
    params?: { status?: string; search?: string; page?: number; limit?: number }
): Promise<SequencesResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/sequences`,
        { params }
    );
    return response.data;
};

/**
 * Get a single sequence by ID
 */
export const getSequence = async (
    workspaceId: string,
    sequenceId: string
): Promise<SequenceResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/sequences/${sequenceId}`
    );
    return response.data;
};

/**
 * Update a sequence
 */
export const updateSequence = async (
    workspaceId: string,
    sequenceId: string,
    data: UpdateSequenceData
): Promise<SequenceResponse> => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/sequences/${sequenceId}`,
        data
    );
    return response.data;
};

/**
 * Delete a sequence
 */
export const deleteSequence = async (
    workspaceId: string,
    sequenceId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/sequences/${sequenceId}`
    );
    return response.data;
};

/**
 * Activate a sequence
 */
export const activateSequence = async (
    workspaceId: string,
    sequenceId: string
): Promise<SequenceResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/activate`
    );
    return response.data;
};

/**
 * Pause a sequence
 */
export const pauseSequence = async (
    workspaceId: string,
    sequenceId: string
): Promise<SequenceResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/pause`
    );
    return response.data;
};

/**
 * Enroll contacts in a sequence
 */
export const enrollInSequence = async (
    workspaceId: string,
    sequenceId: string,
    contactIds: string[]
): Promise<{ success: boolean; enrolled: number; message: string }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/enroll`,
        { contactIds }
    );
    return response.data;
};

/**
 * Unenroll contacts from a sequence
 */
export const unenrollFromSequence = async (
    workspaceId: string,
    sequenceId: string,
    contactIds: string[]
): Promise<{ success: boolean; unenrolled: number; message: string }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/unenroll`,
        { contactIds }
    );
    return response.data;
};

/**
 * Bulk enroll multiple contacts in a sequence
 */
export const bulkEnrollInSequence = async (
    workspaceId: string,
    sequenceId: string,
    contactIds: string[]
): Promise<{ success: boolean; data: { enrolled: number; skipped: number; errors?: string[] }; message: string }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/enroll-bulk`,
        { contactIds }
    );
    return response.data;
};

/**
 * Get enrollments for a sequence
 */
export const getSequenceEnrollments = async (
    workspaceId: string,
    sequenceId: string,
    status?: string
): Promise<{
    success: boolean;
    data: {
        enrollments: Array<{
            _id: string;
            contactId: {
                _id: string;
                firstName?: string;
                lastName?: string;
                email: string;
                company?: string;
            };
            currentStepIndex: number;
            status: 'active' | 'completed' | 'unenrolled' | 'replied' | 'bounced';
            enrolledAt: string;
            nextEmailAt?: string;
            lastEmailAt?: string;
            emailsSent: number;
            emailsOpened: number;
            emailsClicked: number;
        }>;
        stats: {
            totalEnrolled: number;
            currentlyActive: number;
            completed: number;
            replied: number;
            unenrolled: number;
        };
    };
}> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/sequences/${sequenceId}/enrollments`,
        { params: { status } }
    );
    return response.data;
};

/**
 * Manually trigger sequence processing (admin/testing)
 */
export const triggerSequenceProcessing = async (
    workspaceId: string
): Promise<{ success: boolean; data: { queued: number; skipped: number }; message: string }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/sequences/process`
    );
    return response.data;
};

