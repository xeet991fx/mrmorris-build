import mongoose, { Document, Schema, Types, Model } from "mongoose";

/**
 * StageChangeEvent - Immutable Event Log for Deal Stage Transitions
 *
 * Event Sourcing Pattern:
 * - Every stage change writes an event — never overwritten, never deleted
 * - Enables time-travel queries and historical analysis
 * - Powers Time in Stage, Funnel, and Stage Changed reports
 *
 * Time in Stage Algorithm:
 * 1. Sort events by entityId + timestamp
 * 2. delta = next_event.timestamp - current_event.timestamp
 * 3. GROUP BY stage → AVG(delta), MIN(delta), MAX(delta)
 */

export interface IStageChangeEvent extends Document {
  // Entity Identification
  entityId: Types.ObjectId; // Opportunity ID
  entityType: "opportunity"; // Extensible for future entity types
  workspaceId: Types.ObjectId;
  pipelineId: Types.ObjectId;

  // Stage Transition
  oldStageId?: Types.ObjectId; // Undefined for first stage entry
  oldStageName?: string;
  newStageId: Types.ObjectId;
  newStageName: string;

  // Event Metadata
  timestamp: Date;
  userId?: Types.ObjectId; // User who triggered the change (null for automated)

  // Context Data (snapshot at transition time)
  metadata?: {
    value?: number; // Deal value at time of change
    probability?: number; // Probability at time of change
    status?: "open" | "won" | "lost" | "abandoned";
    assignedTo?: Types.ObjectId;
    [key: string]: any;
  };

  createdAt: Date;
}

const stageChangeEventSchema = new Schema<IStageChangeEvent>(
  {
    // Entity Identification
    entityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["opportunity"],
      required: true,
      default: "opportunity",
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    pipelineId: {
      type: Schema.Types.ObjectId,
      ref: "Pipeline",
      required: true,
      index: true,
    },

    // Stage Transition
    oldStageId: {
      type: Schema.Types.ObjectId,
    },
    oldStageName: {
      type: String,
    },
    newStageId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    newStageName: {
      type: String,
      required: true,
    },

    // Event Metadata
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Context Data
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Events are immutable
  }
);

// Compound Indexes for Query Performance
stageChangeEventSchema.index({ entityId: 1, timestamp: 1 }); // Time in stage queries
stageChangeEventSchema.index({ workspaceId: 1, pipelineId: 1, timestamp: -1 }); // Pipeline reports
stageChangeEventSchema.index({ workspaceId: 1, newStageId: 1, timestamp: -1 }); // Stage-specific reports
stageChangeEventSchema.index({ workspaceId: 1, timestamp: -1 }); // Time-series queries

// Static Methods

/**
 * Get all stage transitions for a specific opportunity
 */
stageChangeEventSchema.statics.getEntityHistory = async function (
  entityId: Types.ObjectId
) {
  return this.find({ entityId }).sort({ timestamp: 1 });
};

/**
 * Get time in stage metrics for a workspace/pipeline
 */
stageChangeEventSchema.statics.getTimeInStageMetrics = async function (
  workspaceId: Types.ObjectId,
  pipelineId?: Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = { workspaceId };

  if (pipelineId) {
    matchStage.pipelineId = pipelineId;
  }

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    { $sort: { entityId: 1, timestamp: 1 } },
    {
      $group: {
        _id: {
          entityId: "$entityId",
          stageId: "$newStageId",
          stageName: "$newStageName",
        },
        enteredAt: { $first: "$timestamp" },
        exitedAt: { $last: "$timestamp" },
      },
    },
    {
      $project: {
        stageId: "$_id.stageId",
        stageName: "$_id.stageName",
        duration: {
          $subtract: ["$exitedAt", "$enteredAt"],
        },
      },
    },
    {
      $group: {
        _id: {
          stageId: "$stageId",
          stageName: "$stageName",
        },
        avgDuration: { $avg: "$duration" },
        minDuration: { $min: "$duration" },
        maxDuration: { $max: "$duration" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        stageId: "$_id.stageId",
        stageName: "$_id.stageName",
        avgDurationMs: "$avgDuration",
        minDurationMs: "$minDuration",
        maxDurationMs: "$maxDuration",
        opportunityCount: "$count",
      },
    },
    { $sort: { avgDurationMs: -1 } },
  ]);
};

/**
 * Get funnel conversion data
 */
stageChangeEventSchema.statics.getFunnelData = async function (
  workspaceId: Types.ObjectId,
  pipelineId: Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = { workspaceId, pipelineId };

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    { $sort: { entityId: 1, timestamp: 1 } },
    {
      $group: {
        _id: "$newStageId",
        stageName: { $first: "$newStageName" },
        count: { $sum: 1 },
        uniqueOpportunities: { $addToSet: "$entityId" },
      },
    },
    {
      $project: {
        _id: 0,
        stageId: "$_id",
        stageName: 1,
        count: { $size: "$uniqueOpportunities" },
      },
    },
    { $sort: { stageId: 1 } },
  ]);
};

// Interface for static methods
interface IStageChangeEventModel extends Model<IStageChangeEvent> {
  getEntityHistory(entityId: Types.ObjectId): Promise<IStageChangeEvent[]>;
  getTimeInStageMetrics(
    workspaceId: Types.ObjectId,
    pipelineId?: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]>;
  getFunnelData(
    workspaceId: Types.ObjectId,
    pipelineId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]>;
}

const StageChangeEvent = mongoose.model<IStageChangeEvent, IStageChangeEventModel>(
  "StageChangeEvent",
  stageChangeEventSchema
);

export default StageChangeEvent;
