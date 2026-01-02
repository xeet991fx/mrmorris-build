import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type TriggerType =
    | 'contact_created'
    | 'contact_updated'
    | 'contact_job_changed'  // NEW: Data Stewardship trigger
    | 'deal_stage_changed'
    | 'deal_created'
    | 'email_opened'
    | 'email_clicked'
    | 'form_submitted'
    | 'manual'
    | 'webhook_received';

export type ActionType =
    | 'send_email'
    | 'update_field'
    | 'create_task'
    | 'assign_owner'
    | 'add_tag'
    | 'remove_tag'
    | 'send_notification'
    | 'enroll_workflow'
    | 'update_lead_score'
    | 'send_webhook'
    | 'apollo_enrich'
    // NEW N8N-STYLE ACTIONS
    | 'http_request'        // Enhanced HTTP with full auth
    | 'transform_set'       // Set variables
    | 'transform_map'       // Map/transform data
    | 'transform_filter'    // Filter arrays
    | 'ai_agent';           // AI agent execution

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

export type StepType =
    | 'trigger'
    | 'action'
    | 'delay'
    | 'condition'
    | 'wait_event'
    // NEW N8N-STYLE STEP TYPES
    | 'parallel'              // Split execution into parallel branches
    | 'merge'                 // Join parallel branches back together
    | 'loop'                  // Iterate over arrays
    | 'transform'             // Data transformation (set/map/filter)
    | 'try_catch'             // Error handling wrapper
    | 'ai_agent'              // AI agent integration
    // INTEGRATION NODES (each integration is its own type)
    | 'integration_slack'     // Slack integration
    | 'integration_whatsapp'  // WhatsApp (future)
    | 'integration_discord';  // Discord (future)

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
        useCustomEmail?: boolean;      // Send to custom email vs enrolled contact
        recipientEmail?: string;       // Custom email address (supports placeholders)
        sendFromAccountId?: string;    // Connected Gmail account to send from
        // AI Email Generation
        useAIGeneration?: boolean;     // Use AI to generate email content
        emailPurpose?: string;         // e.g., "welcome", "follow-up", "thank you"
        emailTone?: string;            // e.g., "professional", "friendly", "casual"
        companyName?: string;          // Company name for branding
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

        // Lead scoring config
        scoreEventType?: string;
        scorePoints?: number;
        scoreReason?: string;

        // Webhook config
        webhookUrl?: string;
        webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
        webhookHeaders?: Record<string, string>;
        webhookBody?: string;

        // Apollo enrichment config
        enrichType?: 'person' | 'company' | 'linkedin_to_email';

        // NEW N8N-STYLE CONFIG (flexible - stores all config for new node types)
        credentialId?: Types.ObjectId;  // Reference to IntegrationCredential for API access
        [key: string]: any;  // Allow any additional properties for new node types
    };
    position: {
        x: number;
        y: number;
    };
    nextStepIds: string[];

    // NEW: Named branches for advanced routing
    branches?: {
        success?: string;      // Success path (try_catch)
        error?: string;        // Error path (try_catch)
        yes?: string;          // True branch (condition) - kept for backward compatibility
        no?: string;           // False branch (condition) - kept for backward compatibility
        timeout?: string;      // Timeout path (wait_event)
        parallel?: string[];   // Parallel execution paths
    };

    // NEW: Execution mode
    executionMode?: 'sequential' | 'parallel';
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
                enum: ['contact_created', 'contact_updated', 'contact_job_changed',
                    'deal_stage_changed', 'deal_created', 'email_opened', 'email_clicked',
                    'form_submitted', 'manual', 'webhook_received'],
            },

            // Action config
            actionType: {
                type: String,
                enum: ['send_email', 'update_field', 'create_task', 'assign_owner',
                    'add_tag', 'remove_tag', 'send_notification', 'enroll_workflow',
                    'update_lead_score', 'send_webhook', 'apollo_enrich'],
            },
            emailTemplateId: String,
            emailSubject: String,
            emailBody: String,
            useCustomEmail: Boolean,
            recipientEmail: String,
            sendFromAccountId: String,
            // AI Email Generation
            useAIGeneration: Boolean,
            emailPurpose: String,
            emailTone: String,
            companyName: String,
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

            // Lead scoring config
            scoreEventType: String,
            scorePoints: Number,
            scoreReason: String,

            // Webhook config
            webhookUrl: String,
            webhookMethod: {
                type: String,
                enum: ['GET', 'POST', 'PUT', 'PATCH'],
            },
            webhookHeaders: Schema.Types.Mixed,
            webhookBody: String,

            // Apollo enrichment config
            enrichType: {
                type: String,
                enum: ['person', 'company', 'linkedin_to_email'],
            },
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
