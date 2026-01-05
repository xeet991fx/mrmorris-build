/**
 * Company Visitor Model
 *
 * Tracks anonymous company visitors identified via reverse IP lookup
 * (similar to Clearbit Reveal, Albacross, etc.)
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPageView {
    url: string;
    title?: string;
    timestamp: Date;
    duration?: number; // seconds spent on page
    referrer?: string;
    utmParams?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
}

export interface IEngagementMetrics {
    totalPageViews: number;
    totalTimeOnSite: number; // in seconds
    averageSessionDuration: number;
    bounceRate: number;
    pagesPerSession: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    totalSessions: number;
}

export interface ICompanyVisitor extends Document {
    workspaceId: Types.ObjectId;

    // Company identification
    ipAddress: string;
    domain?: string;
    companyName?: string;

    // Firmographic data (from Clearbit or similar)
    firmographics: {
        industry?: string;
        sector?: string;
        subIndustry?: string;
        employeeCount?: number;
        employeeRange?: string; // e.g., "1-10", "11-50", "51-200"
        estimatedAnnualRevenue?: number;
        revenueRange?: string;
        foundedYear?: number;
        location?: {
            city?: string;
            state?: string;
            country?: string;
            countryCode?: string;
        };
        description?: string;
        tags?: string[];
        techStack?: string[]; // Technologies the company uses
        linkedin?: {
            handle?: string;
            url?: string;
        };
        twitter?: {
            handle?: string;
            followers?: number;
        };
        website?: string;
        phone?: string;
        type?: string; // public, private, education, government, etc.
    };

    // Engagement tracking
    engagement: IEngagementMetrics;
    pageViews: IPageView[];

    // Target account management
    isTargetAccount: boolean;
    targetAccountTier?: 'tier1' | 'tier2' | 'tier3'; // ICP fit
    accountScore: number; // 0-100 based on firmographics + engagement

    // Lead association
    convertedToContact?: boolean;
    contactId?: Types.ObjectId;
    contactCreatedAt?: Date;

    // Alerts and notifications
    alertsSent: {
        type: string; // 'target_account_visit', 'high_intent', 'return_visit'
        sentAt: Date;
        sentTo: Types.ObjectId[]; // User IDs
    }[];

    // Metadata
    enrichedAt?: Date; // When IP was enriched with company data
    enrichmentSource?: 'clearbit' | 'manual' | 'ipinfo' | 'other';
    rawEnrichmentData?: any; // Store full API response for debugging

    createdAt: Date;
    updatedAt: Date;
}

const PageViewSchema = new Schema<IPageView>({
    url: { type: String, required: true },
    title: String,
    timestamp: { type: Date, required: true, default: Date.now },
    duration: Number,
    referrer: String,
    utmParams: {
        source: String,
        medium: String,
        campaign: String,
        term: String,
        content: String,
    },
}, { _id: false });

const EngagementMetricsSchema = new Schema<IEngagementMetrics>({
    totalPageViews: { type: Number, default: 0 },
    totalTimeOnSite: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    pagesPerSession: { type: Number, default: 0 },
    firstSeenAt: { type: Date, required: true, default: Date.now },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    totalSessions: { type: Number, default: 1 },
}, { _id: false });

const CompanyVisitorSchema = new Schema<ICompanyVisitor>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true,
        },

        // Company identification
        ipAddress: {
            type: String,
            required: true,
            index: true,
        },
        domain: {
            type: String,
            index: true,
        },
        companyName: {
            type: String,
            index: true,
        },

        // Firmographic data
        firmographics: {
            industry: String,
            sector: String,
            subIndustry: String,
            employeeCount: Number,
            employeeRange: String,
            estimatedAnnualRevenue: Number,
            revenueRange: String,
            foundedYear: Number,
            location: {
                city: String,
                state: String,
                country: String,
                countryCode: String,
            },
            description: String,
            tags: [String],
            techStack: [String],
            linkedin: {
                handle: String,
                url: String,
            },
            twitter: {
                handle: String,
                followers: Number,
            },
            website: String,
            phone: String,
            type: String,
        },

        // Engagement tracking
        engagement: {
            type: EngagementMetricsSchema,
            required: true,
            default: () => ({}),
        },
        pageViews: {
            type: [PageViewSchema],
            default: [],
        },

        // Target account management
        isTargetAccount: {
            type: Boolean,
            default: false,
            index: true,
        },
        targetAccountTier: {
            type: String,
            enum: ['tier1', 'tier2', 'tier3'],
        },
        accountScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        // Lead association
        convertedToContact: {
            type: Boolean,
            default: false,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: 'Contact',
        },
        contactCreatedAt: Date,

        // Alerts and notifications
        alertsSent: [{
            type: {
                type: String,
                required: true,
            },
            sentAt: {
                type: Date,
                required: true,
                default: Date.now,
            },
            sentTo: [{
                type: Schema.Types.ObjectId,
                ref: 'User',
            }],
        }],

        // Metadata
        enrichedAt: Date,
        enrichmentSource: {
            type: String,
            enum: ['clearbit', 'manual', 'ipinfo', 'other'],
        },
        rawEnrichmentData: Schema.Types.Mixed,
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
CompanyVisitorSchema.index({ workspaceId: 1, ipAddress: 1 }, { unique: true });
CompanyVisitorSchema.index({ workspaceId: 1, isTargetAccount: 1, 'engagement.lastSeenAt': -1 });
CompanyVisitorSchema.index({ workspaceId: 1, accountScore: -1 });
CompanyVisitorSchema.index({ workspaceId: 1, 'engagement.totalPageViews': -1 });
CompanyVisitorSchema.index({ workspaceId: 1, domain: 1 });

// Instance methods

/**
 * Add a page view and update engagement metrics
 */
CompanyVisitorSchema.methods.addPageView = function(pageView: Partial<IPageView>) {
    this.pageViews.push({
        url: pageView.url!,
        title: pageView.title,
        timestamp: pageView.timestamp || new Date(),
        duration: pageView.duration,
        referrer: pageView.referrer,
        utmParams: pageView.utmParams,
    });

    // Update engagement metrics
    this.engagement.totalPageViews += 1;
    this.engagement.lastSeenAt = new Date();

    if (pageView.duration) {
        this.engagement.totalTimeOnSite += pageView.duration;
        this.engagement.averageSessionDuration =
            this.engagement.totalTimeOnSite / this.engagement.totalSessions;
    }

    this.engagement.pagesPerSession =
        this.engagement.totalPageViews / this.engagement.totalSessions;

    // Recalculate account score
    this.calculateAccountScore();
};

/**
 * Calculate account score based on firmographics and engagement
 */
CompanyVisitorSchema.methods.calculateAccountScore = function(): number {
    let score = 0;

    // Firmographic scoring (max 60 points)
    if (this.firmographics.employeeCount) {
        if (this.firmographics.employeeCount >= 1000) score += 20;
        else if (this.firmographics.employeeCount >= 200) score += 15;
        else if (this.firmographics.employeeCount >= 50) score += 10;
        else score += 5;
    }

    if (this.firmographics.estimatedAnnualRevenue) {
        if (this.firmographics.estimatedAnnualRevenue >= 100000000) score += 20; // $100M+
        else if (this.firmographics.estimatedAnnualRevenue >= 10000000) score += 15; // $10M+
        else if (this.firmographics.estimatedAnnualRevenue >= 1000000) score += 10; // $1M+
        else score += 5;
    }

    // Target account bonus
    if (this.isTargetAccount) {
        if (this.targetAccountTier === 'tier1') score += 20;
        else if (this.targetAccountTier === 'tier2') score += 15;
        else if (this.targetAccountTier === 'tier3') score += 10;
    }

    // Engagement scoring (max 40 points)
    if (this.engagement.totalPageViews >= 20) score += 15;
    else if (this.engagement.totalPageViews >= 10) score += 10;
    else if (this.engagement.totalPageViews >= 5) score += 5;

    if (this.engagement.totalSessions >= 5) score += 10;
    else if (this.engagement.totalSessions >= 3) score += 5;

    if (this.engagement.averageSessionDuration >= 300) score += 10; // 5+ minutes
    else if (this.engagement.averageSessionDuration >= 120) score += 5; // 2+ minutes

    if (this.engagement.pagesPerSession >= 5) score += 5;
    else if (this.engagement.pagesPerSession >= 3) score += 3;

    this.accountScore = Math.min(100, score);
    return this.accountScore;
};

/**
 * Check if alert should be sent and return alert type
 */
CompanyVisitorSchema.methods.shouldSendAlert = function(): string | null {
    // Target account visit alert
    if (this.isTargetAccount && this.engagement.totalPageViews === 1) {
        return 'target_account_visit';
    }

    // High intent alert (score > 70 and multiple page views)
    if (this.accountScore >= 70 && this.engagement.totalPageViews >= 5) {
        const recentAlert = this.alertsSent.find(
            (alert: any) =>
                alert.type === 'high_intent' &&
                Date.now() - alert.sentAt.getTime() < 24 * 60 * 60 * 1000 // 24 hours
        );
        if (!recentAlert) {
            return 'high_intent';
        }
    }

    // Return visit alert (came back after 24+ hours)
    if (this.engagement.totalSessions >= 2) {
        const timeSinceFirst = Date.now() - this.engagement.firstSeenAt.getTime();
        if (timeSinceFirst >= 24 * 60 * 60 * 1000) { // 24 hours
            const recentAlert = this.alertsSent.find(
                (alert: any) =>
                    alert.type === 'return_visit' &&
                    Date.now() - alert.sentAt.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
            );
            if (!recentAlert) {
                return 'return_visit';
            }
        }
    }

    return null;
};

const CompanyVisitor = mongoose.model<ICompanyVisitor>('CompanyVisitor', CompanyVisitorSchema);

export default CompanyVisitor;
