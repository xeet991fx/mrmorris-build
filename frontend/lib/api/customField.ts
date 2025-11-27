import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface CreateCustomColumnData {
  fieldLabel: string;
  fieldType: "text" | "number" | "select";
  selectOptions?: string[];
  isRequired?: boolean;
  defaultValue?: any;
  order?: number;
}

export interface UpdateCustomColumnData {
  fieldLabel?: string;
  selectOptions?: string[];
  isRequired?: boolean;
  order?: number;
  isActive?: boolean;
}

export interface CustomColumnDefinition {
  _id: string;
  workspaceId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: "text" | "number" | "select";
  selectOptions?: string[];
  isRequired: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get all custom columns for a workspace
 */
export const getCustomColumns = async (
  workspaceId: string,
  includeInactive: boolean = false
): Promise<CustomFieldResponse<{ customFields: CustomColumnDefinition[]; count: number }>> => {
  try {
    const url = `${API_URL}/api/workspaces/${workspaceId}/custom-fields${
      includeInactive ? "?includeInactive=true" : ""
    }`;

    const response = await axios.get(url, {
      withCredentials: true,
    });

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to fetch custom columns",
    };
  }
};

/**
 * Get a single custom column
 */
export const getCustomColumn = async (
  workspaceId: string,
  fieldId: string
): Promise<CustomFieldResponse<{ customField: CustomColumnDefinition }>> => {
  try {
    const response = await axios.get(
      `${API_URL}/api/workspaces/${workspaceId}/custom-fields/${fieldId}`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to fetch custom column",
    };
  }
};

/**
 * Create a new custom column
 */
export const createCustomColumn = async (
  workspaceId: string,
  data: CreateCustomColumnData
): Promise<CustomFieldResponse<{ customField: CustomColumnDefinition }>> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/workspaces/${workspaceId}/custom-fields`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to create custom column",
    };
  }
};

/**
 * Update a custom column
 */
export const updateCustomColumn = async (
  workspaceId: string,
  fieldId: string,
  data: UpdateCustomColumnData
): Promise<CustomFieldResponse<{ customField: CustomColumnDefinition }>> => {
  try {
    const response = await axios.patch(
      `${API_URL}/api/workspaces/${workspaceId}/custom-fields/${fieldId}`,
      data,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to update custom column",
    };
  }
};

/**
 * Delete a custom column
 */
export const deleteCustomColumn = async (
  workspaceId: string,
  fieldId: string,
  deleteData: boolean = false
): Promise<CustomFieldResponse> => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/workspaces/${workspaceId}/custom-fields/${fieldId}${
        deleteData ? "?deleteData=true" : ""
      }`,
      {
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to delete custom column",
    };
  }
};
