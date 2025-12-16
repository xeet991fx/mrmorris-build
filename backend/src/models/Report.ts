import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Report Model
 * 
 * Custom reports for analytics and data visualization.
 */

export type ReportType =
    | "contacts"
    | "companies"
    | "opportunities"
    | "activities"
    | "tasks"
    | "emails"
    | "custom";

export interface IReportFilter {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "gte" | "lte" | "in" | "between";
    value: any;
}

export interface IReportColumn {
    field: string;
    label: string;
    visible: boolean;
    width?: number;
}

export interface IReport extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;

    // Core fields
    name: string;
    description?: string;
    type: ReportType;

    // Configuration
    baseEntity: string; // e.g., "Contact", "Opportunity"
    filters: IReportFilter[];
    columns: IReportColumn[];
    sortBy?: {
        field: string;
        order: "asc" | "desc";
    };
    limit?: number;

    // Grouping/Aggregation
    groupBy?: string;
    aggregations?: Array<{
        field: string;
        operation: "count" | "sum" | "avg" | "min" | "max";
        label: string;
    }>;

    // Visualization
    chartType?: "bar" | "line" | "pie" | "table" | "funnel";
    chartConfig?: Record<string, any>;

    // Scheduling
    isScheduled: boolean;
    schedule?: {
        frequency: "daily" | "weekly" | "monthly";
        dayOfWeek?: number;
        dayOfMonth?: number;
        time: string;
        recipients: string[]; // emails
    };

    // Access
    isPublic: boolean;
    sharedWith?: Types.ObjectId[];

    // Stats
    lastRunAt?: Date;
    runCount: number;

    createdAt: Date;
    updatedAt: Date;
}

const reportFilterSchema = new Schema<IReportFilter>(
    {
        field: { type: String, required: true },
        operator: {
            type: String,
            enum: ["equals", "not_equals", "contains", "gt", "lt", "gte", "lte", "in", "between"],
            required: true,
        },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { _id: false }
);

const reportColumnSchema = new Schema<IReportColumn>(
    {
        field: { type: String, required: true },
        label: { type: String, required: true },
        visible: { type: Boolean, default: true },
        width: Number,
    },
    { _id: false }
);

const reportSchema = new Schema<IReport>(
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

        // Core
        name: {
            type: String,
            required: [true, "Report name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        description: {
            type: String,
            maxlength: [500, "Description must be less than 500 characters"],
        },
        type: {
            type: String,
            enum: ["contacts", "companies", "opportunities", "activities", "tasks", "emails", "custom"],
            required: true,
        },

        // Config
        baseEntity: {
            type: String,
            required: true,
        },
        filters: {
            type: [reportFilterSchema],
            default: [],
        },
        columns: {
            type: [reportColumnSchema],
            default: [],
        },
        sortBy: {
            field: String,
            order: { type: String, enum: ["asc", "desc"] },
        },
        limit: {
            type: Number,
            min: 1,
            max: 10000,
        },

        // Grouping
        groupBy: String,
        aggregations: [{
            field: { type: String, required: true },
            operation: {
                type: String,
                enum: ["count", "sum", "avg", "min", "max"],
                required: true,
            },
            label: { type: String, required: true },
        }],

        // Visualization
        chartType: {
            type: String,
            enum: ["bar", "line", "pie", "table", "funnel"],
            default: "table",
        },
        chartConfig: Schema.Types.Mixed,

        // Scheduling
        isScheduled: {
            type: Boolean,
            default: false,
        },
        schedule: {
            frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
            dayOfWeek: Number,
            dayOfMonth: Number,
            time: String,
            recipients: [String],
        },

        // Access
        isPublic: {
            type: Boolean,
            default: false,
        },
        sharedWith: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],

        // Stats
        lastRunAt: Date,
        runCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
reportSchema.index({ workspaceId: 1, createdBy: 1 });
reportSchema.index({ workspaceId: 1, type: 1 });

const Report = mongoose.model<IReport>("Report", reportSchema);

export default Report;
