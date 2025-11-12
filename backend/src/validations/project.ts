import { z } from "zod";

// Onboarding data schema - all fields are optional
export const onboardingDataSchema = z.object({
  business: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      product: z.string().optional(),
      problem: z.string().optional(),
      audience: z.string().optional(),
      region: z.string().optional(),
      stage: z
        .enum([
          "Idea",
          "Pre-launch",
          "Launched but no revenue",
          "Generating revenue",
          "Scaling",
        ])
        .optional(),
    })
    .optional(),
  goals: z
    .object({
      primary: z
        .enum([
          "Get early users / signups",
          "Generate leads or demo calls",
          "Drive website traffic",
          "Increase sales",
          "Build brand awareness",
        ])
        .optional(),
      budget: z.number().min(0, "Budget must be a positive number").optional(),
      timeline: z
        .enum([
          "Within 2 weeks",
          "Within 1 month",
          "Long-term brand building",
        ])
        .optional(),
    })
    .optional(),
  channels: z
    .object({
      preferred: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      past_experience: z
        .enum([
          "Yes, but results were poor",
          "Yes, some success",
          "No, starting fresh",
        ])
        .optional(),
    })
    .optional(),
  brand: z
    .object({
      tone: z
        .enum([
          "Professional",
          "Friendly",
          "Bold",
          "Educational",
          "Fun / Quirky",
          "Other",
        ])
        .optional(),
      perception: z.string().optional(),
      unique_value: z.string().optional(),
    })
    .optional(),
  offer: z
    .object({
      offer_type: z
        .enum([
          "Free trial",
          "Free demo",
          "Free resource / lead magnet",
          "Direct purchase only",
        ])
        .optional(),
      cta: z.string().optional(),
      tracking_setup: z.boolean().optional(),
    })
    .optional(),
  competition: z
    .object({
      competitors: z.array(z.string()).optional(),
      inspiration: z.array(z.string()).optional(),
    })
    .optional(),
  advanced: z
    .object({
      uploads: z.array(z.string()).optional(),
      business_type: z.enum(["B2B", "B2C", "Both"]).optional(),
      automation_level: z
        .enum([
          "Fully automated",
          "Notify before changes",
          "Ask every time",
        ])
        .optional(),
    })
    .optional(),
});

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
export type OnboardingDataInput = z.infer<typeof onboardingDataSchema>;
