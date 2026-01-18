import { useAuthStore } from "@/store/useAuthStore";

export interface TargetAudience {
  jobTitles?: string[];
  industries?: string[];
  companySize?: string[];
  geography?: string[];
}

export interface Channels {
  email?: boolean;
  phone?: boolean;
  social?: boolean;
  ads?: boolean;
  content?: boolean;
  events?: boolean;
}

export interface BusinessProfile {
  _id?: string;
  workspace: string;

  // Core Business Info
  industry: string;
  industrySpecific?: string;
  companySize?: string;
  companyName?: string;
  website?: string;

  // Sales & Marketing
  salesCycle: string;
  averageDealSize?: string;
  monthlyLeadVolume?: string;
  primaryGoal: string;
  salesModel?: string;

  // Team Structure
  teamSize: string;
  roles?: string[];

  // Customer Profile
  targetAudience?: TargetAudience;

  // Pain Points & Goals
  painPoints?: string[];
  keyMetrics?: string[];

  // Channel Preferences
  channels?: Channels;

  // Lead Sources
  leadSources?: string[];

  // Metadata
  completedAt?: string;
  lastUpdated?: string;
  version?: number;
}

export interface BusinessProfileUpdateData {
  industry?: string;
  industrySpecific?: string;
  companySize?: string;
  companyName?: string;
  website?: string;
  salesCycle?: string;
  averageDealSize?: string;
  monthlyLeadVolume?: string;
  primaryGoal?: string;
  salesModel?: string;
  teamSize?: string;
  roles?: string[];
  targetAudience?: TargetAudience;
  painPoints?: string[];
  keyMetrics?: string[];
  channels?: Channels;
  leadSources?: string[];
}

export interface AIContext {
  hasProfile: boolean;
  context: string;
  raw?: BusinessProfile;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Get business profile for a workspace
 */
export async function getBusinessProfile(
  workspaceId: string
): Promise<ApiResponse<BusinessProfile | null>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/business-profile`,
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
        error: data.message || "Failed to load business profile",
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Update business profile for a workspace
 */
export async function updateBusinessProfile(
  workspaceId: string,
  profileData: BusinessProfileUpdateData
): Promise<ApiResponse<BusinessProfile>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/business-profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to save business profile",
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Get AI context summary for a workspace's business profile
 */
export async function getBusinessProfileAIContext(
  workspaceId: string
): Promise<ApiResponse<AIContext>> {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(
      `${API_BASE_URL}/workspaces/${workspaceId}/business-profile/ai-context`,
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
        error: data.message || "Failed to load AI context",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
