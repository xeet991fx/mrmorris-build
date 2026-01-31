/**
 * Email Integration API Client
 */

import { axiosInstance } from '../axios';

export interface EmailIntegration {
    _id: string;
    provider: 'gmail' | 'outlook';
    email: string;
    isActive: boolean;
    status?: 'Connected' | 'Expired' | 'Error' | 'Revoked'; // Story 5.1: New status field from IntegrationCredential
    lastSyncAt?: string;
    syncError?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get Gmail OAuth URL to start connection
 * Story 5.1: Updated to use new OAuth routes
 */
export async function getGmailConnectUrl(workspaceId: string) {
    try {
        // Story 5.1: Use new OAuth authorize endpoint
        const response = await axiosInstance.get(
            `/auth/oauth/gmail/authorize?workspaceId=${workspaceId}`
        );
        return {
            success: true,
            data: { authUrl: response.data.url }
        };
    } catch (error: any) {
        console.error('Get Gmail connect URL error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Get LinkedIn OAuth URL to start connection
 * Story 5.1: New LinkedIn integration
 */
export async function getLinkedInConnectUrl(workspaceId: string) {
    try {
        const response = await axiosInstance.get(
            `/auth/oauth/linkedin/authorize?workspaceId=${workspaceId}`
        );
        return {
            success: true,
            data: { authUrl: response.data.url }
        };
    } catch (error: any) {
        console.error('Get LinkedIn connect URL error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Get all email integrations for a workspace
 */
export async function getEmailIntegrations(workspaceId: string) {
    try {
        const response = await axiosInstance.get(
            `/email/integrations?workspaceId=${workspaceId}`
        );
        return response.data;
    } catch (error: any) {
        console.error('Get email integrations error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Disconnect an email integration
 */
export async function disconnectEmailIntegration(integrationId: string) {
    try {
        const response = await axiosInstance.delete(
            `/email/${integrationId}/disconnect`
        );
        return response.data;
    } catch (error: any) {
        console.error('Disconnect email integration error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Trigger email sync for an integration
 */
export async function syncEmails(integrationId: string) {
    try {
        const response = await axiosInstance.post(
            `/email/${integrationId}/sync`
        );
        return response.data;
    } catch (error: any) {
        console.error('Sync emails error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Sync contacts from Gmail for an integration
 */
export async function syncContacts(integrationId: string, autoExtractFromEmails: boolean = false) {
    try {
        const response = await axiosInstance.post(
            `/email/${integrationId}/sync-contacts`,
            { autoExtractFromEmails }
        );
        return response.data;
    } catch (error: any) {
        console.error('Sync contacts error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Trigger contact sync for all active integrations
 */
export async function syncAllContacts() {
    try {
        const response = await axiosInstance.post(
            `/email/sync-all-contacts`
        );
        return response.data;
    } catch (error: any) {
        console.error('Sync all contacts error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}
