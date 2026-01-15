import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z
    .string({ required_error: 'Agent name is required' })
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be 100 characters or less')
    .trim(),
  goal: z
    .string({ required_error: 'Agent goal is required' })
    .min(1, 'Agent goal is required')
    .max(500, 'Agent goal must be 500 characters or less')
});

export type CreateAgentFormData = z.infer<typeof createAgentSchema>;

// Story 1.2: Trigger validation schemas
export const manualTriggerSchema = z.object({
  type: z.literal('manual'),
  config: z.object({}),
  enabled: z.boolean().optional().default(true)
});

export const scheduledTriggerSchema = z.object({
  type: z.literal('scheduled'),
  config: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format'),
    days: z.array(z.number().min(0).max(6)).optional(),
    date: z.number().min(1).max(31).optional()
  }).refine(
    (data) => {
      if (data.frequency === 'weekly') {
        return data.days && data.days.length > 0;
      }
      if (data.frequency === 'monthly') {
        return data.date !== undefined;
      }
      return true;
    },
    {
      message: 'Weekly triggers require at least one day, monthly triggers require a date'
    }
  ),
  enabled: z.boolean().optional().default(true)
});

export const eventTriggerSchema = z.object({
  type: z.literal('event'),
  config: z.object({
    event: z.enum(['contact.created', 'deal.stage_updated', 'form.submitted']),
    conditions: z.array(z.object({
      field: z.string().min(1, 'Field is required'),
      operator: z.enum(['>', '<', '=', '!=', 'contains']),
      value: z.any()
    })).optional()
  }),
  enabled: z.boolean().optional().default(true)
});

export const triggerSchema = z.discriminatedUnion('type', [
  manualTriggerSchema,
  scheduledTriggerSchema,
  eventTriggerSchema
]);

export type ManualTriggerFormData = z.infer<typeof manualTriggerSchema>;
export type ScheduledTriggerFormData = z.infer<typeof scheduledTriggerSchema>;
export type EventTriggerFormData = z.infer<typeof eventTriggerSchema>;
export type TriggerFormData = z.infer<typeof triggerSchema>;
