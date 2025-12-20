/**
 * ICPDefinition Model
 * 
 * Ideal Customer Profile definitions for lead qualification.
 * Used by leadScoreAgent to calculate fit scores.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IICPCriteria {
    industries?: string[];
    companySizes?: string[];  // e.g., "1-10", "11-50", "51-200", "201-500", "500+"
    jobTitles?: string[];
    jobLevels?: string[];  // e.g., "C-Suite", "VP", "Director", "Manager", "Individual"
    locations?: {
        countries?: string[];
        states?: string[];
        cities?: string[];
    };
    technologies?: string[];
    minRevenue?: number;
    maxRevenue?: number;
    minEmployees?: number;
    maxEmployees?: number;
    keywords?: string[];  // Keywords in company description
}

export interface IICPWeights {
    industryMatch: number;  // 0-100 weight
    sizeMatch: number;
    titleMatch: number;
    locationMatch: number;
    technologyMatch: number;
    revenueMatch: number;
}

export interface IICPDefinition extends Document {
    workspaceId: Types.ObjectId;

    // Basic Info
    name: string;
    description?: string;
    isDefault: boolean;  // Default ICP for the workspace

    // Criteria
    criteria: IICPCriteria;

    // Weights (how important each criterion is)
    weights: IICPWeights;

    // Stats
    matchingContactsCount?: number;
    lastCalculatedAt?: Date;
    avgFitScore?: number;

    // Metadata
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const icpCriteriaSchema = new Schema<IICPCriteria>({
    industries: [{ type: String }],
    companySizes: [{ type: String }],
    jobTitles: [{ type: String }],
    jobLevels: [{ type: String }],
    locations: {
        countries: [{ type: String }],
        states: [{ type: String }],
        cities: [{ type: String }],
    },
    technologies: [{ type: String }],
    minRevenue: { type: Number, min: 0 },
    maxRevenue: { type: Number, min: 0 },
    minEmployees: { type: Number, min: 0 },
    maxEmployees: { type: Number, min: 0 },
    keywords: [{ type: String }],
}, { _id: false });

const icpWeightsSchema = new Schema<IICPWeights>({
    industryMatch: { type: Number, min: 0, max: 100, default: 25 },
    sizeMatch: { type: Number, min: 0, max: 100, default: 20 },
    titleMatch: { type: Number, min: 0, max: 100, default: 25 },
    locationMatch: { type: Number, min: 0, max: 100, default: 10 },
    technologyMatch: { type: Number, min: 0, max: 100, default: 10 },
    revenueMatch: { type: Number, min: 0, max: 100, default: 10 },
}, { _id: false });

const icpDefinitionSchema = new Schema<IICPDefinition>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },

        name: {
            type: String,
            required: [true, "ICP name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        description: {
            type: String,
            maxlength: [500, "Description must be less than 500 characters"],
        },
        isDefault: {
            type: Boolean,
            default: false,
        },

        criteria: {
            type: icpCriteriaSchema,
            required: true,
            default: {},
        },

        weights: {
            type: icpWeightsSchema,
            required: true,
            default: {},
        },

        matchingContactsCount: { type: Number, default: 0 },
        lastCalculatedAt: { type: Date },
        avgFitScore: { type: Number, min: 0, max: 100 },

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
icpDefinitionSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
icpDefinitionSchema.index({ workspaceId: 1, isDefault: 1 });

// Ensure only one default per workspace
icpDefinitionSchema.pre("save", async function (next) {
    if (this.isDefault) {
        await mongoose.model("ICPDefinition").updateMany(
            { workspaceId: this.workspaceId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

const ICPDefinition = mongoose.model<IICPDefinition>("ICPDefinition", icpDefinitionSchema);

export default ICPDefinition;
