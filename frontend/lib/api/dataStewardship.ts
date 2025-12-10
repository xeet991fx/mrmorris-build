/**
 * Data Stewardship API Client
 * Handles contact verification and job change tracking
 */

import { axiosInstance } from "../axios";

export interface ContactVerificationStatus {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    jobTitle: string;
    employmentStatus: "active" | "left_company" | "unknown";
    lastVerifiedAt?: string;
    previousCompany?: string;
    previousJobTitle?: string;
    linkedContactId?: string;
}

export interface JobChangeRecord {
    oldContactId: string;
    newContactId: string;
    oldCompany: string;
    oldJobTitle: string;
    newCompany: string;
    newJobTitle: string;
    detectedAt: string;
}

export interface ScanResult {
    scanned: number;
    jobChangesDetected: number;
    errors: number;
    changes: JobChangeRecord[];
}

export interface VerificationStatsResponse {
    success: boolean;
    data?: {
        total: number;
        verified: number;
        stale: number;
        leftCompany: number;
        jobChangesThisMonth: number;
    };
    error?: string;
}

/**
 * Get contacts that need verification
 */
export const getStaleContacts = async (
    workspaceId: string,
    limit: number = 50
): Promise<{ success: boolean; contacts?: ContactVerificationStatus[]; error?: string }> => {
    try {
        const response = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
            params: {
                limit,
                sort: "lastVerifiedAt",
                order: "asc",
            },
        });

        // Transform to verification status format
        const contacts = (response.data.data?.contacts || response.data.contacts || []).map((c: any) => ({
            ...c,
            employmentStatus: c.employmentStatus || "unknown",
        }));

        return { success: true, contacts };
    } catch (err: any) {
        return { success: true, contacts: [] }; // Return empty on error
    }
};

/**
 * Get contacts marked as "left company"
 */
export const getLeftCompanyContacts = async (
    workspaceId: string
): Promise<{ success: boolean; contacts?: ContactVerificationStatus[]; error?: string }> => {
    try {
        const response = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
            params: {
                employmentStatus: "left_company",
            },
        });

        const contacts = response.data.data?.contacts || response.data.contacts || [];
        return { success: true, contacts };
    } catch (err: any) {
        return { success: true, contacts: [] }; // Return empty on error
    }
};

/**
 * Trigger manual verification for a contact
 */
export const verifyContact = async (
    contactId: string,
    workspaceId: string
): Promise<{ success: boolean; verified?: boolean; jobChanged?: boolean; error?: string }> => {
    try {
        const response = await axiosInstance.post(`/enrichment/contact/${contactId}`, {
            workspaceId,
        });
        return {
            success: response.data.success !== false,
            verified: true,
            jobChanged: false,
        };
    } catch (err: any) {
        // Extract the actual API error message
        const apiMessage = err.response?.data?.message;
        const errorMessage = apiMessage || err.message || "Verification failed - Apollo API may not be configured";
        return {
            success: false,
            error: errorMessage,
        };
    }
};

/**
 * Trigger workspace-wide scan
 */
export const scanWorkspace = async (
    workspaceId: string
): Promise<{ success: boolean; result?: ScanResult; error?: string }> => {
    try {
        // First, fetch contacts to get their IDs
        const contactsResponse = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
            params: { limit: 50 } // Limit to 50 per bulk request
        });

        const contacts = contactsResponse.data.data?.contacts || contactsResponse.data.contacts || [];

        if (contacts.length === 0) {
            return {
                success: true,
                result: { scanned: 0, jobChangesDetected: 0, errors: 0, changes: [] },
            };
        }

        const contactIds = contacts.map((c: any) => c._id);

        // Call bulk enrichment with contact IDs
        const response = await axiosInstance.post(`/enrichment/bulk`, {
            workspaceId,
            contactIds,
        });

        return {
            success: true,
            result: {
                scanned: response.data.summary?.total || contacts.length,
                jobChangesDetected: 0,
                errors: response.data.summary?.failed || 0,
                changes: [],
            },
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.response?.data?.message || err.message || "Scan failed",
        };
    }
};

/**
 * Get verification statistics
 */
export const getVerificationStats = async (
    workspaceId: string
): Promise<VerificationStatsResponse> => {
    try {
        // Get all contacts to calculate stats
        const response = await axiosInstance.get(`/workspaces/${workspaceId}/contacts`, {
            params: { limit: 500 }
        });

        const contacts = response.data.data?.contacts || response.data.contacts || [];
        const total = contacts.length;

        // Calculate stats from contacts
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let verified = 0;
        let stale = 0;
        let leftCompany = 0;

        contacts.forEach((contact: any) => {
            const lastVerified = contact.lastVerifiedAt ? new Date(contact.lastVerifiedAt) : null;
            const employmentStatus = contact.employmentStatus;

            if (employmentStatus === 'left_company') {
                leftCompany++;
            } else if (lastVerified && lastVerified > thirtyDaysAgo) {
                verified++;
            } else {
                stale++;
            }
        });

        return {
            success: true,
            data: {
                total,
                verified,
                stale: stale || total, // If no verification data, all are "stale"
                leftCompany,
                jobChangesThisMonth: 0,
            },
        };
    } catch (err: any) {
        return {
            success: true,
            data: {
                total: 0,
                verified: 0,
                stale: 0,
                leftCompany: 0,
                jobChangesThisMonth: 0,
            },
        };
    }
};

