// ============================================
// WORKFLOW TYPE DEFINITIONS
// ============================================

// Trigger Types
export type TriggerType =
    | 'contact_created'
    | 'contact_updated'
    | 'deal_stage_changed'
    | 'deal_created'
    | 'email_opened'
    | 'email_clicked'
    | 'form_submitted'
    | 'webhook_received'
    | 'manual';

// Action Types
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
    | 'send_sms'
    | 'apollo_enrich'
    | 'wait_event'
    // NEW N8N-STYLE ACTIONS
    | 'http_request'        // Enhanced HTTP with full auth
    | 'transform_set'       // Set variables
    | 'transform_map'       // Map/transform data
    | 'transform_filter'    // Filter arrays
    | 'ai_agent';           // AI agent execution

// Delay Types
export type DelayType = 'duration' | 'until_date' | 'until_time' | 'until_weekday';
export type DelayUnit = 'minutes' | 'hours' | 'days' | 'weeks';

// Condition Operators
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

// Workflow Status
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

// Step Types
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
    | 'http_request'          // HTTP request node
    // INTEGRATION NODES (each integration is its own type)
    | 'integration_slack'     // Slack integration
    | 'integration_google_sheets'  // Google Sheets integration
    | 'integration_notion'    // Notion integration
    | 'integration_whatsapp'  // WhatsApp (future)
    | 'integration_discord';  // Discord (future)

// Entity Types
export type EntityType = 'contact' | 'deal' | 'company';

// Enrollment Status
export type EnrollmentStatus =
    | 'active'
    | 'completed'
    | 'goal_met'
    | 'failed'
    | 'cancelled'
    | 'paused';

// ============================================
// CONDITION INTERFACE
// ============================================

export interface WorkflowCondition {
    field: string;
    operator: ConditionOperator;
    value?: any;
}

// ============================================
// STEP CONFIG INTERFACE
// ============================================

export interface WorkflowStepConfig {
    // NEW N8N-STYLE INTEGRATION CONFIG
    credentialId?: string;           // Reference to IntegrationCredential
    action?: string;                 // Action type for integrations
    responseVariable?: string;       // Variable to store API response

    // Trigger config
    triggerType?: TriggerType;
    filters?: Array<{
        id: string;
        field: string;
        operator: string;
        value: string;
    }>;

    // Action config
    actionType?: ActionType;
    emailTemplateId?: string;
    emailSubject?: string;
    emailBody?: string;
    useCustomEmail?: boolean;      // If true, use recipientEmail instead of entity.email
    recipientEmail?: string;       // Custom email address (supports placeholders)
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
    delayUnit?: DelayUnit;
    delayDate?: string;
    delayTime?: string;
    delayWeekdays?: number[];
    delayWeekday?: string;        // Single weekday (for "until_weekday" delay type)
    timezone?: string;            // Timezone for delay execution
    businessHoursOnly?: boolean;  // Only execute during business hours
    businessHoursStart?: string;  // Business hours start time (e.g., "09:00")
    businessHoursEnd?: string;    // Business hours end time (e.g., "17:00")
    skipWeekends?: boolean;       // Skip Saturday and Sunday
    respectContactTimezone?: boolean; // Use contact's timezone if available

    // Condition config
    conditions?: WorkflowCondition[];

    // Wait event config
    waitEventType?: string;
    waitTimeoutDays?: number;
    waitHasTimeout?: boolean;
    waitTimeoutAction?: string;

    // Webhook config
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
    webhookHeaders?: Record<string, string>;
    webhookBody?: string;

    // Lead score config
    scoreMethod?: 'points' | 'event';
    scorePoints?: number;
    scoreEventType?: string;
    scoreReason?: string;
    // Legacy aliases for lead score
    eventType?: string;
    points?: number;
    reason?: string;

    // Apollo enrichment config
    enrichType?: 'person' | 'company' | 'linkedin_to_email';

    // Slack action config
    message?: string;             // Message text (used by Slack and SMS)
    channel?: string;             // Slack channel
    username?: string;            // Slack bot username
    iconEmoji?: string;           // Slack bot icon emoji
    messageFormat?: 'plain' | 'markdown'; // Slack message format
    attachments?: Array<{         // Slack rich attachments
        color?: string;
        title?: string;
        text?: string;
        fields?: Array<{ title: string; value: string; short?: boolean }>;
    }>;

    // SMS action config
    provider?: 'twilio' | 'custom'; // SMS provider
    fromNumber?: string;          // Sender phone number
    toNumber?: string;            // Recipient phone number (if fixed)
    toField?: string;             // Contact field for phone (e.g., "phone")

    // Allow dynamic properties for integration-specific configs
    [key: string]: any;
}

// ============================================
// STEP INTERFACE
// ============================================

export interface WorkflowStep {
    id: string;
    type: StepType;
    name: string;
    config: WorkflowStepConfig;
    position: {
        x: number;
        y: number;
    };
    nextStepIds: string[];

    // NEW: Named branches for advanced routing
    branches?: {
        success?: string;      // Success path (try_catch)
        error?: string;        // Error path (try_catch)
        yes?: string;          // True branch (condition)
        no?: string;           // False branch (condition)
        timeout?: string;      // Timeout path (wait_event)
        parallel?: string[];   // Parallel execution paths
    };

    // NEW: Execution mode
    executionMode?: 'sequential' | 'parallel';
}

// ============================================
// ENROLLMENT CRITERIA
// ============================================

export interface EnrollmentCriteria {
    conditions: WorkflowCondition[];
    matchAll?: boolean;
}

// ============================================
// WORKFLOW STATS
// ============================================

export interface WorkflowStats {
    totalEnrolled: number;
    currentlyActive: number;
    completed: number;
    goalsMet: number;
    failed: number;
}

// ============================================
// MAIN WORKFLOW INTERFACE
// ============================================

export interface Workflow {
    _id: string;
    workspaceId: string;
    userId: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    triggerEntityType: EntityType;
    enrollmentCriteria?: EnrollmentCriteria;
    steps: WorkflowStep[];
    allowReenrollment: boolean;
    goalCriteria?: EnrollmentCriteria;
    stats: WorkflowStats;
    createdAt: string;
    updatedAt: string;
    lastActivatedAt?: string;
}

// ============================================
// STEP EXECUTION
// ============================================

export interface StepExecution {
    stepId: string;
    stepName: string;
    stepType: StepType;
    startedAt: string;
    completedAt?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
}

// ============================================
// WORKFLOW ENROLLMENT
// ============================================

export interface WorkflowEnrollment {
    _id: string;
    workflowId: string;
    workspaceId: string;
    entityType: EntityType;
    entityId: string;
    status: EnrollmentStatus;
    currentStepId?: string;
    nextExecutionTime?: string;
    stepsExecuted: StepExecution[];
    enrolledBy?: string;
    enrollmentSource: 'automatic' | 'manual' | 'api';
    lastError?: string;
    errorCount: number;
    enrolledAt: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// API INPUT TYPES
// ============================================

export interface CreateWorkflowInput {
    name: string;
    description?: string;
    triggerEntityType?: EntityType;
    enrollmentCriteria?: EnrollmentCriteria;
    steps?: WorkflowStep[];
    allowReenrollment?: boolean;
    goalCriteria?: EnrollmentCriteria;
}

export interface UpdateWorkflowInput {
    name?: string;
    description?: string;
    triggerEntityType?: EntityType;
    enrollmentCriteria?: EnrollmentCriteria;
    steps?: WorkflowStep[];
    allowReenrollment?: boolean;
    goalCriteria?: EnrollmentCriteria;
    status?: WorkflowStatus;
}

export interface EnrollEntityInput {
    entityType: EntityType;
    entityId: string;
}

// ============================================
// REACT FLOW NODE TYPES
// ============================================

export interface WorkflowNodeData {
    step: WorkflowStep;
    onDelete?: (id: string) => void;
    onConfigure?: (id: string) => void;
    isSelected?: boolean;
}

// ============================================
// HELPER CONSTANTS
// ============================================

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
    contact_created: 'Contact Created',
    contact_updated: 'Contact Updated',
    deal_stage_changed: 'Deal Stage Changed',
    deal_created: 'Deal Created',
    email_opened: 'Email Opened',
    email_clicked: 'Email Clicked',
    form_submitted: 'Form Submitted',
    webhook_received: 'Webhook Received',
    manual: 'Manual Enrollment',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
    send_email: 'Send Email',
    update_field: 'Update Field',
    create_task: 'Create Task',
    assign_owner: 'Assign Owner',
    add_tag: 'Add Tag',
    remove_tag: 'Remove Tag',
    send_notification: 'Send Notification',
    enroll_workflow: 'Enroll in Workflow',
    update_lead_score: 'Update Lead Score',
    send_webhook: 'Send Webhook',
    apollo_enrich: 'Enrich with Apollo',
    wait_event: 'Wait for Event',
    send_sms: 'Send SMS',
};

export const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
    minutes: 'Minutes',
    hours: 'Hours',
    days: 'Days',
    weeks: 'Weeks',
};

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
    draft: 'gray',
    active: 'green',
    paused: 'yellow',
    archived: 'red',
};

export const STEP_TYPE_COLORS: Record<StepType, string> = {
    trigger: 'violet',
    action: 'blue',
    delay: 'orange',
    condition: 'teal',
};
