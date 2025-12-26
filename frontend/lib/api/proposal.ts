import { axiosInstance } from "../axios";

export interface PricingItem {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
}

export interface Proposal {
    _id: string;
    workspaceId: string;
    userId: string;
    opportunityId: string | any;
    title: string;
    templateType: "standard" | "enterprise" | "startup" | "custom";
    status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
    executiveSummary?: string;
    problemStatement?: string;
    proposedSolution?: string;
    deliverables?: string[];
    timeline?: string;
    whyUs?: string;
    terms?: string;
    pricing: {
        items: PricingItem[];
        subtotal: number;
        discount?: number;
        discountType?: "percentage" | "fixed";
        tax?: number;
        total: number;
        currency: string;
        validUntil?: Date;
    };
    sentAt?: Date;
    sentTo?: string;
    viewedAt?: Date;
    viewCount?: number;
    respondedAt?: Date;
    pdfUrl?: string;
    pdfGeneratedAt?: Date;
    notes?: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProposalData {
    opportunityId: string;
    title: string;
    templateType?: "standard" | "enterprise" | "startup" | "custom";
    executiveSummary?: string;
    problemStatement?: string;
    proposedSolution?: string;
    deliverables?: string[];
    timeline?: string;
    whyUs?: string;
    terms?: string;
    pricing: {
        items: PricingItem[];
        discount?: number;
        discountType?: "percentage" | "fixed";
        tax?: number;
        currency?: string;
        validUntil?: Date;
    };
}

/**
 * Get all proposals for workspace
 */
export const getProposals = async (
    workspaceId: string,
    params?: {
        status?: string;
        opportunityId?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }
) => {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/proposals`, {
        params,
    });
    return response.data;
};

/**
 * Get proposal by ID
 */
export const getProposal = async (workspaceId: string, proposalId: string) => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/proposals/${proposalId}`
    );
    return response.data;
};

/**
 * Create new proposal
 */
export const createProposal = async (workspaceId: string, data: CreateProposalData) => {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/proposals`, data);
    return response.data;
};

/**
 * Update proposal
 */
export const updateProposal = async (
    workspaceId: string,
    proposalId: string,
    data: Partial<CreateProposalData>
) => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/proposals/${proposalId}`,
        data
    );
    return response.data;
};

/**
 * Mark proposal as sent
 */
export const sendProposal = async (
    workspaceId: string,
    proposalId: string,
    sentTo: string
) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/proposals/${proposalId}/send`,
        { sentTo }
    );
    return response.data;
};

/**
 * Track proposal view
 */
export const trackProposalView = async (workspaceId: string, proposalId: string) => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/proposals/${proposalId}/track-view`
    );
    return response.data;
};

/**
 * Delete proposal
 */
export const deleteProposal = async (workspaceId: string, proposalId: string) => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/proposals/${proposalId}`
    );
    return response.data;
};
