import { axiosInstance } from '../axios';

export interface Visitor {
  _id: string;
  workspaceId: string;
  visitorId: string;
  contactId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
  };
  firstSeen: Date;
  lastSeen: Date;
  firstSource?: string;
  lastSource?: string;
  firstUtmCampaign?: string;
  firstUtmSource?: string;
  firstUtmMedium?: string;
  lastUtmCampaign?: string;
  lastUtmSource?: string;
  lastUtmMedium?: string;
  lastPageUrl?: string;
  websites?: string[];
  sessionCount: number;
  pageViewCount: number;
  eventCount: number;
  devices: Array<{
    userAgent: string;
    ip: string;
    screen?: string;
    language?: string;
    lastSeen: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingEvent {
  _id: string;
  workspaceId: string;
  visitorId: string;
  contactId?: string;
  sessionId: string;
  eventType: 'page_view' | 'button_click' | 'form_view' | 'form_submit' | 'scroll_depth' | 'custom';
  eventName: string;
  url: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  properties: Record<string, any>;
  device: {
    userAgent: string;
    ip: string;
    screen: string;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingStats {
  totalVisitors: number;
  anonymousVisitors: number;
  identifiedVisitors: number;
  conversionRate: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
}

/**
 * Get visitors for a workspace
 */
export const getVisitors = async (
  workspaceId: string,
  params?: {
    page?: number;
    limit?: number;
    identified?: boolean;
    minSessions?: number;
  }
) => {
  try {
    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/tracking/visitors`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error('Get visitors error:', error);
    throw error;
  }
};

/**
 * Get tracking events for a visitor or contact
 */
export const getTrackingEvents = async (
  workspaceId: string,
  params?: {
    visitorId?: string;
    contactId?: string;
    eventType?: string;
    page?: number;
    limit?: number;
  }
) => {
  try {
    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/tracking/events`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    console.error('Get tracking events error:', error);
    throw error;
  }
};

/**
 * Get tracking statistics
 */
export const getTrackingStats = async (workspaceId: string) => {
  try {
    const response = await axiosInstance.get(
      `/workspaces/${workspaceId}/tracking/stats`
    );
    return response.data;
  } catch (error: any) {
    console.error('Get tracking stats error:', error);
    throw error;
  }
};
