import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * UserAction Model
 * 
 * Tracks user actions for pattern detection and automation suggestions.
 * Used to detect repetitive patterns that could be automated.
 */
export interface IUserAction extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Action details
    actionType: string;
    page: string;
    resourceType?: string;
    resourceId?: Types.ObjectId;

    // Metadata
    metadata?: Record<string, any>;

    // Timing
    timestamp: Date;
    durationMs?: number;

    createdAt: Date;
}

const userActionSchema = new Schema<IUserAction>(
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

        // Action details
        actionType: {
            type: String,
            required: true,
            index: true,
        },
        page: {
            type: String,
            required: true,
            index: true,
        },
        resourceType: {
            type: String,
            index: true,
        },
        resourceId: {
            type: Schema.Types.ObjectId,
        },

        // Metadata
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },

        // Timing
        timestamp: {
            type: Date,
            default: Date.now,
            // index: true, // Removed - covered by compound indexes below (lines 85-90)
        },
        durationMs: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for pattern detection queries
userActionSchema.index({ workspaceId: 1, userId: 1, timestamp: -1 });
userActionSchema.index({ workspaceId: 1, userId: 1, actionType: 1, timestamp: -1 });
userActionSchema.index({ workspaceId: 1, page: 1, actionType: 1 });

// TTL index to auto-delete old actions (90 days)
userActionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const UserAction = mongoose.model<IUserAction>("UserAction", userActionSchema);

export default UserAction;
