/**
 * Form API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface FormField {
    id: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'url';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    mapToField?: 'firstName' | 'lastName' | 'email' | 'phone' | 'company' | 'jobTitle' | 'website' | 'custom';
    customFieldName?: string;
}

export interface Form {
    _id: string;
    workspaceId: string;
    userId: string;
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';
    fields: FormField[];
    settings: {
        submitButtonText: string;
        successMessage: string;
        redirectUrl?: string;
        notificationEmail?: string;
        autoCreateContact: boolean;
        theme: 'light' | 'dark' | 'custom';
        primaryColor?: string;
        backgroundColor?: string;
        allowMultipleSubmissions: boolean;
        requireCaptcha: boolean;
        trackingEnabled: boolean;
    };
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
        lastSubmittedAt?: Date;
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
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
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
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "GET",
            credentials: "include",
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
 * Create a new form
 */
export async function createForm(
    workspaceId: string,
    data: Partial<Form>
): Promise<{ success: boolean; data: Form; message: string }> {
    const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
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
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
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
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
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
        `${API_BASE_URL}/api/workspaces/${workspaceId}/forms/${formId}/submissions?${queryParams}`,
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
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
        `${API_BASE_URL}/api/public/forms/${formId}/submit`,
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
        `${API_BASE_URL}/api/public/forms/${formId}`,
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
