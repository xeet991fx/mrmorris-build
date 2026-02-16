import mongoose, { Document, Schema, Types } from "mongoose";
import { ReportDefinition, FilterCondition } from "../services/ReportQueryEngine";

// ─── Report Widget Configuration ───────────────────────────────

export type ReportType =
    | "insight"              // Real-time KPI (count, sum, avg)
    | "historical"           // Metric over time (line/area)
    | "funnel"               // Pipeline conversion rates
    | "time_in_stage"        // Duration in pipeline stages
    | "stage_changed"        // Transitions per period
    | "email"                // Email performance metrics
    | "top_performers"       // Team leaderboard
    | "lead_sources"         // Lead source breakdown
    | "forecast"             // Revenue projections
    | "at_risk"              // At-risk deals
    | "deal_velocity"        // Pipeline velocity & sales cycle
    | "activity_breakdown"   // Activity analytics & heatmaps
    | "campaign_performance" // Campaign/sequence analytics
    | "lifecycle_funnel"     // Contact lifecycle stages
    | "call_insights"        // Call recording analytics
    | "deal_cohort"          // Cohort analysis by month
    | "task_productivity"    // Task completion analytics
    | "website";             // Website traffic analytics

export type ChartType =
    | "number"   // Big stat card with trend
    | "bar"      // Vertical/horizontal bar chart
    | "line"     // Line/area chart
    | "pie"      // Pie/donut chart
    | "funnel"   // Funnel visualization
    | "table";   // Data table

// ─── Report Widget Interface ───────────────────────────────────
// Note: ReportDefinition and FilterCondition are imported from ReportQueryEngine

export interface IReportWidget {
    _id?: Types.ObjectId;
    type: ReportType;
    title: string;
    chartType: ChartType;
    config: Record<string, any>;  // type-specific configuration (legacy)
    definition?: ReportDefinition; // New: dynamic report definition
    note?: string;                 // P2: optional user annotation
    position: {
        x: number;    // column (0-based)
        y: number;    // row (0-based)
        w: number;    // width in columns (1-4)
        h: number;    // height in rows (1-3)
    };
}

// ─── Dashboard Document ────────────────────────────────────────

export interface IReportDashboard extends Document {
    workspaceId: Types.ObjectId;
    name: string;
    description?: string;
    reports: IReportWidget[];
    isFavorite: boolean;
    isDefault: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const reportWidgetSchema = new Schema<IReportWidget>(
    {
        type: {
            type: String,
            required: true,
            enum: [
                "insight", "historical", "funnel", "time_in_stage", "stage_changed",
                "email", "top_performers", "lead_sources", "forecast", "at_risk",
                "deal_velocity", "activity_breakdown", "campaign_performance",
                "lifecycle_funnel", "call_insights", "deal_cohort", "task_productivity",
                "website",
            ],
        },
        title: { type: String, required: true, maxlength: 100 },
        chartType: {
            type: String,
            required: true,
            enum: ["number", "bar", "line", "pie", "funnel", "table"],
        },
        config: { type: Schema.Types.Mixed, default: {} },
        definition: { type: Schema.Types.Mixed, required: false },  // Dynamic report definition
        note: { type: String, maxlength: 300 },  // P2: user annotation
        position: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            w: { type: Number, default: 2, min: 1, max: 4 },
            h: { type: Number, default: 1, min: 1, max: 3 },
        },
    },
    { _id: true }
);

const reportDashboardSchema = new Schema<IReportDashboard>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        reports: [reportWidgetSchema],
        isFavorite: { type: Boolean, default: false },
        isDefault: { type: Boolean, default: false },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

reportDashboardSchema.index({ workspaceId: 1, createdAt: -1 });
reportDashboardSchema.index({ workspaceId: 1, isFavorite: 1 });

const ReportDashboard = mongoose.model<IReportDashboard>(
    "ReportDashboard",
    reportDashboardSchema
);

export default ReportDashboard;
