/**
 * Intent Signal Model
 *
 * Tracks behavioral signals that indicate buying intent.
 * Examples: viewed pricing 5x, downloaded whitepaper, watched demo video
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IIntentSignal extends Document {
    workspaceId: Types.ObjectId;
    contactId?: Types.ObjectId;
    visitorId?: string; // For anonymous visitors

    // Signal Details
    signalType: 'page_view' | 'download' | 'video_watch' | 'form_view' | 'email_click' | 'search' | 'custom';
    signalName: string; // e.g., "pricing_page", "case_study", "demo_video"
    signalValue: number; // Intent score value (0-100)

    // Context
    url?: string;
    pageTitle?: string;
    sessionId?: string;
    source?: string; // e.g., "email", "organic", "linkedin"

    // Metadata
    metadata?: {
        duration?: number; // Time spent (seconds)
        scrollDepth?: number; // 0-100
        clickedElements?: string[];
        formFields?: string[];
        videoPercentage?: number; // 0-100
        downloadedFile?: string;
    };

    // Aggregation helpers
    timestamp: Date;
    createdAt: Date;
}

const intentSignalSchema = new Schema<IIntentSignal>(
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
            index: true,
        },
        visitorId: {
            type: String,
            index: true,
        },

        signalType: {
            type: String,
            enum: ['page_view', 'download', 'video_watch', 'form_view', 'email_click', 'search', 'custom'],
            required: true,
            index: true,
        },
        signalName: {
            type: String,
            required: true,
            index: true,
        },
        signalValue: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },

        url: { type: String },
        pageTitle: { type: String },
        sessionId: { type: String, index: true },
        source: { type: String },

        metadata: {
            duration: { type: Number },
            scrollDepth: { type: Number },
            clickedElements: [{ type: String }],
            formFields: [{ type: String }],
            videoPercentage: { type: Number },
            downloadedFile: { type: String },
        },

        timestamp: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
intentSignalSchema.index({ contactId: 1, timestamp: -1 });
intentSignalSchema.index({ visitorId: 1, timestamp: -1 });
intentSignalSchema.index({ workspaceId: 1, signalType: 1 });
intentSignalSchema.index({ workspaceId: 1, timestamp: -1 });

const IntentSignal = mongoose.model<IIntentSignal>("IntentSignal", intentSignalSchema);

export default IntentSignal;
