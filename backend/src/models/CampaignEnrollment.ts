import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EnrollmentStatus =
    | 'pending'
    | 'active'
    | 'completed'
    | 'replied'
    | 'bounced'
    | 'unsubscribed'
    | 'paused';

export interface ISentEmail {
    stepId: string;
    messageId: string;
    sentAt: Date;
    fromAccountId: Types.ObjectId;
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    replied: boolean;
    repliedAt?: Date;
    bounced: boolean;
    bouncedAt?: Date;
}

export interface ICampaignEnrollment extends Document {
    campaignId: Types.ObjectId;
    contactId: Types.ObjectId;
    workspaceId: Types.ObjectId;

    status: EnrollmentStatus;

    currentStepIndex: number;
    nextSendAt?: Date;

    // Sent emails tracking
    emailsSent: ISentEmail[];

    // Timestamps
    enrolledAt: Date;
    completedAt?: Date;
    pausedAt?: Date;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const sentEmailSchema = new Schema<ISentEmail>(
    {
        stepId: { type: String, required: true },
        messageId: { type: String, required: true },
        sentAt: { type: Date, required: true },
        fromAccountId: {
            type: Schema.Types.ObjectId,
            ref: "EmailAccount",
            required: true,
        },
        opened: { type: Boolean, default: false },
        openedAt: Date,
        clicked: { type: Boolean, default: false },
        clickedAt: Date,
        replied: { type: Boolean, default: false },
        repliedAt: Date,
        bounced: { type: Boolean, default: false },
        bouncedAt: Date,
    },
    { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const campaignEnrollmentSchema = new Schema<ICampaignEnrollment>(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
            index: true,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            required: true,
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'replied', 'bounced', 'unsubscribed', 'paused'],
            default: 'pending',
            index: true,
        },

        currentStepIndex: {
            type: Number,
            default: 0,
        },
        nextSendAt: {
            type: Date,
            index: true,
        },

        // Sent emails
        emailsSent: {
            type: [sentEmailSchema],
            default: [],
        },

        // Timestamps
        enrolledAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: Date,
        pausedAt: Date,
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

campaignEnrollmentSchema.index({ campaignId: 1, status: 1 });
campaignEnrollmentSchema.index({ nextSendAt: 1, status: 1 });
campaignEnrollmentSchema.index({ workspaceId: 1, contactId: 1, campaignId: 1 }, { unique: true });

// ============================================
// EXPORT
// ============================================

const CampaignEnrollment = mongoose.model<ICampaignEnrollment>(
    "CampaignEnrollment",
    campaignEnrollmentSchema
);

export default CampaignEnrollment;
