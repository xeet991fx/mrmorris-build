import express, { Request, Response } from "express";
import FormTemplate from "../models/FormTemplate";
import FormIntelligenceService from "../services/FormIntelligenceService";

const router = express.Router();

/**
 * GET /api/form-templates
 * Get all form templates with optional filtering
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { industry, useCase, benchmark, featured } = req.query;

    const filter: any = {};
    if (industry) filter.industry = industry;
    if (useCase) filter.useCase = useCase;
    if (benchmark) filter.benchmark = benchmark;
    if (featured === "true") filter.featured = true;

    const templates = await FormTemplate.find(filter).sort({
      featured: -1,
      rating: -1,
      usageCount: -1,
    });

    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/form-templates/industries
 * Get list of available industries
 */
router.get("/industries", async (req: Request, res: Response) => {
  try {
    const industries = [
      { value: "saas", label: "SaaS", description: "Software as a Service products" },
      { value: "b2b", label: "B2B", description: "Business to Business services" },
      { value: "ecommerce", label: "E-Commerce", description: "Online retail and products" },
      { value: "consulting", label: "Consulting", description: "Professional consulting services" },
      { value: "agency", label: "Agency", description: "Marketing, design, or dev agencies" },
      { value: "finance", label: "Finance", description: "Financial services and fintech" },
      { value: "healthcare", label: "Healthcare", description: "Healthcare and medical services" },
      { value: "education", label: "Education", description: "EdTech and education services" },
      { value: "real_estate", label: "Real Estate", description: "Property and real estate" },
      { value: "general", label: "General", description: "General purpose forms" },
    ];

    res.json({ success: true, industries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/form-templates/use-cases
 * Get list of available use cases
 */
router.get("/use-cases", async (req: Request, res: Response) => {
  try {
    const useCases = [
      { value: "demo_request", label: "Demo Request", description: "Schedule product demos" },
      { value: "trial_signup", label: "Trial Signup", description: "Free trial registrations" },
      { value: "contact_sales", label: "Contact Sales", description: "Sales inquiries" },
      { value: "pricing_inquiry", label: "Pricing Inquiry", description: "Quote requests" },
      { value: "consultation", label: "Consultation", description: "Book consultations" },
      { value: "newsletter", label: "Newsletter", description: "Newsletter subscriptions" },
      { value: "content_download", label: "Content Download", description: "Gated content (ebooks, whitepapers)" },
      { value: "event_registration", label: "Event Registration", description: "Webinar or event signups" },
      { value: "quote_request", label: "Quote Request", description: "Service quote requests" },
      { value: "partnership", label: "Partnership", description: "Partnership inquiries" },
    ];

    res.json({ success: true, useCases });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/form-templates/:slug
 * Get specific template by slug
 */
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const template = await FormTemplate.findOne({ slug });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    res.json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/:slug/use
 * Track template usage
 */
router.post("/:slug/use", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const template = await FormTemplate.findOne({ slug });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    await template.incrementUsage();

    res.json({ success: true, message: "Usage tracked" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/analyze
 * Analyze form and get quality score + recommendations
 */
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { form } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    const qualityScore = FormIntelligenceService.calculateQualityScore(form);
    const recommendations = await FormIntelligenceService.getSmartRecommendations(form);
    const bestPractices = FormIntelligenceService.validateBestPractices(form);

    res.json({
      success: true,
      analysis: {
        qualityScore,
        recommendations,
        bestPractices,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/suggest-fields
 * Get smart field suggestions based on industry and use case
 */
router.post("/suggest-fields", async (req: Request, res: Response) => {
  try {
    const { industry, useCase, currentFields } = req.body;

    if (!industry || !useCase) {
      return res.status(400).json({ success: false, message: "Industry and use case required" });
    }

    const suggestions = await FormIntelligenceService.getFieldSuggestions(
      industry,
      useCase,
      currentFields || []
    );

    res.json({ success: true, suggestions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/form-templates/similar/:slug
 * Get similar high-performing templates
 */
router.get("/similar/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const template = await FormTemplate.findOne({ slug });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const similar = await FormIntelligenceService.getSimilarTemplates(
      template.industry,
      template.useCase,
      3
    );

    // Exclude the current template
    const filtered = similar.filter((t) => t.slug !== slug);

    res.json({ success: true, templates: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/form-templates/featured
 * Get featured templates
 */
router.get("/featured/all", async (req: Request, res: Response) => {
  try {
    const templates = await FormTemplate.find({ featured: true })
      .sort({ rating: -1, usageCount: -1 })
      .limit(6);

    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// EXTENSION ROUTES
// ============================================

/**
 * POST /api/form-templates/industry-benchmarks
 * Get industry benchmarks and compare form
 */
router.post("/industry-benchmarks", async (req: Request, res: Response) => {
  try {
    const { form, industry, useCase } = req.body;

    if (!industry) {
      return res.status(400).json({ success: false, message: "Industry required" });
    }

    const benchmarks = FormIntelligenceService.getIndustryBenchmarks(industry, useCase);

    // If form provided, also compare against benchmarks
    let comparison = null;
    if (form) {
      comparison = FormIntelligenceService.compareToIndustryBenchmarks(form, industry, useCase);
    }

    res.json({
      success: true,
      benchmarks,
      comparison,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/ab-test-suggestions
 * Generate A/B test suggestions for a form
 */
router.post("/ab-test-suggestions", async (req: Request, res: Response) => {
  try {
    const { form } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    const suggestions = FormIntelligenceService.generateABTestSuggestions(form);

    res.json({ success: true, suggestions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/accessibility-score
 * Calculate accessibility score for a form
 */
router.post("/accessibility-score", async (req: Request, res: Response) => {
  try {
    const { form } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    const accessibilityScore = FormIntelligenceService.calculateAccessibilityScore(form);

    res.json({ success: true, accessibilityScore });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/psychology-tips
 * Get conversion psychology tips for a form
 */
router.post("/psychology-tips", async (req: Request, res: Response) => {
  try {
    const { form, industry } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    const tips = FormIntelligenceService.getConversionPsychologyTips(form, industry);

    res.json({ success: true, tips });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/analytics-schema
 * Generate analytics schema for field-level tracking
 */
router.post("/analytics-schema", async (req: Request, res: Response) => {
  try {
    const { form } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    const analyticsSchema = FormIntelligenceService.getFieldAnalyticsSchema(form);

    res.json({ success: true, analyticsSchema });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/form-templates/full-analysis
 * Get comprehensive form analysis with all extensions
 */
router.post("/full-analysis", async (req: Request, res: Response) => {
  try {
    const { form, industry, useCase } = req.body;

    if (!form) {
      return res.status(400).json({ success: false, message: "Form data required" });
    }

    // Run all analysis in parallel
    const [
      qualityScore,
      recommendations,
      bestPractices,
      accessibilityScore,
      abTestSuggestions,
      psychologyTips,
    ] = await Promise.all([
      Promise.resolve(FormIntelligenceService.calculateQualityScore(form)),
      FormIntelligenceService.getSmartRecommendations(form),
      Promise.resolve(FormIntelligenceService.validateBestPractices(form)),
      Promise.resolve(FormIntelligenceService.calculateAccessibilityScore(form)),
      Promise.resolve(FormIntelligenceService.generateABTestSuggestions(form)),
      Promise.resolve(FormIntelligenceService.getConversionPsychologyTips(form, industry)),
    ]);

    // Get industry benchmarks if industry provided
    let industryComparison = null;
    if (industry) {
      industryComparison = FormIntelligenceService.compareToIndustryBenchmarks(form, industry, useCase);
    }

    res.json({
      success: true,
      analysis: {
        qualityScore,
        recommendations,
        bestPractices,
        accessibilityScore,
        abTestSuggestions,
        psychologyTips,
        industryComparison,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

