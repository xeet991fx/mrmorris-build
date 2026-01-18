/**
 * Business Profile Routes
 *
 * Handles workspace-specific business profile data used by AI features
 * for personalization and context-aware responses.
 *
 * Uses the custom error handling pattern with asyncAuthHandler wrapper.
 */

import express, { Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth";
import BusinessProfile, { IBusinessProfile } from "../models/BusinessProfile";
import Project from "../models/Project";
import {
  asyncAuthHandler,
  NotFoundError,
  ValidationError,
} from "../errors";
import { logger } from "../utils/logger";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schema for business profile updates
const BusinessProfileUpdateSchema = z.object({
  // Core Business Info
  industry: z.enum([
    "saas",
    "real_estate",
    "recruiting",
    "consulting",
    "ecommerce",
    "financial",
    "healthcare",
    "manufacturing",
    "education",
    "nonprofit",
    "other",
  ]).optional(),
  industrySpecific: z.string().optional(),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]).optional(),
  companyName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),

  // Sales & Marketing
  salesCycle: z.enum(["short", "medium", "long", "very_long"]).optional(),
  averageDealSize: z.enum(["<1k", "1k-10k", "10k-50k", "50k-100k", "100k+"]).optional(),
  monthlyLeadVolume: z.enum(["<10", "10-50", "50-100", "100-500", "500+"]).optional(),
  primaryGoal: z.enum([
    "generate_leads",
    "close_deals",
    "nurture_relationships",
    "automate_processes",
    "improve_conversion",
    "scale_operations",
  ]).optional(),
  salesModel: z.enum(["b2b", "b2c", "b2b2c", "marketplace"]).optional(),

  // Team Structure
  teamSize: z.enum(["solo", "small", "medium", "large"]).optional(),
  roles: z.array(z.string()).optional(),

  // Customer Profile
  targetAudience: z.object({
    jobTitles: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    companySize: z.array(z.string()).optional(),
    geography: z.array(z.string()).optional(),
  }).optional(),

  // Pain Points & Goals
  painPoints: z.array(z.string()).optional(),
  keyMetrics: z.array(z.string()).optional(),

  // Channel Preferences
  channels: z.object({
    email: z.boolean().optional(),
    phone: z.boolean().optional(),
    social: z.boolean().optional(),
    ads: z.boolean().optional(),
    content: z.boolean().optional(),
    events: z.boolean().optional(),
  }).optional(),

  // Lead Sources
  leadSources: z.array(z.string()).optional(),
});

/**
 * GET /api/workspaces/:workspaceId/business-profile
 * Get business profile for a workspace
 */
router.get("/:workspaceId/business-profile", asyncAuthHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  // Verify workspace exists and user has access
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    throw NotFoundError.workspace(workspaceId);
  }

  // Get business profile
  const profile = await BusinessProfile.findOne({ workspace: workspaceId });

  if (!profile) {
    // Return empty/default profile if none exists
    return res.json({
      success: true,
      data: null,
      message: "No business profile found. Create one to personalize AI features.",
    });
  }

  res.json({
    success: true,
    data: profile,
  });
}));

/**
 * PUT /api/workspaces/:workspaceId/business-profile
 * Create or update business profile for a workspace
 */
router.put("/:workspaceId/business-profile", asyncAuthHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  // Verify workspace exists and user has access
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    throw NotFoundError.workspace(workspaceId);
  }

  // Validate request body
  const validationResult = BusinessProfileUpdateSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw ValidationError.fromZod(validationResult.error);
  }

  const profileData = validationResult.data;

  // Find existing profile or create new one
  let profile = await BusinessProfile.findOne({ workspace: workspaceId });

  if (profile) {
    // Update existing profile
    Object.assign(profile, profileData);
    profile.lastUpdated = new Date();
    profile.version = (profile.version || 1) + 1;
    await profile.save();

    logger.info("Business profile updated", { workspaceId });
  } else {
    // Create new profile - require at least industry, salesCycle, teamSize, and primaryGoal
    if (!profileData.industry || !profileData.salesCycle || !profileData.teamSize || !profileData.primaryGoal) {
      throw new ValidationError(
        "New profiles require industry, salesCycle, teamSize, and primaryGoal",
        { requiredFields: ["industry", "salesCycle", "teamSize", "primaryGoal"] }
      );
    }

    profile = new BusinessProfile({
      workspace: workspaceId,
      ...profileData,
      completedAt: new Date(),
    });
    await profile.save();

    logger.info("Business profile created", { workspaceId });
  }

  res.json({
    success: true,
    data: profile,
    message: "Business profile saved successfully",
  });
}));

/**
 * GET /api/workspaces/:workspaceId/business-profile/ai-context
 * Get a formatted AI context summary of the business profile
 * Used by AI services to personalize responses
 */
router.get("/:workspaceId/business-profile/ai-context", asyncAuthHandler(async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params;

  // Verify workspace exists
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    throw NotFoundError.workspace(workspaceId);
  }

  const profile = await BusinessProfile.findOne({ workspace: workspaceId });

  if (!profile) {
    return res.json({
      success: true,
      data: {
        hasProfile: false,
        context: "No business profile configured. AI features will use generic responses.",
      },
    });
  }

  // Build AI-friendly context summary
  const contextParts: string[] = [];

  if (profile.companyName) {
    contextParts.push(`Company: ${profile.companyName}`);
  }

  if (profile.industry) {
    const industryLabel = profile.industry === "other" && profile.industrySpecific
      ? profile.industrySpecific
      : profile.industry.replace("_", " ");
    contextParts.push(`Industry: ${industryLabel}`);
  }

  if (profile.salesModel) {
    contextParts.push(`Sales Model: ${profile.salesModel.toUpperCase()}`);
  }

  if (profile.companySize) {
    contextParts.push(`Company Size: ${profile.companySize} employees`);
  }

  if (profile.salesCycle) {
    const cycleLabels: Record<string, string> = {
      short: "Short (< 1 week)",
      medium: "Medium (1-4 weeks)",
      long: "Long (1-3 months)",
      very_long: "Very Long (3+ months)",
    };
    contextParts.push(`Sales Cycle: ${cycleLabels[profile.salesCycle] || profile.salesCycle}`);
  }

  if (profile.averageDealSize) {
    contextParts.push(`Average Deal Size: $${profile.averageDealSize}`);
  }

  if (profile.primaryGoal) {
    const goalLabels: Record<string, string> = {
      generate_leads: "Generate more leads",
      close_deals: "Close more deals",
      nurture_relationships: "Nurture customer relationships",
      automate_processes: "Automate sales processes",
      improve_conversion: "Improve conversion rates",
      scale_operations: "Scale sales operations",
    };
    contextParts.push(`Primary Goal: ${goalLabels[profile.primaryGoal] || profile.primaryGoal}`);
  }

  if (profile.targetAudience) {
    const audienceParts: string[] = [];
    if (profile.targetAudience.jobTitles?.length) {
      audienceParts.push(`Job Titles: ${profile.targetAudience.jobTitles.join(", ")}`);
    }
    if (profile.targetAudience.industries?.length) {
      audienceParts.push(`Target Industries: ${profile.targetAudience.industries.join(", ")}`);
    }
    if (profile.targetAudience.geography?.length) {
      audienceParts.push(`Geography: ${profile.targetAudience.geography.join(", ")}`);
    }
    if (audienceParts.length) {
      contextParts.push(`Target Audience - ${audienceParts.join("; ")}`);
    }
  }

  if (profile.channels) {
    const activeChannels = Object.entries(profile.channels)
      .filter(([, active]) => active)
      .map(([channel]) => channel);
    if (activeChannels.length) {
      contextParts.push(`Preferred Channels: ${activeChannels.join(", ")}`);
    }
  }

  if (profile.painPoints?.length) {
    contextParts.push(`Pain Points: ${profile.painPoints.join(", ")}`);
  }

  if (profile.keyMetrics?.length) {
    contextParts.push(`Key Metrics: ${profile.keyMetrics.join(", ")}`);
  }

  res.json({
    success: true,
    data: {
      hasProfile: true,
      context: contextParts.join("\n"),
      raw: profile,
    },
  });
}));

export default router;
