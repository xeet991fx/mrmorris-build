import { axiosInstance } from "../axios";

// Contact type definitions
export interface Contact {
  _id: string;
  workspaceId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  companyId?: string;
  jobTitle?: string;
  tags?: string[];
  source?: string;
  status?: "lead" | "prospect" | "customer" | "inactive";
  linkedin?: string;
  twitter?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  assignedTo?: string;
  lastContactedAt?: string;
  notes?: string;
  customFields?: Record<string, any>;
  aiInsights?: {
    sentiment?: "positive" | "neutral" | "negative";
    engagementScore?: number;
    recommendedActions?: string[];
    lastAnalyzedAt?: string;
  };
  leadScore?: {
    currentScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    previousScore: number;
    previousGrade: "A" | "B" | "C" | "D" | "F";
    lastActivityAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: "lead" | "prospect" | "customer" | "inactive";
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface UpdateContactData extends Partial<CreateContactData> {
  companyId?: string;
}

export interface ContactResponse {
  success: boolean;
  message?: string;
  data?: {
    contact: Contact;
  };
  error?: string;
}

export interface ContactsResponse {
  success: boolean;
  message?: string;
  data?: {
    contacts: Contact[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

export interface ContactQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "lead" | "prospect" | "customer" | "inactive";
  assignedTo?: string;
  tags?: string;
}

/**
 * Create a new contact
 */
export const createContact = async (
  workspaceId: string,
  data: CreateContactData
): Promise<ContactResponse> => {
  const response = await axiosInstance.post(
    `/workspaces/${workspaceId}/contacts`,
    data
  );
  return response.data;
};

/**
 * Get all contacts for a workspace
 */
export const getContacts = async (
  workspaceId: string,
  params?: ContactQueryParams
): Promise<ContactsResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/contacts`,
    { params }
  );
  return response.data;
};

/**
 * Get a specific contact by ID
 */
export const getContact = async (
  workspaceId: string,
  contactId: string
): Promise<ContactResponse> => {
  const response = await axiosInstance.get(
    `/workspaces/${workspaceId}/contacts/${contactId}`
  );
  return response.data;
};

/**
 * Update a contact
 */
export const updateContact = async (
  workspaceId: string,
  contactId: string,
  data: UpdateContactData
): Promise<ContactResponse> => {
  const response = await axiosInstance.patch(
    `/workspaces/${workspaceId}/contacts/${contactId}`,
    data
  );
  return response.data;
};

/**
 * Delete a contact
 */
export const deleteContact = async (
  workspaceId: string,
  contactId: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  const response = await axiosInstance.delete(
    `/workspaces/${workspaceId}/contacts/${contactId}`
  );
  return response.data;
};
