/**
 * AI Client Memory Model
 * 
 * Stores learned knowledge about clients that accumulates over time.
 * The AI uses this to provide increasingly personalized responses.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

// Extracted fact from conversations
export interface IMemoryFact {
    key: string;           // e.g., "budget_range", "decision_timeline"
    value: string;         // e.g., "$50k-100k", "Q2 2024"
    confidence: number;    // 0-100, increases with confirmations
    source: string;        // Where this was learned from
    extractedAt: Date;
    confirmedCount: number; // How many times this was confirmed
}

// Learned preference patterns
export interface IMemoryPreference {
    type: string;          // e.g., "communication_style", "response_speed"
    value: string;         // e.g., "formal", "quick"
    strength: number;      // Increases with observations
    lastObserved: Date;
}

// Summarized interaction
export interface IMemoryInteraction {
    date: Date;
    agentType: string;     // Which agent was used
    query: string;         // What user asked (truncated)
    summary: string;       // AI summary of interaction
    outcome: 'positive' | 'neutral' | 'negative';
    lessonsLearned?: string;
    feedbackScore?: number; // User feedback if given
}

// AI-generated insight
export interface IMemoryInsight {
    type: string;          // e.g., "buying_signal", "churn_risk"
    content: string;
    confidence: number;
    generatedAt: Date;
    validUntil?: Date;
    actedUpon?: boolean;
}

export interface IAIClientMemory extends Document {
    workspaceId: Types.ObjectId;
    contactId: Types.ObjectId;
    companyId?: Types.ObjectId;

    // Extracted facts about this client
    facts: IMemoryFact[];

    // Learned preferences
    preferences: IMemoryPreference[];

    // Interaction history (summarized)
    interactions: IMemoryInteraction[];

    // AI-generated insights
    insights: IMemoryInsight[];

    // Aggregate metrics
    totalInteractions: number;
    positiveOutcomeRate: number;
    lastInteractionAt: Date;

    // Learning metadata
    createdAt: Date;
    updatedAt: Date;
}

const memoryFactSchema = new Schema<IMemoryFact>({
    key: { type: String, required: true },
    value: { type: String, required: true },
    confidence: { type: Number, default: 50, min: 0, max: 100 },
    source: { type: String, required: true },
    extractedAt: { type: Date, default: Date.now },
    confirmedCount: { type: Number, default: 1 },
}, { _id: false });

const memoryPreferenceSchema = new Schema<IMemoryPreference>({
    type: { type: String, required: true },
    value: { type: String, required: true },
    strength: { type: Number, default: 1 },
    lastObserved: { type: Date, default: Date.now },
}, { _id: false });

const memoryInteractionSchema = new Schema<IMemoryInteraction>({
    date: { type: Date, default: Date.now },
    agentType: { type: String, required: true },
    query: { type: String, maxlength: 500 },
    summary: { type: String, required: true, maxlength: 1000 },
    outcome: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
    },
    lessonsLearned: { type: String, maxlength: 500 },
    feedbackScore: { type: Number, min: -1, max: 1 },
}, { _id: false });

const memoryInsightSchema = new Schema<IMemoryInsight>({
    type: { type: String, required: true },
    content: { type: String, required: true },
    confidence: { type: Number, default: 50 },
    generatedAt: { type: Date, default: Date.now },
    validUntil: { type: Date },
    actedUpon: { type: Boolean, default: false },
}, { _id: false });

const aiClientMemorySchema = new Schema<IAIClientMemory>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            required: true,
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            index: true,
        },

        facts: [memoryFactSchema],
        preferences: [memoryPreferenceSchema],
        interactions: [memoryInteractionSchema],
        insights: [memoryInsightSchema],

        totalInteractions: { type: Number, default: 0 },
        positiveOutcomeRate: { type: Number, default: 0 },
        lastInteractionAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
aiClientMemorySchema.index({ workspaceId: 1, contactId: 1 }, { unique: true });
aiClientMemorySchema.index({ workspaceId: 1, companyId: 1 });
aiClientMemorySchema.index({ workspaceId: 1, lastInteractionAt: -1 });

// Text search on facts and insights
aiClientMemorySchema.index({
    'facts.key': 'text',
    'facts.value': 'text',
    'insights.content': 'text',
});

const AIClientMemory = mongoose.model<IAIClientMemory>("AIClientMemory", aiClientMemorySchema);

export default AIClientMemory;
