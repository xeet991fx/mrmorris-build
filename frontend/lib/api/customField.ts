import { axiosInstance } from "../axios";

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
    const url = `/workspaces/${workspaceId}/custom-fields${
      includeInactive ? "?includeInactive=true" : ""
    }`;

    const response = await axiosInstance.get(url);

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
    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/custom-fields/${fieldId}`
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
    const url = `/workspaces/${workspaceId}/custom-fields`;
    console.log("🔵 Creating custom column");
    console.log("URL:", url);
    console.log("Workspace ID:", workspaceId);
    console.log("Request data:", data);

    const response = await axiosInstance.post(url, data);

    console.log("✅ Custom column created successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error creating custom column:", error);
    console.error("Error response:", error.response?.data);
    console.error("Error status:", error.response?.status);
    console.error("Error URL:", error.config?.url);
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
    const response = await axiosInstance.patch(
      `/workspaces/${workspaceId}/custom-fields/${fieldId}`,
      data
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
    const response = await axiosInstance.delete(
      `/workspaces/${workspaceId}/custom-fields/${fieldId}${
        deleteData ? "?deleteData=true" : ""
      }`
    );

    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || "Failed to delete custom column",
    };
  }
};
