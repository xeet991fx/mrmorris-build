import { z } from 'zod';

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
  config: z.object({}),
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

export const updateAgentSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    goal: z.string().min(1).max(500).optional(),
    // When triggers are provided, require at least one. Empty array is invalid.
    triggers: z.array(triggerSchema).min(1, 'At least one trigger is required').optional()
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
