import { axiosInstance } from "../axios";

// Workspace type definitions
export interface Workspace {
  _id: string;
  userId: string;
  name: string;
  onboardingCompleted: boolean;
  onboardingData?: OnboardingData;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingData {
  business?: {
    name?: string;
    description?: string;
    product?: string;
    problem?: string;
    audience?: string;
    region?: string;
    stage?: "Idea" | "Pre-launch" | "Launched but no revenue" | "Generating revenue" | "Scaling";
  };
  goals?: {
    primary?: "Get early users / signups" | "Generate leads or demo calls" | "Drive website traffic" | "Increase sales" | "Build brand awareness";
    budget?: number;
    timeline?: "Within 2 weeks" | "Within 1 month" | "Long-term brand building";
  };
  channels?: {
    preferred?: string[];
    tools?: string[];
    past_experience?: "Yes, but results were poor" | "Yes, some success" | "No, starting fresh";
  };
  brand?: {
    tone?: "Professional" | "Friendly" | "Bold" | "Educational" | "Fun / Quirky" | "Other";
    perception?: string;
    unique_value?: string;
  };
  offer?: {
    offer_type?: "Free trial" | "Free demo" | "Free resource / lead magnet" | "Direct purchase only";
    cta?: string;
    tracking_setup?: boolean;
  };
  competition?: {
    competitors?: string[];
    inspiration?: string[];
  };
  advanced?: {
    uploads?: string[];
    business_type?: "B2B" | "B2C" | "Both";
    automation_level?: "Fully automated" | "Notify before changes" | "Ask every time";
  };
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

/**
 * Save onboarding data for a workspace
 */
export const saveWorkspaceOnboarding = async (
  id: string,
  data: OnboardingData,
  complete?: boolean
): Promise<WorkspaceResponse> => {
  const url = complete
    ? `/projects/${id}/onboarding?complete=true`
    : `/projects/${id}/onboarding`;
  const response = await axiosInstance.patch(url, data);
  // Transform response to use workspace terminology
  if (response.data.data?.project) {
    response.data.data.workspace = response.data.data.project;
    delete response.data.data.project;
  }
  return response.data;
};
