import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Notification Model
 * 
 * In-app notifications for user engagement.
 * Supports various notification types and action links.
 */

export type NotificationType =
    | "task_reminder"
    | "task_assigned"
    | "task_completed"
    | "deal_stage_change"
    | "deal_won"
    | "deal_lost"
    | "workflow_completed"
    | "workflow_failed"
    | "meeting_reminder"
    | "meeting_scheduled"
    | "email_received"
    | "email_opened"
    | "email_replied"
    | "mention"
    | "team_invite"
    | "system"
    | "custom";

export interface INotification extends Document {
    userId: Types.ObjectId;
    workspaceId?: Types.ObjectId;

    // Content
    type: NotificationType;
    title: string;
    message: string;

    // State
    read: boolean;
    readAt?: Date;

    // Action
    actionUrl?: string;
    actionLabel?: string;

    // Metadata
    metadata?: {
        entityType?: string;
        entityId?: Types.ObjectId;
        [key: string]: any;
    };

    // Priority
    priority?: "low" | "normal" | "high";

    // Expiration
    expiresAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            index: true,
        },

        // Content
        type: {
            type: String,
            enum: [
                "task_reminder",
                "task_assigned",
                "task_completed",
                "deal_stage_change",
                "deal_won",
                "deal_lost",
                "workflow_completed",
                "workflow_failed",
                "meeting_reminder",
                "meeting_scheduled",
                "email_received",
                "email_opened",
                "email_replied",
                "mention",
                "team_invite",
                "system",
                "custom",
            ],
            required: [true, "Notification type is required"],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [100, "Title must be less than 100 characters"],
        },
        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
            maxlength: [500, "Message must be less than 500 characters"],
        },

        // State
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },

        // Action
        actionUrl: {
            type: String,
            trim: true,
        },
        actionLabel: {
            type: String,
            trim: true,
            maxlength: [50, "Action label must be less than 50 characters"],
        },

        // Metadata
        metadata: {
            type: Schema.Types.Mixed,
        },

        // Priority
        priority: {
            type: String,
            enum: ["low", "normal", "high"],
            default: "normal",
        },

        // Expiration
        expiresAt: {
            type: Date,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 }); // Unread notifications
notificationSchema.index({ userId: 1, createdAt: -1 }); // All notifications timeline
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 }); // Filter by type
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId: Types.ObjectId | string) {
    const now = new Date();
    return this.updateMany(
        { userId: new Types.ObjectId(userId), read: false },
        { read: true, readAt: now }
    );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId: Types.ObjectId | string) {
    return this.countDocuments({ userId: new Types.ObjectId(userId), read: false });
};

const Notification = mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
