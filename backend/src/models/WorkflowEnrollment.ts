import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type EnrollmentStatus =
    | 'active'
    | 'processing'  // Currently being processed (lock)
    | 'completed'
    | 'goal_met'
    | 'failed'
    | 'cancelled'
    | 'paused'
    | 'retrying'
    | 'waiting_for_event';

export interface IStepExecution {
    stepId: string;
    stepName: string;
    stepType: 'trigger' | 'action' | 'delay' | 'condition' | 'wait_event';
    startedAt: Date;
    completedAt?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
    result?: any;
    error?: string;
}

// ============================================
// MAIN DOCUMENT INTERFACE
// ============================================

export interface IWorkflowEnrollment extends Document {
    workflowId: Types.ObjectId;
    workspaceId: Types.ObjectId;

    // The entity enrolled (contact, deal, or company)
    entityType: 'contact' | 'deal' | 'company';
    entityId: Types.ObjectId;

    // Progress
    status: EnrollmentStatus;
    currentStepId?: string;
    nextExecutionTime?: Date;

    // Wait for event state
    waitingForEvent?: {
        eventType: string;
        timeoutAt?: Date;
        timeoutStepId?: string;
    };

    // Execution History
    stepsExecuted: IStepExecution[];

    // Metadata
    enrolledBy?: Types.ObjectId; // User who manually enrolled (if manual)
    enrollmentSource: 'automatic' | 'manual' | 'api';

    // Error tracking
    lastError?: string;
    errorCount: number;

    // Timestamps
    enrolledAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SUB-DOCUMENT SCHEMAS
// ============================================

const stepExecutionSchema = new Schema<IStepExecution>(
    {
        stepId: { type: String, required: true },
        stepName: { type: String, required: true },
        stepType: {
            type: String,
            enum: ['trigger', 'action', 'delay', 'condition', 'wait_event'],
            required: true,
        },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date },
        status: {
            type: String,
            enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting'],
            default: 'pending',
        },
        result: { type: Schema.Types.Mixed },
        error: { type: String },
    },
    { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const workflowEnrollmentSchema = new Schema<IWorkflowEnrollment>(
    {
        workflowId: {
            type: Schema.Types.ObjectId,
            ref: "Workflow",
            required: [true, "Workflow ID is required"],
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },

        // Entity being enrolled
        entityType: {
            type: String,
            enum: ['contact', 'deal', 'company'],
            required: true,
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: [true, "Entity ID is required"],
            refPath: 'entityTypeRef',
            index: true,
        },

        // Progress tracking
        status: {
            type: String,
            enum: ['active', 'processing', 'completed', 'goal_met', 'failed', 'cancelled', 'paused', 'retrying', 'waiting_for_event'],
            default: 'active',
            index: true,
        },
        currentStepId: {
            type: String,
        },
        nextExecutionTime: {
            type: Date,
            index: true,
        },

        // Wait for event state
        waitingForEvent: {
            eventType: { type: String },
            timeoutAt: { type: Date },
            timeoutStepId: { type: String },
        },

        // Execution history
        stepsExecuted: {
            type: [stepExecutionSchema],
            default: [],
        },

        // Metadata
        enrolledBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        enrollmentSource: {
            type: String,
            enum: ['automatic', 'manual', 'api'],
            default: 'automatic',
        },

        // Error tracking
        lastError: { type: String },
        errorCount: { type: Number, default: 0 },

        // Timestamps
        enrolledAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// ============================================
// VIRTUAL FOR REF PATH
// ============================================

workflowEnrollmentSchema.virtual('entityTypeRef').get(function () {
    const typeMap: Record<string, string> = {
        'contact': 'Contact',
        'deal': 'Opportunity',
        'company': 'Company',
    };
    return typeMap[this.entityType] || 'Contact';
});

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
workflowEnrollmentSchema.index({ workflowId: 1, status: 1 });
workflowEnrollmentSchema.index({ workflowId: 1, entityId: 1 });
workflowEnrollmentSchema.index({ workspaceId: 1, status: 1 });
workflowEnrollmentSchema.index({ workspaceId: 1, entityType: 1, entityId: 1 });
workflowEnrollmentSchema.index({ status: 1, nextExecutionTime: 1 }); // For cron job
workflowEnrollmentSchema.index({ workflowId: 1, entityId: 1, status: 1 }, { unique: false });

// ============================================
// METHODS
// ============================================

// Add step execution record
workflowEnrollmentSchema.methods.addStepExecution = function (
    stepId: string,
    stepName: string,
    stepType: 'trigger' | 'action' | 'delay' | 'condition'
): IStepExecution {
    const execution: IStepExecution = {
        stepId,
        stepName,
        stepType,
        startedAt: new Date(),
        status: 'running',
    };
    this.stepsExecuted.push(execution);
    return execution;
};

// Complete current step execution
workflowEnrollmentSchema.methods.completeStepExecution = function (
    stepId: string,
    result?: any
): void {
    const execution = this.stepsExecuted.find(
        (s: IStepExecution) => s.stepId === stepId && s.status === 'running'
    );
    if (execution) {
        execution.completedAt = new Date();
        execution.status = 'completed';
        execution.result = result;
    }
};

// Mark step as failed
workflowEnrollmentSchema.methods.failStepExecution = function (
    stepId: string,
    error: string
): void {
    const execution = this.stepsExecuted.find(
        (s: IStepExecution) => s.stepId === stepId && s.status === 'running'
    );
    if (execution) {
        execution.completedAt = new Date();
        execution.status = 'failed';
        execution.error = error;
    }
    this.lastError = error;
    this.errorCount += 1;
};

// ============================================
// STATICS
// ============================================

// Find active enrollments ready for execution
workflowEnrollmentSchema.statics.findReadyForExecution = function () {
    return this.find({
        status: 'active',
        nextExecutionTime: { $lte: new Date() },
    }).populate('workflowId');
};

// Check if entity is already enrolled in workflow
workflowEnrollmentSchema.statics.isEnrolled = async function (
    workflowId: Types.ObjectId,
    entityId: Types.ObjectId
): Promise<boolean> {
    const count = await this.countDocuments({
        workflowId,
        entityId,
        status: { $in: ['active', 'paused'] },
    });
    return count > 0;
};

// ============================================
// EXPORT
// ============================================

const WorkflowEnrollment = mongoose.model<IWorkflowEnrollment>(
    "WorkflowEnrollment",
    workflowEnrollmentSchema
);

export default WorkflowEnrollment;
