/**
 * Reverse IP Lookup Service
 *
 * Identifies companies from IP addresses using Clearbit Reveal API
 * and tracks anonymous company visitors
 */

import axios from 'axios';
import CompanyVisitor, { ICompanyVisitor, IPageView } from '../models/CompanyVisitor';
import { Types } from 'mongoose';
import User from '../models/User';

interface ClearbitCompany {
    name: string;
    domain: string;
    legalName?: string;
    tags?: string[];
    description?: string;
    foundedYear?: number;
    location?: string;
    timeZone?: string;
    utcOffset?: number;
    geo?: {
        streetNumber?: string;
        streetName?: string;
        subPremise?: string;
        city?: string;
        postalCode?: string;
        state?: string;
        stateCode?: string;
        country?: string;
        countryCode?: string;
        lat?: number;
        lng?: number;
    };
    logo?: string;
    facebook?: {
        handle?: string;
        likes?: number;
    };
    linkedin?: {
        handle?: string;
    };
    twitter?: {
        handle?: string;
        id?: string;
        bio?: string;
        followers?: number;
        following?: number;
        location?: string;
        site?: string;
        avatar?: string;
    };
    crunchbase?: {
        handle?: string;
    };
    emailProvider?: boolean;
    type?: string;
    ticker?: string;
    identifiers?: {
        usEIN?: string;
    };
    phone?: string;
    metrics?: {
        alexaUsRank?: number;
        alexaGlobalRank?: number;
        employees?: number;
        employeesRange?: string;
        marketCap?: number;
        raised?: number;
        annualRevenue?: number;
        estimatedAnnualRevenue?: string;
        fiscalYearEnd?: number;
    };
    indexedAt?: string;
    tech?: string[];
    techCategories?: string[];
    parent?: {
        domain?: string;
    };
    ultimateParent?: {
        domain?: string;
    };
    category?: {
        sector?: string;
        industryGroup?: string;
        industry?: string;
        subIndustry?: string;
        sicCode?: string;
        naicsCode?: string;
    };
}

interface IPInfoResponse {
    ip: string;
    hostname?: string;
    city?: string;
    region?: string;
    country?: string;
    loc?: string; // "lat,lng"
    org?: string; // "AS15169 Google LLC"
    postal?: string;
    timezone?: string;
    company?: {
        name?: string;
        domain?: string;
        type?: string;
    };
}

export class ReverseIPService {
    private clearbitApiKey: string;
    private ipinfoApiKey?: string;
    private sessionTimeout = 30 * 60 * 1000; // 30 minutes

    constructor() {
        this.clearbitApiKey = process.env.CLEARBIT_API_KEY || '';
        this.ipinfoApiKey = process.env.IPINFO_API_KEY;
    }

    /**
     * Main entry point: Track a visitor by IP address
     */
    async trackVisitor(params: {
        workspaceId: string;
        ipAddress: string;
        pageView: Partial<IPageView>;
    }): Promise<ICompanyVisitor | null> {
        try {
            const { workspaceId, ipAddress, pageView } = params;

            // Skip private/internal IPs
            if (this.isPrivateIP(ipAddress)) {
                return null;
            }

            // Find or create company visitor
            let visitor = await CompanyVisitor.findOne({
                workspaceId: new Types.ObjectId(workspaceId),
                ipAddress,
            });

            if (!visitor) {
                // New visitor - create and enrich
                visitor = await this.createVisitor(workspaceId, ipAddress) as any;
            } else {
                // Existing visitor - check if new session
                const lastSeen = visitor.engagement.lastSeenAt.getTime();
                const now = Date.now();

                if (now - lastSeen > this.sessionTimeout) {
                    visitor.engagement.totalSessions += 1;
                }
            }

            // Add page view
            (visitor as any).addPageView(pageView);

            // Check if we should send alerts
            const alertType = (visitor as any).shouldSendAlert();
            if (alertType) {
                await this.sendAlert(visitor, alertType);
            }

            await visitor.save();

            return visitor;
        } catch (error: any) {
            console.error('Error tracking visitor:', error);
            return null;
        }
    }

    /**
     * Create a new company visitor and enrich with Clearbit
     */
    private async createVisitor(
        workspaceId: string,
        ipAddress: string
    ): Promise<ICompanyVisitor> {
        const visitor = new CompanyVisitor({
            workspaceId: new Types.ObjectId(workspaceId),
            ipAddress,
            engagement: {
                totalPageViews: 0,
                totalTimeOnSite: 0,
                averageSessionDuration: 0,
                bounceRate: 0,
                pagesPerSession: 0,
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
                totalSessions: 1,
            },
        });

        // Enrich with company data
        await this.enrichVisitor(visitor);

        return visitor;
    }

    /**
     * Enrich visitor with company data from Clearbit or fallback providers
     */
    async enrichVisitor(visitor: ICompanyVisitor): Promise<void> {
        try {
            // Try Clearbit first
            if (this.clearbitApiKey) {
                const clearbitData = await this.lookupClearbit(visitor.ipAddress);
                if (clearbitData) {
                    this.mapClearbitData(visitor, clearbitData);
                    visitor.enrichedAt = new Date();
                    visitor.enrichmentSource = 'clearbit';
                    visitor.rawEnrichmentData = clearbitData;
                    return;
                }
            }

            // Fallback to IPInfo
            if (this.ipinfoApiKey) {
                const ipinfoData = await this.lookupIPInfo(visitor.ipAddress);
                if (ipinfoData?.company) {
                    this.mapIPInfoData(visitor, ipinfoData);
                    visitor.enrichedAt = new Date();
                    visitor.enrichmentSource = 'ipinfo';
                    visitor.rawEnrichmentData = ipinfoData;
                    return;
                }
            }

            console.log(`No company data found for IP: ${visitor.ipAddress}`);
        } catch (error: any) {
            console.error('Error enriching visitor:', error);
        }
    }

    /**
     * Lookup company data from Clearbit Reveal API
     */
    private async lookupClearbit(ipAddress: string): Promise<ClearbitCompany | null> {
        try {
            const response = await axios.get(
                `https://reveal.clearbit.com/v1/companies/find`,
                {
                    params: { ip: ipAddress },
                    headers: {
                        Authorization: `Bearer ${this.clearbitApiKey}`,
                    },
                    timeout: 5000,
                }
            );

            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                // No company found for this IP
                return null;
            }
            console.error('Clearbit API error:', error.message);
            return null;
        }
    }

    /**
     * Lookup IP data from IPInfo (fallback provider)
     */
    private async lookupIPInfo(ipAddress: string): Promise<IPInfoResponse | null> {
        try {
            const response = await axios.get(
                `https://ipinfo.io/${ipAddress}`,
                {
                    params: { token: this.ipinfoApiKey },
                    timeout: 5000,
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('IPInfo API error:', error.message);
            return null;
        }
    }

    /**
     * Map Clearbit data to CompanyVisitor model
     */
    private mapClearbitData(visitor: ICompanyVisitor, data: ClearbitCompany): void {
        visitor.domain = data.domain;
        visitor.companyName = data.name;

        visitor.firmographics = {
            industry: data.category?.industry,
            sector: data.category?.sector,
            subIndustry: data.category?.subIndustry,
            employeeCount: data.metrics?.employees,
            employeeRange: data.metrics?.employeesRange,
            estimatedAnnualRevenue: data.metrics?.annualRevenue,
            revenueRange: data.metrics?.estimatedAnnualRevenue,
            foundedYear: data.foundedYear,
            location: {
                city: data.geo?.city,
                state: data.geo?.state,
                country: data.geo?.country,
                countryCode: data.geo?.countryCode,
            },
            description: data.description,
            tags: data.tags,
            techStack: data.tech,
            linkedin: {
                handle: data.linkedin?.handle,
                url: data.linkedin?.handle
                    ? `https://linkedin.com/company/${data.linkedin.handle}`
                    : undefined,
            },
            twitter: {
                handle: data.twitter?.handle,
                followers: data.twitter?.followers,
            },
            website: data.domain ? `https://${data.domain}` : undefined,
            phone: data.phone,
            type: data.type,
        };

        // Calculate initial account score
        (visitor as any).calculateAccountScore();
    }

    /**
     * Map IPInfo data to CompanyVisitor model
     */
    private mapIPInfoData(visitor: ICompanyVisitor, data: IPInfoResponse): void {
        if (data.company) {
            visitor.domain = data.company.domain;
            visitor.companyName = data.company.name;

            visitor.firmographics = {
                location: {
                    city: data.city,
                    state: data.region,
                    country: data.country,
                },
                type: data.company.type,
            };

            visitor.calculateAccountScore();
        }
    }

    /**
     * Check if IP is private/internal (skip tracking these)
     */
    private isPrivateIP(ip: string): boolean {
        // IPv4 private ranges
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^::1$/, // IPv6 localhost
            /^fc00:/, // IPv6 private
            /^fe80:/, // IPv6 link-local
        ];

        return privateRanges.some((range) => range.test(ip));
    }

    /**
     * Send alert to workspace users
     */
    private async sendAlert(visitor: ICompanyVisitor, alertType: string): Promise<void> {
        try {
            // Find workspace admin users
            const users = await User.find({
                workspaceId: visitor.workspaceId,
                role: { $in: ['admin', 'owner'] },
            });

            if (users.length === 0) return;

            const userIds = users.map((u) => u._id);

            // Record alert
            visitor.alertsSent.push({
                type: alertType,
                sentAt: new Date(),
                sentTo: userIds,
            });

            // Send notifications (implement based on your notification system)
            // For now, just log
            console.log(`Alert sent: ${alertType} for company ${visitor.companyName}`);

            // TODO: Implement actual notification sending
            // - Email notification
            // - In-app notification
            // - Slack notification
            // - Webhook
        } catch (error: any) {
            console.error('Error sending alert:', error);
        }
    }

    /**
     * Mark a company visitor as a target account
     */
    async markAsTargetAccount(
        visitorId: string,
        tier: 'tier1' | 'tier2' | 'tier3'
    ): Promise<ICompanyVisitor | null> {
        try {
            const visitor = await CompanyVisitor.findById(visitorId);
            if (!visitor) return null;

            visitor.isTargetAccount = true;
            visitor.targetAccountTier = tier;
            visitor.calculateAccountScore();

            await visitor.save();
            return visitor;
        } catch (error: any) {
            console.error('Error marking target account:', error);
            return null;
        }
    }

    /**
     * Get top company visitors by score
     */
    async getTopVisitors(
        workspaceId: string,
        limit: number = 10
    ): Promise<ICompanyVisitor[]> {
        return CompanyVisitor.find({ workspaceId: new Types.ObjectId(workspaceId) })
            .sort({ accountScore: -1 })
            .limit(limit);
    }

    /**
     * Get recent target account visits
     */
    async getRecentTargetVisits(
        workspaceId: string,
        days: number = 7
    ): Promise<ICompanyVisitor[]> {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        return CompanyVisitor.find({
            workspaceId: new Types.ObjectId(workspaceId),
            isTargetAccount: true,
            'engagement.lastSeenAt': { $gte: sinceDate },
        }).sort({ 'engagement.lastSeenAt': -1 });
    }

    /**
     * Get visitor analytics
     */
    async getAnalytics(workspaceId: string): Promise<any> {
        const visitors = await CompanyVisitor.find({
            workspaceId: new Types.ObjectId(workspaceId),
        });

        const totalVisitors = visitors.length;
        const identifiedVisitors = visitors.filter((v) => v.companyName).length;
        const targetAccountVisitors = visitors.filter((v) => v.isTargetAccount).length;

        const totalPageViews = visitors.reduce(
            (sum, v) => sum + v.engagement.totalPageViews,
            0
        );

        const averageScore = totalVisitors > 0
            ? visitors.reduce((sum, v) => sum + v.accountScore, 0) / totalVisitors
            : 0;

        // Top industries
        const industries = visitors
            .filter((v) => v.firmographics?.industry)
            .map((v) => v.firmographics.industry!);

        const industryCounts = industries.reduce((acc: any, industry) => {
            acc[industry] = (acc[industry] || 0) + 1;
            return acc;
        }, {});

        const topIndustries = Object.entries(industryCounts)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 5)
            .map(([industry, count]) => ({ industry, count }));

        // Top company sizes
        const sizes = visitors
            .filter((v) => v.firmographics?.employeeRange)
            .map((v) => v.firmographics.employeeRange!);

        const sizeCounts = sizes.reduce((acc: any, size) => {
            acc[size] = (acc[size] || 0) + 1;
            return acc;
        }, {});

        const topSizes = Object.entries(sizeCounts)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 5)
            .map(([size, count]) => ({ size, count }));

        return {
            totalVisitors,
            identifiedVisitors,
            targetAccountVisitors,
            identificationRate: totalVisitors > 0
                ? (identifiedVisitors / totalVisitors) * 100
                : 0,
            totalPageViews,
            averageScore: Math.round(averageScore),
            topIndustries,
            topSizes,
        };
    }

    /**
     * Re-enrich a visitor (useful if data is stale or enrichment failed initially)
     */
    async reEnrichVisitor(visitorId: string): Promise<ICompanyVisitor | null> {
        try {
            const visitor = await CompanyVisitor.findById(visitorId);
            if (!visitor) return null;

            await this.enrichVisitor(visitor);
            await visitor.save();

            return visitor;
        } catch (error: any) {
            console.error('Error re-enriching visitor:', error);
            return null;
        }
    }
}

export const reverseIPService = new ReverseIPService();
