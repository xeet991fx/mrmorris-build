import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type TriggerType =
    | 'contact_created'
    | 'contact_updated'
    | 'deal_stage_changed'
    | 'deal_created'
    | 'email_opened'
    | 'email_clicked'
    | 'form_submitted'
    | 'manual';

export type ActionType =
    | 'send_email'
    | 'update_field'
    | 'create_task'
    | 'assign_owner'
    | 'add_tag'
    | 'remove_tag'
    | 'send_notification'
    | 'enroll_workflow';

export type DelayType = 'duration' | 'until_date' | 'until_time' | 'until_weekday';

export type ConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'is_empty'
    | 'is_not_empty'
    | 'is_true'
    | 'is_false';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export type StepType = 'trigger' | 'action' | 'delay' | 'condition';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IWorkflowCondition {
    field: string;
    operator: ConditionOperator;
    value?: any;
}

export interface IWorkflowStep {
    id: string;
    type: StepType;
    name: string;
    config: {
        // Trigger config
        triggerType?: TriggerType;

        // Action config
        actionType?: ActionType;
        emailTemplateId?: string;
        emailSubject?: string;
        emailBody?: string;
        fieldName?: string;
        fieldValue?: any;
        taskTitle?: string;
        taskDescription?: string;
        taskDueInDays?: number;
        taskAssignee?: string;
        tagName?: string;
        notificationMessage?: string;
        notificationUserId?: string;
        targetWorkflowId?: string;

        // Delay config
        delayType?: DelayType;
        delayValue?: number;
        delayUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
        delayDate?: Date;
        delayTime?: string;
        delayWeekdays?: number[];

        // Condition config
        conditions?: IWorkflowCondition[];
    };
    position: {
        x: number;
        y: number;
    };
    nextStepIds: string[];
}

export interface IEnrollmentCriteria {
    conditions: IWorkflowCondition[];
    matchAll?: boolean; // true = AND, false = OR
}

export interface IWorkflowStats {
    totalEnrolled: number;
    currentlyActive: number;
    completed: number;
    goalsMet: number;
    failed: number;
}

// ============================================
// MAIN DOCUMENT INTERFACE
// ============================================

export interface IWorkflow extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Metadata
    name: string;
    description?: string;

    // Status
    status: WorkflowStatus;

    // Configuration
    triggerEntityType: 'contact' | 'deal' | 'company';
    enrollmentCriteria?: IEnrollmentCriteria;

    // Steps
    steps: IWorkflowStep[];

    // Settings
    allowReenrollment: boolean;
    goalCriteria?: IEnrollmentCriteria;

    // Stats
    stats: IWorkflowStats;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    lastActivatedAt?: Date;
}

// ============================================
// SUB-DOCUMENT SCHEMAS
// ============================================

const workflowConditionSchema = new Schema<IWorkflowCondition>(
    {
        field: { type: String, required: true },
        operator: {
            type: String,
            enum: ['equals', 'not_equals', 'contains', 'not_contains',
                'greater_than', 'less_than', 'is_empty', 'is_not_empty',
                'is_true', 'is_false'],
            required: true,
        },
        value: { type: Schema.Types.Mixed },
    },
    { _id: false }
);

const workflowStepSchema = new Schema<IWorkflowStep>(
    {
        id: { type: String, required: true },
        type: {
            type: String,
            enum: ['trigger', 'action', 'delay', 'condition'],
            required: true,
        },
        name: { type: String, required: true },
        config: {
            // Trigger config
            triggerType: {
                type: String,
                enum: ['contact_created', 'contact_updated', 'deal_stage_changed',
                    'deal_created', 'email_opened', 'email_clicked',
                    'form_submitted', 'manual'],
            },

            // Action config
            actionType: {
                type: String,
                enum: ['send_email', 'update_field', 'create_task', 'assign_owner',
                    'add_tag', 'remove_tag', 'send_notification', 'enroll_workflow'],
            },
            emailTemplateId: String,
            emailSubject: String,
            emailBody: String,
            fieldName: String,
            fieldValue: Schema.Types.Mixed,
            taskTitle: String,
            taskDescription: String,
            taskDueInDays: Number,
            taskAssignee: String,
            tagName: String,
            notificationMessage: String,
            notificationUserId: String,
            targetWorkflowId: String,

            // Delay config
            delayType: {
                type: String,
                enum: ['duration', 'until_date', 'until_time', 'until_weekday'],
            },
            delayValue: Number,
            delayUnit: {
                type: String,
                enum: ['minutes', 'hours', 'days', 'weeks'],
            },
            delayDate: Date,
            delayTime: String,
            delayWeekdays: [Number],

            // Condition config
            conditions: [workflowConditionSchema],
        },
        position: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
        },
        nextStepIds: [{ type: String }],
    },
    { _id: false }
);

const enrollmentCriteriaSchema = new Schema<IEnrollmentCriteria>(
    {
        conditions: [workflowConditionSchema],
        matchAll: { type: Boolean, default: true },
    },
    { _id: false }
);

const workflowStatsSchema = new Schema<IWorkflowStats>(
    {
        totalEnrolled: { type: Number, default: 0 },
        currentlyActive: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        goalsMet: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
    { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const workflowSchema = new Schema<IWorkflow>(
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
            index: true,
        },

        // Metadata
        name: {
            type: String,
            required: [true, "Workflow name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description must be less than 500 characters"],
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'archived'],
            default: 'draft',
            index: true,
        },

        // Configuration
        triggerEntityType: {
            type: String,
            enum: ['contact', 'deal', 'company'],
            default: 'contact',
        },
        enrollmentCriteria: enrollmentCriteriaSchema,

        // Steps
        steps: {
            type: [workflowStepSchema],
            default: [],
        },

        // Settings
        allowReenrollment: {
            type: Boolean,
            default: false,
        },
        goalCriteria: enrollmentCriteriaSchema,

        // Stats
        stats: {
            type: workflowStatsSchema,
            default: () => ({
                totalEnrolled: 0,
                currentlyActive: 0,
                completed: 0,
                goalsMet: 0,
                failed: 0,
            }),
        },

        // Timestamps
        lastActivatedAt: Date,
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
workflowSchema.index({ workspaceId: 1, status: 1 });
workflowSchema.index({ workspaceId: 1, createdAt: -1 });
workflowSchema.index({ workspaceId: 1, triggerEntityType: 1, status: 1 });

// Text index for search
workflowSchema.index({
    name: "text",
    description: "text",
});

// ============================================
// METHODS
// ============================================

// Get trigger step (first step)
workflowSchema.methods.getTriggerStep = function (): IWorkflowStep | undefined {
    return this.steps.find((step: IWorkflowStep) => step.type === 'trigger');
};

// Get step by ID
workflowSchema.methods.getStepById = function (stepId: string): IWorkflowStep | undefined {
    return this.steps.find((step: IWorkflowStep) => step.id === stepId);
};

// ============================================
// EXPORT
// ============================================

const Workflow = mongoose.model<IWorkflow>("Workflow", workflowSchema);

export default Workflow;
