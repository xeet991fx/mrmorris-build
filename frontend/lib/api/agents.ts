import axios from '../axios';
import {
  CreateAgentInput,
  CreateAgentResponse,
  GetAgentResponse,
  ListAgentsResponse,
  ListAgentsParams,
  UpdateAgentInput,
  UpdateAgentResponse,
  DuplicateAgentInput,
  DuplicateAgentResponse,
  UpdateAgentStatusInput,
  UpdateAgentStatusResponse,
  DeleteAgentResponse,
  TestRunResponse,
  TestAgentInput,
  TestTargetOption,
  ValidateAgentResponse,
  CompareExecutionResponse,
  GetAgentAccuracyResponse
} from '@/types/agent';

/**
 * Create a new agent in the Agent Builder
 */
export const createAgent = async (
  workspaceId: string,
  data: CreateAgentInput
): Promise<CreateAgentResponse> => {
  const response = await axios.post(
    `/workspaces/${workspaceId}/agents`,
    data
  );
  return response.data;
};

/**
 * List agents in a workspace with filtering, sorting, search, and pagination
 * Story 1.11: Enhanced list endpoint with query parameters
 */
export const listAgents = async (
  workspaceId: string,
  params?: ListAgentsParams
): Promise<ListAgentsResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.set('status', params.status);
  if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/workspaces/${workspaceId}/agents${queryString ? `?${queryString}` : ''}`;

  const response = await axios.get(url);
  return response.data;
};

/**
 * Get a single agent by ID
 */
export const getAgent = async (
  workspaceId: string,
  agentId: string
): Promise<GetAgentResponse> => {
  const response = await axios.get(
    `/workspaces/${workspaceId}/agents/${agentId}`
  );
  return response.data;
};

/**
 * Update an existing agent (Story 1.2: triggers, name, goal)
 */
export const updateAgent = async (
  workspaceId: string,
  agentId: string,
  data: UpdateAgentInput
): Promise<UpdateAgentResponse> => {
  const response = await axios.put(
    `/workspaces/${workspaceId}/agents/${agentId}`,
    data
  );
  return response.data;
};

/**
 * Duplicate an existing agent (Story 1.8)
 */
export const duplicateAgent = async (
  workspaceId: string,
  agentId: string,
  data: DuplicateAgentInput
): Promise<DuplicateAgentResponse> => {
  const response = await axios.post(
    `/workspaces/${workspaceId}/agents/${agentId}/duplicate`,
    data
  );
  return response.data;
};

/**
 * Update agent status (Story 1.9)
 */
export const updateAgentStatus = async (
  workspaceId: string,
  agentId: string,
  data: UpdateAgentStatusInput
): Promise<UpdateAgentStatusResponse> => {
  try {
    const response = await axios.patch(
      `/workspaces/${workspaceId}/agents/${agentId}/status`,
      data
    );
    return response.data;
  } catch (error: any) {
    // Handle validation errors specially - attach validationErrors to error object
    if (error.response?.status === 400 && error.response?.data?.validationErrors) {
      const enhancedError: any = new Error(error.response.data.error || 'Validation failed');
      enhancedError.validationErrors = error.response.data.validationErrors;
      throw enhancedError;
    }
    throw error;
  }
};

/**
 * Delete an agent (Story 1.10)
 */
export const deleteAgent = async (
  workspaceId: string,
  agentId: string
): Promise<DeleteAgentResponse> => {
  const response = await axios.delete(
    `/workspaces/${workspaceId}/agents/${agentId}`
  );
  return response.data;
};

/**
 * Test agent in dry-run mode (Story 2.1, 2.2)
 * Simulates execution without performing real actions
 * Story 2.2: Accepts optional testTarget for variable resolution
 */
export const testAgent = async (
  workspaceId: string,
  agentId: string,
  data?: TestAgentInput
): Promise<TestRunResponse> => {
  const response = await axios.post(
    `/workspaces/${workspaceId}/agents/${agentId}/test`,
    data || {}
  );
  return response.data;
};

/**
 * Search contacts for test target selection (Story 2.2)
 */
export const searchTestTargetContacts = async (
  workspaceId: string,
  search?: string,
  limit: number = 20
): Promise<{ success: boolean; targets: TestTargetOption[]; hasMore: boolean }> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  queryParams.set('limit', limit.toString());

  const queryString = queryParams.toString();
  const response = await axios.get(
    `/workspaces/${workspaceId}/test-targets/contacts${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
};

/**
 * Search deals for test target selection (Story 2.2)
 */
export const searchTestTargetDeals = async (
  workspaceId: string,
  search?: string,
  limit: number = 20
): Promise<{ success: boolean; targets: TestTargetOption[]; hasMore: boolean }> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  queryParams.set('limit', limit.toString());

  const queryString = queryParams.toString();
  const response = await axios.get(
    `/workspaces/${workspaceId}/test-targets/deals${queryString ? `?${queryString}` : ''}`
  );
  return response.data;
};

/**
 * Validate agent instructions (Story 2.4)
 * Checks for template references, variable usage, syntax errors, integrations, and rate limits
 */
export const validateAgentInstructions = async (
  workspaceId: string,
  agentId: string
): Promise<ValidateAgentResponse> => {
  const response = await axios.post(
    `/workspaces/${workspaceId}/agents/${agentId}/validate`
  );
  return response.data;
};

/**
 * Compare live execution to linked test run (Story 2.7)
 * AC1, AC5: Returns side-by-side comparison with mismatch detection
 */
export const compareExecutionToTest = async (
  workspaceId: string,
  agentId: string,
  executionId: string
): Promise<CompareExecutionResponse> => {
  const response = await axios.get(
    `/workspaces/${workspaceId}/agents/${agentId}/executions/${executionId}/compare-to-test`
  );
  return response.data;
};

/**
 * Get agent test prediction accuracy metrics (Story 2.7)
 * AC6, AC8: Returns accuracy percentage with degradation alerts
 */
export const getAgentAccuracy = async (
  workspaceId: string,
  agentId: string
): Promise<GetAgentAccuracyResponse> => {
  const response = await axios.get(
    `/workspaces/${workspaceId}/agents/${agentId}/accuracy`
  );
  return response.data;
};

// =============================================================================
// Story 3.2: Manual Trigger Execution
// =============================================================================

export interface TriggerAgentInput {
  target?: {
    type: 'contact' | 'deal';
    id: string;
  };
  testRunId?: string;
}

export interface TriggerAgentResponse {
  success: boolean;
  message: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  result?: {
    success: boolean;
    summary?: object;
    error?: string;
  };
}

export interface TriggerAgentConflictError {
  success: false;
  error: string;
  currentExecutionId: string;
  startedAt: Date;
  status: string;
}

/**
 * Manually trigger agent execution (Story 3.2)
 * AC1: Immediate execution on "Run Now" button click
 * AC5: Returns 409 Conflict if agent is already running
 */
export const triggerAgent = async (
  workspaceId: string,
  agentId: string,
  data?: TriggerAgentInput
): Promise<TriggerAgentResponse> => {
  try {
    const response = await axios.post(
      `/workspaces/${workspaceId}/agents/${agentId}/trigger`,
      data || {}
    );
    return response.data;
  } catch (error: any) {
    // Story 3.2 AC5: Handle 409 Conflict (already running)
    if (error.response?.status === 409) {
      const conflictError: any = new Error(error.response.data.error || 'Agent is already running');
      conflictError.isConflict = true;
      conflictError.currentExecutionId = error.response.data.currentExecutionId;
      conflictError.startedAt = error.response.data.startedAt;
      conflictError.status = error.response.data.status;
      throw conflictError;
    }
    throw error;
  }
};

// =============================================================================
// Story 3.13: Execution History API
// =============================================================================

export interface ExecutionStep {
  stepNumber: number;
  action: string;
  result: {
    success: boolean;
    description: string;
    data?: any;
    error?: string; // Story 3.14 AC7: Error message for failed steps
  };
  executedAt: string;
  durationMs: number;
  creditsUsed: number;
}

export interface ExecutionSummary {
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  totalCreditsUsed: number;
  totalDurationMs: number;
  description?: string; // Story 3.13 AC2: Human-readable summary
}

export interface Execution {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';
  triggeredBy?: string;
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
  };
  startedAt: string;
  completedAt?: string;
  summary: ExecutionSummary;
  steps?: ExecutionStep[];
  duration?: number; // Virtual field from backend
}

export interface ListExecutionsResponse {
  success: boolean;
  executions: Execution[];
  count: number;
}

export interface GetExecutionResponse {
  success: boolean;
  execution: Execution;
}

/**
 * List executions for an agent (Story 3.13 + 3.14)
 * AC1: Display execution history with filtering and pagination
 * AC3: Filter by date range (Story 3.14)
 * AC4: Search executions (Story 3.14)
 */
export const listAgentExecutions = async (
  workspaceId: string,
  agentId: string,
  params?: {
    status?: string;
    limit?: number;
    skip?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
): Promise<ListExecutionsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set('status', params.status);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.skip) queryParams.set('skip', params.skip.toString());
  if (params?.startDate) queryParams.set('startDate', params.startDate);
  if (params?.endDate) queryParams.set('endDate', params.endDate);
  if (params?.search) queryParams.set('search', params.search);

  const queryString = queryParams.toString();
  const url = `/workspaces/${workspaceId}/agents/${agentId}/executions${queryString ? `?${queryString}` : ''}`;

  const response = await axios.get(url);
  return response.data;
};

/**
 * Get a specific execution by ID (Story 3.13)
 * AC6: Role-based data access (owners see full, members see redacted)
 */
export const getAgentExecution = async (
  workspaceId: string,
  agentId: string,
  executionId: string
): Promise<GetExecutionResponse> => {
  const response = await axios.get(
    `/workspaces/${workspaceId}/agents/${agentId}/executions/${executionId}`
  );
  return response.data;
};

/**
 * Retry a failed execution with same trigger context (Story 3.14 AC9)
 */
export const retryAgentExecution = async (
  workspaceId: string,
  agentId: string,
  executionId: string
): Promise<{ success: boolean; executionId: string; message: string }> => {
  const response = await axios.post(
    `/workspaces/${workspaceId}/agents/${agentId}/executions/${executionId}/retry`
  );
  return response.data;
};

/**
 * Export execution logs as JSON or CSV (Story 3.14 AC10)
 */
export const exportAgentExecutions = async (
  workspaceId: string,
  agentId: string,
  params?: {
    format: 'json' | 'csv';
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Blob> => {
  const queryParams = new URLSearchParams();
  if (params?.format) queryParams.set('format', params.format);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.startDate) queryParams.set('startDate', params.startDate);
  if (params?.endDate) queryParams.set('endDate', params.endDate);

  const queryString = queryParams.toString();
  const url = `/workspaces/${workspaceId}/agents/${agentId}/executions/export${queryString ? `?${queryString}` : ''}`;

  const response = await axios.get(url, {
    responseType: 'blob', // Important for file download
  });
  return response.data;
};
