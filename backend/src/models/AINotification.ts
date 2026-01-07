/**
 * AI Notification Model
 * 
 * Stores proactive AI-generated notifications and insights.
 * Used to push AI insights to users without them having to ask.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType =
    | 'meeting_prep'
    | 'stale_deal_alert'
    | 'hot_lead_alert'
    | 'deal_insight'
    | 'contact_insight'
    | 'campaign_insight'
    | 'workflow_suggestion'
    | 'daily_digest'
    | 'urgent_action';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IAINotification extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Notification content
    type: NotificationType;
    title: string;
    message: string; // Short preview (for notification panel)
    fullContent?: string; // Full AI response

    // Priority & Status
    priority: NotificationPriority;
    status: 'pending' | 'shown' | 'acted' | 'dismissed' | 'expired';

    // Context linking
    contextType?: 'contact' | 'deal' | 'campaign' | 'calendar_event' | 'workflow' | 'email';
    contextId?: Types.ObjectId;

    // Metadata
    metadata?: Record<string, any>;

    // Actions
    suggestedAction?: {
        label: string;
        url?: string;
        actionType?: string;
    };

    // Interaction tracking
    shownAt?: Date;
    actedAt?: Date;
    dismissedAt?: Date;
    feedback?: {
        helpful: boolean;
        comment?: string;
    };

    // Expiration
    expiresAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const aiNotificationSchema = new Schema<IAINotification>(
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
            required: true,
            enum: [
                'meeting_prep',
                'stale_deal_alert',
                'hot_lead_alert',
                'deal_insight',
                'contact_insight',
                'campaign_insight',
                'workflow_suggestion',
                'daily_digest',
                'urgent_action',
            ],
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
        fullContent: {
            type: String,
        },

        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'shown', 'acted', 'dismissed', 'expired'],
            default: 'pending',
            index: true,
        },

        contextType: {
            type: String,
            enum: ['contact', 'deal', 'campaign', 'calendar_event', 'workflow', 'email'],
        },
        contextId: {
            type: Schema.Types.ObjectId,
        },

        metadata: {
            type: Schema.Types.Mixed,
        },

        suggestedAction: {
            label: { type: String },
            url: { type: String },
            actionType: { type: String },
        },

        shownAt: { type: Date },
        actedAt: { type: Date },
        dismissedAt: { type: Date },
        feedback: {
            helpful: { type: Boolean },
            comment: { type: String },
        },

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
aiNotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
aiNotificationSchema.index({ workspaceId: 1, type: 1, createdAt: -1 });
aiNotificationSchema.index({ userId: 1, priority: 1, status: 1 });

// TTL index for auto-expiring notifications
aiNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AINotification = mongoose.model<IAINotification>("AINotification", aiNotificationSchema);

export default AINotification;
