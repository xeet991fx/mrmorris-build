import axios from '../axios';
import {
  CreateAgentInput,
  CreateAgentResponse,
  GetAgentResponse,
  ListAgentsResponse,
  UpdateAgentInput,
  UpdateAgentResponse,
  DuplicateAgentInput,
  DuplicateAgentResponse,
  UpdateAgentStatusInput,
  UpdateAgentStatusResponse,
  DeleteAgentResponse
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
 * List all agents in a workspace
 */
export const listAgents = async (
  workspaceId: string
): Promise<ListAgentsResponse> => {
  const response = await axios.get(
    `/workspaces/${workspaceId}/agents`
  );
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
