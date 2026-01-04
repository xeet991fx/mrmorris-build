/**
 * Multi-Channel Sequence Model
 *
 * Orchestrates outreach across email, LinkedIn, SMS, and WhatsApp.
 * Automatically switches channels based on engagement.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export type ChannelType = 'email' | 'linkedin' | 'sms' | 'whatsapp' | 'phone';
export type StepActionType = 'send_message' | 'connect_linkedin' | 'send_sms' | 'wait' | 'condition';

export interface ISequenceStep {
    id: string;
    order: number;
    channel: ChannelType;
    action: StepActionType;

    // Delays
    delayDays?: number;
    delayHours?: number;

    // Message content
    subject?: string; // For email
    message: string; // Template with variables

    // Conditions
    condition?: {
        type: 'replied' | 'opened' | 'clicked' | 'connected' | 'no_response';
        channel?: ChannelType;
        timeframeHours?: number;
    };

    // Auto-switch channel logic
    fallbackChannel?: ChannelType;
    fallbackAfterHours?: number;
}

export interface IMultiChannelSequence extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Basic Info
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'paused' | 'archived';

    // Sequence Steps
    steps: ISequenceStep[];

    // Channel Priority
    channelPriority: ChannelType[]; // e.g., ['email', 'linkedin', 'sms']

    // Auto-Switch Rules
    autoSwitch: {
        enabled: boolean;
        rules: {
            fromChannel: ChannelType;
            toChannel: ChannelType;
            trigger: 'no_response' | 'bounced' | 'unsubscribed';
            afterHours: number;
        }[];
    };

    // Settings
    settings: {
        // Business hours
        onlyBusinessHours: boolean;
        businessHours: {
            start: string; // "09:00"
            end: string; // "17:00"
            timezone: string;
        };

        // Rate limiting
        maxContactsPerDay?: number;
        maxPerChannel?: Record<ChannelType, number>;

        // Auto-unenroll
        unenrollOnReply: boolean;
        unenrollOnBounce: boolean;
        unenrollOnUnsubscribe: boolean;

        // LinkedIn settings
        linkedin?: {
            addPersonalNote: boolean;
            waitForAcceptance: boolean;
            messageAfterConnection: boolean;
        };

        // SMS settings
        sms?: {
            twilioAccountSid: string;
            twilioAuthToken: string;
            fromNumber: string;
        };
    };

    // Stats
    stats: {
        totalEnrolled: number;
        currentlyActive: number;
        completed: number;
        replied: number;
        bounced: number;
        unsubscribed: number;

        // Channel stats
        channelStats: {
            [key in ChannelType]?: {
                sent: number;
                delivered: number;
                opened?: number;
                clicked?: number;
                replied: number;
            };
        };
    };

    createdAt: Date;
    updatedAt: Date;
}

// Sequence Step Schema
const sequenceStepSchema = new Schema<ISequenceStep>({
    id: { type: String, required: true },
    order: { type: Number, required: true },
    channel: {
        type: String,
        enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
        required: true,
    },
    action: {
        type: String,
        enum: ['send_message', 'connect_linkedin', 'send_sms', 'wait', 'condition'],
        required: true,
    },

    delayDays: { type: Number },
    delayHours: { type: Number },

    subject: { type: String },
    message: { type: String, required: true },

    condition: {
        type: {
            type: String,
            enum: ['replied', 'opened', 'clicked', 'connected', 'no_response'],
        },
        channel: {
            type: String,
            enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
        },
        timeframeHours: { type: Number },
    },

    fallbackChannel: {
        type: String,
        enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
    },
    fallbackAfterHours: { type: Number },
}, { _id: false });

// Main Schema
const multiChannelSequenceSchema = new Schema<IMultiChannelSequence>(
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

        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: { type: String },
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'archived'],
            default: 'draft',
            index: true,
        },

        steps: [sequenceStepSchema],

        channelPriority: [{
            type: String,
            enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
        }],

        autoSwitch: {
            enabled: { type: Boolean, default: false },
            rules: [{
                fromChannel: {
                    type: String,
                    enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
                },
                toChannel: {
                    type: String,
                    enum: ['email', 'linkedin', 'sms', 'whatsapp', 'phone'],
                },
                trigger: {
                    type: String,
                    enum: ['no_response', 'bounced', 'unsubscribed'],
                },
                afterHours: { type: Number },
            }],
        },

        settings: {
            onlyBusinessHours: { type: Boolean, default: true },
            businessHours: {
                start: { type: String, default: "09:00" },
                end: { type: String, default: "17:00" },
                timezone: { type: String, default: "America/New_York" },
            },

            maxContactsPerDay: { type: Number },
            maxPerChannel: {
                type: Map,
                of: Number,
            },

            unenrollOnReply: { type: Boolean, default: true },
            unenrollOnBounce: { type: Boolean, default: true },
            unenrollOnUnsubscribe: { type: Boolean, default: true },

            linkedin: {
                addPersonalNote: { type: Boolean, default: true },
                waitForAcceptance: { type: Boolean, default: true },
                messageAfterConnection: { type: Boolean, default: true },
            },

            sms: {
                twilioAccountSid: { type: String },
                twilioAuthToken: { type: String },
                fromNumber: { type: String },
            },
        },

        stats: {
            totalEnrolled: { type: Number, default: 0 },
            currentlyActive: { type: Number, default: 0 },
            completed: { type: Number, default: 0 },
            replied: { type: Number, default: 0 },
            bounced: { type: Number, default: 0 },
            unsubscribed: { type: Number, default: 0 },

            channelStats: {
                type: Map,
                of: {
                    sent: { type: Number, default: 0 },
                    delivered: { type: Number, default: 0 },
                    opened: { type: Number, default: 0 },
                    clicked: { type: Number, default: 0 },
                    replied: { type: Number, default: 0 },
                },
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
multiChannelSequenceSchema.index({ workspaceId: 1, status: 1 });
multiChannelSequenceSchema.index({ workspaceId: 1, createdAt: -1 });

const MultiChannelSequence = mongoose.model<IMultiChannelSequence>(
    "MultiChannelSequence",
    multiChannelSequenceSchema
);

export default MultiChannelSequence;
