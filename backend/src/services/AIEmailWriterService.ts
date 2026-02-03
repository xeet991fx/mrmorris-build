/**
 * AI Email Writer Service
 * Uses business profile to generate contextual, personalized emails
 */

import { IntelligentOnboardingService } from "./IntelligentOnboardingService";
import { IBusinessProfile } from "../models/BusinessProfile";
import { getProModel } from "../chatbot/modelFactory";

interface EmailRequest {
  purpose:
  | "cold_outreach"
  | "follow_up"
  | "demo_invite"
  | "proposal"
  | "nurture"
  | "customer_onboarding"
  | "event_invite"
  | "content_share"
  | "custom";
  customPurpose?: string;
  recipientInfo?: {
    name?: string;
    company?: string;
    jobTitle?: string;
    previousInteraction?: string;
  };
  additionalContext?: string;
  tone?: "professional" | "friendly" | "casual" | "formal";
  length?: "short" | "medium" | "long";
}

interface GeneratedEmail {
  subject: string;
  body: string;
  preheader?: string;
  cta: string;
  alternatives: {
    subject: string[];
    cta: string[];
  };
  reasoning: string;
  tips: string[];
}

export class AIEmailWriterService {
  /**
   * Generate email using business profile context
   */
  static async generateEmailWithContext(
    workspaceId: string,
    request: EmailRequest,
    useProfileContext: boolean = true
  ): Promise<GeneratedEmail> {
    let profileContext = "";
    let profile: IBusinessProfile | null = null;

    if (useProfileContext) {
      profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
      if (profile) {
        profileContext = this.buildProfileContext(profile, request);
      }
    }

    const model = getProModel();

    const prompt = this.buildEmailPrompt(request, profileContext, profile);

    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : String(result.content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response - no JSON found");
    }

    const generatedEmail = JSON.parse(jsonMatch[0]);

    return {
      subject: generatedEmail.subject || "Subject Line",
      body: generatedEmail.body || "",
      preheader: generatedEmail.preheader,
      cta: generatedEmail.cta || "Learn More",
      alternatives: {
        subject: generatedEmail.alternatives?.subject || [],
        cta: generatedEmail.alternatives?.cta || [],
      },
      reasoning: generatedEmail.reasoning || "",
      tips: generatedEmail.tips || [],
    };
  }

  /**
   * Build email prompt
   */
  private static buildEmailPrompt(
    request: EmailRequest,
    profileContext: string,
    profile: IBusinessProfile | null
  ): string {
    const purpose = request.customPurpose || this.getPurposeLabel(request.purpose);
    const tone = this.getToneGuidance(request.tone || this.getDefaultTone(profile), profile);
    const length = this.getLengthGuidance(request.length || "medium");

    return `You are an expert email copywriter. Write a ${request.purpose} email.

${profileContext}

**EMAIL PURPOSE**: ${purpose}

${request.recipientInfo ? this.formatRecipientInfo(request.recipientInfo) : ""}

${request.additionalContext ? `**ADDITIONAL CONTEXT**: ${request.additionalContext}` : ""}

**TONE**: ${tone}
**LENGTH**: ${length}

Generate a JSON response with this EXACT structure:
{
  "subject": "compelling subject line (50-60 chars)",
  "preheader": "preview text (40-100 chars)",
  "body": "email body with personalization tokens like {{firstName}}, {{company}}",
  "cta": "clear call to action",
  "alternatives": {
    "subject": ["alternative 1", "alternative 2", "alternative 3"],
    "cta": ["alternative 1", "alternative 2"]
  },
  "reasoning": "Why this approach works for this audience",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

**IMPORTANT RULES**:
1. Use personalization tokens: {{firstName}}, {{lastName}}, {{company}}, {{jobTitle}}
2. Keep subject line under 60 characters
3. Make it scannable with short paragraphs
4. Include ONE clear CTA
5. Match the industry, tone, and sales cycle
6. Address pain points if provided
7. Use the profile context to make it relevant
8. Return ONLY valid JSON, no markdown`;
  }

  /**
   * Build profile context for email
   */
  private static buildProfileContext(
    profile: IBusinessProfile,
    request: EmailRequest
  ): string {
    const painPointsText =
      profile.painPoints && profile.painPoints.length > 0
        ? `\n- Pain Points to Address: ${this.formatPainPoints(profile.painPoints)}`
        : "";

    return `
**YOUR BUSINESS CONTEXT**:
- Industry: ${profile.industry}${profile.industrySpecific ? ` (${profile.industrySpecific})` : ""}
- Sales Model: ${profile.salesModel?.toUpperCase()}
- Sales Cycle: ${profile.salesCycle} (${this.getSalesCycleDescription(profile.salesCycle)})
- Average Deal Size: ${profile.averageDealSize || "Not specified"}
- Primary Goal: ${this.getGoalDescription(profile.primaryGoal)}
- Target Audience: ${this.formatTargetAudience(profile)}${painPointsText}

**YOUR VALUE PROPOSITION FOCUS**:
${this.getValuePropFocus(profile)}

**WRITE EMAIL THAT**:
- Resonates with ${profile.industry} businesses
- Speaks to ${profile.salesModel === "b2b" ? "business decision-makers" : "consumers"}
- Fits a ${profile.salesCycle} sales cycle (${request.purpose === "cold_outreach" ? "first touch" : "nurturing"})
- Addresses their goal of ${profile.primaryGoal}`;
  }

  /**
   * Format recipient info
   */
  private static formatRecipientInfo(info: any): string {
    const parts = [];
    if (info.name) parts.push(`- Name: ${info.name}`);
    if (info.company) parts.push(`- Company: ${info.company}`);
    if (info.jobTitle) parts.push(`- Job Title: ${info.jobTitle}`);
    if (info.previousInteraction) parts.push(`- Previous Interaction: ${info.previousInteraction}`);

    return parts.length > 0 ? `**RECIPIENT INFO**:\n${parts.join("\n")}` : "";
  }

  /**
   * Get purpose label
   */
  private static getPurposeLabel(purpose: string): string {
    const labels: any = {
      cold_outreach: "Initial cold outreach to a new prospect",
      follow_up: "Follow-up after previous interaction",
      demo_invite: "Invitation to schedule a product demo",
      proposal: "Sending a proposal or quote",
      nurture: "Nurturing a lead over time",
      customer_onboarding: "Onboarding a new customer",
      event_invite: "Inviting to a webinar or event",
      content_share: "Sharing valuable content",
    };
    return labels[purpose] || purpose;
  }

  /**
   * Get default tone based on profile
   */
  private static getDefaultTone(profile: IBusinessProfile | null): string {
    if (!profile) return "professional";

    if (profile.industry === "financial" || profile.industry === "healthcare") {
      return "professional";
    }
    if (profile.industry === "saas") {
      return "friendly";
    }
    return "professional";
  }

  /**
   * Get tone guidance
   */
  private static getToneGuidance(tone: string, profile: IBusinessProfile | null): string {
    const guidance: any = {
      professional:
        "Professional and respectful, suitable for corporate environments. Avoid slang.",
      friendly:
        "Warm and approachable, but still professional. Use contractions and conversational language.",
      casual: "Relaxed and informal, like talking to a colleague. Use casual language.",
      formal: "Very professional and polished, suitable for executive communication. Formal language.",
    };

    let base = guidance[tone] || guidance.professional;

    if (profile?.industry === "financial" || profile?.industry === "healthcare") {
      base += " Extra care for compliance and professionalism.";
    }

    return base;
  }

  /**
   * Get length guidance
   */
  private static getLengthGuidance(length: string): string {
    const guidance: any = {
      short: "Very concise, 50-100 words. Get to the point quickly.",
      medium: "Balanced length, 100-200 words. Provide context but stay focused.",
      long: "Comprehensive, 200-300 words. Tell a story, build value.",
    };
    return guidance[length] || guidance.medium;
  }

  /**
   * Format pain points
   */
  private static formatPainPoints(painPoints: string[]): string {
    const map: any = {
      not_enough_leads: "Not enough leads",
      low_conversion: "Low conversion rates",
      long_sales_cycle: "Sales cycle too long",
      manual_tasks: "Too many manual tasks",
      lead_quality: "Poor lead quality",
      tracking_follow_ups: "Tracking follow-ups",
      team_collaboration: "Team collaboration",
      data_scattered: "Data scattered everywhere",
      reporting: "Lack of visibility/reporting",
    };

    return painPoints.map((p) => map[p] || p).join(", ");
  }

  /**
   * Format target audience
   */
  private static formatTargetAudience(profile: IBusinessProfile): string {
    if (profile.salesModel === "b2c") {
      return "Individual consumers";
    }

    const parts = [];
    if (profile.targetAudience?.jobTitles && profile.targetAudience.jobTitles.length > 0) {
      parts.push(profile.targetAudience.jobTitles.join(", "));
    }
    if (profile.targetAudience?.companySize && profile.targetAudience.companySize.length > 0) {
      parts.push(`at companies with ${profile.targetAudience.companySize.join(", ")} employees`);
    }

    return parts.length > 0 ? parts.join(" ") : "Business decision-makers";
  }

  /**
   * Get value prop focus
   */
  private static getValuePropFocus(profile: IBusinessProfile): string {
    if (profile.painPoints?.includes("manual_tasks")) {
      return "Focus on automation, time-saving, and efficiency gains";
    }
    if (profile.painPoints?.includes("low_conversion")) {
      return "Focus on conversion optimization and revenue growth";
    }
    if (profile.painPoints?.includes("not_enough_leads")) {
      return "Focus on lead generation and pipeline growth";
    }
    if (profile.primaryGoal === "scale_operations") {
      return "Focus on scalability, reliability, and handling growth";
    }
    if (profile.primaryGoal === "automate_processes") {
      return "Focus on automation and reducing manual work";
    }
    return "Focus on solving their business challenges and driving results";
  }

  /**
   * Get goal description
   */
  private static getGoalDescription(goal: string): string {
    const map: any = {
      generate_leads: "Generating more leads",
      close_deals: "Closing more deals",
      nurture_relationships: "Nurturing relationships",
      automate_processes: "Automating processes",
      improve_conversion: "Improving conversion rates",
      scale_operations: "Scaling operations",
    };
    return map[goal] || goal;
  }

  /**
   * Get sales cycle description
   */
  private static getSalesCycleDescription(cycle: string): string {
    const map: any = {
      short: "fast, transactional",
      medium: "standard B2B process",
      long: "complex, involves demos",
      very_long: "enterprise, multiple stakeholders",
    };
    return map[cycle] || cycle;
  }
}
