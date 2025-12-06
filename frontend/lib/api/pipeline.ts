import { axiosInstance } from "../axios";

// Type definitions
export interface Stage {
  _id: string;
  name: string;
  order: number;
  color: string;
}

export interface Pipeline {
  _id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  stages: Stage[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  stages: {
    name: string;
    color: string;
    order?: number;
  }[];
  isDefault?: boolean;
}

export interface UpdatePipelineData {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateStageData {
  name: string;
  color: string;
  order?: number;
}

export interface UpdateStageData {
  name?: string;
  color?: string;
  order?: number;
}

export interface PipelineResponse {
  success: boolean;
  message?: string;
  data?: {
    pipeline: Pipeline;
  };
  error?: string;
}

export interface PipelinesResponse {
  success: boolean;
  message?: string;
  data?: {
    pipelines: Pipeline[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface PipelineQueryParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

/**
 * Create a new pipeline
 */
export const createPipeline = async (
  workspaceId: string,
  data: CreatePipelineData
): Promise<PipelineResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/pipelines`,
    data
  );
  return response.data;
};

/**
 * Get all pipelines for a workspace
 */
export const getPipelines = async (
  workspaceId: string,
  params?: PipelineQueryParams
): Promise<PipelinesResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/pipelines`,
    {
      params: params
        ? {
            ...params,
            isActive: params.isActive !== undefined ? String(params.isActive) : undefined,
          }
        : undefined,
    }
  );
  return response.data;
};

/**
 * Get a specific pipeline by ID
 */
export const getPipeline = async (
  workspaceId: string,
  pipelineId: string
): Promise<PipelineResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}`
  );
  return response.data;
};

/**
 * Update a pipeline
 */
export const updatePipeline = async (
  workspaceId: string,
  pipelineId: string,
  data: UpdatePipelineData
): Promise<PipelineResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}`,
    data
  );
  return response.data;
};

/**
 * Delete (archive) a pipeline
 */
export const deletePipeline = async (
  workspaceId: string,
  pipelineId: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  const response = await axiosInstance.delete(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}`
  );
  return response.data;
};

/**
 * Add a stage to a pipeline
 */
export const addStage = async (
  workspaceId: string,
  pipelineId: string,
  data: CreateStageData
): Promise<PipelineResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}/stages`,
    data
  );
  return response.data;
};

/**
 * Update a stage
 */
export const updateStage = async (
  workspaceId: string,
  pipelineId: string,
  stageId: string,
  data: UpdateStageData
): Promise<PipelineResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}/stages/${stageId}`,
    data
  );
  return response.data;
};

/**
 * Delete a stage
 */
export const deleteStage = async (
  workspaceId: string,
  pipelineId: string,
  stageId: string
): Promise<PipelineResponse> => {
  const response = await axiosInstance.delete(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}/stages/${stageId}`
  );
  return response.data;
};

/**
 * Reorder stages in a pipeline
 */
export const reorderStages = async (
  workspaceId: string,
  pipelineId: string,
  stageOrder: string[]
): Promise<PipelineResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/pipelines/${pipelineId}/stages/reorder`,
    { stageOrder }
  );
  return response.data;
};
