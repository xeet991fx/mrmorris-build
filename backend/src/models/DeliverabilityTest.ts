/**
 * Deliverability Test Model
 *
 * Tracks email deliverability tests and their results
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export type TestType = 'inbox_placement' | 'spam_score' | 'authentication' | 'blacklist';
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed';
export type InboxPlacement = 'inbox' | 'spam' | 'promotions' | 'not_delivered';

export interface IInboxPlacementResult {
    provider: 'gmail' | 'outlook' | 'yahoo' | 'apple' | 'other';
    placement: InboxPlacement;
    deliveryTime?: number; // milliseconds
    headers?: string;
}

export interface ISpamScoreResult {
    score: number; // 0-10 (0 = not spam, 10 = definitely spam)
    tests: {
        name: string;
        passed: boolean;
        score: number;
        description?: string;
    }[];
    recommendations: string[];
}

export interface IAuthenticationResult {
    spf: {
        passed: boolean;
        result: 'pass' | 'fail' | 'softfail' | 'neutral' | 'none';
        domain?: string;
        details?: string;
    };
    dkim: {
        passed: boolean;
        result: 'pass' | 'fail' | 'none';
        domain?: string;
        selector?: string;
        details?: string;
    };
    dmarc: {
        passed: boolean;
        result: 'pass' | 'fail' | 'none';
        policy?: 'none' | 'quarantine' | 'reject';
        details?: string;
    };
}

export interface IBlacklistResult {
    totalLists: number;
    listedOn: number;
    lists: {
        name: string;
        listed: boolean;
        checkedAt: Date;
        details?: string;
    }[];
}

export interface IDeliverabilityTest extends Document {
    workspaceId: Types.ObjectId;
    emailAccountId: Types.ObjectId;

    // Test details
    testType: TestType;
    status: TestStatus;

    // Test configuration
    fromEmail: string;
    fromName?: string;
    subject?: string;
    htmlBody?: string;
    textBody?: string;

    // Results
    inboxPlacementResults?: IInboxPlacementResult[];
    spamScoreResult?: ISpamScoreResult;
    authenticationResult?: IAuthenticationResult;
    blacklistResult?: IBlacklistResult;

    // Overall results
    overallScore?: number; // 0-100
    passed: boolean;
    issues: string[];
    recommendations: string[];

    // Metadata
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;

    createdAt: Date;
    updatedAt: Date;
}

const InboxPlacementResultSchema = new Schema({
    provider: {
        type: String,
        enum: ['gmail', 'outlook', 'yahoo', 'apple', 'other'],
        required: true,
    },
    placement: {
        type: String,
        enum: ['inbox', 'spam', 'promotions', 'not_delivered'],
        required: true,
    },
    deliveryTime: Number,
    headers: String,
}, { _id: false });

const SpamTestSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    passed: {
        type: Boolean,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    description: String,
}, { _id: false });

const SpamScoreResultSchema = new Schema({
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 10,
    },
    tests: [SpamTestSchema],
    recommendations: [String],
}, { _id: false });

const AuthenticationResultSchema = new Schema({
    spf: {
        passed: Boolean,
        result: {
            type: String,
            enum: ['pass', 'fail', 'softfail', 'neutral', 'none'],
        },
        domain: String,
        details: String,
    },
    dkim: {
        passed: Boolean,
        result: {
            type: String,
            enum: ['pass', 'fail', 'none'],
        },
        domain: String,
        selector: String,
        details: String,
    },
    dmarc: {
        passed: Boolean,
        result: {
            type: String,
            enum: ['pass', 'fail', 'none'],
        },
        policy: {
            type: String,
            enum: ['none', 'quarantine', 'reject'],
        },
        details: String,
    },
}, { _id: false });

const BlacklistItemSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    listed: {
        type: Boolean,
        required: true,
    },
    checkedAt: {
        type: Date,
        required: true,
    },
    details: String,
}, { _id: false });

const BlacklistResultSchema = new Schema({
    totalLists: {
        type: Number,
        required: true,
    },
    listedOn: {
        type: Number,
        required: true,
    },
    lists: [BlacklistItemSchema],
}, { _id: false });

const DeliverabilityTestSchema = new Schema<IDeliverabilityTest>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true,
        },
        emailAccountId: {
            type: Schema.Types.ObjectId,
            ref: 'EmailAccount',
            required: true,
            index: true,
        },

        // Test details
        testType: {
            type: String,
            enum: ['inbox_placement', 'spam_score', 'authentication', 'blacklist'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'running', 'completed', 'failed'],
            default: 'pending',
        },

        // Test configuration
        fromEmail: {
            type: String,
            required: true,
        },
        fromName: String,
        subject: String,
        htmlBody: String,
        textBody: String,

        // Results
        inboxPlacementResults: [InboxPlacementResultSchema],
        spamScoreResult: SpamScoreResultSchema,
        authenticationResult: AuthenticationResultSchema,
        blacklistResult: BlacklistResultSchema,

        // Overall results
        overallScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        passed: {
            type: Boolean,
            default: false,
        },
        issues: {
            type: [String],
            default: [],
        },
        recommendations: {
            type: [String],
            default: [],
        },

        // Metadata
        startedAt: Date,
        completedAt: Date,
        errorMessage: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
DeliverabilityTestSchema.index({ workspaceId: 1, emailAccountId: 1, createdAt: -1 });
DeliverabilityTestSchema.index({ workspaceId: 1, status: 1 });

const DeliverabilityTest = mongoose.model<IDeliverabilityTest>('DeliverabilityTest', DeliverabilityTestSchema);

export default DeliverabilityTest;
