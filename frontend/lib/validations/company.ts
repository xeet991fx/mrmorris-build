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
  domain: z.string().trim().optional().or(z.literal("")),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  annualRevenue: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().min(0, "Annual revenue cannot be negative").optional()
  ),
  employeeCount: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(val) ? undefined : Number(val)),
    z.number().int("Employee count must be an integer").min(0, "Employee count cannot be negative").optional()
  ),
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
  source: z.string().trim().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional().or(z.literal("")),
  associatedContacts: z.array(z.string()).optional(),
});

// Update company schema - all fields optional
export const updateCompanySchema = createCompanySchema.partial();

// Type exports for TypeScript
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
