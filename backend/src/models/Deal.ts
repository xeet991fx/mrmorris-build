import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDeal extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Basic Information
    name: string;
    description?: string;

    // Related Entities
    companyId?: Types.ObjectId;
    contacts?: Types.ObjectId[];
    assignedTo?: Types.ObjectId;

    // Deal Pipeline
    stage: "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
    stageChangedAt?: Date;
    stageHistory?: Array<{
        stage: string;
        changedAt: Date;
        changedBy: Types.ObjectId;
    }>;

    // Financial
    value: number;
    currency: string;
    expectedRevenue?: number; // value * probability

    // Timeline
    closeDate?: Date;
    expectedCloseDate?: Date;
    createdAt: Date;
    updatedAt: Date;

    // Scoring
    probability?: number; // 0-100
    icpFit?: "excellent" | "good" | "medium" | "low";
    connectionStrength?: "very_strong" | "strong" | "good" | "weak";

    // Source & Tracking
    source?: string;
    lostReason?: string;
    wonReason?: string;
    tags?: string[];
    notes?: string;

    // Custom Fields
    customFields?: Map<string, any>;

    // AI Insights
    aiInsights?: {
        winProbability?: number;
        nextBestAction?: string;
        riskFactors?: string[];
        lastAnalyzedAt?: Date;
    };
}

const dealSchema = new Schema<IDeal>(
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
            index: true,
        },

        // Basic Information
        name: {
            type: String,
            required: [true, "Deal name is required"],
            trim: true,
            maxlength: [200, "Deal name must be less than 200 characters"],
        },
        description: {
            type: String,
            maxlength: [2000, "Description must be less than 2000 characters"],
        },

        // Related Entities
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            index: true,
        },
        contacts: [{
            type: Schema.Types.ObjectId,
            ref: "Contact",
        }],
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        // Deal Pipeline
        stage: {
            type: String,
            enum: ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
            default: "lead",
            index: true,
        },
        stageChangedAt: { type: Date },
        stageHistory: [{
            stage: { type: String, required: true },
            changedAt: { type: Date, required: true },
            changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        }],

        // Financial
        value: {
            type: Number,
            default: 0,
            min: [0, "Deal value cannot be negative"],
        },
        currency: {
            type: String,
            default: "USD",
            maxlength: 3,
        },
        expectedRevenue: {
            type: Number,
            min: 0,
        },

        // Timeline
        closeDate: { type: Date },
        expectedCloseDate: { type: Date },

        // Scoring
        probability: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        icpFit: {
            type: String,
            enum: ["excellent", "good", "medium", "low"],
        },
        connectionStrength: {
            type: String,
            enum: ["very_strong", "strong", "good", "weak"],
        },

        // Source & Tracking
        source: { type: String, trim: true },
        lostReason: { type: String },
        wonReason: { type: String },
        tags: [{ type: String }],
        notes: { type: String },

        // Custom Fields
        customFields: {
            type: Map,
            of: Schema.Types.Mixed,
            default: () => new Map(),
        },

        // AI Insights
        aiInsights: {
            winProbability: { type: Number, min: 0, max: 100 },
            nextBestAction: { type: String },
            riskFactors: [{ type: String }],
            lastAnalyzedAt: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
dealSchema.index({ workspaceId: 1, createdAt: -1 });
dealSchema.index({ workspaceId: 1, stage: 1 });
dealSchema.index({ workspaceId: 1, companyId: 1 });
dealSchema.index({ workspaceId: 1, assignedTo: 1 });
dealSchema.index({ workspaceId: 1, expectedCloseDate: 1 });
dealSchema.index({ workspaceId: 1, value: -1 });

// Text index for search
dealSchema.index({
    name: "text",
    description: "text",
});

// Pre-save middleware to track stage changes
dealSchema.pre("save", function (next) {
    if (this.isModified("stage")) {
        this.stageChangedAt = new Date();

        // Calculate expected revenue
        if (this.value && this.probability) {
            this.expectedRevenue = this.value * (this.probability / 100);
        }
    }
    next();
});

const Deal = mongoose.model<IDeal>("Deal", dealSchema);

export default Deal;
