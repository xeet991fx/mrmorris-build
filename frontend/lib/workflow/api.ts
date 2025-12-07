import axios from 'axios';
import Cookies from 'js-cookie';
import {
    Workflow,
    WorkflowEnrollment,
    CreateWorkflowInput,
    UpdateWorkflowInput,
    EnrollEntityInput,
} from './types';

// ============================================
// API CLIENT SETUP
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ============================================
// API RESPONSE TYPES
// ============================================

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    error?: string;
    data?: T;
}

interface PaginatedResponse<T> {
    success: boolean;
    data: {
        workflows?: T[];
        enrollments?: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}

// ============================================
// WORKFLOW CRUD OPERATIONS
// ============================================

/**
 * Fetch all workflows for a workspace
 */
export async function fetchWorkflows(
    workspaceId: string,
    params?: {
        status?: string;
        triggerEntityType?: string;
        page?: number;
        limit?: number;
        search?: string;
    }
): Promise<{ workflows: Workflow[]; pagination: any }> {
    const response = await apiClient.get<PaginatedResponse<Workflow>>(
        `/workspaces/${workspaceId}/workflows`,
        { params }
    );
    return {
        workflows: response.data.data?.workflows || [],
        pagination: response.data.data?.pagination,
    };
}

/**
 * Fetch a single workflow by ID
 */
export async function fetchWorkflow(
    workspaceId: string,
    workflowId: string
): Promise<Workflow> {
    const response = await apiClient.get<ApiResponse<{ workflow: Workflow }>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}`
    );
    if (!response.data.data?.workflow) {
        throw new Error('Workflow not found');
    }
    return response.data.data.workflow;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
    workspaceId: string,
    data: CreateWorkflowInput
): Promise<Workflow> {
    const response = await apiClient.post<ApiResponse<{ workflow: Workflow }>>(
        `/workspaces/${workspaceId}/workflows`,
        data
    );
    if (!response.data.data?.workflow) {
        throw new Error(response.data.error || 'Failed to create workflow');
    }
    return response.data.data.workflow;
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
    workspaceId: string,
    workflowId: string,
    data: UpdateWorkflowInput
): Promise<Workflow> {
    const response = await apiClient.put<ApiResponse<{ workflow: Workflow }>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}`,
        data
    );
    if (!response.data.data?.workflow) {
        throw new Error(response.data.error || 'Failed to update workflow');
    }
    return response.data.data.workflow;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
    workspaceId: string,
    workflowId: string
): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/workflows/${workflowId}`);
}

// ============================================
// WORKFLOW STATUS OPERATIONS
// ============================================

/**
 * Activate a workflow
 */
export async function activateWorkflow(
    workspaceId: string,
    workflowId: string
): Promise<Workflow> {
    const response = await apiClient.post<ApiResponse<{ workflow: Workflow }>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/activate`
    );
    if (!response.data.data?.workflow) {
        throw new Error(response.data.error || 'Failed to activate workflow');
    }
    return response.data.data.workflow;
}

/**
 * Pause a workflow
 */
export async function pauseWorkflow(
    workspaceId: string,
    workflowId: string
): Promise<Workflow> {
    const response = await apiClient.post<ApiResponse<{ workflow: Workflow }>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/pause`
    );
    if (!response.data.data?.workflow) {
        throw new Error(response.data.error || 'Failed to pause workflow');
    }
    return response.data.data.workflow;
}

// ============================================
// ENROLLMENT OPERATIONS
// ============================================

/**
 * Manually enroll an entity in a workflow
 */
export async function enrollInWorkflow(
    workspaceId: string,
    workflowId: string,
    data: EnrollEntityInput
): Promise<WorkflowEnrollment> {
    const response = await apiClient.post<ApiResponse<{ enrollment: WorkflowEnrollment }>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enroll`,
        data
    );
    if (!response.data.data?.enrollment) {
        throw new Error(response.data.error || 'Failed to enroll in workflow');
    }
    return response.data.data.enrollment;
}

/**
 * Fetch enrollments for a workflow
 */
export async function fetchWorkflowEnrollments(
    workspaceId: string,
    workflowId: string,
    params?: {
        status?: string;
        page?: number;
        limit?: number;
    }
): Promise<{ enrollments: WorkflowEnrollment[]; pagination: any }> {
    const response = await apiClient.get<PaginatedResponse<WorkflowEnrollment>>(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enrollments`,
        { params }
    );
    return {
        enrollments: response.data.data?.enrollments || [],
        pagination: response.data.data?.pagination,
    };
}

/**
 * Fetch workflow enrollments for a specific entity
 */
export async function fetchEntityWorkflows(
    workspaceId: string,
    entityType: 'contact' | 'deal' | 'company',
    entityId: string
): Promise<WorkflowEnrollment[]> {
    const response = await apiClient.get<ApiResponse<{ enrollments: WorkflowEnrollment[] }>>(
        `/workspaces/${workspaceId}/entity/${entityType}/${entityId}/workflows`
    );
    return response.data.data?.enrollments || [];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique step ID
 */
export function generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default trigger step
 */
export function createTriggerStep(x = 250, y = 50): any {
    return {
        id: generateStepId(),
        type: 'trigger' as const,
        name: 'New Trigger',
        config: {
            triggerType: 'contact_created' as const,
        },
        position: { x, y },
        nextStepIds: [],
    };
}

/**
 * Create a default action step
 */
export function createActionStep(x = 250, y = 150): any {
    return {
        id: generateStepId(),
        type: 'action' as const,
        name: 'New Action',
        config: {
            actionType: 'update_field' as const,
        },
        position: { x, y },
        nextStepIds: [],
    };
}

/**
 * Create a default delay step
 */
export function createDelayStep(x = 250, y = 150): any {
    return {
        id: generateStepId(),
        type: 'delay' as const,
        name: 'Wait',
        config: {
            delayType: 'duration' as const,
            delayValue: 1,
            delayUnit: 'days' as const,
        },
        position: { x, y },
        nextStepIds: [],
    };
}
