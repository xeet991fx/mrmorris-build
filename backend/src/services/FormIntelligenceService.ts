import { IForm } from "../models/Form";
import FormTemplate from "../models/FormTemplate";

interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    fieldCount: { score: number; feedback: string };
    fieldLabels: { score: number; feedback: string };
    helpText: { score: number; feedback: string };
    progressiveProfile: { score: number; feedback: string };
    formLength: { score: number; feedback: string };
    callToAction: { score: number; feedback: string };
    mobileFriendly: { score: number; feedback: string };
    gdprCompliance: { score: number; feedback: string };
  };
  improvements: Array<{
    priority: "critical" | "high" | "medium" | "low";
    issue: string;
    suggestion: string;
    impact: string; // Expected conversion lift
  }>;
  estimatedConversionRate: number;
  benchmark: "below_average" | "average" | "above_average" | "exceptional";
}

interface SmartRecommendation {
  type: "add_field" | "remove_field" | "reorder_fields" | "modify_field" | "add_step" | "change_copy";
  field?: {
    type: string;
    label: string;
    placeholder: string;
    helpText: string;
    required: boolean;
    qualificationWeight: number;
  };
  reason: string;
  expectedImpact: string;
  priority: "critical" | "high" | "medium" | "low";
}

interface FieldSuggestion {
  label: string;
  type: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  qualificationWeight: number;
  reasoning: string;
  conversionImpact: string;
}

export class FormIntelligenceService {
  /**
   * Calculate comprehensive form quality score
   */
  static calculateQualityScore(form: any): QualityScore {
    const fields = form.fields || [];
    const visibleFields = fields.filter((f: any) => f.type !== "hidden");
    const requiredFields = fields.filter((f: any) => f.required);

    // 1. Field Count Score (optimal: 3-7 fields for lead gen)
    let fieldCountScore = 100;
    let fieldCountFeedback = "Perfect field count for conversion";
    if (visibleFields.length < 3) {
      fieldCountScore = 50;
      fieldCountFeedback = "Too few fields - may not qualify leads effectively";
    } else if (visibleFields.length > 12) {
      fieldCountScore = 40;
      fieldCountFeedback = "Too many fields - will significantly reduce conversion rate";
    } else if (visibleFields.length > 7) {
      fieldCountScore = 70;
      fieldCountFeedback = "Consider using multi-step form to reduce perceived complexity";
    }

    // 2. Field Labels Score (clear, concise, action-oriented)
    let fieldLabelsScore = 100;
    let fieldLabelsFeedback = "All field labels are clear and descriptive";
    let poorLabels = 0;
    fields.forEach((field: any) => {
      if (!field.label || field.label.length < 2) {
        poorLabels++;
      } else if (field.label.length > 50) {
        poorLabels++;
      } else if (field.label.toLowerCase() === field.type) {
        poorLabels++; // Generic label like "text" or "email"
      }
    });
    if (poorLabels > 0) {
      fieldLabelsScore = Math.max(50, 100 - poorLabels * 15);
      fieldLabelsFeedback = `${poorLabels} field(s) have unclear or missing labels`;
    }

    // 3. Help Text Score (guides users, reduces friction)
    let helpTextScore = 0;
    let helpTextFeedback = "No help text provided - users may be confused";
    const fieldsWithHelp = fields.filter((f: any) => f.helpText && f.helpText.length > 10).length;
    const helpTextCoverage = visibleFields.length > 0 ? (fieldsWithHelp / visibleFields.length) * 100 : 0;

    if (helpTextCoverage >= 70) {
      helpTextScore = 100;
      helpTextFeedback = "Excellent help text coverage - guides users effectively";
    } else if (helpTextCoverage >= 40) {
      helpTextScore = 70;
      helpTextFeedback = "Good help text, but consider adding to more fields";
    } else if (helpTextCoverage >= 20) {
      helpTextScore = 40;
      helpTextFeedback = "Minimal help text - add guidance to reduce form abandonment";
    }

    // 4. Progressive Profiling Score
    let progressiveProfileScore = 0;
    let progressiveProfileFeedback = "Progressive profiling not enabled";
    if (form.enableProgressiveProfiling) {
      progressiveProfileScore = 100;
      progressiveProfileFeedback = "Smart! Hides known fields to reduce friction for returning visitors";
    } else if (visibleFields.length > 7) {
      progressiveProfileFeedback = "Consider enabling progressive profiling for long forms";
    }

    // 5. Form Length Score (time to complete)
    let formLengthScore = 100;
    let formLengthFeedback = "Form length is optimal";
    const estimatedTime = visibleFields.length * 5; // 5 seconds per field
    if (estimatedTime > 120) {
      // 2 minutes
      formLengthScore = 50;
      formLengthFeedback = `Estimated ${Math.round(estimatedTime / 60)} min to complete - too long for cold traffic`;
    } else if (estimatedTime > 60) {
      formLengthScore = 75;
      formLengthFeedback = "Form may be too long for top-of-funnel leads";
    }

    // 6. Call to Action Score
    let ctaScore = 50;
    let ctaFeedback = "Using generic submit button text";
    const submitText = form.submitButtonText || "Submit";
    if (
      submitText.toLowerCase().includes("get") ||
      submitText.toLowerCase().includes("start") ||
      submitText.toLowerCase().includes("try") ||
      submitText.toLowerCase().includes("request") ||
      submitText.toLowerCase().includes("download") ||
      submitText.toLowerCase().includes("book")
    ) {
      ctaScore = 100;
      ctaFeedback = "Strong action-oriented CTA";
    } else if (submitText.toLowerCase() === "submit" || submitText.toLowerCase() === "send") {
      ctaFeedback = 'Generic CTA - try "Get My Free Demo" or "Start Free Trial"';
    }

    // 7. Mobile Friendly Score
    let mobileFriendlyScore = 80;
    let mobileFriendlyFeedback = "Form should work on mobile (verify responsive design)";
    if (form.layout === "two-column") {
      mobileFriendlyScore = 60;
      mobileFriendlyFeedback = "Two-column layout may be difficult on mobile - consider single column";
    } else if (form.layout === "vertical") {
      mobileFriendlyScore = 100;
      mobileFriendlyFeedback = "Vertical layout is mobile-optimized";
    }

    // 8. GDPR Compliance Score
    let gdprScore = 50;
    let gdprFeedback = "No GDPR consent fields detected";
    const hasConsent = fields.some(
      (f: any) => f.type === "gdpr_consent" || f.type === "marketing_consent"
    );
    if (hasConsent) {
      gdprScore = 100;
      gdprFeedback = "GDPR compliant with consent tracking";
    } else {
      gdprFeedback = "Add GDPR consent field for compliance (required in EU)";
    }

    // Calculate overall score (weighted average)
    const weights = {
      fieldCount: 0.15,
      fieldLabels: 0.1,
      helpText: 0.15,
      progressiveProfile: 0.1,
      formLength: 0.15,
      callToAction: 0.15,
      mobileFriendly: 0.1,
      gdprCompliance: 0.1,
    };

    const overall =
      fieldCountScore * weights.fieldCount +
      fieldLabelsScore * weights.fieldLabels +
      helpTextScore * weights.helpText +
      progressiveProfileScore * weights.progressiveProfile +
      formLengthScore * weights.formLength +
      ctaScore * weights.callToAction +
      mobileFriendlyScore * weights.mobileFriendly +
      gdprScore * weights.gdprCompliance;

    // Generate improvements
    const improvements: any[] = [];

    if (fieldCountScore < 70) {
      improvements.push({
        priority: "high" as const,
        issue: "Suboptimal number of form fields",
        suggestion:
          visibleFields.length > 12
            ? "Reduce to 5-7 critical fields or use multi-step form"
            : "Add 2-3 qualifying questions to filter leads",
        impact: "15-30% conversion improvement",
      });
    }

    if (helpTextScore < 50) {
      improvements.push({
        priority: "high" as const,
        issue: "Insufficient help text",
        suggestion: "Add helpful examples and guidance for each field (e.g., 'Your company email' or 'Number of employees: 1-10, 11-50, etc.')",
        impact: "10-15% reduction in form abandonment",
      });
    }

    if (!form.enableProgressiveProfiling && visibleFields.length > 7) {
      improvements.push({
        priority: "medium" as const,
        issue: "Progressive profiling disabled",
        suggestion: "Enable progressive profiling to hide known fields for returning visitors",
        impact: "20-40% lift in returning visitor conversions",
      });
    }

    if (ctaScore < 70) {
      improvements.push({
        priority: "high" as const,
        issue: "Weak call-to-action button",
        suggestion: 'Use action-oriented text like "Get My Free Demo" instead of generic "Submit"',
        impact: "5-12% conversion lift",
      });
    }

    if (mobileFriendlyScore < 80) {
      improvements.push({
        priority: "medium" as const,
        issue: "Layout may not be mobile-optimized",
        suggestion: "Switch to vertical single-column layout for better mobile experience",
        impact: "10-20% improvement in mobile conversions",
      });
    }

    if (gdprScore < 100) {
      improvements.push({
        priority: "critical" as const,
        issue: "Missing GDPR compliance",
        suggestion: "Add GDPR consent checkbox (legally required for EU visitors)",
        impact: "Avoids legal penalties + builds trust",
      });
    }

    // Estimate conversion rate based on industry benchmarks
    let estimatedConversionRate = 0.25; // 25% baseline for good forms
    if (overall >= 85) {
      estimatedConversionRate = 0.35; // 35%
    } else if (overall >= 70) {
      estimatedConversionRate = 0.25; // 25%
    } else if (overall >= 50) {
      estimatedConversionRate = 0.15; // 15%
    } else {
      estimatedConversionRate = 0.08; // 8%
    }

    // Determine benchmark
    let benchmark: "below_average" | "average" | "above_average" | "exceptional" = "average";
    if (overall >= 90) {
      benchmark = "exceptional";
    } else if (overall >= 75) {
      benchmark = "above_average";
    } else if (overall < 60) {
      benchmark = "below_average";
    }

    return {
      overall: Math.round(overall),
      breakdown: {
        fieldCount: { score: fieldCountScore, feedback: fieldCountFeedback },
        fieldLabels: { score: fieldLabelsScore, feedback: fieldLabelsFeedback },
        helpText: { score: helpTextScore, feedback: helpTextFeedback },
        progressiveProfile: { score: progressiveProfileScore, feedback: progressiveProfileFeedback },
        formLength: { score: formLengthScore, feedback: formLengthFeedback },
        callToAction: { score: ctaScore, feedback: ctaFeedback },
        mobileFriendly: { score: mobileFriendlyScore, feedback: mobileFriendlyFeedback },
        gdprCompliance: { score: gdprScore, feedback: gdprFeedback },
      },
      improvements: improvements.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      estimatedConversionRate,
      benchmark,
    };
  }

  /**
   * Get smart field recommendations based on industry and use case
   */
  static async getFieldSuggestions(
    industry: string,
    useCase: string,
    currentFields: any[]
  ): Promise<FieldSuggestion[]> {
    const suggestions: FieldSuggestion[] = [];
    const currentFieldTypes = currentFields.map((f) => f.mapping || f.type);

    // Universal qualifying questions
    if (!currentFieldTypes.includes("email")) {
      suggestions.push({
        label: "Work Email",
        type: "email",
        placeholder: "you@company.com",
        helpText: "We'll never share your email with anyone",
        required: true,
        qualificationWeight: 10,
        reasoning: "Email is essential for lead tracking and follow-up",
        conversionImpact: "Critical - required for any lead gen form",
      });
    }

    if (!currentFieldTypes.includes("company")) {
      suggestions.push({
        label: "Company Name",
        type: "text",
        placeholder: "Acme Inc.",
        helpText: "Your company or organization name",
        required: true,
        qualificationWeight: 15,
        reasoning: "Company name helps qualify B2B leads and personalize outreach",
        conversionImpact: "High - adds context without friction",
      });
    }

    // SaaS-specific recommendations
    if (industry === "saas") {
      if (useCase === "demo_request" || useCase === "trial_signup") {
        if (!currentFieldTypes.includes("employees")) {
          suggestions.push({
            label: "Company Size",
            type: "select",
            placeholder: "Select team size",
            helpText: "Helps us customize your demo",
            required: true,
            qualificationWeight: 20,
            reasoning: "Company size is a strong qualification signal for SaaS - indicates deal value and fit",
            conversionImpact: "Medium - critical for lead routing but adds friction",
          });
        }

        if (!currentFieldTypes.includes("jobTitle")) {
          suggestions.push({
            label: "Job Title",
            type: "text",
            placeholder: "e.g., Marketing Director",
            helpText: "Helps us understand your role",
            required: true,
            qualificationWeight: 15,
            reasoning: "Identifies decision-maker vs individual contributor",
            conversionImpact: "Low friction - people type this naturally",
          });
        }

        if (!currentFieldTypes.some((f) => f.includes("timeline") || f.includes("urgency"))) {
          suggestions.push({
            label: "When do you need this?",
            type: "select",
            placeholder: "Select timeframe",
            helpText: "Helps us prioritize your demo",
            required: false,
            qualificationWeight: 25,
            reasoning: "Timeline/urgency is the strongest qualification signal - predicts close probability",
            conversionImpact: "High qualification value - worth the friction",
          });
        }
      }

      if (useCase === "pricing_inquiry") {
        if (!currentFieldTypes.some((f) => f.includes("budget"))) {
          suggestions.push({
            label: "Monthly Budget Range",
            type: "select",
            placeholder: "Select budget range",
            helpText: "Helps us recommend the right plan (we have options for every budget)",
            required: false,
            qualificationWeight: 30,
            reasoning: "Budget qualification prevents wasted sales cycles",
            conversionImpact: "Critical for enterprise sales - pre-qualifies financial fit",
          });
        }
      }
    }

    // B2B-specific recommendations
    if (industry === "b2b") {
      if (!currentFieldTypes.includes("phone")) {
        suggestions.push({
          label: "Phone Number",
          type: "phone",
          placeholder: "+1 (555) 000-0000",
          helpText: "For urgent questions only - we prefer email",
          required: false,
          qualificationWeight: 10,
          reasoning: "Phone number indicates serious intent (but reduces conversion if required)",
          conversionImpact: "If optional: 5% drop but higher lead quality. If required: 30% drop",
        });
      }

      if (!currentFieldTypes.some((f) => f.includes("industry") || f.includes("vertical"))) {
        suggestions.push({
          label: "Industry",
          type: "select",
          placeholder: "Select your industry",
          helpText: "We specialize in certain industries",
          required: true,
          qualificationWeight: 20,
          reasoning: "Industry targeting enables personalized follow-up and qualification",
          conversionImpact: "Medium - essential for ICP matching",
        });
      }
    }

    // Consulting/Agency recommendations
    if (industry === "consulting" || industry === "agency") {
      if (useCase === "consultation") {
        if (!currentFieldTypes.some((f) => f.includes("challenge") || f.includes("problem"))) {
          suggestions.push({
            label: "What's your biggest challenge right now?",
            type: "textarea",
            placeholder: "Tell us what you're struggling with...",
            helpText: "The more details you share, the better we can help",
            required: true,
            qualificationWeight: 25,
            reasoning: "Understanding pain points enables personalized consultation and qualifies intent",
            conversionImpact: "High - self-qualification through effort",
          });
        }

        if (!currentFieldTypes.some((f) => f.includes("budget"))) {
          suggestions.push({
            label: "Project Budget Range",
            type: "select",
            placeholder: "Select budget range",
            helpText: "Helps us provide accurate recommendations",
            required: false,
            qualificationWeight: 30,
            reasoning: "Budget pre-qualification for professional services",
            conversionImpact: "Critical - avoids misaligned consultations",
          });
        }
      }
    }

    // GDPR compliance (universal)
    if (!currentFieldTypes.some((f) => f.includes("gdpr") || f.includes("consent"))) {
      suggestions.push({
        label: "I agree to receive communications",
        type: "gdpr_consent",
        placeholder: "",
        helpText: "We respect your privacy. Unsubscribe anytime.",
        required: true,
        qualificationWeight: 0,
        reasoning: "GDPR compliance is legally required for EU visitors",
        conversionImpact: "Legally required - minimal impact (~2% drop)",
      });
    }

    return suggestions;
  }

  /**
   * Generate smart recommendations for form improvement
   */
  static async getSmartRecommendations(form: any): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    const qualityScore = this.calculateQualityScore(form);
    const fields = form.fields || [];

    // Critical improvements
    qualityScore.improvements
      .filter((imp) => imp.priority === "critical" || imp.priority === "high")
      .forEach((imp) => {
        if (imp.issue.includes("GDPR")) {
          recommendations.push({
            type: "add_field",
            field: {
              type: "gdpr_consent",
              label: "I agree to receive communications",
              placeholder: "",
              helpText: "We respect your privacy. Unsubscribe anytime.",
              required: true,
              qualificationWeight: 0,
            },
            reason: imp.suggestion,
            expectedImpact: imp.impact,
            priority: imp.priority as any,
          });
        }

        if (imp.issue.includes("call-to-action")) {
          recommendations.push({
            type: "change_copy",
            reason: imp.suggestion,
            expectedImpact: imp.impact,
            priority: imp.priority as any,
          });
        }

        if (imp.issue.includes("help text")) {
          recommendations.push({
            type: "modify_field",
            reason: imp.suggestion,
            expectedImpact: imp.impact,
            priority: imp.priority as any,
          });
        }
      });

    // Field order optimization (most important fields first)
    const emailField = fields.find((f: any) => f.type === "email");
    if (emailField && fields.indexOf(emailField) > 2) {
      recommendations.push({
        type: "reorder_fields",
        reason: "Email field should be in the first 3 fields for better completion rates",
        expectedImpact: "5-8% improvement in form completion",
        priority: "medium",
      });
    }

    // Multi-step recommendation for long forms
    if (fields.length > 7 && !form.isMultiStep) {
      recommendations.push({
        type: "add_step",
        reason: "Break into 2-3 steps to reduce perceived complexity. Step 1: Contact info (3 fields), Step 2: Qualification (4 fields)",
        expectedImpact: "10-25% conversion improvement for long forms",
        priority: "high",
      });
    }

    return recommendations;
  }

  /**
   * Get similar high-performing templates
   */
  static async getSimilarTemplates(industry: string, useCase: string, limit = 3) {
    return await FormTemplate.find({
      $or: [{ industry }, { useCase }],
      benchmark: { $in: ["high", "exceptional"] },
    })
      .sort({ rating: -1, usageCount: -1 })
      .limit(limit);
  }

  /**
   * Validate form against best practices
   */
  static validateBestPractices(form: any): Array<{ passed: boolean; rule: string; details: string }> {
    const validations = [];

    // Rule 1: Forms should have 3-7 fields for optimal conversion
    const visibleFields = (form.fields || []).filter((f: any) => f.type !== "hidden");
    validations.push({
      passed: visibleFields.length >= 3 && visibleFields.length <= 7,
      rule: "Optimal Field Count",
      details: visibleFields.length >= 3 && visibleFields.length <= 7
        ? "✓ Form has optimal number of fields (3-7)"
        : `✗ Form has ${visibleFields.length} fields. Optimal range is 3-7 for best conversion.`,
    });

    // Rule 2: Email field should be present
    const hasEmail = visibleFields.some((f: any) => f.type === "email");
    validations.push({
      passed: hasEmail,
      rule: "Email Field Required",
      details: hasEmail ? "✓ Email field present" : "✗ Email field missing - required for lead capture",
    });

    // Rule 3: CTA should be action-oriented
    const submitText = (form.submitButtonText || "Submit").toLowerCase();
    const hasActionVerb =
      submitText.includes("get") ||
      submitText.includes("start") ||
      submitText.includes("try") ||
      submitText.includes("request") ||
      submitText.includes("download") ||
      submitText.includes("book");
    validations.push({
      passed: hasActionVerb,
      rule: "Action-Oriented CTA",
      details: hasActionVerb
        ? "✓ CTA uses action-oriented language"
        : '✗ CTA is generic. Use action verbs like "Get", "Start", "Try", "Request"',
    });

    // Rule 4: Required fields should be minimal
    const requiredFields = visibleFields.filter((f: any) => f.required);
    validations.push({
      passed: requiredFields.length <= 5,
      rule: "Minimal Required Fields",
      details: requiredFields.length <= 5
        ? `✓ Only ${requiredFields.length} required fields`
        : `✗ Too many required fields (${requiredFields.length}). Keep to 5 or fewer.`,
    });

    // Rule 5: Help text for complex fields
    const complexFields = visibleFields.filter(
      (f: any) =>
        f.type === "select" ||
        f.type === "multiselect" ||
        f.type === "textarea" ||
        f.type === "file"
    );
    const complexWithHelp = complexFields.filter((f: any) => f.helpText && f.helpText.length > 0);
    validations.push({
      passed: complexFields.length === 0 || complexWithHelp.length >= complexFields.length * 0.7,
      rule: "Help Text for Complex Fields",
      details:
        complexFields.length === 0
          ? "✓ No complex fields"
          : complexWithHelp.length >= complexFields.length * 0.7
            ? "✓ Most complex fields have help text"
            : `✗ ${complexFields.length - complexWithHelp.length} complex field(s) missing help text`,
    });

    return validations;
  }

  // ============================================
  // EXTENSION 1: INDUSTRY BENCHMARKS
  // ============================================

  /**
   * Get industry-specific benchmarks for comparison
   */
  static getIndustryBenchmarks(industry: string, useCase?: string): {
    avgConversionRate: number;
    avgFieldCount: number;
    avgCompletionTime: number;
    topPerformerRate: number;
    commonFieldTypes: string[];
    description: string;
  } {
    const benchmarks: Record<string, any> = {
      saas: {
        demo_request: {
          avgConversionRate: 0.25,
          avgFieldCount: 6,
          avgCompletionTime: 45,
          topPerformerRate: 0.38,
          commonFieldTypes: ["email", "company", "employees", "job_title", "timeline"],
          description: "SaaS demo forms perform best with 5-7 fields including qualification questions",
        },
        trial_signup: {
          avgConversionRate: 0.35,
          avgFieldCount: 3,
          avgCompletionTime: 20,
          topPerformerRate: 0.52,
          commonFieldTypes: ["email", "company"],
          description: "Trial signups should be ultra-minimal - every field drops conversion 10%",
        },
        default: {
          avgConversionRate: 0.22,
          avgFieldCount: 5,
          avgCompletionTime: 35,
          topPerformerRate: 0.35,
          commonFieldTypes: ["email", "name", "company"],
          description: "SaaS forms average 5 fields with 22% conversion rates",
        },
      },
      b2b: {
        default: {
          avgConversionRate: 0.18,
          avgFieldCount: 6,
          avgCompletionTime: 50,
          topPerformerRate: 0.30,
          commonFieldTypes: ["email", "company", "phone", "industry", "job_title"],
          description: "B2B forms require more qualification but face higher abandonment",
        },
      },
      consulting: {
        consultation: {
          avgConversionRate: 0.22,
          avgFieldCount: 7,
          avgCompletionTime: 60,
          topPerformerRate: 0.32,
          commonFieldTypes: ["email", "company", "challenge", "budget", "timeline"],
          description: "Consultation forms need qualification to avoid wasted calls",
        },
        default: {
          avgConversionRate: 0.20,
          avgFieldCount: 6,
          avgCompletionTime: 50,
          topPerformerRate: 0.30,
          commonFieldTypes: ["email", "company", "challenge", "budget"],
          description: "Consulting forms balance qualification with conversion",
        },
      },
      ecommerce: {
        default: {
          avgConversionRate: 0.42,
          avgFieldCount: 4,
          avgCompletionTime: 25,
          topPerformerRate: 0.55,
          commonFieldTypes: ["email", "name"],
          description: "E-commerce lead forms should be quick and mobile-optimized",
        },
      },
      agency: {
        default: {
          avgConversionRate: 0.24,
          avgFieldCount: 6,
          avgCompletionTime: 55,
          topPerformerRate: 0.35,
          commonFieldTypes: ["email", "company", "budget", "services", "timeline"],
          description: "Agency forms need budget qualification to filter prospects",
        },
      },
      general: {
        default: {
          avgConversionRate: 0.25,
          avgFieldCount: 5,
          avgCompletionTime: 35,
          topPerformerRate: 0.40,
          commonFieldTypes: ["email", "name", "company", "message"],
          description: "General contact forms work best with 4-6 fields",
        },
      },
    };

    const industryData = benchmarks[industry] || benchmarks.general;
    const useCaseData = useCase && industryData[useCase] ? industryData[useCase] : industryData.default;

    return useCaseData || benchmarks.general.default;
  }

  /**
   * Compare form against industry benchmarks
   */
  static compareToIndustryBenchmarks(form: any, industry: string, useCase?: string): {
    benchmarks: any;
    comparison: {
      fieldCount: { status: "above" | "below" | "optimal"; difference: number };
      estimatedConversion: { status: "above" | "below" | "average"; percentile: number };
      completionTime: { status: "faster" | "slower" | "average"; difference: number };
    };
    insights: string[];
  } {
    const benchmarks = this.getIndustryBenchmarks(industry, useCase);
    const fields = (form.fields || []).filter((f: any) => f.type !== "hidden");
    const fieldCount = fields.length;
    const estimatedTime = fieldCount * 5; // 5 seconds per field

    const qualityScore = this.calculateQualityScore(form);

    // Field count comparison
    let fieldCountStatus: "above" | "below" | "optimal" = "optimal";
    if (fieldCount > benchmarks.avgFieldCount + 2) fieldCountStatus = "above";
    else if (fieldCount < benchmarks.avgFieldCount - 2) fieldCountStatus = "below";

    // Conversion comparison (based on quality score)
    let conversionStatus: "above" | "below" | "average" = "average";
    let percentile = 50;
    if (qualityScore.estimatedConversionRate > benchmarks.topPerformerRate * 0.9) {
      conversionStatus = "above";
      percentile = 90;
    } else if (qualityScore.estimatedConversionRate > benchmarks.avgConversionRate) {
      percentile = 70;
    } else if (qualityScore.estimatedConversionRate < benchmarks.avgConversionRate * 0.8) {
      conversionStatus = "below";
      percentile = 25;
    }

    // Time comparison
    let timeStatus: "faster" | "slower" | "average" = "average";
    if (estimatedTime < benchmarks.avgCompletionTime - 10) timeStatus = "faster";
    else if (estimatedTime > benchmarks.avgCompletionTime + 15) timeStatus = "slower";

    // Generate insights
    const insights: string[] = [];
    if (fieldCountStatus === "above") {
      insights.push(`Your form has ${fieldCount - benchmarks.avgFieldCount} more fields than the industry average. Consider removing non-essential fields.`);
    } else if (fieldCountStatus === "below") {
      insights.push(`Your form is leaner than average. Make sure you're capturing enough qualification data.`);
    }

    if (conversionStatus === "above") {
      insights.push(`Your form is optimized better than ${percentile}% of ${industry} forms!`);
    } else if (conversionStatus === "below") {
      insights.push(`Your conversion rate is below industry average. Focus on the improvement suggestions.`);
    }

    if (timeStatus === "slower") {
      insights.push(`Users will take longer to complete this form. Consider a multi-step approach.`);
    }

    return {
      benchmarks,
      comparison: {
        fieldCount: { status: fieldCountStatus, difference: fieldCount - benchmarks.avgFieldCount },
        estimatedConversion: { status: conversionStatus, percentile },
        completionTime: { status: timeStatus, difference: estimatedTime - benchmarks.avgCompletionTime },
      },
      insights,
    };
  }

  // ============================================
  // EXTENSION 2: A/B TEST SUGGESTIONS
  // ============================================

  /**
   * Generate A/B test suggestions based on form analysis
   */
  static generateABTestSuggestions(form: any): Array<{
    testName: string;
    hypothesis: string;
    control: string;
    variant: string;
    expectedLift: string;
    sampleSizeNeeded: number;
    priority: "high" | "medium" | "low";
    category: "fields" | "layout" | "copy" | "ux";
  }> {
    const suggestions: any[] = [];
    const fields = form.fields || [];
    const visibleFields = fields.filter((f: any) => f.type !== "hidden");

    // Test 1: Phone field removal (if phone exists and is required)
    const phoneField = fields.find((f: any) => f.type === "phone");
    if (phoneField && phoneField.required) {
      suggestions.push({
        testName: "Phone Field Optional vs Required",
        hypothesis: "Making phone number optional will increase form completion without significantly impacting lead quality",
        control: "Phone field required",
        variant: "Phone field optional with hint 'For urgent follow-up only'",
        expectedLift: "15-25% conversion increase",
        sampleSizeNeeded: 500,
        priority: "high",
        category: "fields",
      });
    } else if (phoneField) {
      suggestions.push({
        testName: "Remove Phone Field Entirely",
        hypothesis: "Removing phone field will increase conversions, phone can be collected via email follow-up",
        control: "Include optional phone field",
        variant: "Remove phone field entirely",
        expectedLift: "5-10% conversion increase",
        sampleSizeNeeded: 800,
        priority: "medium",
        category: "fields",
      });
    }

    // Test 2: Multi-step vs single-step (for longer forms)
    if (visibleFields.length > 5 && !form.isMultiStep) {
      suggestions.push({
        testName: "Multi-Step Form vs Single Page",
        hypothesis: "Breaking the form into 2-3 steps will reduce perceived complexity and increase completion",
        control: "Single-page form with all fields",
        variant: "2-step form: Basic info → Qualification questions",
        expectedLift: "10-25% conversion increase",
        sampleSizeNeeded: 400,
        priority: "high",
        category: "ux",
      });
    }

    // Test 3: CTA button text
    const submitText = (form.submitButtonText || "Submit").toLowerCase();
    if (submitText === "submit" || submitText === "send") {
      suggestions.push({
        testName: "CTA Button Text Optimization",
        hypothesis: "Action-oriented, value-focused CTA will outperform generic 'Submit'",
        control: `Current: "${form.submitButtonText || "Submit"}"`,
        variant: "Variants: 'Get My Free Demo', 'Start Free Trial', 'Download Now'",
        expectedLift: "5-12% conversion increase",
        sampleSizeNeeded: 600,
        priority: "high",
        category: "copy",
      });
    }

    // Test 4: Help text addition
    const fieldsWithoutHelp = visibleFields.filter((f: any) => !f.helpText || f.helpText.length < 5);
    if (fieldsWithoutHelp.length >= 3) {
      suggestions.push({
        testName: "Add Contextual Help Text",
        hypothesis: "Adding helpful microcopy to each field will reduce confusion and abandonment",
        control: `${fieldsWithoutHelp.length} fields without help text`,
        variant: "Add reassuring help text to all fields (e.g., 'We never share your email')",
        expectedLift: "8-15% reduction in abandonment",
        sampleSizeNeeded: 500,
        priority: "medium",
        category: "copy",
      });
    }

    // Test 5: Social proof near form
    suggestions.push({
      testName: "Add Social Proof to Form",
      hypothesis: "Showing customer logos or testimonials near the form will build trust and increase submissions",
      control: "Form without social proof",
      variant: "Add '5,000+ companies trust us' or 3 customer logos below form",
      expectedLift: "8-20% conversion increase",
      sampleSizeNeeded: 700,
      priority: "medium",
      category: "ux",
    });

    // Test 6: Layout (2-column vs 1-column)
    if (form.layout !== "vertical" || (!form.layout && visibleFields.length > 4)) {
      suggestions.push({
        testName: "Single Column vs Two Column Layout",
        hypothesis: "Single-column layout improves mobile experience and reduces cognitive load",
        control: form.layout || "Default layout",
        variant: "Strictly single-column, full-width fields",
        expectedLift: "10-20% improvement on mobile",
        sampleSizeNeeded: 1000,
        priority: "medium",
        category: "layout",
      });
    }

    // Test 7: Field order optimization
    const emailFieldIndex = visibleFields.findIndex((f: any) => f.type === "email");
    if (emailFieldIndex > 1) {
      suggestions.push({
        testName: "Email Field Position",
        hypothesis: "Moving email to first or second position captures more leads before abandonment",
        control: `Email field at position ${emailFieldIndex + 1}`,
        variant: "Email field as the first field",
        expectedLift: "5-10% more partial submissions captured",
        sampleSizeNeeded: 600,
        priority: "medium",
        category: "ux",
      });
    }

    // Test 8: Remove a qualification field
    if (visibleFields.length >= 7) {
      const qualificationFields = visibleFields.filter(
        (f: any) => f.type === "select" && !["email", "name", "phone"].includes(f.type)
      );
      if (qualificationFields.length > 1) {
        suggestions.push({
          testName: "Reduce Qualification Fields",
          hypothesis: "Removing one qualification question will increase volume without killing lead quality",
          control: `${qualificationFields.length} qualification questions`,
          variant: "Remove the least predictive qualification question",
          expectedLift: "10-15% more leads, monitor quality",
          sampleSizeNeeded: 800,
          priority: "low",
          category: "fields",
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ============================================
  // EXTENSION 3: ACCESSIBILITY SCORE
  // ============================================

  /**
   * Calculate accessibility score for the form
   */
  static calculateAccessibilityScore(form: any): {
    score: number;
    checks: Array<{ passed: boolean; name: string; description: string; severity: "critical" | "warning" | "info" }>;
    recommendations: string[];
  } {
    const checks: any[] = [];
    const recommendations: string[] = [];
    const fields = form.fields || [];
    let score = 100;

    // Check 1: All fields have labels
    const fieldsWithoutLabels = fields.filter((f: any) => !f.label || f.label.trim().length < 2);
    const hasLabels = fieldsWithoutLabels.length === 0;
    checks.push({
      passed: hasLabels,
      name: "Field Labels",
      description: hasLabels
        ? "All fields have descriptive labels"
        : `${fieldsWithoutLabels.length} field(s) missing proper labels`,
      severity: "critical",
    });
    if (!hasLabels) {
      score -= 25;
      recommendations.push("Add clear, descriptive labels to all form fields for screen reader accessibility");
    }

    // Check 2: Placeholder not used as label substitute
    const fieldsUsingPlaceholderAsLabel = fields.filter(
      (f: any) => f.placeholder && (!f.label || f.label === f.placeholder)
    );
    const noPlaceholderLabels = fieldsUsingPlaceholderAsLabel.length === 0;
    checks.push({
      passed: noPlaceholderLabels,
      name: "Placeholder Usage",
      description: noPlaceholderLabels
        ? "Placeholders not used as label substitutes"
        : `${fieldsUsingPlaceholderAsLabel.length} field(s) rely on placeholders instead of labels`,
      severity: "warning",
    });
    if (!noPlaceholderLabels) {
      score -= 15;
      recommendations.push("Use visible labels, not just placeholders. Placeholders disappear when typing.");
    }

    // Check 3: Required fields are indicated
    const requiredFields = fields.filter((f: any) => f.required);
    const allRequiredIndicated = requiredFields.every(
      (f: any) => f.label && (f.label.includes("*") || f.label.toLowerCase().includes("required"))
    );
    checks.push({
      passed: allRequiredIndicated || requiredFields.length === 0,
      name: "Required Field Indication",
      description: allRequiredIndicated
        ? "Required fields are clearly marked"
        : "Some required fields may not be clearly indicated",
      severity: "warning",
    });
    if (!allRequiredIndicated && requiredFields.length > 0) {
      score -= 10;
      recommendations.push("Mark required fields with asterisks (*) and add a legend explaining the symbol");
    }

    // Check 4: Form has a clear title/heading
    const hasTitle = form.name && form.name.length > 2;
    checks.push({
      passed: hasTitle,
      name: "Form Title",
      description: hasTitle ? "Form has a descriptive title" : "Form missing title/heading",
      severity: "warning",
    });
    if (!hasTitle) {
      score -= 10;
      recommendations.push("Add a clear heading to describe the form's purpose");
    }

    // Check 5: Error messages are descriptive (checking for validation config)
    const fieldsWithValidation = fields.filter((f: any) => f.validation);
    const hasCustomErrors = fieldsWithValidation.some((f: any) => f.validation?.message);
    checks.push({
      passed: hasCustomErrors || fieldsWithValidation.length === 0,
      name: "Custom Error Messages",
      description: hasCustomErrors
        ? "Custom error messages configured"
        : "Using default browser error messages",
      severity: "info",
    });
    if (!hasCustomErrors && fieldsWithValidation.length > 0) {
      score -= 5;
      recommendations.push("Add custom, helpful error messages that explain how to fix issues");
    }

    // Check 6: Help text for complex inputs
    const complexFields = fields.filter(
      (f: any) => ["select", "multiselect", "file", "date", "phone"].includes(f.type)
    );
    const complexWithHelp = complexFields.filter((f: any) => f.helpText && f.helpText.length > 5);
    const hasComplexHelp = complexWithHelp.length >= complexFields.length * 0.6;
    checks.push({
      passed: hasComplexHelp || complexFields.length === 0,
      name: "Help Text for Complex Fields",
      description: hasComplexHelp
        ? "Complex fields have explanatory help text"
        : `${complexFields.length - complexWithHelp.length} complex field(s) lack help text`,
      severity: "info",
    });
    if (!hasComplexHelp && complexFields.length > 0) {
      score -= 5;
      recommendations.push("Add help text to complex fields explaining expected format or options");
    }

    // Check 7: Button has descriptive text
    const submitText = form.submitButtonText || "Submit";
    const hasDescriptiveButton = submitText.length > 4 && submitText.toLowerCase() !== "submit";
    checks.push({
      passed: hasDescriptiveButton,
      name: "Descriptive Submit Button",
      description: hasDescriptiveButton
        ? `Button text "${submitText}" is descriptive`
        : "Button uses generic 'Submit' text",
      severity: "info",
    });
    if (!hasDescriptiveButton) {
      score -= 5;
      recommendations.push("Use descriptive button text that tells users what happens (e.g., 'Get Free Demo')");
    }

    return {
      score: Math.max(0, score),
      checks,
      recommendations,
    };
  }

  // ============================================
  // EXTENSION 4: CONVERSION PSYCHOLOGY TIPS
  // ============================================

  /**
   * Get conversion psychology tips based on form analysis
   */
  static getConversionPsychologyTips(form: any, industry?: string): Array<{
    principle: string;
    tip: string;
    implementation: string;
    impact: string;
    icon: string;
  }> {
    const tips: any[] = [];
    const fields = form.fields || [];
    const visibleFields = fields.filter((f: any) => f.type !== "hidden");

    // 1. Social Proof
    tips.push({
      principle: "Social Proof",
      tip: "People follow the actions of others when uncertain",
      implementation: "Add '10,000+ marketers use this' or show customer logos near your form",
      impact: "8-15% conversion lift when social proof is visible during form fill",
      icon: "👥",
    });

    // 2. Reciprocity (if content download or free resource)
    const hasValueExchange = form.name?.toLowerCase().includes("download") ||
      form.name?.toLowerCase().includes("free") ||
      form.name?.toLowerCase().includes("guide") ||
      form.submitButtonText?.toLowerCase().includes("download");
    if (hasValueExchange) {
      tips.push({
        principle: "Reciprocity",
        tip: "People feel obligated to return favors",
        implementation: "Emphasize the value they're getting: 'Get your FREE 50-page guide (worth $99)'",
        impact: "Increases perceived value and willingness to share info",
        icon: "🎁",
      });
    }

    // 3. Scarcity and Urgency
    tips.push({
      principle: "Scarcity & Urgency",
      tip: "Limited availability increases desire",
      implementation: "Add urgency without being fake: 'Only 3 demo slots left this week' or 'Free for limited time'",
      impact: "Creates FOMO - 10-30% lift when credible",
      icon: "⏰",
    });

    // 4. Loss Aversion
    tips.push({
      principle: "Loss Aversion",
      tip: "People fear losses more than they value gains",
      implementation: "Frame as what they'll miss: 'Don't miss out on...' instead of 'Get access to...'",
      impact: "Loss framing can be 2x more effective than gain framing",
      icon: "🛡️",
    });

    // 5. Commitment and Consistency
    if (visibleFields.length > 4) {
      tips.push({
        principle: "Commitment Consistency",
        tip: "Small commitments lead to larger ones",
        implementation: "Start form with easy questions, progressively ask harder ones. Use multi-step.",
        impact: "Multi-step forms see 20-50% higher completion due to sunk cost effect",
        icon: "📈",
      });
    }

    // 6. Trust and Security
    const hasPersonalFields = fields.some((f: any) =>
      ["phone", "address", "company"].includes(f.type) ||
      f.label?.toLowerCase().includes("phone")
    );
    if (hasPersonalFields) {
      tips.push({
        principle: "Trust & Security",
        tip: "People need to feel safe sharing personal info",
        implementation: "Add trust indicators: privacy policy link, security badges, 'We never share your info'",
        impact: "Trust badges increase conversions 42% for first-time visitors",
        icon: "🔒",
      });
    }

    // 7. Authority
    if (industry === "consulting" || industry === "agency" || industry === "b2b") {
      tips.push({
        principle: "Authority",
        tip: "People defer to experts and credentials",
        implementation: "Show credentials near form: 'Trusted by Fortune 500', certifications, awards",
        impact: "Authority signals increase B2B form conversions by 15-25%",
        icon: "🏆",
      });
    }

    // 8. Personalization
    tips.push({
      principle: "Personalization",
      tip: "Personalized experiences feel more relevant",
      implementation: "Use dynamic form fields based on referral source. Personalize success message with their name.",
      impact: "Personalization can increase conversions by 10-15%",
      icon: "✨",
    });

    // 9. Simplicity and Cognitive Ease
    if (visibleFields.length > 5) {
      tips.push({
        principle: "Cognitive Ease",
        tip: "Simpler = more likely to complete",
        implementation: "Remove any field you can. Every removed field = ~10% more completions.",
        impact: `Your form has ${visibleFields.length} fields. Reducing by 2 could increase conversions by 20%`,
        icon: "🧠",
      });
    }

    // 10. Immediate Gratification
    tips.push({
      principle: "Instant Gratification",
      tip: "People prefer immediate rewards",
      implementation: "Promise and deliver something immediately: 'Get instant access' not 'We'll email you'",
      impact: "Immediate delivery increases satisfaction and follow-through",
      icon: "⚡",
    });

    return tips;
  }

  // ============================================
  // EXTENSION 5: ANALYTICS SCHEMA
  // ============================================

  /**
   * Generate analytics schema for field-level tracking
   */
  static getFieldAnalyticsSchema(form: any): {
    trackingPlan: Array<{
      fieldId: string;
      fieldLabel: string;
      events: Array<{
        eventName: string;
        properties: Record<string, string>;
        description: string;
      }>;
    }>;
    globalEvents: Array<{
      eventName: string;
      properties: Record<string, string>;
      description: string;
    }>;
    suggestedMetrics: string[];
  } {
    const fields = form.fields || [];

    // Field-level tracking
    const trackingPlan = fields.map((field: any) => ({
      fieldId: field.id || field.label?.toLowerCase().replace(/\s+/g, "_"),
      fieldLabel: field.label,
      events: [
        {
          eventName: "form_field_focus",
          properties: {
            field_id: field.id,
            field_type: field.type,
            field_required: String(field.required),
            form_id: "{{form_id}}",
          },
          description: "Fired when user focuses on this field",
        },
        {
          eventName: "form_field_blur",
          properties: {
            field_id: field.id,
            field_type: field.type,
            field_filled: "{{has_value}}",
            time_spent_ms: "{{focus_duration}}",
            form_id: "{{form_id}}",
          },
          description: "Fired when user leaves this field",
        },
        {
          eventName: "form_field_error",
          properties: {
            field_id: field.id,
            error_type: "{{validation_error_type}}",
            error_message: "{{error_message}}",
            form_id: "{{form_id}}",
          },
          description: "Fired when field validation fails",
        },
      ],
    }));

    // Global form events
    const globalEvents = [
      {
        eventName: "form_view",
        properties: {
          form_id: "{{form_id}}",
          form_name: form.name || "Untitled",
          field_count: String(fields.length),
          source_page: "{{current_url}}",
          referrer: "{{referrer}}",
        },
        description: "Fired when form is visible in viewport",
      },
      {
        eventName: "form_start",
        properties: {
          form_id: "{{form_id}}",
          first_field_id: "{{first_field_id}}",
          time_to_start_ms: "{{time_since_view}}",
        },
        description: "Fired when user interacts with first field",
      },
      {
        eventName: "form_progress",
        properties: {
          form_id: "{{form_id}}",
          fields_completed: "{{completed_count}}",
          total_fields: String(fields.length),
          completion_percentage: "{{percentage}}",
        },
        description: "Fired periodically as user progresses",
      },
      {
        eventName: "form_abandon",
        properties: {
          form_id: "{{form_id}}",
          last_field_id: "{{last_focused_field}}",
          fields_completed: "{{completed_count}}",
          time_spent_ms: "{{total_time}}",
          abandon_reason: "{{reason}}", // navigation, close, idle
        },
        description: "Fired when user abandons form without submitting",
      },
      {
        eventName: "form_submit_attempt",
        properties: {
          form_id: "{{form_id}}",
          validation_passed: "{{is_valid}}",
          error_count: "{{error_count}}",
          time_to_submit_ms: "{{total_time}}",
        },
        description: "Fired when user clicks submit",
      },
      {
        eventName: "form_submit_success",
        properties: {
          form_id: "{{form_id}}",
          submission_id: "{{submission_id}}",
          total_time_ms: "{{total_time}}",
          retry_count: "{{submit_attempts}}",
        },
        description: "Fired on successful form submission",
      },
    ];

    // Suggested metrics to track
    const suggestedMetrics = [
      "Form Completion Rate = form_submit_success / form_view",
      "Form Start Rate = form_start / form_view",
      "Abandonment Rate = form_abandon / form_start",
      "Average Time to Complete = AVG(form_submit_success.total_time_ms)",
      "Field Drop-off Rate = (form_field_blur WHERE field_filled=false) / form_field_focus per field",
      "Error Rate per Field = form_field_error / form_field_blur per field",
      "Time per Field = AVG(form_field_blur.time_spent_ms) per field",
      "Most Problematic Field = field with highest (error_rate + drop_off_rate)",
      "Mobile vs Desktop Completion = form_submit_success by device_type",
      "Conversion by Source = form_submit_success by referrer",
    ];

    return {
      trackingPlan,
      globalEvents,
      suggestedMetrics,
    };
  }
}

export default FormIntelligenceService;
