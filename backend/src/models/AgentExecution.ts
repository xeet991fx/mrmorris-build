import mongoose, { Document, Schema } from 'mongoose';

/**
 * Story 2.7: AgentExecution Model
 * Stores live execution results for comparison with test predictions.
 * Links to AgentTestRun via linkedTestRunId for accuracy tracking.
 */

export interface IAgentExecutionStep {
  stepNumber: number;
  action: string;
  result: {
    targetCount?: number;
    recipients?: string[];
    conditionResult?: boolean;
    fieldUpdates?: Record<string, any>;
    description: string;
    success: boolean;
    error?: string;
  };
  executedAt: Date;
  durationMs: number;
  creditsUsed: number;
}

export interface IAgentExecutionComparison {
  linkedTestRunId: string;
  overallMatch: boolean;
  matchPercentage: number;
  mismatches: Array<{
    stepNumber: number;
    predicted: string;
    actual: string;
    reason: string;
  }>;
}

export interface IAgentExecution extends Document {
  executionId: string;
  agent: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  linkedTestRunId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
    eventDetails?: Record<string, any>;
  };
  target?: {
    type: 'contact' | 'deal';
    id: string;
    currentData?: Record<string, any>;
  };
  steps: IAgentExecutionStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalCreditsUsed: number;
    totalDurationMs: number;
  };
  comparison?: IAgentExecutionComparison;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const AgentExecutionSchema = new Schema<IAgentExecution>(
  {
    executionId: {
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
    linkedTestRunId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    trigger: {
      type: {
        type: String,
        enum: ['manual', 'scheduled', 'event'],
        required: true,
      },
      eventDetails: Schema.Types.Mixed,
    },
    target: {
      type: {
        type: String,
        enum: ['contact', 'deal'],
      },
      id: String,
      currentData: Schema.Types.Mixed,
    },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        action: { type: String, required: true },
        result: {
          targetCount: Number,
          recipients: [String],
          conditionResult: Boolean,
          fieldUpdates: Schema.Types.Mixed,
          description: { type: String, required: true },
          success: { type: Boolean, required: true },
          error: String,
        },
        executedAt: { type: Date, required: true },
        durationMs: { type: Number, required: true },
        creditsUsed: { type: Number, required: true },
      },
    ],
    summary: {
      totalSteps: { type: Number, required: true },
      successfulSteps: { type: Number, required: true },
      failedSteps: { type: Number, required: true },
      totalCreditsUsed: { type: Number, required: true },
      totalDurationMs: { type: Number, required: true },
    },
    comparison: {
      linkedTestRunId: String,
      overallMatch: Boolean,
      matchPercentage: Number,
      mismatches: [
        {
          stepNumber: Number,
          predicted: String,
          actual: String,
          reason: String,
        },
      ],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for efficient queries (AC: 1, 2, 3, 4)
AgentExecutionSchema.index({ agent: 1, workspace: 1, createdAt: -1 });
AgentExecutionSchema.index({ agent: 1, linkedTestRunId: 1 });

export default mongoose.model<IAgentExecution>('AgentExecution', AgentExecutionSchema);
