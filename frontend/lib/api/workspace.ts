import { axiosInstance } from "../axios";

// Workspace type definitions
export interface Workspace {
  _id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  name: string;
}

export interface UpdateWorkspaceData {
  name?: string;
}

export interface WorkspaceResponse {
  success: boolean;
  message?: string;
  data?: {
    workspace: Workspace;
  };
  error?: string;
}

export interface WorkspacesResponse {
  success: boolean;
  message?: string;
  data?: {
    workspaces: Workspace[];
  };
  error?: string;
}

/**
 * Create a new workspace
 */
export const createWorkspace = async (data: CreateWorkspaceData): Promise<WorkspaceResponse> => {
  const response = await axiosInstance.post("/projects", data);
  // Transform response to use workspace terminology
  if (response.data.data?.project) {
    response.data.data.workspace = response.data.data.project;
    delete response.data.data.project;
  }
  return response.data;
};

/**
 * Get all workspaces for the current user
 */
export const getWorkspaces = async (): Promise<WorkspacesResponse> => {
  const response = await axiosInstance.get("/projects");
  // Transform response to use workspace terminology
  if (response.data.data?.projects) {
    response.data.data.workspaces = response.data.data.projects;
    delete response.data.data.projects;
  }
  return response.data;
};

/**
 * Get a specific workspace by ID
 */
export const getWorkspace = async (id: string): Promise<WorkspaceResponse> => {
  const response = await axiosInstance.get(`/projects/${id}`);
  // Transform response to use workspace terminology
  if (response.data.data?.project) {
    response.data.data.workspace = response.data.data.project;
    delete response.data.data.project;
  }
  return response.data;
};

/**
 * Update a workspace
 */
export const updateWorkspace = async (
  id: string,
  data: UpdateWorkspaceData
): Promise<WorkspaceResponse> => {
  const response = await axiosInstance.patch(`/projects/${id}`, data);
  // Transform response to use workspace terminology
  if (response.data.data?.project) {
    response.data.data.workspace = response.data.data.project;
    delete response.data.data.project;
  }
  return response.data;
};

/**
 * Delete a workspace
 */
export const deleteWorkspace = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.delete(`/projects/${id}`);
  return response.data;
};
