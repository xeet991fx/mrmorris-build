import { z } from "zod";

// Create project schema - name is required
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters")
    .trim(),
});

// Update project schema - name is optional for updates
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters")
    .trim()
    .optional(),
});

// Type exports for TypeScript
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
