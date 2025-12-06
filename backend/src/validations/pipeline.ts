import { z } from "zod";

// Stage schema for embedded stages
export const stageSchema = z.object({
  name: z
    .string()
    .min(1, "Stage name is required")
    .max(50, "Stage name must be less than 50 characters")
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color (e.g., #9ACD32)"),
  order: z.number().int().min(0).optional(), // Optional during creation, will be set automatically
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

// Update pipeline schema - all fields optional
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

// Create stage schema (for adding a single stage to existing pipeline)
export const createStageSchema = z.object({
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

// Update stage schema
export const updateStageSchema = z.object({
  name: z
    .string()
    .min(1, "Stage name is required")
    .max(50, "Stage name must be less than 50 characters")
    .trim()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color (e.g., #9ACD32)")
    .optional(),
  order: z.number().int().min(0).optional(),
});

// Reorder stages schema
export const reorderStagesSchema = z.object({
  stageOrder: z.array(z.string()).min(1, "Stage order array cannot be empty"),
});

// Query/filter schema
export const pipelineQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  isActive: z.string().optional(), // "true" or "false"
});

// Type exports for TypeScript
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
export type PipelineQueryInput = z.infer<typeof pipelineQuerySchema>;
export type StageInput = z.infer<typeof stageSchema>;
