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
