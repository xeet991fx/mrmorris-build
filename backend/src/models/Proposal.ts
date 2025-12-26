/**
 * Proposal Model
 * 
 * AI-generated sales proposals, SOWs, and quotes.
 * Linked to opportunities with pricing and tracking.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPricingItem {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
}

export interface IProposal extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    opportunityId: Types.ObjectId;

    // Basic Info
    title: string;
    templateType: "standard" | "enterprise" | "startup" | "custom";
    status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

    // Content (AI-generated)
    executiveSummary?: string;
    problemStatement?: string;
    proposedSolution?: string;
    deliverables?: string[];
    timeline?: string;
    whyUs?: string;
    terms?: string;

    // Pricing
    pricing: {
        items: IPricingItem[];
        subtotal: number;
        discount?: number;
        discountType?: "percentage" | "fixed";
        tax?: number;
        total: number;
        currency: string;
        validUntil?: Date;
    };

    // Tracking
    sentAt?: Date;
    sentTo?: string;
    viewedAt?: Date;
    viewCount?: number;
    respondedAt?: Date;

    // Similar deals reference
    referenceDealIds?: Types.ObjectId[];

    // PDF
    pdfUrl?: string;
    pdfGeneratedAt?: Date;

    // Metadata
    notes?: string;
    version: number;

    createdAt: Date;
    updatedAt: Date;
}

const pricingItemSchema = new Schema<IPricingItem>({
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, max: 100 },
    total: { type: Number, required: true },
}, { _id: false });

const proposalSchema = new Schema<IProposal>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
        },
        opportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
            required: [true, "Opportunity ID is required"],
            // index: true, // Removed - separate index defined below (line 165)
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        templateType: {
            type: String,
            enum: ["standard", "enterprise", "startup", "custom"],
            default: "standard",
        },
        status: {
            type: String,
            enum: ["draft", "sent", "viewed", "accepted", "declined", "expired"],
            default: "draft",
        },

        executiveSummary: { type: String },
        problemStatement: { type: String },
        proposedSolution: { type: String },
        deliverables: [{ type: String }],
        timeline: { type: String },
        whyUs: { type: String },
        terms: { type: String },

        pricing: {
            items: [pricingItemSchema],
            subtotal: { type: Number, required: true, default: 0 },
            discount: { type: Number, min: 0 },
            discountType: {
                type: String,
                enum: ["percentage", "fixed"],
            },
            tax: { type: Number, min: 0 },
            total: { type: Number, required: true, default: 0 },
            currency: { type: String, default: "USD" },
            validUntil: { type: Date },
        },

        sentAt: { type: Date },
        sentTo: { type: String },
        viewedAt: { type: Date },
        viewCount: { type: Number, default: 0 },
        respondedAt: { type: Date },

        referenceDealIds: [{
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
        }],

        pdfUrl: { type: String },
        pdfGeneratedAt: { type: Date },

        notes: { type: String },
        version: { type: Number, default: 1 },
    },
    {
        timestamps: true,
    }
);

// Indexes
proposalSchema.index({ workspaceId: 1, status: 1 });
proposalSchema.index({ workspaceId: 1, createdAt: -1 });
proposalSchema.index({ opportunityId: 1 });

// Text search
proposalSchema.index({
    title: "text",
    executiveSummary: "text",
    proposedSolution: "text",
});

const Proposal = mongoose.model<IProposal>("Proposal", proposalSchema);

export default Proposal;
