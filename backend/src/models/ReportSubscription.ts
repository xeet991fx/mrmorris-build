import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReportSubscription extends Document {
    workspaceId: Types.ObjectId;
    dashboardId: Types.ObjectId;
    createdBy: Types.ObjectId;
    // Schedule config
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
    dayOfMonth?: number; // 1-31 for monthly
    timeOfDay: string; // HH:mm in 24h format, e.g. "08:00"
    timezone: string; // IANA timezone, e.g. "America/New_York"
    // Recipients
    recipients: {
        email: string;
        name?: string;
    }[];
    // Config
    subject?: string; // Custom email subject
    message?: string; // Custom message to include
    format: "pdf" | "inline" | "csv";
    isActive: boolean;
    lastSentAt?: Date;
    nextRunAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const reportSubscriptionSchema = new Schema<IReportSubscription>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        dashboardId: {
            type: Schema.Types.ObjectId,
            ref: "ReportDashboard",
            required: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        frequency: {
            type: String,
            enum: ["daily", "weekly", "monthly"],
            required: true,
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
        },
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31,
        },
        timeOfDay: {
            type: String,
            required: true,
            default: "08:00",
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        timezone: {
            type: String,
            required: true,
            default: "UTC",
        },
        recipients: [
            {
                email: { type: String, required: true },
                name: { type: String },
            },
        ],
        subject: {
            type: String,
            maxlength: 200,
        },
        message: {
            type: String,
            maxlength: 1000,
        },
        format: {
            type: String,
            enum: ["pdf", "inline", "csv"],
            default: "pdf",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastSentAt: { type: Date },
        nextRunAt: { type: Date, index: true },
    },
    { timestamps: true }
);

// Index for finding due subscriptions
reportSubscriptionSchema.index({ isActive: 1, nextRunAt: 1 });

const ReportSubscription = mongoose.model<IReportSubscription>(
    "ReportSubscription",
    reportSubscriptionSchema
);

export default ReportSubscription;
