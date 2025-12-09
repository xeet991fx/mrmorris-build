import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface ICampaignStep {
    id: string;
    order: number;
    type: 'email';
    delayDays: number;
    delayHours: number;

    subject: string;
    body: string;
    useAIPersonalization: boolean;

    // Conditional sending
    sendIf?: {
        previousEmailOpened?: boolean;
        previousEmailClicked?: boolean;
        previousEmailReplied?: boolean;
    };
}

export interface ISendingSchedule {
    timezone: string;
    startTime: string; // "09:00"
    endTime: string;   // "17:00"
    sendOnWeekends: boolean;
}

export interface ICampaignStats {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    positiveReplies: number;
    negativeReplies: number;
}

export interface ICampaign extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    name: string;
    description?: string;
    status: CampaignStatus;

    // Sending settings
    fromAccounts: Types.ObjectId[]; // EmailAccount IDs to rotate
    dailyLimit: number;
    sendingSchedule: ISendingSchedule;

    // Sequence steps
    steps: ICampaignStep[];

    // Enrollment
    totalEnrolled: number;
    activeEnrollments: number;
    completedEnrollments: number;

    // Stats
    stats: ICampaignStats;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const campaignStepSchema = new Schema<ICampaignStep>(
    {
        id: { type: String, required: true },
        order: { type: Number, required: true },
        type: { type: String, default: 'email' },
        delayDays: { type: Number, default: 0 },
        delayHours: { type: Number, default: 0 },

        subject: { type: String, required: true },
        body: { type: String, required: true },
        useAIPersonalization: { type: Boolean, default: false },

        sendIf: {
            previousEmailOpened: Boolean,
            previousEmailClicked: Boolean,
            previousEmailReplied: Boolean,
        },
    },
    { _id: false }
);

const sendingScheduleSchema = new Schema<ISendingSchedule>(
    {
        timezone: { type: String, default: 'UTC' },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '17:00' },
        sendOnWeekends: { type: Boolean, default: false },
    },
    { _id: false }
);

const campaignStatsSchema = new Schema<ICampaignStats>(
    {
        sent: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 },
        replied: { type: Number, default: 0 },
        bounced: { type: Number, default: 0 },
        unsubscribed: { type: Number, default: 0 },
        positiveReplies: { type: Number, default: 0 },
        negativeReplies: { type: Number, default: 0 },
    },
    { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const campaignSchema = new Schema<ICampaign>(
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

        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'completed'],
            default: 'draft',
            index: true,
        },

        // Sending settings
        fromAccounts: [{
            type: Schema.Types.ObjectId,
            ref: "EmailAccount",
        }],
        dailyLimit: {
            type: Number,
            default: 50,
        },
        sendingSchedule: {
            type: sendingScheduleSchema,
            default: () => ({}),
        },

        // Sequence steps
        steps: {
            type: [campaignStepSchema],
            default: [],
        },

        // Enrollment counts
        totalEnrolled: {
            type: Number,
            default: 0,
        },
        activeEnrollments: {
            type: Number,
            default: 0,
        },
        completedEnrollments: {
            type: Number,
            default: 0,
        },

        // Stats
        stats: {
            type: campaignStatsSchema,
            default: () => ({}),
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

campaignSchema.index({ workspaceId: 1, status: 1 });
campaignSchema.index({ workspaceId: 1, createdAt: -1 });

// ============================================
// EXPORT
// ============================================

const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);

export default Campaign;
