import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Forecast Model
 * 
 * Sales forecasting and quota tracking.
 */

export type ForecastPeriod = "monthly" | "quarterly" | "yearly";

export interface IForecastEntry {
    userId?: Types.ObjectId;
    teamId?: Types.ObjectId;
    quota: number;
    committed: number; // High confidence deals
    bestCase: number; // Medium confidence deals
    pipeline: number; // All open deals
    closed: number; // Actually closed
}

export interface IForecast extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;

    // Period
    period: ForecastPeriod;
    startDate: Date;
    endDate: Date;
    name: string; // e.g., "Q1 2024"

    // Entries per user/team
    entries: IForecastEntry[];

    // Totals (calculated)
    totalQuota: number;
    totalCommitted: number;
    totalBestCase: number;
    totalPipeline: number;
    totalClosed: number;

    // Settings
    commitThreshold: number; // % probability for committed (default 80%)
    bestCaseThreshold: number; // % probability for best case (default 50%)

    // Status
    status: "draft" | "active" | "closed";

    createdAt: Date;
    updatedAt: Date;
}

const forecastEntrySchema = new Schema<IForecastEntry>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: "Team",
        },
        quota: {
            type: Number,
            default: 0,
            min: 0,
        },
        committed: {
            type: Number,
            default: 0,
            min: 0,
        },
        bestCase: {
            type: Number,
            default: 0,
            min: 0,
        },
        pipeline: {
            type: Number,
            default: 0,
            min: 0,
        },
        closed: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const forecastSchema = new Schema<IForecast>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Period
        period: {
            type: String,
            enum: ["monthly", "quarterly", "yearly"],
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Entries
        entries: {
            type: [forecastEntrySchema],
            default: [],
        },

        // Totals
        totalQuota: {
            type: Number,
            default: 0,
        },
        totalCommitted: {
            type: Number,
            default: 0,
        },
        totalBestCase: {
            type: Number,
            default: 0,
        },
        totalPipeline: {
            type: Number,
            default: 0,
        },
        totalClosed: {
            type: Number,
            default: 0,
        },

        // Settings
        commitThreshold: {
            type: Number,
            default: 80,
            min: 0,
            max: 100,
        },
        bestCaseThreshold: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },

        // Status
        status: {
            type: String,
            enum: ["draft", "active", "closed"],
            default: "draft",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
forecastSchema.index({ workspaceId: 1, period: 1, startDate: 1 });
forecastSchema.index({ "entries.userId": 1 });

// Pre-save: Calculate totals
forecastSchema.pre("save", function (next) {
    if (this.entries && this.entries.length > 0) {
        this.totalQuota = this.entries.reduce((sum, e) => sum + (e.quota || 0), 0);
        this.totalCommitted = this.entries.reduce((sum, e) => sum + (e.committed || 0), 0);
        this.totalBestCase = this.entries.reduce((sum, e) => sum + (e.bestCase || 0), 0);
        this.totalPipeline = this.entries.reduce((sum, e) => sum + (e.pipeline || 0), 0);
        this.totalClosed = this.entries.reduce((sum, e) => sum + (e.closed || 0), 0);
    }
    next();
});

const Forecast = mongoose.model<IForecast>("Forecast", forecastSchema);

export default Forecast;
