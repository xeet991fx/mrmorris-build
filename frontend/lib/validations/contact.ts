import { z } from "zod";

// Create contact schema
export const createContactSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email")
    .toLowerCase()
    .trim()
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  jobTitle: z
    .string()
    .max(100, "Job title must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

// Update contact schema - all fields optional
export const updateContactSchema = createContactSchema.partial();

// Type exports for TypeScript
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
