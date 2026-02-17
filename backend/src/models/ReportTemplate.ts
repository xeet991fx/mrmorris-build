/**
 * Report Template Model
 * 
 * Allows users to save widget configurations as reusable templates.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReportTemplate extends Document {
    workspaceId: Types.ObjectId;
    name: string;
    description?: string;
    type: string;
    chartType: string;
    config: Record<string, any>;
    definition?: Record<string, any>;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const reportTemplateSchema = new Schema<IReportTemplate>(
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
            maxlength: 300,
        },
        type: { type: String, required: true },
        chartType: { type: String, required: true },
        config: { type: Schema.Types.Mixed, default: {} },
        definition: { type: Schema.Types.Mixed },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

reportTemplateSchema.index({ workspaceId: 1, createdAt: -1 });

const ReportTemplate = mongoose.model<IReportTemplate>(
    "ReportTemplate",
    reportTemplateSchema
);

export default ReportTemplate;
