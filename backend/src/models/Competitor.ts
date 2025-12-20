/**
 * Competitor Model
 * 
 * Tracks competitors for competitive intelligence.
 * Used by competitorAgent for battlecards and win/loss analysis.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICompetitor extends Document {
    workspaceId: Types.ObjectId;

    // Basic Info
    name: string;
    website?: string;
    description?: string;

    // Detection
    keywords: string[];  // Keywords to detect mentions
    aliases?: string[];  // Alternative names

    // Intelligence
    strengths?: string[];
    weaknesses?: string[];
    pricing?: string;
    targetMarket?: string;

    // Stats (calculated)
    dealsWon?: number;
    dealsLost?: number;
    lastMentionAt?: Date;

    // Metadata
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const competitorSchema = new Schema<ICompetitor>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },

        name: {
            type: String,
            required: [true, "Competitor name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        website: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [1000, "Description must be less than 1000 characters"],
        },

        keywords: [{
            type: String,
            trim: true,
            lowercase: true,
        }],
        aliases: [{
            type: String,
            trim: true,
        }],

        strengths: [{ type: String }],
        weaknesses: [{ type: String }],
        pricing: { type: String },
        targetMarket: { type: String },

        dealsWon: { type: Number, default: 0 },
        dealsLost: { type: Number, default: 0 },
        lastMentionAt: { type: Date },

        notes: { type: String },
    },
    {
        timestamps: true,
    }
);

// Indexes
competitorSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
competitorSchema.index({ workspaceId: 1, keywords: 1 });

// Text search
competitorSchema.index({
    name: "text",
    keywords: "text",
    aliases: "text",
});

const Competitor = mongoose.model<ICompetitor>("Competitor", competitorSchema);

export default Competitor;
