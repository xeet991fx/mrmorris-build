/**
 * LandingPage Model
 *
 * Stores landing page definitions with sections, components, and SEO settings.
 * Used for marketing campaigns and lead generation.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPageSection {
    id: string;
    type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'cta' | 'form' | 'content' | 'image' | 'video';
    order: number;
    settings: {
        // Layout
        layout?: 'single' | 'two-column' | 'three-column' | 'grid';
        alignment?: 'left' | 'center' | 'right';
        spacing?: 'tight' | 'normal' | 'relaxed';

        // Content
        heading?: string;
        subheading?: string;
        content?: string;
        buttonText?: string;
        buttonLink?: string;
        imageUrl?: string;
        videoUrl?: string;

        // For form sections
        formId?: string;

        // For features
        features?: Array<{
            icon?: string;
            title: string;
            description: string;
        }>;

        // For testimonials
        testimonials?: Array<{
            name: string;
            role?: string;
            company?: string;
            avatar?: string;
            quote: string;
            rating?: number;
        }>;

        // For pricing
        pricingPlans?: Array<{
            name: string;
            price: string;
            period?: string;
            features: string[];
            highlighted?: boolean;
            buttonText?: string;
            buttonLink?: string;
        }>;

        // Styling
        backgroundColor?: string;
        textColor?: string;
        backgroundImage?: string;
    };
}

export interface ILandingPage extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Basic info
    name: string;
    slug: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';

    // Page sections
    sections: IPageSection[];

    // SEO
    seo: {
        title: string;
        description: string;
        keywords?: string[];
        ogImage?: string;
        favicon?: string;
    };

    // Settings
    settings: {
        // Design
        theme: 'light' | 'dark' | 'custom';
        primaryColor: string;
        secondaryColor: string;
        font: string;

        // Tracking
        googleAnalyticsId?: string;
        facebookPixelId?: string;

        // Custom code
        customCss?: string;
        customJs?: string;
        headerCode?: string;
        footerCode?: string;
    };

    // Analytics
    stats: {
        views: number;
        uniqueVisitors: number;
        conversions: number;
        conversionRate: number;
        lastViewedAt?: Date;
    };

    createdAt: Date;
    updatedAt: Date;
}

const pageSectionSchema = new Schema<IPageSection>({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['hero', 'features', 'testimonials', 'pricing', 'cta', 'form', 'content', 'image', 'video'],
        required: true,
    },
    order: { type: Number, required: true },
    settings: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const landingPageSchema = new Schema<ILandingPage>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, "Name must be less than 200 characters"],
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        description: { type: String },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true,
        },

        sections: [pageSectionSchema],

        seo: {
            title: { type: String, required: true },
            description: { type: String, required: true },
            keywords: [{ type: String }],
            ogImage: { type: String },
            favicon: { type: String },
        },

        settings: {
            theme: {
                type: String,
                enum: ['light', 'dark', 'custom'],
                default: 'light',
            },
            primaryColor: { type: String, default: '#3b82f6' },
            secondaryColor: { type: String, default: '#10b981' },
            font: { type: String, default: 'Inter' },
            googleAnalyticsId: { type: String },
            facebookPixelId: { type: String },
            customCss: { type: String },
            customJs: { type: String },
            headerCode: { type: String },
            footerCode: { type: String },
        },

        stats: {
            views: { type: Number, default: 0 },
            uniqueVisitors: { type: Number, default: 0 },
            conversions: { type: Number, default: 0 },
            conversionRate: { type: Number, default: 0 },
            lastViewedAt: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
landingPageSchema.index({ workspaceId: 1, status: 1 });
landingPageSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
landingPageSchema.index({ workspaceId: 1, createdAt: -1 });

// Update conversion rate when stats change
landingPageSchema.pre('save', function(next) {
    if (this.stats.uniqueVisitors > 0) {
        this.stats.conversionRate = (this.stats.conversions / this.stats.uniqueVisitors) * 100;
    }
    next();
});

const LandingPage = mongoose.model<ILandingPage>("LandingPage", landingPageSchema);

export default LandingPage;
