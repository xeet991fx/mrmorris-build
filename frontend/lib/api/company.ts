import { axiosInstance } from "../axios";

// Company type definitions
export interface Company {
  _id: string;
  workspaceId: string;
  userId: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  annualRevenue?: number;
  employeeCount?: number;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  status: "lead" | "prospect" | "customer" | "churned";
  tags?: string[];
  source?: string;
  assignedTo?: string;
  lastContactedAt?: string;
  notes?: string;
  customFields?: Record<string, any>;
  aiInsights?: {
    sentiment?: "positive" | "neutral" | "negative";
    healthScore?: number;
    recommendedActions?: string[];
    lastAnalyzedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  annualRevenue?: number;
  employeeCount?: number;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  status?: "lead" | "prospect" | "customer" | "churned";
  tags?: string[];
  source?: string;
  assignedTo?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export interface CompanyResponse {
  success: boolean;
  message?: string;
  data?: {
    company: Company;
  };
  error?: string;
}

export interface CompaniesResponse {
  success: boolean;
  message?: string;
  data?: {
    companies: Company[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "lead" | "prospect" | "customer" | "churned";
  assignedTo?: string;
  tags?: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
}

/**
 * Create a new company
 */
export const createCompany = async (
  workspaceId: string,
  data: CreateCompanyData
): Promise<CompanyResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/companies`,
    data
  );
  return response.data;
};

/**
 * Get all companies for a workspace
 */
export const getCompanies = async (
  workspaceId: string,
  params?: CompanyQueryParams
): Promise<CompaniesResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/companies`,
    { params }
  );
  return response.data;
};

/**
 * Get a specific company by ID
 */
export const getCompany = async (
  workspaceId: string,
  companyId: string
): Promise<CompanyResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/companies/${companyId}`
  );
  return response.data;
};

/**
 * Update a company
 */
export const updateCompany = async (
  workspaceId: string,
  companyId: string,
  data: UpdateCompanyData
): Promise<CompanyResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/companies/${companyId}`,
    data
  );
  return response.data;
};

/**
 * Delete a company
 */
export const deleteCompany = async (
  workspaceId: string,
  companyId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axiosInstance.delete(
    `/workspaces/${workspaceId}/companies/${companyId}`
  );
  return response.data;
};
