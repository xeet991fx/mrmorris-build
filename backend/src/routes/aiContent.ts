/**
 * AI Content Generation Routes
 * Form generation, email writing, and page creation using business profile context
 */

import express, { Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const router = express.Router();

/**
 * POST /ai/generate-form
 * Generate form using AI with optional business profile context
 */
router.post("/generate-form", authenticate, async (req: Request, res: Response) => {
  try {
    const { workspaceId, formGoal, useProfileContext = true } = req.body;

    if (!workspaceId || !formGoal) {
      return res.status(400).json({
        success: false,
        error: "workspaceId and formGoal are required",
      });
    }

    const { AIFormGeneratorService } = await import("../services/AIFormGeneratorService");

    const generatedForm = await AIFormGeneratorService.generateFormWithContext(
      workspaceId,
      formGoal,
      useProfileContext
    );

    res.json({
      success: true,
      data: generatedForm,
    });
  } catch (error: any) {
    console.error("Error generating form:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /ai/form-fields-from-profile
 * Generate form fields based on business profile (non-AI)
 */
router.post("/form-fields-from-profile", authenticate, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "workspaceId is required",
      });
    }

    const { AIFormGeneratorService } = await import("../services/AIFormGeneratorService");

    const fields = await AIFormGeneratorService.generateFieldsFromProfile(workspaceId);

    res.json({
      success: true,
      data: { fields },
    });
  } catch (error: any) {
    console.error("Error generating fields from profile:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /ai/generate-email
 * Generate email using AI with optional business profile context
 */
router.post("/generate-email", authenticate, async (req: Request, res: Response) => {
  try {
    const { workspaceId, emailRequest, useProfileContext = true } = req.body;

    if (!workspaceId || !emailRequest) {
      return res.status(400).json({
        success: false,
        error: "workspaceId and emailRequest are required",
      });
    }

    // Validate email request
    if (!emailRequest.purpose) {
      return res.status(400).json({
        success: false,
        error: "emailRequest.purpose is required",
      });
    }

    const { AIEmailWriterService } = await import("../services/AIEmailWriterService");

    const generatedEmail = await AIEmailWriterService.generateEmailWithContext(
      workspaceId,
      emailRequest,
      useProfileContext
    );

    res.json({
      success: true,
      data: generatedEmail,
    });
  } catch (error: any) {
    console.error("Error generating email:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /ai/generate-landing-page
 * Generate landing page copy using AI with business profile context
 */
router.post("/generate-landing-page", authenticate, async (req: Request, res: Response) => {
  try {
    const { workspaceId, pageGoal, useProfileContext = true } = req.body;

    if (!workspaceId || !pageGoal) {
      return res.status(400).json({
        success: false,
        error: "workspaceId and pageGoal are required",
      });
    }

    const { IntelligentOnboardingService } = await import(
      "../services/IntelligentOnboardingService"
    );
    const { getProModel } = await import("../agents/modelFactory");

    let profileContext = "";
    if (useProfileContext) {
      const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
      if (profile) {
        profileContext = `
**BUSINESS CONTEXT**:
- Industry: ${profile.industry}
- Sales Model: ${profile.salesModel?.toUpperCase()}
- Sales Cycle: ${profile.salesCycle}
- Primary Goal: ${profile.primaryGoal}
- Pain Points: ${profile.painPoints?.join(", ") || "None"}
- Target Audience: ${profile.targetAudience?.jobTitles?.join(", ") || "General"}`;
      }
    }

    const model = getProModel();

    const prompt = `You are an expert landing page copywriter. Generate compelling landing page copy.

${profileContext}

**PAGE GOAL**: ${pageGoal}

Generate a JSON response with this EXACT structure:
{
  "headline": "attention-grabbing headline",
  "subheadline": "supporting subheadline",
  "heroText": "hero section copy",
  "benefitsTitle": "benefits section title",
  "benefits": [
    {"title": "benefit 1", "description": "description"},
    {"title": "benefit 2", "description": "description"},
    {"title": "benefit 3", "description": "description"}
  ],
  "cta": {
    "primary": "main CTA text",
    "secondary": "secondary CTA text"
  },
  "socialProof": "testimonial or stat to include",
  "reasoning": "why this copy works"
}

**RULES**:
1. Keep headline under 60 characters
2. Address pain points from profile
3. Match industry and sales model
4. Focus on benefits, not features
5. Include strong, clear CTAs
6. Return ONLY valid JSON, no markdown`;

    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : String(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response - no JSON found");
    }

    const generatedPage = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      data: generatedPage,
    });
  } catch (error: any) {
    console.error("Error generating landing page:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /ai/content-suggestions/:workspaceId
 * Get personalized content suggestions based on business profile
 */
router.get(
  "/content-suggestions/:workspaceId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;

      const { IntelligentOnboardingService } = await import(
        "../services/IntelligentOnboardingService"
      );

      const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: "Business profile not found. Complete onboarding first.",
        });
      }

      const suggestions = {
        formTypes: [] as string[],
        emailCampaigns: [] as string[],
        landingPages: [] as string[],
      };

      // Form suggestions based on profile
      if (profile.salesModel === "b2b" || profile.salesModel === "b2b2c") {
        suggestions.formTypes.push(
          "Lead Qualification Form",
          "Demo Request Form",
          "RFP/Quote Request Form"
        );
      }

      if (profile.channels?.content) {
        suggestions.formTypes.push("Content Download Form", "Webinar Registration");
      }

      if (profile.channels?.events) {
        suggestions.formTypes.push("Event Registration", "Workshop Sign-up");
      }

      // Email campaign suggestions
      if (profile.primaryGoal === "generate_leads") {
        suggestions.emailCampaigns.push(
          "Cold Outreach Campaign",
          "Lead Magnet Promotion",
          "Content Nurture Sequence"
        );
      }

      if (profile.primaryGoal === "close_deals") {
        suggestions.emailCampaigns.push(
          "Demo Follow-up Sequence",
          "Proposal Follow-up",
          "Objection Handling Series"
        );
      }

      if (profile.salesCycle === "long" || profile.salesCycle === "very_long") {
        suggestions.emailCampaigns.push("Long-term Nurture Campaign", "Educational Series");
      }

      // Landing page suggestions
      if (profile.primaryGoal === "generate_leads") {
        suggestions.landingPages.push("Lead Magnet Landing Page", "Free Trial Sign-up");
      }

      if (profile.channels?.content) {
        suggestions.landingPages.push("Ebook/Guide Landing Page", "Webinar Registration Page");
      }

      suggestions.landingPages.push("Product Landing Page", "Pricing Page");

      res.json({
        success: true,
        data: {
          suggestions,
          profile: {
            industry: profile.industry,
            salesModel: profile.salesModel,
            primaryGoal: profile.primaryGoal,
          },
        },
      });
    } catch (error: any) {
      console.error("Error getting content suggestions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
