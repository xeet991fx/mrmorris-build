import mongoose, { Document, Schema } from "mongoose";

export interface IWebhookSubscription extends Document {
    workspaceId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    url: string;
    events: string[]; // e.g., ["contact.created", "deal.won", "email.opened"]
    isActive: boolean;
    secret?: string; // For signature verification
    headers?: Record<string, string>;
    retryCount: number;
    lastTriggeredAt?: Date;
    lastError?: string;
    createdAt: Date;
    updatedAt: Date;
}

const webhookSubscriptionSchema = new Schema<IWebhookSubscription>(
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
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
        events: {
            type: [String],
            required: true,
            validate: {
                validator: (v: string[]) => v.length > 0,
                message: "At least one event must be specified",
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        secret: {
            type: String,
        },
        headers: {
            type: Map,
            of: String,
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        lastTriggeredAt: {
            type: Date,
        },
        lastError: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
webhookSubscriptionSchema.index({ workspaceId: 1, isActive: 1 });
webhookSubscriptionSchema.index({ events: 1 });

const WebhookSubscription = mongoose.model<IWebhookSubscription>(
    "WebhookSubscription",
    webhookSubscriptionSchema
);

export default WebhookSubscription;
