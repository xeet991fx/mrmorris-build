/**
 * Email Integration API Client
 */

import { axiosInstance } from '../axios';

export interface EmailIntegration {
    _id: string;
    provider: 'gmail' | 'outlook';
    email: string;
    isActive: boolean;
    lastSyncAt?: string;
    syncError?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get Gmail OAuth URL to start connection
 */
export async function getGmailConnectUrl(workspaceId: string) {
    try {
        const response = await axiosInstance.get(
            `/email/connect/gmail?workspaceId=${workspaceId}`
        );
        return response.data;
    } catch (error: any) {
        console.error('Get Gmail connect URL error:', error);
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
