import { z } from "zod";

// Deal stage enum
export const dealStageEnum = z.enum([
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
]);

// ICP Fit enum
export const icpFitEnum = z.enum(["excellent", "good", "medium", "low"]);

// Connection strength enum
export const connectionStrengthEnum = z.enum(["very_strong", "strong", "good", "weak"]);

// Create deal schema
export const createDealSchema = z.object({
    name: z
        .string()
        .min(1, "Deal name is required")
        .max(200, "Deal name must be less than 200 characters")
        .trim(),
    description: z
        .string()
        .max(2000, "Description must be less than 2000 characters")
        .optional(),
    companyId: z.string().length(24, "Invalid company ID").optional(),
    contacts: z.array(z.string().length(24, "Invalid contact ID")).optional(),
    assignedTo: z.string().length(24, "Invalid user ID").optional(),
    stage: dealStageEnum.default("lead"),
    value: z.number().min(0, "Deal value cannot be negative").default(0),
    currency: z.string().length(3, "Currency must be 3 characters (ISO 4217)").default("USD"),
    probability: z.number().min(0).max(100).optional(),
    expectedCloseDate: z.string().datetime().optional(),
    icpFit: icpFitEnum.optional(),
    connectionStrength: connectionStrengthEnum.optional(),
    source: z.string().max(100).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(5000).optional(),
    customFields: z.record(z.any()).optional(),
});

// Update deal schema
export const updateDealSchema = z.object({
    name: z
        .string()
        .min(1, "Deal name is required")
        .max(200, "Deal name must be less than 200 characters")
        .trim()
        .optional(),
    description: z
        .string()
        .max(2000, "Description must be less than 2000 characters")
        .optional(),
    companyId: z.string().length(24, "Invalid company ID").nullable().optional(),
    contacts: z.array(z.string().length(24, "Invalid contact ID")).optional(),
    assignedTo: z.string().length(24, "Invalid user ID").nullable().optional(),
    stage: dealStageEnum.optional(),
    value: z.number().min(0, "Deal value cannot be negative").optional(),
    currency: z.string().length(3, "Currency must be 3 characters").optional(),
    probability: z.number().min(0).max(100).optional(),
    expectedCloseDate: z.string().datetime().nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
    icpFit: icpFitEnum.nullable().optional(),
    connectionStrength: connectionStrengthEnum.nullable().optional(),
    source: z.string().max(100).optional(),
    lostReason: z.string().max(500).optional(),
    wonReason: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(5000).optional(),
    customFields: z.record(z.any()).optional(),
});

// Type exports
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
