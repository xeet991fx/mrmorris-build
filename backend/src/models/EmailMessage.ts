import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type MessageSentiment = 'positive' | 'neutral' | 'negative' | 'out_of_office' | 'unsubscribe';
export type EmailSource = 'campaign' | 'workflow' | 'sequence' | 'direct';

export interface IEmailMessage extends Document {
    // Source identification
    source: EmailSource;

    // Campaign fields (optional - only for campaign emails)
    campaignId?: Types.ObjectId;
    enrollmentId?: Types.ObjectId;

    // Workflow fields (optional - only for workflow emails)
    workflowId?: Types.ObjectId;
    workflowEnrollmentId?: Types.ObjectId;

    // Sequence fields (optional - only for sequence emails)
    sequenceId?: Types.ObjectId;

    // Common required fields
    contactId: Types.ObjectId;
    workspaceId: Types.ObjectId;
    assignedTo?: Types.ObjectId; // User ID of assigned team member

    // Email details
    fromAccountId?: Types.ObjectId;
    fromEmail: string;
    toEmail: string;

    subject: string;
    bodyHtml: string;
    bodyText?: string;

    // Threading
    messageId: string; // Email Message-ID header
    threadId?: string; // For grouping replies
    inReplyTo?: string; // If this is a reply

    // Timestamps
    sentAt: Date;

    // Tracking
    opened: boolean;
    openedAt?: Date;
    openCount: number;         // Total number of times email was opened
    lastOpenedAt?: Date;       // Most recent open timestamp
    clicked: boolean;
    clickedAt?: Date;
    totalClickCount: number;   // Total click count across all links
    lastClickedAt?: Date;      // Most recent click timestamp
    replied: boolean;
    repliedAt?: Date;
    bounced: boolean;
    bouncedAt?: Date;
    unsubscribed: boolean;
    unsubscribedAt?: Date;

    // Tracking metadata
    trackingId?: string;       // The tracking ID used for this email

    // Granular open events
    opens?: Array<{
        openedAt: Date;
        userAgent?: string;
        ipAddress?: string;
        isBot: boolean;
        isApplePrivacy?: boolean; // Apple Mail Privacy Protection
        device?: string;          // desktop, mobile, tablet
        browser?: string;         // chrome, firefox, safari, etc.
        os?: string;              // windows, macos, linux, ios, android
        // Geolocation
        country?: string;
        countryCode?: string;
        city?: string;
        timezone?: string;
    }>;

    // Detailed link tracking
    linkClicks?: Array<{
        url: string;           // Original destination URL
        clickedAt: Date;       // When this link was clicked
        clickCount: number;    // Number of times this specific link was clicked
        userAgent?: string;
        ipAddress?: string;
        isBot?: boolean;       // Flag for bot clicks
        device?: string;
        browser?: string;
        os?: string;
        // Geolocation
        country?: string;
        countryCode?: string;
        city?: string;
        timezone?: string;
    }>;

    // Reply details
    replySubject?: string;
    replyBody?: string;
    replySentiment?: MessageSentiment;

    // Metadata
    stepId?: string; // Which campaign/workflow step this was sent from

    // Read status (for inbox display)
    isRead?: boolean;
}

// ============================================
// SCHEMA
// ============================================

const emailMessageSchema = new Schema<IEmailMessage>(
    {
        // Source identification
        source: {
            type: String,
            enum: ['campaign', 'workflow', 'sequence', 'direct'],
            default: 'campaign',
            index: true,
        },

        // Campaign fields (optional)
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            index: true,
        },
        enrollmentId: {
            type: Schema.Types.ObjectId,
            ref: "CampaignEnrollment",
            index: true,
        },

        // Workflow fields (optional)
        workflowId: {
            type: Schema.Types.ObjectId,
            ref: "Workflow",
            index: true,
        },
        workflowEnrollmentId: {
            type: Schema.Types.ObjectId,
            ref: "WorkflowEnrollment",
            index: true,
        },

        // Sequence fields (optional)
        sequenceId: {
            type: Schema.Types.ObjectId,
            ref: "Sequence",
            index: true,
        },

        // Common required fields
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
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        // Email details
        fromAccountId: {
            type: Schema.Types.ObjectId,
            ref: "EmailAccount",
        },
        fromEmail: {
            type: String,
            required: true,
        },
        toEmail: {
            type: String,
            required: true,
        },

        subject: {
            type: String,
            required: true,
        },
        bodyHtml: {
            type: String,
            required: true,
        },
        bodyText: String,

        // Threading
        messageId: {
            type: String,
            required: true,
            unique: true,
        },
        threadId: String,
        inReplyTo: String,

        // Timestamps
        sentAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        // Tracking
        opened: {
            type: Boolean,
            default: false,
        },
        openedAt: Date,
        openCount: {
            type: Number,
            default: 0,
        },
        lastOpenedAt: Date,
        clicked: {
            type: Boolean,
            default: false,
        },
        clickedAt: Date,
        totalClickCount: {
            type: Number,
            default: 0,
        },
        lastClickedAt: Date,
        replied: {
            type: Boolean,
            default: false,
            index: true,
        },
        repliedAt: Date,
        bounced: {
            type: Boolean,
            default: false,
        },
        bouncedAt: Date,
        unsubscribed: {
            type: Boolean,
            default: false,
        },
        unsubscribedAt: Date,

        // Tracking metadata
        trackingId: {
            type: String,
            index: true,
        },

        // Granular open events
        opens: [{
            openedAt: {
                type: Date,
                default: Date.now,
            },
            userAgent: String,
            ipAddress: String,
            isBot: {
                type: Boolean,
                default: false,
            },
            isApplePrivacy: {
                type: Boolean,
                default: false,
            },
            device: String,
            browser: String,
            os: String,
            // Geolocation
            country: String,
            countryCode: String,
            city: String,
            timezone: String,
        }],

        // Detailed link tracking
        linkClicks: [{
            url: {
                type: String,
                required: true,
            },
            clickedAt: {
                type: Date,
                required: true,
                default: Date.now,
            },
            clickCount: {
                type: Number,
                required: true,
                default: 1,
            },
            userAgent: String,
            ipAddress: String,
            isBot: {
                type: Boolean,
                default: false,
            },
            device: String,
            browser: String,
            os: String,
            // Geolocation
            country: String,
            countryCode: String,
            city: String,
            timezone: String,
        }],

        // Reply details
        replySubject: String,
        replyBody: String,
        replySentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative', 'out_of_office', 'unsubscribe'],
        },

        // Metadata
        stepId: String,

        // Read status for inbox
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

emailMessageSchema.index({ workspaceId: 1, source: 1, sentAt: -1 });
emailMessageSchema.index({ workspaceId: 1, replied: 1, sentAt: -1 });
emailMessageSchema.index({ threadId: 1 });
emailMessageSchema.index({ campaignId: 1, sentAt: -1 });
emailMessageSchema.index({ workflowId: 1, sentAt: -1 });
emailMessageSchema.index({ sequenceId: 1, sentAt: -1 });
emailMessageSchema.index({ trackingId: 1 });

// ============================================
// EXPORT
// ============================================

const EmailMessage = mongoose.model<IEmailMessage>("EmailMessage", emailMessageSchema);

export default EmailMessage;
