/**
 * Email Tracking API Client
 * Handles email analytics, open/click tracking, and campaign performance
 */

import { axiosInstance } from "../axios";

export interface EmailTrackingStats {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalReplied: number;
    totalBounced: number;
    totalUnsubscribed: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
    totalOpenEvents: number;
    totalClickEvents: number;
}

export interface CampaignPerformance {
    campaignId: string;
    campaignName: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    openRate: number;
    clickRate: number;
}

export interface EmailEvent {
    _id: string;
    type: "open" | "click" | "reply" | "bounce";
    contactId: string;
    contactName?: string;
    contactEmail: string;
    campaignId: string;
    campaignName?: string;
    timestamp: string;
    metadata?: {
        linkUrl?: string;
        userAgent?: string;
        ipAddress?: string;
    };
}

export interface TrackingStatsResponse {
    success: boolean;
    data?: EmailTrackingStats;
    error?: string;
}

export interface CampaignPerformanceResponse {
    success: boolean;
    campaigns?: CampaignPerformance[];
    error?: string;
}

export interface RecentEventsResponse {
    success: boolean;
    events?: EmailEvent[];
    error?: string;
}

/**
 * Get overall email tracking statistics from the backend tracking API
 */
export const getTrackingStats = async (
    workspaceId: string,
    dateRange?: { start: string; end: string }
): Promise<TrackingStatsResponse> => {
    try {
        const params: any = {};
        if (dateRange?.start) params.start = dateRange.start;
        if (dateRange?.end) params.end = dateRange.end;

        const response = await axiosInstance.get(`/email-tracking/stats/${workspaceId}`, {
            params,
        });

        return {
            success: response.data.success,
            data: response.data.data,
        };
    } catch (err: any) {
        // Return empty stats on error
        return {
            success: true,
            data: {
                totalSent: 0,
                totalOpened: 0,
                totalClicked: 0,
                totalReplied: 0,
                totalBounced: 0,
                totalUnsubscribed: 0,
                openRate: 0,
                clickRate: 0,
                replyRate: 0,
                bounceRate: 0,
                totalOpenEvents: 0,
                totalClickEvents: 0,
            },
        };
    }
};

/**
 * Get campaign performance breakdown from the backend tracking API
 */
export const getCampaignPerformance = async (
    workspaceId: string
): Promise<CampaignPerformanceResponse> => {
    try {
        const response = await axiosInstance.get(`/email-tracking/campaigns/${workspaceId}`);

        return {
            success: response.data.success,
            campaigns: response.data.campaigns || [],
        };
    } catch (err: any) {
        // Return empty campaigns on error
        return {
            success: true,
            campaigns: [],
        };
    }
};

/**
 * Get recent email events
 */
export const getRecentEvents = async (
    workspaceId: string,
    limit: number = 50
): Promise<RecentEventsResponse> => {
    try {
        const response = await axiosInstance.get(`/email-tracking/events`, {
            params: { workspaceId, limit },
        });
        return {
            success: true,
            events: response.data.events || response.data.data?.events || [],
        };
    } catch (err: any) {
        // Return empty array if endpoint doesn't exist
        return {
            success: true,
            events: [],
        };
    }
};

/**
 * Get tracking pixel URL for an email
 */
export const getTrackingPixelUrl = (messageId: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}/email-tracking/open/${messageId}`;
};

/**
 * Get click tracking URL wrapper
 */
export const getClickTrackingUrl = (messageId: string, originalUrl: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}/email-tracking/click/${messageId}?url=${encodeURIComponent(originalUrl)}`;
};

// ============================================
// ANALYTICS BREAKDOWN TYPES & FUNCTIONS
// ============================================

export interface DeviceBreakdown {
    devices: Array<{ name: string; count: number; percentage: number }>;
    browsers: Array<{ name: string; count: number; percentage: number }>;
    os: Array<{ name: string; count: number; percentage: number }>;
}

export interface LocationBreakdown {
    countries: Array<{ country: string; countryCode: string; count: number; percentage: number }>;
    cities: Array<{ city: string; country: string; count: number }>;
    timezones: Array<{ timezone: string; count: number }>;
}

export interface TimeBreakdown {
    byHour: Array<{ hour: number; label: string; count: number }>;
    byDayOfWeek: Array<{ day: number; dayName: string; count: number }>;
    trend: Array<{ date: string; opens: number }>;
}

/**
 * Get device/browser/OS breakdown for email opens
 */
export const getEmailDeviceBreakdown = async (
    workspaceId: string
): Promise<{ success: boolean; data?: DeviceBreakdown; error?: string }> => {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/analytics/email/device-breakdown`
        );
        return { success: true, data: response.data.data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

/**
 * Get geographic breakdown for email opens
 */
export const getEmailLocationBreakdown = async (
    workspaceId: string
): Promise<{ success: boolean; data?: LocationBreakdown; error?: string }> => {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/analytics/email/location-breakdown`
        );
        return { success: true, data: response.data.data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};

/**
 * Get time-based breakdown for email opens
 */
export const getEmailTimeBreakdown = async (
    workspaceId: string
): Promise<{ success: boolean; data?: TimeBreakdown; error?: string }> => {
    try {
        const response = await axiosInstance.get(
            `/workspaces/${workspaceId}/analytics/email/time-breakdown`
        );
        return { success: true, data: response.data.data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};
