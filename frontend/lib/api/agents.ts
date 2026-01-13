import axios from '../axios';
import { CreateAgentInput, CreateAgentResponse, GetAgentResponse, ListAgentsResponse } from '@/types/agent';

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
