import { z } from "zod";

// Create workspace schema
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, "Workspace name must be at least 3 characters")
    .max(100, "Workspace name must be less than 100 characters")
    .trim(),
});

// Update workspace schema
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, "Workspace name must be at least 3 characters")
    .max(100, "Workspace name must be less than 100 characters")
    .trim()
    .optional(),
});

// Type exports
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
