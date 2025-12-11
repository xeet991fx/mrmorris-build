/**
 * Workflow API Client
 * Handles all workflow-related API calls
 */

import { axiosInstance } from "../axios";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WorkflowStep {
    id: string;
    type: "trigger" | "action" | "condition" | "delay";
    name: string;
    config: Record<string, any>;
    nextStepIds: string[];
    position?: { x: number; y: number };
}

export interface Workflow {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    status: "draft" | "active" | "paused";
    triggerType: string;
    triggerEntityType: "contact" | "deal" | "company";
    steps: WorkflowStep[];
    allowReenrollment?: boolean;
    goalCriteria?: Record<string, any>;
    stats?: {
        totalEnrolled: number;
        currentlyActive: number;
        completed: number;
        failed: number;
    };
    lastActivatedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowEnrollment {
    _id: string;
    workflowId: string;
    workspaceId: string;
    entityType: "contact" | "deal" | "company";
    entityId: string;
    status: "active" | "paused" | "completed" | "failed";
    currentStepId?: string;
    nextExecutionTime?: string;
    enrolledAt: string;
    completedAt?: string;
    enrolledBy?: string;
    enrollmentSource: "trigger" | "manual" | "api";
    stepsExecuted: StepExecution[];
    errorCount?: number;
    lastError?: string;
}

export interface StepExecution {
    stepId: string;
    stepName: string;
    stepType: string;
    startedAt: string;
    completedAt?: string;
    status: "completed" | "pending" | "failed";
    result?: Record<string, any>;
    error?: string;
}

export interface CreateWorkflowData {
    name: string;
    description?: string;
    triggerType: string;
    triggerEntityType: "contact" | "deal" | "company";
    triggerConfig?: Record<string, any>;
    steps?: Omit<WorkflowStep, "id">[];
    allowReenrollment?: boolean;
    goalCriteria?: Record<string, any>;
}

export interface UpdateWorkflowData {
    name?: string;
    description?: string;
    steps?: WorkflowStep[];
    allowReenrollment?: boolean;
    goalCriteria?: Record<string, any>;
}

export interface WorkflowResponse {
    success: boolean;
    message?: string;
    data?: {
        workflow: Workflow;
    };
    error?: string;
}

export interface WorkflowsResponse {
    success: boolean;
    message?: string;
    data?: {
        workflows: Workflow[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
    error?: string;
}

export interface EnrollmentResponse {
    success: boolean;
    message?: string;
    data?: {
        enrollment: WorkflowEnrollment;
    };
    error?: string;
}

export interface EnrollmentsResponse {
    success: boolean;
    message?: string;
    data?: {
        enrollments: WorkflowEnrollment[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
    error?: string;
}

export interface WorkflowAnalytics {
    overview: {
        totalEnrolled: number;
        currentlyActive: number;
        completed: number;
        failed: number;
        completionRate: number;
        avgTimeToComplete: number;
    };
    funnel: Array<{
        stepId: string;
        stepName: string;
        stepType: string;
        entered: number;
        completed: number;
        failed: number;
        dropOff: number;
    }>;
    timeline: Array<{
        date: string;
        enrolled: number;
        completed: number;
        failed: number;
    }>;
}

export interface TestWorkflowResult {
    workflowName: string;
    entityName: string;
    dryRun: boolean;
    fastForward: boolean;
    steps: Array<{
        stepId: string;
        stepName: string;
        stepType: string;
        status: string;
        message: string;
        startedAt: string;
        completedAt?: string;
        duration?: number;
        simulated?: boolean;
        conditionResult?: boolean;
        delaySkipped?: number;
        error?: string;
    }>;
    startedAt: string;
    completedAt?: string;
    success: boolean;
    totalDuration: number;
    productionDuration: number;
}

// ============================================
// WORKFLOW CRUD
// ============================================

/**
 * Create a new workflow
 */
export const createWorkflow = async (
    workspaceId: string,
    data: CreateWorkflowData
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows`,
        data
    );
    return response.data;
};

/**
 * Get all workflows for a workspace
 */
export const getWorkflows = async (
    workspaceId: string,
    params?: {
        status?: string;
        triggerEntityType?: string;
        search?: string;
        page?: number;
        limit?: number;
    }
): Promise<WorkflowsResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/workflows`,
        { params }
    );
    return response.data;
};

/**
 * Get a single workflow by ID
 */
export const getWorkflow = async (
    workspaceId: string,
    workflowId: string
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/workflows/${workflowId}`
    );
    return response.data;
};

/**
 * Update a workflow
 */
export const updateWorkflow = async (
    workspaceId: string,
    workflowId: string,
    data: UpdateWorkflowData
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.put(
        `/workspaces/${workspaceId}/workflows/${workflowId}`,
        data
    );
    return response.data;
};

/**
 * Delete a workflow
 */
export const deleteWorkflow = async (
    workspaceId: string,
    workflowId: string
): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(
        `/workspaces/${workspaceId}/workflows/${workflowId}`
    );
    return response.data;
};

// ============================================
// WORKFLOW STATUS
// ============================================

/**
 * Activate a workflow
 */
export const activateWorkflow = async (
    workspaceId: string,
    workflowId: string
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/activate`
    );
    return response.data;
};

/**
 * Pause a workflow
 */
export const pauseWorkflow = async (
    workspaceId: string,
    workflowId: string
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/pause`
    );
    return response.data;
};

/**
 * Clone/duplicate a workflow
 */
export const cloneWorkflow = async (
    workspaceId: string,
    workflowId: string
): Promise<WorkflowResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/clone`
    );
    return response.data;
};

// ============================================
// WORKFLOW TESTING
// ============================================

/**
 * Test a workflow with a specific entity
 */
export const testWorkflow = async (
    workspaceId: string,
    workflowId: string,
    data: {
        entityId: string;
        entityType: "contact" | "deal" | "company";
        dryRun?: boolean;
        fastForward?: boolean;
    }
): Promise<{ success: boolean; message?: string; data?: TestWorkflowResult; error?: string }> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/test`,
        data
    );
    return response.data;
};

// ============================================
// ENROLLMENT
// ============================================

/**
 * Enroll an entity in a workflow
 */
export const enrollInWorkflow = async (
    workspaceId: string,
    workflowId: string,
    data: {
        entityType: "contact" | "deal" | "company";
        entityId: string;
    }
): Promise<EnrollmentResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enroll`,
        data
    );
    return response.data;
};

/**
 * Bulk enroll entities in a workflow
 */
export const bulkEnrollInWorkflow = async (
    workspaceId: string,
    workflowId: string,
    entityIds: string[]
): Promise<{
    success: boolean;
    message?: string;
    data?: {
        results: {
            enrolled: number;
            skipped: number;
            failed: number;
            errors: string[];
        };
    };
    error?: string;
}> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enroll-bulk`,
        { entityIds }
    );
    return response.data;
};

/**
 * Get all enrollments for a workflow
 */
export const getWorkflowEnrollments = async (
    workspaceId: string,
    workflowId: string,
    params?: {
        status?: string;
        page?: number;
        limit?: number;
    }
): Promise<EnrollmentsResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enrollments`,
        { params }
    );
    return response.data;
};

/**
 * Get all workflow enrollments for a specific entity
 */
export const getEntityWorkflows = async (
    workspaceId: string,
    entityType: "contact" | "deal" | "company",
    entityId: string
): Promise<EnrollmentsResponse> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/entity/${entityType}/${entityId}/workflows`
    );
    return response.data;
};

/**
 * Retry a failed enrollment
 */
export const retryEnrollment = async (
    workspaceId: string,
    workflowId: string,
    enrollmentId: string
): Promise<EnrollmentResponse> => {
    const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/workflows/${workflowId}/enrollments/${enrollmentId}/retry`
    );
    return response.data;
};

// ============================================
// ANALYTICS
// ============================================

/**
 * Get workflow analytics and funnel data
 */
export const getWorkflowAnalytics = async (
    workspaceId: string,
    workflowId: string
): Promise<{ success: boolean; data?: WorkflowAnalytics; error?: string }> => {
    const response = await axiosInstance.get(
        `/workspaces/${workspaceId}/workflows/${workflowId}/analytics`
    );
    return response.data;
};

// ============================================
// SCHEDULER (Admin)
// ============================================

/**
 * Get workflow scheduler status
 */
export const getSchedulerStatus = async (): Promise<{
    success: boolean;
    data?: {
        scheduler: {
            isRunning: boolean;
            lastRun?: string;
            nextRun?: string;
        };
        pendingEnrollments: number;
        serverTime: string;
        isVercel: boolean;
    };
    error?: string;
}> => {
    const response = await axiosInstance.get(`/workspaces/workflows/scheduler-status`);
    return response.data;
};

/**
 * Manually trigger workflow processing
 */
export const triggerWorkflowProcessing = async (): Promise<{
    success: boolean;
    message?: string;
    timestamp?: string;
    durationMs?: number;
    error?: string;
}> => {
    const response = await axiosInstance.post(`/workspaces/workflows/process`);
    return response.data;
};
