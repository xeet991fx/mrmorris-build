/**
 * LinkedIn Activity Model
 * 
 * Tracks manual LinkedIn interactions (messages sent, connection requests, etc.)
 * Since LinkedIn API doesn't support messaging, we log activities manually.
 */

import mongoose, { Schema, Document, Types } from "mongoose";

// Activity types for LinkedIn interactions
export type LinkedInActivityType =
    | "message_sent"
    | "message_received"
    | "connection_request_sent"
    | "connection_request_received"
    | "connection_accepted"
    | "profile_viewed"
    | "note"
    | "inmail_sent"
    | "inmail_received";

export interface ILinkedInActivity extends Document {
    workspaceId: Types.ObjectId;
    contactId: Types.ObjectId;
    userId: Types.ObjectId; // User who logged this activity
    type: LinkedInActivityType;
    subject?: string;
    content: string;
    linkedinUrl?: string;
    direction: "inbound" | "outbound";
    isRead: boolean;
    activityDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const linkedInActivitySchema = new Schema<ILinkedInActivity>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "message_sent",
                "message_received",
                "connection_request_sent",
                "connection_request_received",
                "connection_accepted",
                "profile_viewed",
                "note",
                "inmail_sent",
                "inmail_received",
            ],
            required: true,
        },
        subject: {
            type: String,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        linkedinUrl: {
            type: String,
            trim: true,
        },
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            default: "outbound",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        activityDate: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
linkedInActivitySchema.index({ workspaceId: 1, createdAt: -1 });
linkedInActivitySchema.index({ workspaceId: 1, contactId: 1, createdAt: -1 });
linkedInActivitySchema.index({ workspaceId: 1, isRead: 1 });
linkedInActivitySchema.index({ workspaceId: 1, type: 1 });

// Virtual for formatted type label
linkedInActivitySchema.virtual("typeLabel").get(function () {
    const labels: Record<LinkedInActivityType, string> = {
        message_sent: "Message Sent",
        message_received: "Message Received",
        connection_request_sent: "Connection Request Sent",
        connection_request_received: "Connection Request Received",
        connection_accepted: "Connection Accepted",
        profile_viewed: "Profile Viewed",
        note: "Note",
        inmail_sent: "InMail Sent",
        inmail_received: "InMail Received",
    };
    return labels[this.type] || this.type;
});

// Ensure virtuals are included in JSON
linkedInActivitySchema.set("toJSON", { virtuals: true });
linkedInActivitySchema.set("toObject", { virtuals: true });

const LinkedInActivity = mongoose.model<ILinkedInActivity>(
    "LinkedInActivity",
    linkedInActivitySchema
);

export default LinkedInActivity;
