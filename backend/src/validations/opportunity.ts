import { z } from "zod";

// Create opportunity schema
export const createOpportunitySchema = z.object({
  pipelineId: z.string().min(1, "Pipeline ID is required"),
  stageId: z.string().min(1, "Stage ID is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  value: z
    .number()
    .min(0, "Value must be a positive number")
    .or(z.string().transform((val) => parseFloat(val))),
  currency: z
    .string()
    .length(3, "Currency code must be 3 characters")
    .toUpperCase()
    .optional()
    .default("USD"),
  probability: z
    .number()
    .min(0, "Probability must be between 0 and 100")
    .max(100, "Probability must be between 0 and 100")
    .nullable()
    .optional(),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  source: z
    .string()
    .max(100, "Source must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  status: z.enum(["open", "won", "lost", "abandoned"]).optional(),
  lostReason: z
    .string()
    .max(500, "Lost reason must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  assignedTo: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  customFields: z.record(z.any()).optional(),
});

// Update opportunity schema - all fields optional
export const updateOpportunitySchema = createOpportunitySchema.partial();

// Move opportunity schema
export const moveOpportunitySchema = z.object({
  stageId: z.string().min(1, "Stage ID is required"),
  pipelineId: z.string().optional(), // Optional - if moving to different pipeline
});

// Query/filter schema
export const opportunityQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  search: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  status: z.enum(["open", "won", "lost", "abandoned"]).optional(),
  assignedTo: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// Type exports for TypeScript
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type MoveOpportunityInput = z.infer<typeof moveOpportunitySchema>;
export type OpportunityQueryInput = z.infer<typeof opportunityQuerySchema>;
