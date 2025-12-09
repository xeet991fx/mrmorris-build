import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// INTERFACE
// ============================================

export interface IWarmupActivity extends Document {
    fromAccountId: Types.ObjectId;
    toAccountId: Types.ObjectId;

    subject: string;
    body: string;

    sentAt: Date;
    opened: boolean;
    openedAt?: Date;
    replied: boolean;
    repliedAt?: Date;
    markedAsSpam: boolean;
    movedFromSpam: boolean;

    // Tracking
    messageId: string;
}

// ============================================
// SCHEMA
// ============================================

const warmupActivitySchema = new Schema<IWarmupActivity>(
    {
        fromAccountId: {
            type: Schema.Types.ObjectId,
            ref: "EmailAccount",
            required: true,
            index: true,
        },
        toAccountId: {
            type: Schema.Types.ObjectId,
            ref: "EmailAccount",
            required: true,
            index: true,
        },

        subject: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },

        sentAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        opened: {
            type: Boolean,
            default: false,
        },
        openedAt: Date,
        replied: {
            type: Boolean,
            default: false,
        },
        repliedAt: Date,
        markedAsSpam: {
            type: Boolean,
            default: false,
        },
        movedFromSpam: {
            type: Boolean,
            default: false,
        },

        messageId: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: false, // We use sentAt instead
    }
);

// ============================================
// INDEXES
// ============================================

warmupActivitySchema.index({ fromAccountId: 1, sentAt: -1 });
warmupActivitySchema.index({ toAccountId: 1, sentAt: -1 });

// ============================================
// EXPORT
// ============================================

const WarmupActivity = mongoose.model<IWarmupActivity>("WarmupActivity", warmupActivitySchema);

export default WarmupActivity;
