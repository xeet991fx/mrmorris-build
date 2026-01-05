import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EmailProvider = 'gmail' | 'smtp';
export type AccountStatus = 'active' | 'warming_up' | 'paused' | 'disconnected';
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface IDNSRecords {
    spf: {
        valid: boolean;
        record?: string;
        lastChecked?: Date;
        issues?: string[];
    };
    dkim: {
        valid: boolean;
        selector?: string;
        record?: string;
        lastChecked?: Date;
        issues?: string[];
    };
    dmarc: {
        valid: boolean;
        record?: string;
        policy?: 'none' | 'quarantine' | 'reject';
        lastChecked?: Date;
        issues?: string[];
    };
}

export interface IBlacklistStatus {
    listName: string;
    isListed: boolean;
    listedDate?: Date;
    checkedAt: Date;
    details?: string;
}

export interface IWarmupConfig {
    externalProvider?: 'mailreach' | 'lemwarm' | 'warmbox' | 'none';
    apiKey?: string;
    campaignId?: string;
    dailyLimit: number;
    rampUpRate: number; // emails per day increase
    enabled: boolean;
}

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

    // External warmup integration
    warmupConfig?: IWarmupConfig;

    // Sending limits
    dailySendLimit: number;
    sentToday: number;
    lastSentAt?: Date;

    // Deliverability stats
    bounceRate: number;
    spamRate: number;
    openRate: number;
    replyRate: number;

    // Email deliverability suite
    reputationScore: number; // 0-100
    dnsRecords?: IDNSRecords;
    blacklistStatus: IBlacklistStatus[];
    lastDeliverabilityCheck?: Date;

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

        // External warmup integration
        warmupConfig: {
            externalProvider: {
                type: String,
                enum: ['mailreach', 'lemwarm', 'warmbox', 'none'],
            },
            apiKey: String,
            campaignId: String,
            dailyLimit: Number,
            rampUpRate: Number,
            enabled: Boolean,
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

        // Email deliverability suite
        reputationScore: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        dnsRecords: {
            spf: {
                valid: Boolean,
                record: String,
                lastChecked: Date,
                issues: [String],
            },
            dkim: {
                valid: Boolean,
                selector: String,
                record: String,
                lastChecked: Date,
                issues: [String],
            },
            dmarc: {
                valid: Boolean,
                record: String,
                policy: {
                    type: String,
                    enum: ['none', 'quarantine', 'reject'],
                },
                lastChecked: Date,
                issues: [String],
            },
        },
        blacklistStatus: {
            type: [{
                listName: {
                    type: String,
                    required: true,
                },
                isListed: {
                    type: Boolean,
                    required: true,
                },
                listedDate: Date,
                checkedAt: {
                    type: Date,
                    required: true,
                },
                details: String,
            }],
            default: [],
        },
        lastDeliverabilityCheck: Date,

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
