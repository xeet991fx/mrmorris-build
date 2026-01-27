import mongoose, { Document, Schema } from 'mongoose';

/**
 * Story 2.7: AgentExecution Model
 * Stores live execution results for comparison with test predictions.
 * Links to AgentTestRun via linkedTestRunId for accuracy tracking.
 * 
 * Story 3.13: Track Execution History
 * Added fields: triggeredBy, canceledAt, canceledBy, agentDeleted, agentName
 * Added indexes for workspace-wide history queries and TTL retention
 */

/**
 * Story 3.5: Enhanced step status for multi-step tracking
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';

export interface IAgentExecutionStep {
  stepNumber: number;
  stepIndex?: number;           // Story 3.5: 0-based index for programmatic access
  action: string;
  actionParams?: Record<string, any>;  // Story 3.5: Parameters for the action
  stepStatus?: StepStatus;      // Story 3.5: Per-step status tracking
  result: {
    targetCount?: number;
    recipients?: string[];
    conditionResult?: boolean;
    fieldUpdates?: Record<string, any>;
    description: string;
    success: boolean;
    error?: string;
    data?: any;                 // Story 3.5: Action-specific output data
    itemsProcessed?: number;    // Story 3.5: For batch operations
    warnings?: string[];        // Story 3.6: Condition evaluation warnings
    fieldValues?: Record<string, any>;  // Story 3.6: Resolved field values
  };
  executedAt: Date;
  completedAt?: Date;           // Story 3.5: When step finished
  durationMs: number;
  creditsUsed: number;
  skippedReason?: string;       // Story 3.5: Reason if step was skipped
  // Story 3.6: Condition logging for debugging
  conditionLog?: {
    condition: string;          // Original condition text
    resolvedValues: Record<string, any>;  // Field values at evaluation time
    operator: string;           // Operator used
    expectedValue: any;         // Expected comparison value
    result: boolean;            // Evaluation result
    warnings: string[];         // Any warnings generated
    nestingLevel: number;       // For nested conditions (Task 4.5) - 0 for top level
  };
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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';  // Story 3.5: Added 'waiting'
  trigger: {
    type: 'manual' | 'scheduled' | 'event';
    eventDetails?: Record<string, any>;
  };
  // Story 3.13: Triggered by user for manual triggers
  triggeredBy?: mongoose.Types.ObjectId;
  target?: {
    type: 'contact' | 'deal';
    id: string;
    currentData?: Record<string, any>;
  };
  // Story 3.5: Multi-step tracking fields
  currentStep: number;
  totalSteps: number;
  steps: IAgentExecutionStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalCreditsUsed: number;
    totalDurationMs: number;
    description?: string;  // Story 3.13: Human-readable summary
  };
  comparison?: IAgentExecutionComparison;
  // Story 3.5: Resume capability fields
  savedContext?: Record<string, any>;   // Serialized execution context for resume
  savedMemory?: Record<string, any>;    // Serialized memory Map for resume
  resumeFromStep?: number;              // Step index to resume from
  resumeAt?: Date;                      // Scheduled resume time
  resumeJobId?: string;                 // BullMQ job ID for cancellation
  // Story 3.13: Cancel tracking fields
  canceledAt?: Date;
  canceledBy?: mongoose.Types.ObjectId;
  // Story 3.13: Agent deletion preservation
  agentDeleted: boolean;
  agentName?: string;                   // Preserved agent name after deletion
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  // Story 3.13: Virtual field for duration
  duration?: number;                    // Computed: completedAt - startedAt in ms
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
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'waiting'],  // Story 3.5: Added 'waiting'
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
    // Story 3.13: Triggered by user for manual triggers
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    target: {
      type: {
        type: String,
        enum: ['contact', 'deal'],
      },
      id: String,
      currentData: Schema.Types.Mixed,
    },
    // Story 3.5: Multi-step tracking fields
    currentStep: {
      type: Number,
      default: 0,
    },
    totalSteps: {
      type: Number,
      default: 1,
    },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        stepIndex: { type: Number },  // Story 3.5: 0-based index
        action: { type: String, required: true },
        actionParams: { type: Schema.Types.Mixed },  // Story 3.5: Action parameters
        stepStatus: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting'],
          default: 'pending',
        },
        result: {
          targetCount: Number,
          recipients: [String],
          conditionResult: Boolean,
          fieldUpdates: Schema.Types.Mixed,
          description: { type: String, required: true },
          success: { type: Boolean, required: true },
          error: String,
          data: Schema.Types.Mixed,       // Story 3.5: Action-specific output
          itemsProcessed: Number,         // Story 3.5: For batch operations
          warnings: [String],             // Story 3.6: Condition evaluation warnings
          fieldValues: Schema.Types.Mixed, // Story 3.6: Resolved field values
        },
        executedAt: { type: Date, required: true },
        completedAt: Date,                // Story 3.5: When step finished
        durationMs: { type: Number, required: true },
        creditsUsed: { type: Number, required: true },
        skippedReason: String,            // Story 3.5: Reason if step was skipped
        // Story 3.6: Condition logging for debugging
        conditionLog: {
          condition: String,              // Original condition text
          resolvedValues: Schema.Types.Mixed,  // Field values at evaluation time
          operator: String,               // Operator used
          expectedValue: Schema.Types.Mixed,   // Expected comparison value
          result: Boolean,                // Evaluation result
          warnings: [String],             // Any warnings generated
          nestingLevel: Number,           // For nested conditions (Task 4.5)
        },
      },
    ],
    summary: {
      totalSteps: { type: Number, required: true },
      successfulSteps: { type: Number, required: true },
      failedSteps: { type: Number, required: true },
      totalCreditsUsed: { type: Number, required: true },
      totalDurationMs: { type: Number, required: true },
      description: { type: String },  // Story 3.13: Human-readable summary
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
    // Story 3.5: Resume capability fields
    savedContext: { type: Schema.Types.Mixed },   // Serialized execution context for resume
    savedMemory: { type: Schema.Types.Mixed },    // Serialized memory Map for resume
    resumeFromStep: { type: Number },             // Step index to resume from
    resumeAt: { type: Date },                     // Scheduled resume time
    resumeJobId: { type: String },                // BullMQ job ID for cancellation
    // Story 3.13: Cancel tracking fields
    canceledAt: { type: Date },
    canceledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // Story 3.13: Agent deletion preservation
    agentDeleted: { type: Boolean, default: false, index: true },
    agentName: { type: String },                  // Preserved agent name after deletion
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Story 3.13: Virtual field for duration (completedAt - startedAt in ms)
AgentExecutionSchema.virtual('duration').get(function () {
  if (this.completedAt && this.startedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return undefined;
});

// Compound indexes for efficient queries (AC: 1, 2, 3, 4)
AgentExecutionSchema.index({ agent: 1, workspace: 1, createdAt: -1 });
AgentExecutionSchema.index({ agent: 1, linkedTestRunId: 1 });
// Story 3.5: Index for querying waiting executions (for resume job scanning)
AgentExecutionSchema.index({ status: 1, resumeAt: 1 });
// Story 3.13: Index for workspace-wide execution history queries
AgentExecutionSchema.index({ workspace: 1, startedAt: -1 });
// Story 3.14: Index for filtered execution history queries (status filter + date range)
AgentExecutionSchema.index({ workspace: 1, agent: 1, status: 1, startedAt: -1 });

export default mongoose.model<IAgentExecution>('AgentExecution', AgentExecutionSchema);

