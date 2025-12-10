/**
 * Sequence API Client
 * Handles all email sequence-related API calls
 */

import { axiosInstance } from "../axios";

export interface SequenceStep {
    id: string;
    type: "email" | "delay" | "task";
    subject?: string;
    body?: string;
    delayDays?: number;
    delayHours?: number;
    taskTitle?: string;
    taskDescription?: string;
}

export interface Sequence {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused";
    steps: SequenceStep[];
    enrollmentCount: number;
    completedCount: number;
    stats?: {
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateSequenceData {
    name: string;
    description?: string;
    steps: SequenceStep[];
}

export interface UpdateSequenceData {
    name?: string;
    description?: string;
    steps?: SequenceStep[];
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
