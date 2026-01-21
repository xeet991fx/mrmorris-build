import mongoose, { Document, Schema } from 'mongoose';

/**
 * Story 2.7: AgentTestRun Model
 * Stores test run predictions for comparison with live execution results.
 * Enables test accuracy tracking per NFR36 (95% accuracy target).
 */

export interface IAgentTestRunStep {
  stepNumber: number;
  action: string;
  prediction: {
    targetCount?: number;
    recipients?: string[];
    conditionResult?: boolean;
    fieldUpdates?: Record<string, any>;
    description: string;
  };
  status: 'success' | 'warning' | 'error' | 'skipped';
}

export interface IAgentTestRun extends Document {
  testRunId: string;
  agent: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  testTarget?: {
    type: 'contact' | 'deal' | 'none';
    id?: string;
    snapshotData?: Record<string, any>;
  };
  steps: IAgentTestRunStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    estimatedCredits: number;
    estimatedDurationMs: number;
  };
  createdAt: Date;
}

const AgentTestRunSchema = new Schema<IAgentTestRun>(
  {
    testRunId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    testTarget: {
      type: { type: String, enum: ['contact', 'deal', 'none'] },
      id: String,
      snapshotData: Schema.Types.Mixed,
    },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        action: { type: String, required: true },
        prediction: {
          targetCount: Number,
          recipients: [String],
          conditionResult: Boolean,
          fieldUpdates: Schema.Types.Mixed,
          description: { type: String, required: true },
        },
        status: {
          type: String,
          enum: ['success', 'warning', 'error', 'skipped'],
          required: true,
        },
      },
    ],
    summary: {
      totalSteps: { type: Number, required: true },
      successfulSteps: { type: Number, required: true },
      estimatedCredits: { type: Number, required: true },
      estimatedDurationMs: { type: Number, required: true },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60, // TTL: 30 days
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for efficient queries (AC: 1, 6)
AgentTestRunSchema.index({ agent: 1, workspace: 1, createdAt: -1 });

export default mongoose.model<IAgentTestRun>('AgentTestRun', AgentTestRunSchema);
