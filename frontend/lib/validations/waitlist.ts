import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  companyName: z.string().optional(),
  role: z.string().optional(),
  teamSize: z.enum(["1-5", "6-20", "21-50", "51-200", "200+"]).optional(),
  source: z.string().optional(),
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;
