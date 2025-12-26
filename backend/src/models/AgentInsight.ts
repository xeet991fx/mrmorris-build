import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * AgentInsight Model
 * 
 * Caches AI-generated proactive insights across all CRM pages.
 * Used for contact engagement, deal risk, campaign optimization, email intelligence, etc.
 */
export interface IAgentInsight extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Context reference
    contextType: 'contact' | 'deal' | 'campaign' | 'email' | 'workflow' | 'pipeline' | 'analytics' | 'account' | 'sequence' | 'ticket' | 'meeting' | 'lead_score' | 'email_template' | 'data_quality' | 'email_analytics' | 'email_account' | 'daily_briefing';
    contextId?: Types.ObjectId;

    // Agent info
    agentType: string;

    // Insight data
    insights: {
        type: string;
        title: string;
        description: string;
        data?: Record<string, any>;
    };

    // Suggested actions
    suggestedActions?: {
        id: string;
        type: string;
        label: string;
        priority: number;
        metadata?: Record<string, any>;
    }[];

    // Scoring
    confidence: number;
    priority: 'high' | 'medium' | 'low';
    displayType: 'inline_panel' | 'inline_alert' | 'toast_notification';

    // Lifecycle
    status: 'pending' | 'shown' | 'acted' | 'dismissed';
    shownAt?: Date;
    actedAt?: Date;
    dismissedAt?: Date;
    expiresAt?: Date;

    // Feedback
    helpful?: boolean;
    feedback?: string;

    createdAt: Date;
    updatedAt: Date;
}

const agentInsightSchema = new Schema<IAgentInsight>(
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

        // Context
        contextType: {
            type: String,
            enum: ['contact', 'deal', 'campaign', 'email', 'workflow', 'pipeline', 'analytics', 'account', 'sequence', 'ticket', 'meeting', 'lead_score', 'email_template', 'data_quality', 'email_analytics', 'email_account', 'daily_briefing'],
            required: true,
            index: true,
        },
        contextId: {
            type: Schema.Types.ObjectId,
            index: true,
        },

        // Agent
        agentType: {
            type: String,
            required: true,
            index: true,
        },

        // Insight data
        insights: {
            type: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            data: {
                type: Schema.Types.Mixed,
                default: {},
            },
        },

        // Actions
        suggestedActions: [{
            id: { type: String, required: true },
            type: { type: String, required: true },
            label: { type: String, required: true },
            priority: { type: Number, default: 1 },
            metadata: { type: Schema.Types.Mixed },
        }],

        // Scoring
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.75,
        },
        priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium',
        },
        displayType: {
            type: String,
            enum: ['inline_panel', 'inline_alert', 'toast_notification'],
            default: 'inline_panel',
        },

        // Lifecycle
        status: {
            type: String,
            enum: ['pending', 'shown', 'acted', 'dismissed'],
            default: 'pending',
            index: true,
        },
        shownAt: { type: Date },
        actedAt: { type: Date },
        dismissedAt: { type: Date },
        expiresAt: { type: Date, index: true },

        // Feedback
        helpful: { type: Boolean },
        feedback: { type: String },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
agentInsightSchema.index({ workspaceId: 1, userId: 1, status: 1 });
agentInsightSchema.index({ workspaceId: 1, contextType: 1, contextId: 1 });
agentInsightSchema.index({ priority: -1, createdAt: -1 });

const AgentInsight = mongoose.model<IAgentInsight>("AgentInsight", agentInsightSchema);

export default AgentInsight;
