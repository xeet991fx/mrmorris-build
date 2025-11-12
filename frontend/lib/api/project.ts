import { axiosInstance } from "../axios";

// Project type definitions
export interface Project {
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

export interface CreateProjectData {
  name: string;
}

export interface UpdateProjectData {
  name?: string;
}

export interface ProjectResponse {
  success: boolean;
  message?: string;
  data?: {
    project: Project;
  };
  error?: string;
}

export interface ProjectsResponse {
  success: boolean;
  message?: string;
  data?: {
    projects: Project[];
  };
  error?: string;
}

/**
 * Create a new project
 */
export const createProject = async (data: CreateProjectData): Promise<ProjectResponse> => {
  const response = await axiosInstance.post("/projects", data);
  return response.data;
};

/**
 * Get all projects for the current user
 */
export const getProjects = async (): Promise<ProjectsResponse> => {
  const response = await axiosInstance.get("/projects");
  return response.data;
};

/**
 * Get a specific project by ID
 */
export const getProject = async (id: string): Promise<ProjectResponse> => {
  const response = await axiosInstance.get(`/projects/${id}`);
  return response.data;
};

/**
 * Update a project
 */
export const updateProject = async (
  id: string,
  data: UpdateProjectData
): Promise<ProjectResponse> => {
  const response = await axiosInstance.patch(`/projects/${id}`, data);
  return response.data;
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.delete(`/projects/${id}`);
  return response.data;
};

/**
 * Save onboarding data for a project
 */
export const saveProjectOnboarding = async (
  id: string,
  data: OnboardingData,
  complete?: boolean
): Promise<ProjectResponse> => {
  const url = complete
    ? `/projects/${id}/onboarding?complete=true`
    : `/projects/${id}/onboarding`;
  const response = await axiosInstance.patch(url, data);
  return response.data;
};
