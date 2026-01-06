/**
 * Profile Utilization Service
 * Demonstrates how to use business profile data throughout the application
 * for personalization, targeting, and intelligent defaults
 */

import { IBusinessProfile } from "../models/BusinessProfile";
import { IntelligentOnboardingService } from "./IntelligentOnboardingService";

export class ProfileUtilizationService {
  /**
   * FORMS: Generate intelligent form fields based on business profile
   * Use this when creating contact forms, lead capture forms, etc.
   */
  static async generateFormFields(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return this.getDefaultFormFields();

    const fields = [
      { name: "name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
    ];

    // B2B specific fields
    if (profile.salesModel === "b2b" || profile.salesModel === "b2b2c") {
      fields.push(
        { name: "company", label: "Company Name", type: "text", required: true },
        {
          name: "jobTitle",
          label: "Job Title",
          type: "select",
          required: true,
          options: profile.targetAudience?.jobTitles || [
            "ceo",
            "cto",
            "cmo",
            "manager",
            "individual",
          ],
        },
        {
          name: "companySize",
          label: "Company Size",
          type: "select",
          required: false,
          options: profile.targetAudience?.companySize || ["1-10", "11-50", "51-200", "201+"],
        }
      );
    }

    // Add phone if they use phone channel
    if (profile.channels?.phone) {
      fields.push({ name: "phone", label: "Phone Number", type: "tel", required: false });
    }

    // Industry-specific question
    if (profile.industry === "saas") {
      fields.push({
        name: "currentTool",
        label: "What tool are you currently using?",
        type: "text",
        required: false,
      });
    }

    return fields;
  }

  /**
   * LEAD TARGETING: Generate ideal customer profile for targeting
   */
  static async getTargetingCriteria(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return null;

    return {
      // Apollo/LinkedIn targeting
      jobTitles: profile.targetAudience?.jobTitles || [],
      companySizes: profile.targetAudience?.companySize || [],
      industries: profile.targetAudience?.industries || [profile.industry],

      // Lead scoring weights
      scoringCriteria: {
        jobTitle: profile.salesModel === "b2b" ? 25 : 10,
        companySize: profile.salesModel === "b2b" ? 20 : 5,
        industry: 15,
        engagement: 40,
      },

      // Qualification criteria
      qualification: {
        mustHaveCompany: profile.salesModel === "b2b",
        mustHaveJobTitle: profile.salesModel === "b2b" && profile.averageDealSize !== "<1k",
        minEngagement: profile.monthlyLeadVolume === "500+" ? 2 : 1,
      },
    };
  }

  /**
   * EMAIL CAMPAIGNS: Personalize email content based on profile
   */
  static async getEmailPersonalization(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return null;

    const personalization = {
      // Sender signature
      signOff:
        profile.teamSize === "solo"
          ? "Best regards,\n[Your Name]\nFounder"
          : "Best regards,\n[Your Name]\nSales Team",

      // Tone
      tone:
        profile.industry === "financial" || profile.industry === "healthcare"
          ? "professional"
          : profile.industry === "saas"
          ? "friendly"
          : "balanced",

      // Pain points to reference
      painPoints: profile.painPoints || [],

      // Value proposition focus
      valueProposition: this.getValuePropFocus(profile),
    };

    return personalization;
  }

  /**
   * WORKFLOWS: Suggest workflow automations based on profile
   */
  static async suggestWorkflows(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return [];

    const workflows = [];

    // Based on primary goal
    if (profile.primaryGoal === "generate_leads") {
      workflows.push({
        name: "New Lead Nurture",
        trigger: "contact_created",
        actions: [
          { type: "add_tag", value: "new_lead" },
          { type: "send_email", template: "welcome_sequence" },
          { type: "create_task", description: "Follow up within 24h" },
        ],
      });
    }

    if (profile.primaryGoal === "close_deals") {
      workflows.push({
        name: "Deal Stage Changed",
        trigger: "deal_stage_changed",
        actions: [
          { type: "send_notification", message: "Deal moved to {{stage}}" },
          { type: "create_task", description: "Prepare for next stage" },
        ],
      });
    }

    // Based on pain points
    if (profile.painPoints?.includes("tracking_follow_ups")) {
      workflows.push({
        name: "Auto Follow-up Reminder",
        trigger: "contact_created",
        actions: [{ type: "create_task", description: "Follow up in 3 days", dueInDays: 3 }],
      });
    }

    // Based on channels
    if (profile.channels?.email) {
      workflows.push({
        name: "Email Sequence",
        trigger: "form_submitted",
        actions: [
          { type: "add_tag", value: "interested" },
          { type: "send_email", template: "nurture_day_1" },
        ],
      });
    }

    return workflows;
  }

  /**
   * PIPELINE STAGES: Generate appropriate pipeline stages
   */
  static async generatePipelineStages(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return this.getDefaultStages();

    const stages = [];

    // All pipelines start with these
    stages.push(
      { name: "New Lead", probability: 10 },
      { name: "Contacted", probability: 20 }
    );

    // Industry-specific stages
    if (profile.industry === "saas") {
      stages.push(
        { name: "Demo Scheduled", probability: 40 },
        { name: "Trial Started", probability: 60 },
        { name: "Proposal Sent", probability: 75 },
        { name: "Negotiation", probability: 85 }
      );
    } else if (profile.industry === "real_estate") {
      stages.push(
        { name: "Property Shown", probability: 35 },
        { name: "Offer Made", probability: 60 },
        { name: "Under Contract", probability: 85 }
      );
    } else if (profile.industry === "consulting") {
      stages.push(
        { name: "Discovery Call", probability: 30 },
        { name: "Proposal Sent", probability: 60 },
        { name: "Negotiation", probability: 80 }
      );
    } else {
      // Generic B2B stages
      stages.push(
        { name: "Qualified", probability: 30 },
        { name: "Meeting Set", probability: 50 },
        { name: "Proposal", probability: 70 },
        { name: "Negotiation", probability: 85 }
      );
    }

    // All pipelines end with these
    stages.push({ name: "Closed Won", probability: 100 });

    return stages;
  }

  /**
   * SLA CONFIGURATION: Set appropriate SLAs based on sales cycle
   */
  static async getSLAConfig(workspaceId: string) {
    const profile = await IntelligentOnboardingService.getBusinessProfile(workspaceId);
    if (!profile) return null;

    const slaConfig: any = {};

    // Response times based on sales cycle
    switch (profile.salesCycle) {
      case "short":
        slaConfig.firstResponse = 2; // 2 hours
        slaConfig.followUp = 24; // 1 day
        break;
      case "medium":
        slaConfig.firstResponse = 8; // 8 hours
        slaConfig.followUp = 72; // 3 days
        break;
      case "long":
        slaConfig.firstResponse = 24; // 1 day
        slaConfig.followUp = 168; // 1 week
        break;
      case "very_long":
        slaConfig.firstResponse = 48; // 2 days
        slaConfig.followUp = 336; // 2 weeks
        break;
    }

    return slaConfig;
  }

  /**
   * Helper: Get value proposition focus
   */
  private static getValuePropFocus(profile: IBusinessProfile): string {
    if (profile.painPoints?.includes("manual_tasks")) {
      return "automation and time-saving";
    }
    if (profile.painPoints?.includes("low_conversion")) {
      return "conversion optimization and revenue growth";
    }
    if (profile.painPoints?.includes("not_enough_leads")) {
      return "lead generation and pipeline growth";
    }
    if (profile.primaryGoal === "scale_operations") {
      return "scalability and efficiency";
    }
    return "growth and success";
  }

  /**
   * Helper: Default form fields
   */
  private static getDefaultFormFields() {
    return [
      { name: "name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "company", label: "Company Name", type: "text", required: false },
      { name: "phone", label: "Phone Number", type: "tel", required: false },
    ];
  }

  /**
   * Helper: Default pipeline stages
   */
  private static getDefaultStages() {
    return [
      { name: "New Lead", probability: 10 },
      { name: "Contacted", probability: 25 },
      { name: "Qualified", probability: 40 },
      { name: "Proposal", probability: 65 },
      { name: "Negotiation", probability: 85 },
      { name: "Closed Won", probability: 100 },
    ];
  }
}
