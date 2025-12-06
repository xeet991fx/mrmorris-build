import { z } from "zod";

// Stage schema
export const stageSchema = z.object({
  _id: z.string().optional(), // Optional for new stages
  name: z
    .string()
    .min(1, "Stage name is required")
    .max(50, "Stage name must be less than 50 characters")
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color (e.g., #9ACD32)"),
  order: z.number().int().min(0).optional(),
});

// Create pipeline schema
export const createPipelineSchema = z.object({
  name: z
    .string()
    .min(1, "Pipeline name is required")
    .max(100, "Pipeline name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  stages: z
    .array(stageSchema)
    .min(1, "Pipeline must have at least one stage")
    .max(20, "Pipeline cannot have more than 20 stages"),
  isDefault: z.boolean().optional(),
});

// Update pipeline schema
export const updatePipelineSchema = z.object({
  name: z
    .string()
    .min(1, "Pipeline name is required")
    .max(100, "Pipeline name must be less than 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type StageInput = z.infer<typeof stageSchema>;
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
