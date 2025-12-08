import { useAuthStore } from "@/store/useAuthStore";

export interface ApolloSettings {
  apiKey: string;
  autoEnrichNew: boolean;
  autoEnrichMissing: boolean;
  autoVerifyEmails: boolean;
  alertThreshold: number;
  notificationEmail: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Get Apollo settings for a workspace
 */
export async function getApolloSettings(
  workspaceId: string
): Promise<ApiResponse<ApolloSettings>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/apollo/settings`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to load Apollo settings",
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Save Apollo settings for a workspace
 */
export async function saveApolloSettings(
  workspaceId: string,
  settings: ApolloSettings
): Promise<ApiResponse<void>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/apollo/settings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to save Apollo settings",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test Apollo API connection
 */
export async function testApolloConnection(
  workspaceId: string,
  apiKey: string
): Promise<ApiResponse<{ connected: boolean }>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/apollo/test-connection`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Connection test failed",
      };
    }

    return {
      success: true,
      data: { connected: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
