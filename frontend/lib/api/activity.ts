/**
 * Activity API Client
 * Handles all activity-related API calls
 */

import { axiosInstance } from '../axios';

const API_URL = '';  // axiosInstance already has baseURL set

export interface Activity {
  _id: string;
  workspaceId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  opportunityId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'stage_change' | 'file_upload' | 'task' | 'ai_suggestion';
  title: string;
  description?: string;
  direction?: 'inbound' | 'outbound';
  duration?: number;
  emailSubject?: string;
  emailBody?: string;
  dueDate?: string;
  completed?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: {
    fromStage?: string;
    toStage?: string;
    oldValue?: any;
    newValue?: any;
  };
  isAutoLogged?: boolean;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityData {
  type: Activity['type'];
  title: string;
  description?: string;
  direction?: 'inbound' | 'outbound';
  duration?: number;
  emailSubject?: string;
  emailBody?: string;
  dueDate?: string;
  completed?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  completed?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create a new activity for an opportunity
 */
export async function createActivity(
  workspaceId: string,
  opportunityId: string,
  data: CreateActivityData
) {
  try {
    const response = await axiosInstance.post(
      `/workspaces/${workspaceId}/opportunities/${opportunityId}/activities`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.error('Create activity error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Get all activities for an opportunity
 */
export async function getActivities(
  workspaceId: string,
  opportunityId: string,
  options?: {
    type?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/opportunities/${opportunityId}/activities?${params}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Get activities error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Update an activity
 */
export async function updateActivity(
  workspaceId: string,
  activityId: string,
  data: UpdateActivityData
) {
  try {
    const response = await axiosInstance.patch(
      `/workspaces/${workspaceId}/activities/${activityId}`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.error('Update activity error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Delete an activity
 */
export async function deleteActivity(
  workspaceId: string,
  activityId: string
) {
  try {
    const response = await axiosInstance.delete(
      `/workspaces/${workspaceId}/activities/${activityId}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}
