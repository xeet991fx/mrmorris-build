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
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
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
 * Get overall email tracking statistics
 */
export const getTrackingStats = async (
    workspaceId: string,
    dateRange?: { start: string; end: string }
): Promise<TrackingStatsResponse> => {
    try {
        // Fetch from campaigns and calculate stats
        const campaignsRes = await axiosInstance.get(`/campaigns`, {
            params: { workspaceId },
        });
        const campaigns = campaignsRes.data.campaigns || campaignsRes.data.data?.campaigns || [];

        let totalSent = 0, totalOpened = 0, totalClicked = 0, totalReplied = 0, totalBounced = 0;

        campaigns.forEach((c: any) => {
            const stats = c.stats || {};
            totalSent += stats.sent || 0;
            totalOpened += stats.opened || 0;
            totalClicked += stats.clicked || 0;
            totalReplied += stats.replied || 0;
            totalBounced += stats.bounced || 0;
        });

        return {
            success: true,
            data: {
                totalSent,
                totalOpened,
                totalClicked,
                totalReplied,
                totalBounced,
                openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
                clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
                replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
                bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
            },
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
                openRate: 0,
                clickRate: 0,
                replyRate: 0,
                bounceRate: 0,
            },
        };
    }
};

/**
 * Get campaign performance breakdown
 */
export const getCampaignPerformance = async (
    workspaceId: string
): Promise<CampaignPerformanceResponse> => {
    try {
        const response = await axiosInstance.get(`/campaigns`, {
            params: { workspaceId },
        });

        const campaigns = response.data.campaigns || response.data.data?.campaigns || [];

        const performance: CampaignPerformance[] = campaigns.map((c: any) => {
            const stats = c.stats || {};
            const sent = stats.sent || 0;
            return {
                campaignId: c._id,
                campaignName: c.name,
                sent,
                opened: stats.opened || 0,
                clicked: stats.clicked || 0,
                replied: stats.replied || 0,
                bounced: stats.bounced || 0,
                openRate: sent > 0 ? ((stats.opened || 0) / sent) * 100 : 0,
                clickRate: sent > 0 ? ((stats.clicked || 0) / sent) * 100 : 0,
            };
        });

        return {
            success: true,
            campaigns: performance,
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
