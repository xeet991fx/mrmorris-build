import { z } from "zod";

// ============================================
// CONDITION SCHEMAS
// ============================================

export const conditionOperators = [
    'equals', 'not_equals', 'contains', 'not_contains',
    'greater_than', 'less_than', 'is_empty', 'is_not_empty',
    'is_true', 'is_false'
] as const;

export const workflowConditionSchema = z.object({
    field: z.string().min(1, "Field is required"),
    operator: z.enum(conditionOperators),
    value: z.any().optional(),
});

// ============================================
// STEP SCHEMAS
// ============================================

export const triggerTypes = [
    'contact_created', 'contact_updated', 'deal_stage_changed',
    'deal_created', 'email_opened', 'email_clicked',
    'form_submitted', 'manual'
] as const;

export const actionTypes = [
    'send_email', 'update_field', 'create_task', 'assign_owner',
    'add_tag', 'remove_tag', 'send_notification', 'enroll_workflow'
] as const;

export const delayTypes = ['duration', 'until_date', 'until_time', 'until_weekday'] as const;
export const delayUnits = ['minutes', 'hours', 'days', 'weeks'] as const;
export const stepTypes = ['trigger', 'action', 'delay', 'condition'] as const;

export const workflowStepConfigSchema = z.object({
    // Trigger config
    triggerType: z.enum(triggerTypes).optional(),

    // Action config
    actionType: z.enum(actionTypes).optional(),
    emailTemplateId: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    fieldName: z.string().optional(),
    fieldValue: z.any().optional(),
    taskTitle: z.string().optional(),
    taskDescription: z.string().optional(),
    taskDueInDays: z.number().min(0).optional(),
    taskAssignee: z.string().optional(),
    tagName: z.string().optional(),
    notificationMessage: z.string().optional(),
    notificationUserId: z.string().optional(),
    targetWorkflowId: z.string().optional(),

    // Delay config
    delayType: z.enum(delayTypes).optional(),
    delayValue: z.number().min(1).optional(),
    delayUnit: z.enum(delayUnits).optional(),
    delayDate: z.string().datetime().optional(),
    delayTime: z.string().optional(),
    delayWeekdays: z.array(z.number().min(0).max(6)).optional(),

    // Condition config
    conditions: z.array(workflowConditionSchema).optional(),
});

export const workflowStepSchema = z.object({
    id: z.string().min(1, "Step ID is required"),
    type: z.enum(stepTypes),
    name: z.string().min(1, "Step name is required").max(100),
    config: workflowStepConfigSchema,
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    nextStepIds: z.array(z.string()).default([]),
});

// ============================================
// ENROLLMENT CRITERIA SCHEMA
// ============================================

export const enrollmentCriteriaSchema = z.object({
    conditions: z.array(workflowConditionSchema).default([]),
    matchAll: z.boolean().default(true),
});

// ============================================
// MAIN WORKFLOW SCHEMAS
// ============================================

export const workflowStatuses = ['draft', 'active', 'paused', 'archived'] as const;
export const entityTypes = ['contact', 'deal', 'company'] as const;

export const createWorkflowSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, "Workflow name is required")
            .max(100, "Name must be less than 100 characters"),
        description: z.string()
            .max(500, "Description must be less than 500 characters")
            .optional(),
        triggerEntityType: z.enum(entityTypes).default('contact'),
        enrollmentCriteria: enrollmentCriteriaSchema.optional(),
        steps: z.array(workflowStepSchema).default([]),
        allowReenrollment: z.boolean().default(false),
        goalCriteria: enrollmentCriteriaSchema.optional(),
    }),
});

export const updateWorkflowSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, "Workflow name is required")
            .max(100, "Name must be less than 100 characters")
            .optional(),
        description: z.string()
            .max(500, "Description must be less than 500 characters")
            .optional(),
        triggerEntityType: z.enum(entityTypes).optional(),
        enrollmentCriteria: enrollmentCriteriaSchema.optional(),
        steps: z.array(workflowStepSchema).optional(),
        allowReenrollment: z.boolean().optional(),
        goalCriteria: enrollmentCriteriaSchema.optional(),
        status: z.enum(workflowStatuses).optional(),
    }),
});

export const enrollContactSchema = z.object({
    body: z.object({
        entityType: z.enum(entityTypes),
        entityId: z.string().min(1, "Entity ID is required"),
    }),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const listWorkflowsQuerySchema = z.object({
    query: z.object({
        status: z.enum(workflowStatuses).optional(),
        triggerEntityType: z.enum(entityTypes).optional(),
        page: z.string().transform(Number).default("1"),
        limit: z.string().transform(Number).default("20"),
        search: z.string().optional(),
    }),
});

export const listEnrollmentsQuerySchema = z.object({
    query: z.object({
        status: z.enum(['active', 'completed', 'goal_met', 'failed', 'cancelled', 'paused']).optional(),
        page: z.string().transform(Number).default("1"),
        limit: z.string().transform(Number).default("20"),
    }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>['body'];
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>['body'];
export type EnrollContactInput = z.infer<typeof enrollContactSchema>['body'];
export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
