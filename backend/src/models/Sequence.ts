import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Email Sequence Model
 * 
 * Represents a multi-step email campaign that sends emails over time.
 * Similar to HubSpot Sequences - contacts are enrolled and receive
 * a series of emails with delays between them.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface ISequenceStep {
    id: string;
    order: number;
    templateId?: Types.ObjectId;          // Reference to EmailTemplate
    subject: string;
    body: string;
    delay: {
        value: number;
        unit: 'hours' | 'days' | 'weeks';
    };
}

export interface ISequenceEnrollment {
    _id?: Types.ObjectId;
    contactId: Types.ObjectId;
    currentStepIndex: number;
    status: 'active' | 'completed' | 'unenrolled' | 'replied' | 'bounced';
    enrolledAt: Date;
    nextEmailAt?: Date;
    lastEmailAt?: Date;
    completedAt?: Date;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
}

export interface ISequenceStats {
    totalEnrolled: number;
    currentlyActive: number;
    completed: number;
    replied: number;
    unenrolled: number;
}

// ============================================
// MAIN DOCUMENT INTERFACE
// ============================================

export interface ISequence extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Metadata
    name: string;
    description?: string;

    // Status
    status: SequenceStatus;

    // Steps (the sequence of emails)
    steps: ISequenceStep[];

    // Settings
    sendFromAccountId?: Types.ObjectId;    // Connected Gmail account
    unenrollOnReply: boolean;              // Auto-unenroll when contact replies
    sendOnWeekends: boolean;               // Whether to send on weekends
    sendWindowStart?: string;              // e.g., "09:00" - only send after this time
    sendWindowEnd?: string;                // e.g., "18:00" - only send before this time
    timezone?: string;                     // e.g., "America/New_York"

    // Enrollments
    enrollments: ISequenceEnrollment[];

    // Stats
    stats: ISequenceStats;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMAS
// ============================================

const sequenceStepSchema = new Schema<ISequenceStep>(
    {
        id: { type: String, required: true },
        order: { type: Number, required: true },
        templateId: { type: Schema.Types.ObjectId, ref: "EmailTemplate" },
        subject: { type: String, required: true },
        body: { type: String, required: true },
        delay: {
            value: { type: Number, required: true, default: 1 },
            unit: {
                type: String,
                enum: ['hours', 'days', 'weeks'],
                default: 'days'
            },
        },
    },
    { _id: false }
);

const sequenceEnrollmentSchema = new Schema<ISequenceEnrollment>(
    {
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            required: true
        },
        currentStepIndex: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['active', 'completed', 'unenrolled', 'replied', 'bounced'],
            default: 'active',
        },
        enrolledAt: { type: Date, default: Date.now },
        nextEmailAt: Date,
        lastEmailAt: Date,
        completedAt: Date,
        emailsSent: { type: Number, default: 0 },
        emailsOpened: { type: Number, default: 0 },
        emailsClicked: { type: Number, default: 0 },
    }
);

const sequenceStatsSchema = new Schema<ISequenceStats>(
    {
        totalEnrolled: { type: Number, default: 0 },
        currentlyActive: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        replied: { type: Number, default: 0 },
        unenrolled: { type: Number, default: 0 },
    },
    { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const sequenceSchema = new Schema<ISequence>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
        },

        // Metadata
        name: {
            type: String,
            required: [true, "Sequence name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description must be less than 500 characters"],
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'archived'],
            default: 'draft',
            index: true,
        },

        // Steps
        steps: {
            type: [sequenceStepSchema],
            default: [],
        },

        // Settings
        sendFromAccountId: {
            type: Schema.Types.ObjectId,
            ref: "EmailIntegration",
        },
        unenrollOnReply: {
            type: Boolean,
            default: true,
        },
        sendOnWeekends: {
            type: Boolean,
            default: false,
        },
        sendWindowStart: String,
        sendWindowEnd: String,
        timezone: {
            type: String,
            default: "UTC",
        },

        // Enrollments
        enrollments: {
            type: [sequenceEnrollmentSchema],
            default: [],
        },

        // Stats
        stats: {
            type: sequenceStatsSchema,
            default: () => ({
                totalEnrolled: 0,
                currentlyActive: 0,
                completed: 0,
                replied: 0,
                unenrolled: 0,
            }),
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

sequenceSchema.index({ workspaceId: 1, status: 1 });
sequenceSchema.index({ workspaceId: 1, createdAt: -1 });
sequenceSchema.index({ "enrollments.contactId": 1 });
sequenceSchema.index({ "enrollments.nextEmailAt": 1, "enrollments.status": 1 });

// ============================================
// METHODS
// ============================================

// Get next step for an enrollment
sequenceSchema.methods.getNextStep = function (enrollment: ISequenceEnrollment): ISequenceStep | null {
    const nextIndex = enrollment.currentStepIndex + 1;
    return this.steps.find((s: ISequenceStep) => s.order === nextIndex) || null;
};

// ============================================
// EXPORT
// ============================================

const Sequence = mongoose.model<ISequence>("Sequence", sequenceSchema);

export default Sequence;
