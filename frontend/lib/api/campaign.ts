/**
 * Campaign API Client
 * Handles all cold email campaign-related API calls
 */

import { axiosInstance } from "../axios";

export interface CampaignStep {
    id: string;
    type: "email";
    subject: string;
    body: string;
    delayDays: number;
    delayHours: number;
}

export interface Campaign {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused" | "completed";
    fromAccounts: Array<{
        _id: string;
        email: string;
        provider: string;
        status: string;
    }>;
    steps: CampaignStep[];
    totalEnrolled: number;
    activeEnrollments: number;
    dailyLimit: number;
    stats: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        bounced: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CampaignEnrollment {
    _id: string;
    campaignId: string;
    contactId: string;
    contact?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    status: "active" | "completed" | "paused" | "bounced" | "replied";
    currentStep: number;
    nextSendAt?: string;
    completedAt?: string;
    createdAt: string;
}

export interface CreateCampaignData {
    name: string;
    description?: string;
    fromAccounts: string[];
    dailyLimit?: number;
    steps: CampaignStep[];
}

export interface UpdateCampaignData {
    name?: string;
    description?: string;
    fromAccounts?: string[];
    dailyLimit?: number;
    steps?: CampaignStep[];
}

export interface CampaignResponse {
    success: boolean;
    message?: string;
    data?: {
        campaign: Campaign;
    };
    error?: string;
}

export interface CampaignsResponse {
    success: boolean;
    message?: string;
    campaigns?: Campaign[];
    data?: {
        campaigns: Campaign[];
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
 * Get all campaigns for a workspace
 */
export const getCampaigns = async (
    workspaceId: string,
    params?: { status?: string; page?: number; limit?: number }
): Promise<CampaignsResponse> => {
    const response = await axiosInstance.get(`/campaigns`, {
        params: { workspaceId, ...params },
    });
    return response.data;
};

/**
 * Get a single campaign by ID
 */
export const getCampaign = async (
    campaignId: string
): Promise<CampaignResponse> => {
    const response = await axiosInstance.get(`/campaigns/${campaignId}`);
    return response.data;
};

/**
 * Create a new campaign
 */
export const createCampaign = async (
    workspaceId: string,
    data: CreateCampaignData
): Promise<CampaignResponse> => {
    const response = await axiosInstance.post(`/campaigns`, {
        ...data,
        workspaceId,
    });
    return response.data;
};

/**
 * Update a campaign
 */
export const updateCampaign = async (
    campaignId: string,
    data: UpdateCampaignData
): Promise<CampaignResponse> => {
    const response = await axiosInstance.put(`/campaigns/${campaignId}`, data);
    return response.data;
};

/**
 * Delete a campaign
 */
export const deleteCampaign = async (
    campaignId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(`/campaigns/${campaignId}`);
    return response.data;
};

/**
 * Enroll contacts into a campaign
 */
export const enrollInCampaign = async (
    campaignId: string,
    contactIds: string[]
): Promise<{ success: boolean; enrolled: number; message: string }> => {
    const response = await axiosInstance.post(`/campaigns/${campaignId}/enroll`, {
        contactIds,
    });
    return response.data;
};

/**
 * Start a campaign
 */
export const startCampaign = async (
    campaignId: string
): Promise<CampaignResponse> => {
    const response = await axiosInstance.post(`/campaigns/${campaignId}/start`);
    return response.data;
};

/**
 * Pause a campaign
 */
export const pauseCampaign = async (
    campaignId: string
): Promise<CampaignResponse> => {
    const response = await axiosInstance.post(`/campaigns/${campaignId}/pause`);
    return response.data;
};

/**
 * Get campaign enrollments
 */
export const getCampaignEnrollments = async (
    campaignId: string,
    params?: { status?: string; page?: number; limit?: number }
): Promise<{
    success: boolean;
    data?: {
        enrollments: CampaignEnrollment[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}> => {
    const response = await axiosInstance.get(
        `/campaigns/${campaignId}/enrollments`,
        { params }
    );
    return response.data;
};
