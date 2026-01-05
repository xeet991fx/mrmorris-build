import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Lead Recycling Model
 *
 * Tracks lead recycling attempts and re-engagement campaigns
 * for dead/stale leads to recover lost opportunities
 */

export type RecyclingStatus = "detected" | "in_recycling" | "re_engaged" | "failed" | "exhausted";
export type RecyclingReason = "inactive" | "low_score" | "no_engagement" | "stale" | "churned" | "lost_opportunity";

export interface IRecyclingAttempt {
  attemptNumber: number;
  method: "email" | "sms" | "call" | "linkedin" | "workflow";
  campaignId?: Types.ObjectId;
  sequenceId?: Types.ObjectId;
  workflowId?: Types.ObjectId;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  status: "sent" | "opened" | "clicked" | "replied" | "failed" | "bounced";
  metadata?: Record<string, any>;
}

export interface ILeadRecycling extends Document {
  workspaceId: Types.ObjectId;
  contactId: Types.ObjectId;

  // Detection
  detectedAt: Date;
  detectedReason: RecyclingReason;
  detectionCriteria: {
    daysSinceLastActivity?: number;
    currentScore?: number;
    previousScore?: number;
    lifecycleStage?: string;
    noEngagementDays?: number;
  };

  // Status
  status: RecyclingStatus;
  currentAttempt: number;
  maxAttempts: number;

  // Re-engagement
  firstAttemptAt?: Date;
  lastAttemptAt?: Date;
  reEngagedAt?: Date; // When they showed activity again
  exhaustedAt?: Date; // When we gave up
  attempts: IRecyclingAttempt[];

  // Results
  totalEmailsSent: number;
  totalOpens: number;
  totalClicks: number;
  totalReplies: number;
  reEngagementScore?: number; // 0-100, likelihood to re-engage

  // Next Action
  nextAttemptAt?: Date;
  nextAttemptMethod?: "email" | "sms" | "call" | "linkedin";

  // Metadata
  assignedTo?: Types.ObjectId; // Sales rep to follow up
  notes?: string;
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

const recyclingAttemptSchema = new Schema<IRecyclingAttempt>(
  {
    attemptNumber: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["email", "sms", "call", "linkedin", "workflow"],
      required: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
    },
    sequenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sequence",
    },
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    openedAt: Date,
    clickedAt: Date,
    repliedAt: Date,
    status: {
      type: String,
      enum: ["sent", "opened", "clicked", "replied", "failed", "bounced"],
      required: true,
      default: "sent",
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const leadRecyclingSchema = new Schema<ILeadRecycling>(
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

    // Detection
    detectedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    detectedReason: {
      type: String,
      enum: ["inactive", "low_score", "no_engagement", "stale", "churned", "lost_opportunity"],
      required: true,
    },
    detectionCriteria: {
      daysSinceLastActivity: Number,
      currentScore: Number,
      previousScore: Number,
      lifecycleStage: String,
      noEngagementDays: Number,
    },

    // Status
    status: {
      type: String,
      enum: ["detected", "in_recycling", "re_engaged", "failed", "exhausted"],
      required: true,
      default: "detected",
      index: true,
    },
    currentAttempt: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5, // Try 5 times before giving up
      min: 1,
      max: 10,
    },

    // Re-engagement
    firstAttemptAt: Date,
    lastAttemptAt: Date,
    reEngagedAt: Date,
    exhaustedAt: Date,
    attempts: [recyclingAttemptSchema],

    // Results
    totalEmailsSent: {
      type: Number,
      default: 0,
    },
    totalOpens: {
      type: Number,
      default: 0,
    },
    totalClicks: {
      type: Number,
      default: 0,
    },
    totalReplies: {
      type: Number,
      default: 0,
    },
    reEngagementScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Next Action
    nextAttemptAt: Date,
    nextAttemptMethod: {
      type: String,
      enum: ["email", "sms", "call", "linkedin"],
    },

    // Metadata
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Compound Indexes
leadRecyclingSchema.index({ workspaceId: 1, contactId: 1 }, { unique: true });
leadRecyclingSchema.index({ workspaceId: 1, status: 1 });
leadRecyclingSchema.index({ workspaceId: 1, nextAttemptAt: 1 });
leadRecyclingSchema.index({ workspaceId: 1, detectedAt: -1 });

// Static methods
leadRecyclingSchema.statics.getActiveRecycling = async function (workspaceId: Types.ObjectId) {
  return this.find({
    workspaceId,
    status: { $in: ["detected", "in_recycling"] },
  })
    .populate("contactId", "firstName lastName email lifecycleStage")
    .sort({ nextAttemptAt: 1 });
};

leadRecyclingSchema.statics.getSuccessRate = async function (workspaceId: Types.ObjectId) {
  const results = await this.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const total = results.reduce((sum: number, r: any) => sum + r.count, 0);
  const reEngaged = results.find((r: any) => r._id === "re_engaged")?.count || 0;

  return {
    total,
    reEngaged,
    successRate: total > 0 ? (reEngaged / total) * 100 : 0,
    breakdown: results,
  };
};

const LeadRecycling = mongoose.model<ILeadRecycling>("LeadRecycling", leadRecyclingSchema);

export default LeadRecycling;
