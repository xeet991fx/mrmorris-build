import { z } from "zod";

// Step 1: Business Overview Schema
export const step1Schema = z.object({
  business: z.object({
    name: z.string().min(1, "Business name is required"),
    description: z.string().min(10, "Please provide a detailed description (min 10 characters)"),
    product: z.string().min(5, "Please describe your product or service"),
    problem: z.string().min(10, "Please describe the problem you're solving"),
    audience: z.string().min(5, "Please describe your target audience"),
    region: z.string().min(1, "Region is required"),
    stage: z.enum([
      "Idea",
      "Pre-launch",
      "Launched but no revenue",
      "Generating revenue",
      "Scaling",
    ], { errorMap: () => ({ message: "Please select a business stage" }) }),
  }),
});

// Step 2: Goals & Metrics Schema
export const step2Schema = z.object({
  goals: z.object({
    primary: z.enum([
      "Get early users / signups",
      "Generate leads or demo calls",
      "Drive website traffic",
      "Increase sales",
      "Build brand awareness",
    ]),
    budget: z.number().min(0, "Budget must be a positive number"),
    timeline: z.enum([
      "Within 2 weeks",
      "Within 1 month",
      "Long-term brand building",
    ]),
  }),
});

// Step 3: Channels Setup Schema
export const step3Schema = z.object({
  channels: z.object({
    preferred: z.array(z.string()).min(1, "Please select at least one channel"),
    tools: z.array(z.string()).optional(),
    past_experience: z.enum([
      "Yes, but results were poor",
      "Yes, some success",
      "No, starting fresh",
    ]),
  }),
});

// Step 4: Brand & Messaging Schema
export const step4Schema = z.object({
  brand: z.object({
    tone: z.enum([
      "Professional",
      "Friendly",
      "Bold",
      "Educational",
      "Fun / Quirky",
      "Other",
    ]),
    perception: z.string().min(10, "Please describe how you want to be perceived (min 10 characters)"),
    unique_value: z.string().min(10, "Please describe your unique value (min 10 characters)"),
  }),
});

// Step 5: Offer & CTA Schema
export const step5Schema = z.object({
  offer: z.object({
    offer_type: z.enum([
      "Free trial",
      "Free demo",
      "Free resource / lead magnet",
      "Direct purchase only",
    ]),
    cta: z.string().min(3, "Call-to-action is required (min 3 characters)"),
    tracking_setup: z.boolean(),
  }),
});

// Step 6: Competition Schema
export const step6Schema = z.object({
  competition: z.object({
    competitors: z.array(z.string()).optional(),
    inspiration: z.array(z.string()).optional(),
  }),
});

// Step 7: Advanced Schema
export const step7Schema = z.object({
  advanced: z.object({
    uploads: z.array(z.string()).optional(),
    business_type: z.enum(["B2B", "B2C", "Both"]),
    automation_level: z.enum([
      "Fully automated",
      "Notify before changes",
      "Ask every time",
    ]),
  }),
});

// Complete onboarding data schema - all fields are optional for partial saves
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

// Create project schema
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters")
    .trim(),
});

// Update project schema
export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name must be less than 100 characters")
    .trim()
    .optional(),
});

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type OnboardingDataInput = z.infer<typeof onboardingDataSchema>;
export type Step1Input = z.infer<typeof step1Schema>;
export type Step2Input = z.infer<typeof step2Schema>;
export type Step3Input = z.infer<typeof step3Schema>;
export type Step4Input = z.infer<typeof step4Schema>;
export type Step5Input = z.infer<typeof step5Schema>;
export type Step6Input = z.infer<typeof step6Schema>;
export type Step7Input = z.infer<typeof step7Schema>;
