/**
 * Email Template API Client
 * Handles all email template-related API calls
 */

import { axiosInstance } from "../axios";

export interface EmailTemplate {
    _id: string;
    workspaceId: string;
    name: string;
    subject: string;
    body: string;
    category?: string;
    tags?: string[];
    isDefault?: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEmailTemplateData {
    name: string;
    subject: string;
    body: string;
    category?: string;
    tags?: string[];
}

export interface UpdateEmailTemplateData {
    name?: string;
    subject?: string;
    body?: string;
    category?: string;
    tags?: string[];
}

export interface EmailTemplateResponse {
    success: boolean;
    message?: string;
    data?: {
        template: EmailTemplate;
    };
    error?: string;
}

export interface EmailTemplatesResponse {
    success: boolean;
    message?: string;
    data?: {
        templates: EmailTemplate[];
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
 * Create a new email template
 */
export const createEmailTemplate = async (
    workspaceId: string,
    data: CreateEmailTemplateData
): Promise<EmailTemplateResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/email-templates`,
        data
    );
    return response.data;
};

/**
 * Get all email templates for a workspace
 */
export const getEmailTemplates = async (
    workspaceId: string,
    params?: { category?: string; search?: string; page?: number; limit?: number }
): Promise<EmailTemplatesResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/email-templates`,
        { params }
    );
    return response.data;
};

/**
 * Get a single email template by ID
 */
export const getEmailTemplate = async (
    workspaceId: string,
    templateId: string
): Promise<EmailTemplateResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/email-templates/${templateId}`
    );
    return response.data;
};

/**
 * Update an email template
 */
export const updateEmailTemplate = async (
    workspaceId: string,
    templateId: string,
    data: UpdateEmailTemplateData
): Promise<EmailTemplateResponse> => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/email-templates/${templateId}`,
        data
    );
    return response.data;
};

/**
 * Delete an email template
 */
export const deleteEmailTemplate = async (
    workspaceId: string,
    templateId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/email-templates/${templateId}`
    );
    return response.data;
};

/**
 * Get default email templates
 */
export const getDefaultEmailTemplates = async (
    workspaceId: string
): Promise<EmailTemplatesResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/email-templates/defaults`
    );
    return response.data;
};

/**
 * Duplicate an email template
 */
export const duplicateEmailTemplate = async (
    workspaceId: string,
    templateId: string,
    newName?: string
): Promise<EmailTemplateResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/email-templates/${templateId}/duplicate`,
        { name: newName }
    );
    return response.data;
};

/**
 * Track template usage
 */
export const trackTemplateUsage = async (
    workspaceId: string,
    templateId: string
): Promise<{ success: boolean }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/email-templates/${templateId}/use`
    );
    return response.data;
};
