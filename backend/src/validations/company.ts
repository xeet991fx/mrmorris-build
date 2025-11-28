import { z } from "zod";

// Create company schema
export const createCompanySchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(200, "Company name must be less than 200 characters")
    .trim(),
  industry: z
    .string()
    .max(100, "Industry must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Please enter a valid URL")
    .trim()
    .optional()
    .or(z.literal(""))
    .or(z.string().length(0)),
  phone: z.string().trim().optional().or(z.literal("")),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  annualRevenue: z
    .number()
    .min(0, "Annual revenue cannot be negative")
    .optional(),
  employeeCount: z
    .number()
    .int("Employee count must be an integer")
    .min(0, "Employee count cannot be negative")
    .optional(),
  linkedinUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
    .or(z.string().length(0)),
  twitterUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
    .or(z.string().length(0)),
  facebookUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
    .or(z.string().length(0)),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  status: z.enum(["lead", "prospect", "customer", "churned"]).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().trim().optional().or(z.literal("")),
  assignedTo: z.string().optional(), // User ID
  notes: z.string().optional().or(z.literal("")),
  customFields: z.record(z.any()).optional(), // Dynamic custom fields
});

// Update company schema - all fields optional
export const updateCompanySchema = createCompanySchema.partial();

// Query/filter schema
export const companyQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  search: z.string().optional(),
  status: z.enum(["lead", "prospect", "customer", "churned"]).optional(),
  assignedTo: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  industry: z.string().optional(),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
});

// Type exports for TypeScript
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyQueryInput = z.infer<typeof companyQuerySchema>;
