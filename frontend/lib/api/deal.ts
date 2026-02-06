import { axiosInstance } from "../axios";

// Types
export interface Deal {
    _id: string;
    workspaceId: string;
    userId: string;
    name: string;
    description?: string;
    companyId?: string | { _id: string; name: string; website?: string };
    contacts?: string[] | Array<{ _id: string; firstName: string; lastName: string; email?: string }>;
    assignedTo?: string | { _id: string; name: string; email?: string };
    stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
    stageChangedAt?: string;
    value: number;
    currency: string;
    expectedRevenue?: number;
    probability?: number;
    expectedCloseDate?: string;
    closeDate?: string;
    icpFit?: "excellent" | "good" | "medium" | "low";
    connectionStrength?: "very_strong" | "strong" | "good" | "weak";
    source?: string;
    lostReason?: string;
    wonReason?: string;
    tags?: string[];
    notes?: string;
    customFields?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDealData {
    name: string;
    description?: string;
    companyId?: string;
    contacts?: string[];
    assignedTo?: string;
    stage?: "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
    value?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: string;
    icpFit?: "excellent" | "good" | "medium" | "low";
    connectionStrength?: "very_strong" | "strong" | "good" | "weak";
    source?: string;
    tags?: string[];
    notes?: string;
    customFields?: Record<string, any>;
}

export interface UpdateDealData extends Partial<CreateDealData> {
    closeDate?: string;
    lostReason?: string;
    wonReason?: string;
}

export interface DealQueryParams {
    stage?: string;
    companyId?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface DealResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface DealsSummary {
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    totalValue: number;
    wonValue: number;
}

// API Functions

/**
 * Get all deals for a workspace
 */
export const getDeals = async (
    workspaceId: string,
    params?: DealQueryParams
): Promise<DealResponse<{ deals: Deal[]; pagination: { page: number; limit: number; total: number; pages: number } }>> => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.stage) queryParams.append("stage", params.stage);
        if (params?.companyId) queryParams.append("companyId", params.companyId);
        if (params?.assignedTo) queryParams.append("assignedTo", params.assignedTo);
        if (params?.search) queryParams.append("search", params.search);
        if (params?.page) queryParams.append("page", String(params.page));
        if (params?.limit) queryParams.append("limit", String(params.limit));
        if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
        if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

        const url = `/workspaces/${workspaceId}/deals?${queryParams.toString()}`;
        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to fetch deals",
        };
    }
};

/**
 * Get a single deal
 */
export const getDeal = async (
    workspaceId: string,
    dealId: string
): Promise<DealResponse<{ deal: Deal }>> => {
    try {
        const response = await axiosInstance.get(`/workspaces/${workspaceId}/deals/${dealId}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to fetch deal",
        };
    }
};

/**
 * Create a new deal
 */
export const createDeal = async (
    workspaceId: string,
    data: CreateDealData
): Promise<DealResponse<{ deal: Deal }>> => {
    try {
        const response = await axiosInstance.post(`/workspaces/${workspaceId}/deals`, data);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to create deal",
        };
    }
};

/**
 * Update a deal
 */
export const updateDeal = async (
    workspaceId: string,
    dealId: string,
    data: UpdateDealData
): Promise<DealResponse<{ deal: Deal }>> => {
    try {
        const response = await axiosInstance.patch(`/workspaces/${workspaceId}/deals/${dealId}`, data);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to update deal",
        };
    }
};

/**
 * Delete a deal
 */
export const deleteDeal = async (
    workspaceId: string,
    dealId: string
): Promise<DealResponse> => {
    try {
        const response = await axiosInstance.delete(`/workspaces/${workspaceId}/deals/${dealId}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to delete deal",
        };
    }
};

/**
 * Get deals associated with a company
 */
export const getCompanyDeals = async (
    workspaceId: string,
    companyId: string
): Promise<DealResponse<{ deals: Deal[]; summary: DealsSummary }>> => {
    try {
        const response = await axiosInstance.get(`/workspaces/${workspaceId}/companies/${companyId}/deals`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || "Failed to fetch company deals",
        };
    }
};

/**
 * Update deal stage (convenience function)
 */
export const updateDealStage = async (
    workspaceId: string,
    dealId: string,
    stage: Deal["stage"],
    reason?: string
): Promise<DealResponse<{ deal: Deal }>> => {
    const data: UpdateDealData = { stage };
    if (stage === "closed_lost" && reason) {
        data.lostReason = reason;
    } else if (stage === "closed_won" && reason) {
        data.wonReason = reason;
    }
    return updateDeal(workspaceId, dealId, data);
};
