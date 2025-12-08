/**
 * AgentConfig Model
 * MongoDB schema for persisting agent configurations per workspace
 */

import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AgentTypeEnum =
    | 'onboarding'
    | 'intent'
    | 'planner'
    | 'workflow_builder'
    | 'learning'
    | 'enrichment'
    | 'email'
    | 'workflow_runner'
    | 'pipeline'
    | 'integration'
    | 'insights';

export interface IAgentTrigger {
    events?: string[];
    schedule?: string; // cron expression
}

export interface IAgentLimits {
    maxConcurrentTasks?: number;
    maxRetries?: number;
    timeoutMs?: number;
    dailyExecutionLimit?: number;
}

export interface IAgentConfig extends Document {
    workspaceId: Types.ObjectId;
    agentType: AgentTypeEnum;
    enabled: boolean;
    settings: Record<string, any>;
    triggers?: IAgentTrigger;
    limits?: IAgentLimits;
    credentials?: {
        encrypted: string;
        iv: string;
    };
    stats: {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        lastExecutedAt?: Date;
        averageExecutionTimeMs?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const agentTriggerSchema = new Schema<IAgentTrigger>(
    {
        events: [{ type: String }],
        schedule: { type: String }, // cron expression
    },
    { _id: false }
);

const agentLimitsSchema = new Schema<IAgentLimits>(
    {
        maxConcurrentTasks: { type: Number, default: 1 },
        maxRetries: { type: Number, default: 3 },
        timeoutMs: { type: Number, default: 30000 },
        dailyExecutionLimit: { type: Number },
    },
    { _id: false }
);

const agentStatsSchema = new Schema(
    {
        totalExecutions: { type: Number, default: 0 },
        successfulExecutions: { type: Number, default: 0 },
        failedExecutions: { type: Number, default: 0 },
        lastExecutedAt: { type: Date },
        averageExecutionTimeMs: { type: Number },
    },
    { _id: false }
);

const agentConfigSchema = new Schema<IAgentConfig>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        agentType: {
            type: String,
            enum: [
                'onboarding',
                'intent',
                'planner',
                'workflow_builder',
                'learning',
                'enrichment',
                'email',
                'workflow_runner',
                'pipeline',
                'integration',
                'insights',
            ],
            required: [true, "Agent type is required"],
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        settings: {
            type: Schema.Types.Mixed,
            default: {},
        },
        triggers: agentTriggerSchema,
        limits: agentLimitsSchema,
        credentials: {
            encrypted: { type: String },
            iv: { type: String },
        },
        stats: {
            type: agentStatsSchema,
            default: () => ({
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
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

// Compound index for workspace + agent type (unique per workspace)
agentConfigSchema.index(
    { workspaceId: 1, agentType: 1 },
    { unique: true }
);

// Index for finding enabled agents
agentConfigSchema.index(
    { workspaceId: 1, enabled: 1 }
);

// ============================================
// METHODS
// ============================================

/**
 * Record an execution for stats tracking
 */
agentConfigSchema.methods.recordExecution = async function (
    success: boolean,
    executionTimeMs: number
): Promise<void> {
    this.stats.totalExecutions += 1;
    if (success) {
        this.stats.successfulExecutions += 1;
    } else {
        this.stats.failedExecutions += 1;
    }
    this.stats.lastExecutedAt = new Date();

    // Update rolling average execution time
    const prevAvg = this.stats.averageExecutionTimeMs || executionTimeMs;
    const total = this.stats.totalExecutions;
    this.stats.averageExecutionTimeMs =
        (prevAvg * (total - 1) + executionTimeMs) / total;

    await this.save();
};

// ============================================
// STATICS
// ============================================

/**
 * Get all enabled agents for a workspace
 */
agentConfigSchema.statics.getEnabledAgents = async function (
    workspaceId: Types.ObjectId | string
): Promise<IAgentConfig[]> {
    return this.find({ workspaceId, enabled: true });
};

/**
 * Get or create default config for an agent
 */
agentConfigSchema.statics.getOrCreateConfig = async function (
    workspaceId: Types.ObjectId | string,
    agentType: AgentTypeEnum
): Promise<IAgentConfig> {
    let config = await this.findOne({ workspaceId, agentType });

    if (!config) {
        config = await this.create({
            workspaceId,
            agentType,
            enabled: true,
            settings: getDefaultSettings(agentType),
            limits: getDefaultLimits(agentType),
        });
    }

    return config;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultSettings(agentType: AgentTypeEnum): Record<string, any> {
    switch (agentType) {
        case 'intent':
            return {
                model: 'gemini-2.5-flash',
                temperature: 0.7,
                maxTokens: 1024,
            };
        case 'planner':
            return {
                model: 'gemini-2.5-flash',
                maxSteps: 10,
                requireApproval: true,
            };
        case 'workflow_builder':
            return {
                requireConfirmation: true,
                maxWorkflowSteps: 20,
            };
        case 'enrichment':
            return {
                provider: 'apollo',
                autoEnrich: true,
                enrichOnCreate: true,
            };
        case 'email':
            return {
                provider: 'gmail',
                syncInterval: 15, // minutes
                trackOpens: true,
                trackClicks: true,
            };
        case 'learning':
            return {
                analysisFrequency: 'weekly',
                minDataPoints: 100,
                autoSuggest: true,
            };
        default:
            return {};
    }
}

function getDefaultLimits(agentType: AgentTypeEnum): IAgentLimits {
    switch (agentType) {
        case 'enrichment':
            return {
                maxConcurrentTasks: 5,
                maxRetries: 2,
                timeoutMs: 10000,
                dailyExecutionLimit: 500,
            };
        case 'email':
            return {
                maxConcurrentTasks: 10,
                maxRetries: 3,
                timeoutMs: 30000,
                dailyExecutionLimit: 1000,
            };
        default:
            return {
                maxConcurrentTasks: 1,
                maxRetries: 3,
                timeoutMs: 30000,
            };
    }
}

// ============================================
// MODEL EXPORT
// ============================================

const AgentConfig = mongoose.model<IAgentConfig>("AgentConfig", agentConfigSchema);
export default AgentConfig;
