/**
 * Lead Score API Client
 * Handles all lead scoring-related API calls
 */

import { axiosInstance } from "../axios";

export interface LeadScore {
    _id: string;
    contactId: string;
    workspaceId: string;
    currentScore: number;
    previousScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    previousGrade: "A" | "B" | "C" | "D" | "F";
    scoreHistory: Array<{
        score: number;
        reason: string;
        timestamp: string;
    }>;
    lastActivityAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ScoringRule {
    id: string;
    name: string;
    eventType: string;
    points: number;
    isActive: boolean;
}

export interface LeadScoreResponse {
    success: boolean;
    message?: string;
    data?: {
        leadScore: LeadScore;
    };
    error?: string;
}

export interface LeadScoresResponse {
    success: boolean;
    message?: string;
    data?: {
        leadScores: LeadScore[];
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
 * Get lead score for a contact
 */
export const getLeadScore = async (
    workspaceId: string,
    contactId: string
): Promise<LeadScoreResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/lead-scores/${contactId}`
    );
    return response.data;
};

/**
 * Update lead score for a contact
 */
export const updateLeadScore = async (
    workspaceId: string,
    contactId: string,
    data: { points?: number; eventType?: string; reason?: string }
): Promise<LeadScoreResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/lead-scores/${contactId}`,
        data
    );
    return response.data;
};

/**
 * Get top scored leads
 */
export const getTopLeads = async (
    workspaceId: string,
    limit: number = 10
): Promise<{
    success: boolean;
    data?: { leads: Array<LeadScore & { contact: any }> };
}> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/lead-scores/top`,
        { params: { limit } }
    );
    return response.data;
};

/**
 * Get lead score distribution by grade
 */
export const getScoreDistribution = async (
    workspaceId: string
): Promise<{
    success: boolean;
    data?: {
        distribution: { grade: string; count: number; percentage: number }[];
    };
}> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/lead-scores/distribution`
    );
    return response.data;
};

/**
 * Apply score decay to inactive leads
 */
export const applyScoreDecay = async (
    workspaceId: string,
    options?: { inactiveDays?: number; decayPercentage?: number }
): Promise<{
    success: boolean;
    affected: number;
    message: string;
}> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/lead-scores/decay`,
        options
    );
    return response.data;
};

/**
 * Get scoring rules
 */
export const getScoringRules = async (
    workspaceId: string
): Promise<{
    success: boolean;
    data?: { rules: ScoringRule[] };
}> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/lead-scores/rules`
    );
    return response.data;
};

/**
 * Get all lead scores with pagination
 */
export const getAllLeadScores = async (
    workspaceId: string,
    params?: { grade?: string; page?: number; limit?: number }
): Promise<LeadScoresResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/lead-scores`,
        { params }
    );
    return response.data;
};
