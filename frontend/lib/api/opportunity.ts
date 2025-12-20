import { axiosInstance } from "../axios";

// Type definitions
export interface StageHistory {
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt?: string;
  duration?: number;
}

export interface Opportunity {
  _id: string;
  workspaceId: string;
  userId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  contactId?: string;
  companyId?: string;
  associatedContacts?: string[] | { _id: string; firstName: string; lastName: string; email?: string }[];
  description?: string;
  source?: string;
  status: "open" | "won" | "lost" | "abandoned";
  lostReason?: string;
  assignedTo?: string | { _id: string; name: string; email: string };
  tags?: string[];
  priority?: "low" | "medium" | "high";
  lastActivityAt?: string;
  stageHistory: StageHistory[];
  customFields?: Record<string, any>;
  aiInsights?: {
    dealScore?: number;
    recommendedActions?: string[];
    riskFactors?: string[];
    lastAnalyzedAt?: string;
  };
  // UI enhancement fields
  dealTemperature?: "hot" | "warm" | "cold";
  nextAction?: string;
  activityCount?: number;
  callCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityData {
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  contactId?: string;
  companyId?: string;
  description?: string;
  source?: string;
  status?: "open" | "won" | "lost" | "abandoned";
  lostReason?: string;
  assignedTo: string; // Required - Deal Owner
  associatedContacts?: string[];
  tags?: string[];
  priority?: "low" | "medium" | "high";
  customFields?: Record<string, any>;
}

export interface UpdateOpportunityData extends Partial<CreateOpportunityData> { }

export interface MoveOpportunityData {
  stageId: string;
  pipelineId?: string;
}

export interface OpportunityResponse {
  success: boolean;
  message?: string;
  data?: {
    opportunity: Opportunity;
  };
  error?: string;
}

export interface OpportunitiesResponse {
  success: boolean;
  message?: string;
  data?: {
    opportunities: Opportunity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface OpportunitiesByPipelineResponse {
  success: boolean;
  message?: string;
  data?: {
    pipeline: {
      _id: string;
      name: string;
      description?: string;
    };
    stages: {
      stage: {
        _id: string;
        name: string;
        order: number;
        color: string;
      };
      opportunities: Opportunity[];
    }[];
  };
  error?: string;
}

export interface OpportunityQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  pipelineId?: string;
  stageId?: string;
  status?: "open" | "won" | "lost" | "abandoned";
  assignedTo?: string;
  contactId?: string;
  companyId?: string;
  tags?: string;
  priority?: "low" | "medium" | "high";
}

/**
 * Create a new opportunity
 */
export const createOpportunity = async (
  workspaceId: string,
  data: CreateOpportunityData
): Promise<OpportunityResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/opportunities`,
    data
  );
  return response.data;
};

/**
 * Get all opportunities for a workspace
 */
export const getOpportunities = async (
  workspaceId: string,
  params?: OpportunityQueryParams
): Promise<OpportunitiesResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/opportunities`,
    { params }
  );
  return response.data;
};

/**
 * Get opportunities grouped by pipeline stages (for kanban view)
 */
export const getOpportunitiesByPipeline = async (
  workspaceId: string,
  pipelineId: string
): Promise<OpportunitiesByPipelineResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/opportunities/by-pipeline/${pipelineId}`
  );
  return response.data;
};

/**
 * Get a specific opportunity by ID
 */
export const getOpportunity = async (
  workspaceId: string,
  opportunityId: string
): Promise<OpportunityResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/opportunities/${opportunityId}`
  );
  return response.data;
};

/**
 * Update an opportunity
 */
export const updateOpportunity = async (
  workspaceId: string,
  opportunityId: string,
  data: UpdateOpportunityData
): Promise<OpportunityResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/opportunities/${opportunityId}`,
    data
  );
  return response.data;
};

/**
 * Move an opportunity to a different stage/pipeline
 */
export const moveOpportunity = async (
  workspaceId: string,
  opportunityId: string,
  data: MoveOpportunityData
): Promise<OpportunityResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/opportunities/${opportunityId}/move`,
    data
  );
  return response.data;
};

/**
 * Delete an opportunity
 */
export const deleteOpportunity = async (
  workspaceId: string,
  opportunityId: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  const response = await axiosInstance.delete(
    `/workspaces/${workspaceId}/opportunities/${opportunityId}`
  );
  return response.data;
};
