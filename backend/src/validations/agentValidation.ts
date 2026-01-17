import { z } from 'zod';

// Story 1.3: Instructions character thresholds
export const INSTRUCTIONS_WARNING_THRESHOLD = 8000;
export const INSTRUCTIONS_MAX_LENGTH = 10000;

// Story 1.4: Restrictions constants
export const RESTRICTIONS_LIMITS = {
  maxExecutionsPerDay: { min: 1, max: 1000 },
  maxEmailsPerDay: { min: 1, max: 500 }
};

export const RESTRICTIONS_DEFAULTS = {
  maxExecutionsPerDay: 100,
  maxEmailsPerDay: 100,
  allowedIntegrations: [] as string[],
  excludedContacts: [] as string[],
  excludedDomains: [] as string[],
  guardrails: ''
};

// Story 1.4: Guardrails character limit
export const GUARDRAILS_MAX_LENGTH = 5000;

export const VALID_INTEGRATIONS = [
  'gmail',
  'linkedin',
  'slack',
  'apollo',
  'google-calendar',
  'google-sheets'
] as const;

// Story 1.5: Memory configuration constants
export const MEMORY_VARIABLE_TYPES = ['string', 'number', 'date', 'array'] as const;
export const MEMORY_RETENTION_OPTIONS = [0, 7, 30, 90] as const;
export const MAX_MEMORY_VARIABLES = 20;

export const MEMORY_DEFAULTS = {
  enabled: false,
  variables: [] as any[],
  retentionDays: 30
};

// Story 1.6: Approvable actions for approval configuration
export const APPROVABLE_ACTIONS = [
  'send_email',
  'linkedin_invite',
  'web_search',
  'create_task',
  'add_tag',
  'remove_tag',
  'update_field',
  'enrich_contact',
  'update_deal_value',
  'wait'
] as const;

export type ApprovableAction = typeof APPROVABLE_ACTIONS[number];

// Story 1.6: Approval configuration defaults
export const APPROVAL_DEFAULTS = {
  enabled: false,
  requireForAllActions: false,
  requiredForActions: [] as string[],
  approvers: [] as string[]
};

// Variable name validation: Must be valid identifier (starts with letter or underscore, alphanumeric)
const variableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Story 1.5: Memory variable schema
const memoryVariableSchema = z.object({
  name: z.string()
    .min(1, 'Variable name is required')
    .max(50, 'Variable name cannot exceed 50 characters')
    .regex(variableNameRegex, 'Variable name must be a valid identifier (alphanumeric + underscore, starting with letter or underscore)'),
  type: z.enum(MEMORY_VARIABLE_TYPES),
  defaultValue: z.any().optional().nullable()
});

// Story 1.5: Memory configuration schema
const memorySchema = z.object({
  enabled: z.boolean().optional(),
  variables: z.array(memoryVariableSchema)
    .max(MAX_MEMORY_VARIABLES, `Maximum ${MAX_MEMORY_VARIABLES} variables allowed`)
    .optional(),
  retentionDays: z.number()
    .refine(val => MEMORY_RETENTION_OPTIONS.includes(val as any), {
      message: 'Invalid retention period. Valid options: 0 (forever), 7, 30, 90 days'
    })
    .optional()
}).optional();

// Story 1.6: Approval configuration schema
const approvalConfigSchema = z.object({
  enabled: z.boolean().optional(),
  requireForAllActions: z.boolean().optional(),
  requiredForActions: z.array(
    z.enum(APPROVABLE_ACTIONS)
  ).optional(),
  approvers: z.array(z.string()).optional()  // User IDs as strings
}).optional().refine(
  (data) => {
    // If enabled and not requireForAllActions, at least one action must be selected
    if (data?.enabled && !data?.requireForAllActions) {
      return data.requiredForActions && data.requiredForActions.length > 0;
    }
    return true;
  },
  {
    message: 'At least one action must be selected when approval is enabled for specific actions'
  }
);

export const createAgentSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Agent name is required' })
      .min(1, 'Agent name is required')
      .max(100, 'Agent name must be 100 characters or less')
      .trim(),
    goal: z
      .string({ required_error: 'Agent goal is required' })
      .min(1, 'Agent goal is required')
      .max(500, 'Agent goal must be 500 characters or less')
  })
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>['body'];

// Story 1.2: Trigger configuration schemas
const manualTriggerSchema = z.object({
  type: z.literal('manual'),
  config: z.object({}).default({}),  // Default to empty object for legacy data
  enabled: z.boolean().optional().default(true)
});

const scheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  config: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format (00:00 to 23:59)'),
    days: z.array(z.number().min(0).max(6)).optional(),
    date: z.number().min(1).max(31).optional()
  }).refine(
    (data) => {
      // Weekly frequency requires days array
      if (data.frequency === 'weekly') {
        return data.days && data.days.length > 0;
      }
      // Monthly frequency requires date
      if (data.frequency === 'monthly') {
        return data.date !== undefined;
      }
      return true;
    },
    {
      message: 'Weekly triggers require days array, monthly triggers require date'
    }
  ),
  enabled: z.boolean().optional().default(true)
});

const eventTriggerSchema = z.object({
  type: z.literal('event'),
  config: z.object({
    event: z.enum(['contact.created', 'deal.stage_updated', 'form.submitted']),
    conditions: z.array(z.object({
      field: z.string().min(1, 'Condition field is required'),
      operator: z.enum(['>', '<', '=', '!=', 'contains']),
      value: z.string().min(1, 'Condition value is required')
    })).optional()
  }),
  enabled: z.boolean().optional().default(true)
});

const triggerSchema = z.discriminatedUnion('type', [
  manualTriggerSchema,
  scheduledTriggerSchema,
  eventTriggerSchema
]);

// Story 1.4: Restrictions schema
const restrictionsSchema = z.object({
  maxExecutionsPerDay: z.number()
    .int('Must be a whole number')
    .min(RESTRICTIONS_LIMITS.maxExecutionsPerDay.min, `Must be at least ${RESTRICTIONS_LIMITS.maxExecutionsPerDay.min}`)
    .max(RESTRICTIONS_LIMITS.maxExecutionsPerDay.max, `Cannot exceed ${RESTRICTIONS_LIMITS.maxExecutionsPerDay.max}`)
    .optional(),
  maxEmailsPerDay: z.number()
    .int('Must be a whole number')
    .min(RESTRICTIONS_LIMITS.maxEmailsPerDay.min, `Must be at least ${RESTRICTIONS_LIMITS.maxEmailsPerDay.min}`)
    .max(RESTRICTIONS_LIMITS.maxEmailsPerDay.max, `Cannot exceed ${RESTRICTIONS_LIMITS.maxEmailsPerDay.max}`)
    .optional(),
  allowedIntegrations: z.array(z.enum(VALID_INTEGRATIONS)).optional(),
  excludedContacts: z.array(z.string()).optional(),
  excludedDomains: z.array(z.string()).optional(),
  guardrails: z.string().max(GUARDRAILS_MAX_LENGTH, `Guardrails cannot exceed ${GUARDRAILS_MAX_LENGTH} characters`).optional()
}).optional();

export const updateAgentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    goal: z.string().min(1).max(500).optional(),
    // Story 1.3: Instructions field with 10K character limit
    instructions: z.string().max(INSTRUCTIONS_MAX_LENGTH, `Instructions cannot exceed ${INSTRUCTIONS_MAX_LENGTH} characters`).optional(),
    // When triggers are provided, require at least one. Empty array is invalid.
    triggers: z.array(triggerSchema).min(1, 'At least one trigger is required').optional(),
    // Story 1.4: Restrictions configuration
    restrictions: restrictionsSchema,
    // Story 1.5: Memory configuration
    memory: memorySchema,
    // Story 1.6: Approval configuration
    approvalConfig: approvalConfigSchema,
    // Story 1.7: Optimistic locking - expected updatedAt timestamp (ISO string)
    expectedUpdatedAt: z.string().datetime().optional()
  }).refine(
    (data) => {
      // If triggers is explicitly an empty array, reject it
      if (data.triggers !== undefined && data.triggers.length === 0) {
        return false;
      }
      return true;
    },
    { message: 'Cannot set triggers to an empty array', path: ['triggers'] }
  )
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>['body'];

