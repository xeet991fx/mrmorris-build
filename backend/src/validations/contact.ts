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
  tags: z.array(z.string()).optional(),
  source: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
  linkedin: z.string().optional().or(z.literal("")),
  twitter: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  assignedTo: z.string().optional(), // User ID
  notes: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")), // Company ID reference
  customFields: z.record(z.any()).optional(), // Dynamic custom fields
});

// Update contact schema - all fields optional
export const updateContactSchema = createContactSchema.partial();

// Query/filter schema
export const contactQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  search: z.string().optional(),
  status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
  assignedTo: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
});

// Type exports for TypeScript
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactQueryInput = z.infer<typeof contactQuerySchema>;
