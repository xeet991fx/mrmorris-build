import { z } from "zod";

// Create opportunity schema (client-side validation)
export const createOpportunitySchema = z.object({
  pipelineId: z.string().min(1, "Pipeline is required"),
  stageId: z.string().min(1, "Stage is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  value: z
    .number({ invalid_type_error: "Value must be a number" })
    .min(0, "Value must be a positive number"),
  currency: z.string().length(3, "Currency must be 3 characters").toUpperCase().optional(),
  probability: z
    .number()
    .min(0, "Probability must be between 0 and 100")
    .max(100, "Probability must be between 0 and 100")
    .optional()
    .or(z.literal(null)),
  expectedCloseDate: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .or(z.literal("")),
  source: z
    .string()
    .max(100, "Source must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  status: z.enum(["open", "won", "lost", "abandoned"]).optional(),
  lostReason: z
    .string()
    .max(500, "Lost reason must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  assignedTo: z.string().min(1, "Deal Owner is required"),
  associatedContacts: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// Update opportunity schema - all fields optional except pipeline/stage
export const updateOpportunitySchema = createOpportunitySchema.partial();

// Type exports for TypeScript
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
