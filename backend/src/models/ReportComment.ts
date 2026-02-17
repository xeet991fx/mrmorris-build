import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReportComment extends Document {
    workspaceId: Types.ObjectId;
    dashboardId: Types.ObjectId;
    widgetId: Types.ObjectId;
    userId: Types.ObjectId;
    text: string;
    mentions: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const reportCommentSchema = new Schema<IReportComment>(
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
        widgetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
            maxlength: 2000,
        },
        mentions: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    { timestamps: true }
);

reportCommentSchema.index({ dashboardId: 1, widgetId: 1, createdAt: -1 });

const ReportComment = mongoose.model<IReportComment>(
    "ReportComment",
    reportCommentSchema
);

export default ReportComment;
