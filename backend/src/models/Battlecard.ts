/**
 * Battlecard Model
 * 
 * Competitive positioning documents for sales enablement.
 * Linked to competitors for context-aware surfacing.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IBattlecard extends Document {
    workspaceId: Types.ObjectId;
    competitorId: Types.ObjectId;

    // Content
    title: string;
    category: "pricing" | "features" | "objections" | "positioning" | "general";
    content: string;  // Rich text/markdown content

    // Objection handling
    objection?: string;  // The objection this addresses
    response?: string;   // Suggested response
    proofPoints?: string[];  // Evidence to support

    // Metadata
    priority?: "high" | "medium" | "low";
    tags?: string[];
    views?: number;
    lastUsedAt?: Date;

    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const battlecardSchema = new Schema<IBattlecard>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        competitorId: {
            type: Schema.Types.ObjectId,
            ref: "Competitor",
            required: [true, "Competitor ID is required"],
            index: true,
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        category: {
            type: String,
            enum: ["pricing", "features", "objections", "positioning", "general"],
            default: "general",
        },
        content: {
            type: String,
            required: [true, "Content is required"],
        },

        objection: { type: String },
        response: { type: String },
        proofPoints: [{ type: String }],

        priority: {
            type: String,
            enum: ["high", "medium", "low"],
            default: "medium",
        },
        tags: [{ type: String }],
        views: { type: Number, default: 0 },
        lastUsedAt: { type: Date },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
battlecardSchema.index({ workspaceId: 1, competitorId: 1 });
battlecardSchema.index({ workspaceId: 1, category: 1 });

// Text search
battlecardSchema.index({
    title: "text",
    content: "text",
    objection: "text",
});

const Battlecard = mongoose.model<IBattlecard>("Battlecard", battlecardSchema);

export default Battlecard;
