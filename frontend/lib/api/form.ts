/**
 * Enhanced Form API Client - HubSpot Level
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Helper to get auth token
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

// Advanced field types
export type FieldType =
    | 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio'
    | 'number' | 'date' | 'datetime' | 'time' | 'url' | 'file'
    | 'multiselect' | 'country' | 'state' | 'hidden' | 'richtext'
    | 'rating' | 'signature' | 'gdpr_consent' | 'marketing_consent'
    | 'divider' | 'html' | 'calculation';

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
        customValidation?: string;
    };
    mapToField?: 'firstName' | 'lastName' | 'email' | 'phone' | 'company' |
    'jobTitle' | 'website' | 'address' | 'city' | 'state' |
    'country' | 'zip' | 'industry' | 'revenue' | 'employees' | 'custom';
    customFieldName?: string;
    conditionalLogic?: {
        enabled: boolean;
        rules: Array<{
            fieldId: string;
            operator: 'equals' | 'notEquals' | 'contains' | 'notContains' |
            'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan';
            value: string;
        }>;
        logicType: 'AND' | 'OR';
    };
    progressive?: {
        enabled: boolean;
        hideIfKnown: boolean;
        priority: number;
    };
    width?: 'full' | 'half' | 'third';
    cssClass?: string;
    calculation?: {
        formula: string;
        format?: 'number' | 'currency' | 'percentage';
    };
    fileSettings?: {
        maxSize: number;
        allowedTypes: string[];
        multiple: boolean;
    };
    gdprSettings?: {
        consentText: string;
        privacyPolicyUrl?: string;
        required: boolean;
    };
}

export interface FormStep {
    id: string;
    name: string;
    description?: string;
    fields: string[];
    conditionalLogic?: {
        enabled: boolean;
        showIf: {
            fieldId: string;
            operator: string;
            value: string;
        };
    };
}

export interface LeadRoutingRule {
    id: string;
    name: string;
    enabled: boolean;
    priority: number;
    conditions: Array<{
        fieldId: string;
        operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
        value: string;
    }>;
    action: {
        type: 'assign' | 'tag' | 'notify';
        assignTo?: string;
        tags?: string[];
        notifyEmails?: string[];
    };
}

export interface FollowUpAction {
    id: string;
    type: 'email' | 'task' | 'webhook' | 'slack' | 'salesforce';
    enabled: boolean;
    emailConfig?: {
        to: string;
        from?: string;
        subject: string;
        body: string;
        cc?: string[];
        bcc?: string[];
    };
    taskConfig?: {
        assignTo?: string;
        title: string;
        description?: string;
        dueInDays?: number;
        priority: 'low' | 'medium' | 'high';
    };
    webhookConfig?: {
        url: string;
        method: 'GET' | 'POST' | 'PUT';
        headers?: Record<string, string>;
        body?: string;
    };
    triggerConditions?: Array<{
        fieldId: string;
        operator: string;
        value: string;
    }>;
}

export interface FormVariant {
    id: string;
    name: string;
    traffic: number;
    fields: FormField[];
    settings: {
        submitButtonText: string;
        successMessage: string;
        primaryColor?: string;
    };
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
    };
}

export interface Form {
    _id: string;
    workspaceId: string;
    userId: string;
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';
    formType: 'single_step' | 'multi_step';
    fields: FormField[];
    steps?: FormStep[];
    progressiveProfilingEnabled: boolean;
    maxProgressiveFields?: number;
    settings: {
        submitButtonText: string;
        successMessage: string;
        redirectUrl?: string;
        notificationEmails?: string[];
        autoCreateContact: boolean;
        doubleOptIn?: {
            enabled: boolean;
            confirmationEmail?: {
                subject: string;
                body: string;
            };
        };
        theme: 'light' | 'dark' | 'custom';
        primaryColor?: string;
        backgroundColor?: string;
        fontFamily?: string;
        customCss?: string;
        layout?: 'vertical' | 'horizontal' | 'two_column';
        labelPosition?: 'top' | 'left' | 'inside';
        fieldSpacing?: 'compact' | 'normal' | 'comfortable';
        allowMultipleSubmissions: boolean;
        requireCaptcha: boolean;
        trackingEnabled: boolean;
        cookieTracking: boolean;
        maxSubmissions?: number;
        maxSubmissionsPerUser?: number;
        maxSubmissionsPerDay?: number;
        schedule?: {
            enabled: boolean;
            startDate?: Date;
            endDate?: Date;
            messageWhenClosed?: string;
        };
        gdpr?: {
            enabled: boolean;
            consentRequired: boolean;
            dataRetentionDays?: number;
            allowDataExport: boolean;
            allowDataDeletion: boolean;
        };
    };
    leadRouting?: {
        enabled: boolean;
        defaultAssignee?: string;
        rules: LeadRoutingRule[];
        roundRobinEnabled?: boolean;
        roundRobinUsers?: string[];
    };
    followUpActions: FollowUpAction[];
    abTesting?: {
        enabled: boolean;
        variants: FormVariant[];
    };
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
        averageTimeToComplete?: number;
        abandonmentRate?: number;
        lastSubmittedAt?: Date;
        fieldStats?: Array<{
            fieldId: string;
            completionRate: number;
            averageTime: number;
        }>;
    };
    integrations?: {
        zapier?: { enabled: boolean; webhookUrl?: string };
        salesforce?: { enabled: boolean; objectType?: string };
        hubspot?: { enabled: boolean; formId?: string };
        mailchimp?: { enabled: boolean; listId?: string };
        slack?: { enabled: boolean; webhookUrl?: string; channel?: string };
    };
    embedCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FormSubmission {
    _id: string;
    workspaceId: string;
    formId: string;
    contactId?: any;
    data: Record<string, any>;
    source: {
        url?: string;
        referrer?: string;
        userAgent?: string;
        ip?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
    };
    status: 'new' | 'contacted' | 'qualified' | 'spam' | 'archived';
    notes?: string;
    contactCreated: boolean;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get all forms
 */
export async function getForms(
    workspaceId: string,
    status?: string
): Promise<{ success: boolean; data: Form[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch forms");
    }

    return response.json();
}

/**
 * Get a specific form
 */
export async function getForm(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; data: Form }> {
    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch form");
    }

    return response.json();
}

/**
 * Create a new form
 */
export async function createForm(
    workspaceId: string,
    data: Partial<Form>
): Promise<{ success: boolean; data: Form; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms`,
        {
            method: "POST",
            credentials: "include",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to create form");
    }

    return response.json();
}

/**
 * Update a form
 */
export async function updateForm(
    workspaceId: string,
    id: string,
    data: Partial<Form>
): Promise<{ success: boolean; data: Form; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to update form");
    }

    return response.json();
}

/**
 * Delete a form
 */
export async function deleteForm(
    workspaceId: string,
    id: string
): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to delete form");
    }

    return response.json();
}

/**
 * Get form submissions
 */
export async function getFormSubmissions(
    workspaceId: string,
    formId: string,
    params?: { status?: string; limit?: number; offset?: number }
): Promise<{
    success: boolean;
    data: FormSubmission[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms/${formId}/submissions?${queryParams}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch submissions");
    }

    return response.json();
}

/**
 * Submit a form (public endpoint)
 */
export async function submitForm(
    formId: string,
    data: Record<string, any>,
    source?: {
        url?: string;
        referrer?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
    }
): Promise<{
    success: boolean;
    message: string;
    redirectUrl?: string;
    submissionId: string;
    contactId?: string;
}> {
    const response = await fetch(
        `${API_BASE_URL}/public/forms/${formId}/submit`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ data, source }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to submit form");
    }

    return response.json();
}

/**
 * Get public form (no auth required)
 */
export async function getPublicForm(
    formId: string
): Promise<{ success: boolean; data: Form }> {
    const response = await fetch(
        `${API_BASE_URL}/public/forms/${formId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch form");
    }

    return response.json();
}

/**
 * Form Analytics Interfaces
 */
export interface FieldAnalytics {
    fieldId: string;
    fieldLabel: string;
    completionRate: number;
    totalResponses: number;
    uniqueValues?: number;
    topValues?: Array<{ value: string; count: number }>;
}

export interface FormAnalytics {
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    averageTimeToComplete?: number;
    abandonmentRate: number;
    submissionsByDay: Array<{ date: string; count: number }>;
    fieldAnalytics: FieldAnalytics[];
    lastUpdated: Date;
}

/**
 * Get form analytics
 */
export async function getFormAnalytics(
    workspaceId: string,
    formId: string
): Promise<{ success: boolean; data: FormAnalytics }> {
    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forms/${formId}/analytics`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch form analytics");
    }

    return response.json();
}
