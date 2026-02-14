/**
 * Lead Score Model
 *
 * Tracks point-based lead scoring for contacts.
 * Scores are calculated based on engagement activities and can trigger workflows.
 */

import mongoose, { Document, Schema, Types, Model } from "mongoose";

export interface ILeadScoreEvent {
    eventType: string; // e.g., "email_opened", "form_submitted", "page_visited"
    points: number;
    reason: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface ILeadScore extends Document {
    workspaceId: Types.ObjectId;
    contactId: Types.ObjectId;

    // Current score
    currentScore: number;
    previousScore: number;

    // Grade calculation (A, B, C, D, F)
    grade: "A" | "B" | "C" | "D" | "F";
    previousGrade: "A" | "B" | "C" | "D" | "F";

    // Score history
    scoreHistory: ILeadScoreEvent[];

    // Decay settings
    lastActivityAt: Date;
    decayedAt?: Date;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    calculateGrade(): "A" | "B" | "C" | "D" | "F";
    addPoints(
        eventType: string,
        points: number,
        reason: string,
        metadata?: Record<string, any>
    ): Promise<void>;
}

// Static methods interface
export interface ILeadScoreModel extends Model<ILeadScore> {
    applyDecay(
        workspaceId: Types.ObjectId | string,
        daysInactive?: number,
        decayPercent?: number
    ): Promise<number>;
    getOrCreate(
        workspaceId: Types.ObjectId | string,
        contactId: Types.ObjectId | string
    ): Promise<ILeadScore>;
    getTopLeads(
        workspaceId: Types.ObjectId | string,
        limit?: number
    ): Promise<ILeadScore[]>;
}

const leadScoreEventSchema = new Schema<ILeadScoreEvent>(
    {
        eventType: {
            type: String,
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    { _id: false }
);

const leadScoreSchema = new Schema<ILeadScore>(
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
        currentScore: {
            type: Number,
            default: 0,
            min: 0,
        },
        previousScore: {
            type: Number,
            default: 0,
            min: 0,
        },
        grade: {
            type: String,
            enum: ["A", "B", "C", "D", "F"],
            default: "F",
        },
        previousGrade: {
            type: String,
            enum: ["A", "B", "C", "D", "F"],
            default: "F",
        },
        scoreHistory: [leadScoreEventSchema],
        lastActivityAt: {
            type: Date,
            default: Date.now,
        },
        decayedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
leadScoreSchema.index({ workspaceId: 1, contactId: 1 }, { unique: true });
leadScoreSchema.index({ workspaceId: 1, currentScore: -1 }); // Leaderboard
leadScoreSchema.index({ workspaceId: 1, grade: 1 }); // Filter by grade
leadScoreSchema.index({ workspaceId: 1, lastActivityAt: -1 }); // Find stale leads

/**
 * Calculate grade from score
 */
leadScoreSchema.methods.calculateGrade = function (): "A" | "B" | "C" | "D" | "F" {
    const score = this.currentScore;

    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    if (score >= 20) return "D";
    return "F";
};

/**
 * Add points to lead score
 */
leadScoreSchema.methods.addPoints = async function (
    eventType: string,
    points: number,
    reason: string,
    metadata?: Record<string, any>
): Promise<void> {
    this.previousScore = this.currentScore;
    this.previousGrade = this.grade;

    this.currentScore += points;
    if (this.currentScore < 0) this.currentScore = 0; // Don't go negative

    this.grade = this.calculateGrade();
    this.lastActivityAt = new Date();

    this.scoreHistory.push({
        eventType,
        points,
        reason,
        timestamp: new Date(),
        metadata,
    });

    // Keep only last 100 events
    if (this.scoreHistory.length > 100) {
        this.scoreHistory = this.scoreHistory.slice(-100);
    }

    await this.save();
};

/**
 * Apply time decay (reduce score over time for inactive leads)
 */
leadScoreSchema.statics.applyDecay = async function (
    workspaceId: Types.ObjectId | string,
    daysInactive: number = 30,
    decayPercent: number = 10
): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const staleLeads = await this.find({
        workspaceId,
        lastActivityAt: { $lt: cutoffDate },
        currentScore: { $gt: 0 },
    });

    let decayedCount = 0;

    for (const lead of staleLeads) {
        const decayAmount = Math.ceil(lead.currentScore * (decayPercent / 100));
        lead.previousScore = lead.currentScore;
        lead.previousGrade = lead.grade;
        lead.currentScore = Math.max(0, lead.currentScore - decayAmount);
        lead.grade = lead.calculateGrade();
        lead.decayedAt = new Date();

        lead.scoreHistory.push({
            eventType: "decay",
            points: -decayAmount,
            reason: `${daysInactive} days inactive - ${decayPercent}% decay`,
            timestamp: new Date(),
        });

        // Trim history to 100 entries (fixes B5)
        if (lead.scoreHistory.length > 100) {
            lead.scoreHistory = lead.scoreHistory.slice(-100);
        }

        await lead.save();
        decayedCount++;
    }

    return decayedCount;
};

/**
 * Get or create lead score for a contact
 */
leadScoreSchema.statics.getOrCreate = async function (
    workspaceId: Types.ObjectId | string,
    contactId: Types.ObjectId | string
): Promise<ILeadScore> {
    let leadScore = await this.findOne({ workspaceId, contactId });

    if (!leadScore) {
        leadScore = await this.create({
            workspaceId,
            contactId,
            currentScore: 0,
            previousScore: 0,
            grade: "F",
            previousGrade: "F",
            scoreHistory: [],
            lastActivityAt: new Date(),
        });
    }

    return leadScore;
};

/**
 * Get top scored leads
 */
leadScoreSchema.statics.getTopLeads = async function (
    workspaceId: Types.ObjectId | string,
    limit: number = 10
): Promise<ILeadScore[]> {
    return this.find({ workspaceId })
        .sort({ currentScore: -1 })
        .limit(limit)
        .populate("contactId", "firstName lastName email company");
};

const LeadScore = mongoose.model<ILeadScore, ILeadScoreModel>("LeadScore", leadScoreSchema);

export default LeadScore;
