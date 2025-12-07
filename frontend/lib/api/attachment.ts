/**
 * Attachment API Client
 * Handles all attachment-related API calls
 */

import axios from 'axios';
import { axiosInstance } from '../axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Attachment {
  _id: string;
  workspaceId: string;
  opportunityId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  category?: 'proposal' | 'contract' | 'presentation' | 'other';
  description?: string;
  aiExtractedText?: string;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Upload a file attachment for an opportunity
 */
export async function uploadAttachment(
  workspaceId: string,
  opportunityId: string,
  file: File,
  options?: {
    category?: 'proposal' | 'contract' | 'presentation' | 'other';
    description?: string;
  }
) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) formData.append('category', options.category);
    if (options?.description) formData.append('description', options.description);

    const response = await axiosInstance.post(
      `/workspaces/${workspaceId}/opportunities/${opportunityId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Get all attachments for an opportunity
 */
export async function getAttachments(
  workspaceId: string,
  opportunityId: string,
  category?: string
) {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/opportunities/${opportunityId}/attachments?${params}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Get attachments error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Download an attachment
 */
export function getAttachmentDownloadUrl(
  workspaceId: string,
  attachmentId: string
): string {
  return `${API_URL}/workspaces/${workspaceId}/attachments/${attachmentId}/download`;
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(
  workspaceId: string,
  attachmentId: string
) {
  try {
    const response = await axiosInstance.delete(
      `/workspaces/${workspaceId}/attachments/${attachmentId}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}
