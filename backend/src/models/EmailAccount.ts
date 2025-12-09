import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EmailProvider = 'gmail' | 'smtp';
export type AccountStatus = 'active' | 'warming_up' | 'paused' | 'disconnected';
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface IEmailAccount extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Account details
    email: string;
    provider: EmailProvider;
    status: AccountStatus;

    // SMTP credentials (encrypted)
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string; // Will be encrypted

    // OAuth tokens (for Gmail)
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;

    // Warmup settings
    warmupEnabled: boolean;
    warmupStartDate?: Date;
    warmupCurrentDaily: number;
    warmupTargetDaily: number;
    warmupSlowRamp: boolean;

    // Sending limits
    dailySendLimit: number;
    sentToday: number;
    lastSentAt?: Date;

    // Deliverability stats
    bounceRate: number;
    spamRate: number;
    openRate: number;
    replyRate: number;

    // Health monitoring
    lastHealthCheck?: Date;
    healthStatus: HealthStatus;
    healthIssues: string[];

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const emailAccountSchema = new Schema<IEmailAccount>(
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

        // Account details
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        provider: {
            type: String,
            enum: ['gmail', 'smtp'],
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'warming_up', 'paused', 'disconnected'],
            default: 'warming_up',
        },

        // SMTP credentials
        smtpHost: String,
        smtpPort: Number,
        smtpUser: String,
        smtpPassword: String,

        // OAuth tokens
        accessToken: String,
        refreshToken: String,
        tokenExpiry: Date,

        // Warmup settings
        warmupEnabled: {
            type: Boolean,
            default: true,
        },
        warmupStartDate: Date,
        warmupCurrentDaily: {
            type: Number,
            default: 0,
        },
        warmupTargetDaily: {
            type: Number,
            default: 50,
        },
        warmupSlowRamp: {
            type: Boolean,
            default: true,
        },

        // Sending limits
        dailySendLimit: {
            type: Number,
            default: 50,
        },
        sentToday: {
            type: Number,
            default: 0,
        },
        lastSentAt: Date,

        // Deliverability stats
        bounceRate: {
            type: Number,
            default: 0,
        },
        spamRate: {
            type: Number,
            default: 0,
        },
        openRate: {
            type: Number,
            default: 0,
        },
        replyRate: {
            type: Number,
            default: 0,
        },

        // Health monitoring
        lastHealthCheck: Date,
        healthStatus: {
            type: String,
            enum: ['healthy', 'warning', 'critical'],
            default: 'healthy',
        },
        healthIssues: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

emailAccountSchema.index({ workspaceId: 1, status: 1 });
emailAccountSchema.index({ email: 1 }, { unique: true });

// ============================================
// EXPORT
// ============================================

const EmailAccount = mongoose.model<IEmailAccount>("EmailAccount", emailAccountSchema);

export default EmailAccount;
