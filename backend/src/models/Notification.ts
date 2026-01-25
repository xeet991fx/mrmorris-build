import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export interface INotification extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    type: "task_due" | "task_assigned" | "deal_won" | "deal_lost" | "new_lead" | "workflow_complete" | "mention" | "system" | "custom" | "agent_handoff";
    title: string;
    message: string;
    isRead: boolean;
    readAt?: Date;

    // Related entities
    relatedEntityType?: "task" | "contact" | "opportunity" | "workflow" | "campaign";
    relatedEntityId?: Types.ObjectId;

    // Action link
    actionUrl?: string;

    // Priority
    priority: "low" | "normal" | "high";

    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const notificationSchema = new Schema<INotification>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["task_due", "task_assigned", "deal_won", "deal_lost", "new_lead", "workflow_complete", "mention", "system", "custom", "agent_handoff"],
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        relatedEntityType: {
            type: String,
            enum: ["task", "contact", "opportunity", "workflow", "campaign"],
        },
        relatedEntityId: {
            type: Schema.Types.ObjectId,
        },
        actionUrl: {
            type: String,
        },
        priority: {
            type: String,
            enum: ["low", "normal", "high"],
            default: "normal",
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });

// ============================================
// MODEL
// ============================================

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
