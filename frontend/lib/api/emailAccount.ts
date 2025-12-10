/**
 * Email Account API Client
 * Handles all email account-related API calls for cold email campaigns
 */

import { axiosInstance } from "../axios";

export interface EmailAccount {
    _id: string;
    workspaceId: string;
    email: string;
    provider: "smtp" | "gmail";
    status: "active" | "warming" | "paused" | "error";
    dailyLimit: number;
    sentToday: number;
    warmupEnabled: boolean;
    warmupProgress?: number;
    health?: {
        score: number;
        deliverability: number;
        reputation: string;
        lastChecked: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromName: string;
}

export interface EmailAccountResponse {
    success: boolean;
    message?: string;
    data?: {
        account: EmailAccount;
    };
    error?: string;
}

export interface EmailAccountsResponse {
    success: boolean;
    message?: string;
    data?: {
        accounts: EmailAccount[];
    };
    error?: string;
}

/**
 * Get all email accounts for a workspace
 */
export const getEmailAccounts = async (
    workspaceId: string
): Promise<EmailAccountsResponse> => {
    const response = await axiosInstance.get(`/email-accounts`, {
        params: { workspaceId },
    });
    return response.data;
};

/**
 * Connect an SMTP email account
 */
export const connectSMTPAccount = async (
    workspaceId: string,
    config: SMTPConfig
): Promise<EmailAccountResponse> => {
    const response = await axiosInstance.post(`/email-accounts/smtp`, {
        ...config,
        workspaceId,
    });
    return response.data;
};

/**
 * Connect a Gmail account
 */
export const connectGmailAccount = async (
    workspaceId: string,
    authCode: string
): Promise<EmailAccountResponse> => {
    const response = await axiosInstance.post(`/email-accounts/gmail`, {
        authCode,
        workspaceId,
    });
    return response.data;
};

/**
 * Update warmup settings for an account
 */
export const updateWarmupSettings = async (
    accountId: string,
    settings: {
        enabled: boolean;
        dailyIncrement?: number;
        targetDailyLimit?: number;
    }
): Promise<EmailAccountResponse> => {
    const response = await axiosInstance.put(
        `/email-accounts/${accountId}/warmup`,
        settings
    );
    return response.data;
};

/**
 * Get account health status
 */
export const getAccountHealth = async (
    accountId: string
): Promise<{
    success: boolean;
    data?: {
        score: number;
        deliverability: number;
        reputation: string;
        issues: string[];
        recommendations: string[];
    };
}> => {
    const response = await axiosInstance.get(
        `/email-accounts/${accountId}/health`
    );
    return response.data;
};

/**
 * Disconnect an email account
 */
export const disconnectEmailAccount = async (
    accountId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(`/email-accounts/${accountId}`);
    return response.data;
};
