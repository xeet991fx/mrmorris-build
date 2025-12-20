/**
 * CallRecording Model
 * 
 * Stores call recordings, transcripts, and AI-extracted insights.
 * Used by transcriptionAgent for note-taking automation.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICallRecording extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Relationships
    contactId?: Types.ObjectId;
    opportunityId?: Types.ObjectId;
    companyId?: Types.ObjectId;

    // Recording
    title: string;
    audioUrl?: string;
    duration?: number;  // in seconds
    recordedAt: Date;
    source?: "upload" | "zoom" | "google_meet" | "teams" | "phone";

    // Transcription
    transcript?: string;
    transcribedAt?: Date;
    language?: string;

    // AI Insights
    summary?: string;
    actionItems?: {
        task: string;
        assignee?: string;
        dueDate?: Date;
        completed?: boolean;
    }[];
    keyInsights?: {
        budget?: {
            mentioned: boolean;
            details?: string;
            quote?: string;
        };
        authority?: {
            decisionMaker: boolean;
            details?: string;
            quote?: string;
        };
        need?: {
            identified: boolean;
            painPoints?: string[];
            quote?: string;
        };
        timeline?: {
            mentioned: boolean;
            details?: string;
            quote?: string;
        };
    };

    // Sentiment
    overallSentiment?: "positive" | "neutral" | "negative";
    keyMoments?: {
        timestamp?: number;
        type: "objection" | "interest" | "concern" | "commitment";
        quote: string;
    }[];

    // Next steps detected
    nextSteps?: string[];

    // Metadata
    participants?: string[];
    tags?: string[];

    createdAt: Date;
    updatedAt: Date;
}

const actionItemSchema = new Schema({
    task: { type: String, required: true },
    assignee: { type: String },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
}, { _id: false });

const keyMomentSchema = new Schema({
    timestamp: { type: Number },
    type: {
        type: String,
        enum: ["objection", "interest", "concern", "commitment"],
    },
    quote: { type: String, required: true },
}, { _id: false });

const callRecordingSchema = new Schema<ICallRecording>(
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

        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },
        opportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        audioUrl: { type: String },
        duration: { type: Number, min: 0 },
        recordedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        source: {
            type: String,
            enum: ["upload", "zoom", "google_meet", "teams", "phone"],
            default: "upload",
        },

        transcript: { type: String },
        transcribedAt: { type: Date },
        language: { type: String, default: "en" },

        summary: { type: String },
        actionItems: [actionItemSchema],
        keyInsights: {
            budget: {
                mentioned: { type: Boolean, default: false },
                details: { type: String },
                quote: { type: String },
            },
            authority: {
                decisionMaker: { type: Boolean, default: false },
                details: { type: String },
                quote: { type: String },
            },
            need: {
                identified: { type: Boolean, default: false },
                painPoints: [{ type: String }],
                quote: { type: String },
            },
            timeline: {
                mentioned: { type: Boolean, default: false },
                details: { type: String },
                quote: { type: String },
            },
        },

        overallSentiment: {
            type: String,
            enum: ["positive", "neutral", "negative"],
        },
        keyMoments: [keyMomentSchema],

        nextSteps: [{ type: String }],
        participants: [{ type: String }],
        tags: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

// Indexes
callRecordingSchema.index({ workspaceId: 1, recordedAt: -1 });
callRecordingSchema.index({ workspaceId: 1, contactId: 1 });
callRecordingSchema.index({ workspaceId: 1, opportunityId: 1 });

// Text search
callRecordingSchema.index({
    title: "text",
    transcript: "text",
    summary: "text",
});

const CallRecording = mongoose.model<ICallRecording>("CallRecording", callRecordingSchema);

export default CallRecording;
