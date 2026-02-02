/**
 * Integrations API Client
 * Story 5.1 - OAuth Authentication Flow
 *
 * Generic API client for managing all integrations (Gmail, LinkedIn, Slack, etc.)
 */

import { axiosInstance } from '../axios';

// Backend IntegrationCredential.type values
export type IntegrationType = 'gmail' | 'linkedin' | 'slack' | 'google_sheets' | 'calendar' | 'notion';
export type IntegrationStatus = 'Connected' | 'Expired' | 'Error' | 'Revoked';

export interface Integration {
    _id: string;
    workspaceId: string;
    type: IntegrationType;
    name: string;
    status: IntegrationStatus;
    profileInfo?: {
        email?: string;
        name?: string;
        avatarUrl?: string;
    };
    scopes?: string[];
    expiresAt?: string;
    lastUsed?: string;
    isValid: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get all integrations for a workspace
 */
export async function getIntegrations(workspaceId: string) {
    try {
        const response = await axiosInstance.get(
            `/integrations?workspaceId=${workspaceId}`
        );
        return {
            success: true,
            data: { integrations: response.data.integrations || [] }
        };
    } catch (error: any) {
        console.error('Get integrations error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            data: { integrations: [] }
        };
    }
}

/**
 * Get OAuth authorization URL for a provider
 */
export async function connectIntegration(workspaceId: string, provider: 'gmail' | 'linkedin' | 'google-calendar') {
    try {
        const response = await axiosInstance.get(
            `/auth/oauth/${provider}/authorize?workspaceId=${workspaceId}`
        );
        return {
            success: true,
            data: { authUrl: response.data.url }
        };
    } catch (error: any) {
        console.error(`Get ${provider} connect URL error:`, error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(workspaceId: string, credentialId: string) {
    try {
        const response = await axiosInstance.delete(
            `/integrations/${credentialId}?workspaceId=${workspaceId}`
        );
        return {
            success: true,
            data: response.data
        };
    } catch (error: any) {
        console.error('Disconnect integration error:', error);
        return {
            success: false,
            error: error.response?.data?.error || error.message,
        };
    }
}
