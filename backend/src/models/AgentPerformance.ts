import mongoose, { Document, Schema } from "mongoose";

export interface IAgentPerformance extends Document {
  agentType: string;
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  insightId?: mongoose.Types.ObjectId;
  actionTaken: boolean;
  actionType?: string;
  responseTimeMs: number;
  userRating?: number;
  userFeedback?: string;
  helpful?: boolean;
  errorOccurred: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const agentPerformanceSchema = new Schema<IAgentPerformance>(
  {
    agentType: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    insightId: {
      type: Schema.Types.ObjectId,
      ref: 'AgentInsight'
    },
    actionTaken: {
      type: Boolean,
      default: false,
      index: true
    },
    actionType: {
      type: String
    },
    responseTimeMs: {
      type: Number,
      required: true
    },
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    userFeedback: {
      type: String
    },
    helpful: {
      type: Boolean
    },
    errorOccurred: {
      type: Boolean,
      default: false,
      index: true
    },
    errorMessage: {
      type: String
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Indexes for analytics queries
agentPerformanceSchema.index({ agentType: 1, createdAt: -1 });
agentPerformanceSchema.index({ userId: 1, agentType: 1 });
agentPerformanceSchema.index({ workspaceId: 1, agentType: 1, createdAt: -1 });
agentPerformanceSchema.index({ actionTaken: 1, agentType: 1 });

const AgentPerformance = mongoose.model<IAgentPerformance>("AgentPerformance", agentPerformanceSchema);

export default AgentPerformance;
