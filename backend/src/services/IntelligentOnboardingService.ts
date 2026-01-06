/**
 * Intelligent Onboarding Service
 * Provides contextual questions based on previous answers
 * Stores business profile for use throughout the application
 */

import BusinessProfile, { IBusinessProfile } from "../models/BusinessProfile";

interface Question {
  id: string;
  question: string;
  type: "select" | "multiselect" | "text" | "number";
  options?: { value: string; label: string; description?: string }[];
  placeholder?: string;
  required?: boolean;
  dependsOn?: {
    questionId: string;
    values: string[];
  };
}

interface OnboardingAnswers {
  [key: string]: any;
}

export class IntelligentOnboardingService {
  /**
   * Get all questions with intelligent branching
   */
  static getAllQuestions(): Question[] {
    return [
      // Step 1: Core Business
      {
        id: "industry",
        question: "What industry is your business in?",
        type: "select",
        required: true,
        options: [
          { value: "saas", label: "SaaS / Software", description: "Cloud-based software products" },
          { value: "real_estate", label: "Real Estate", description: "Property sales & management" },
          { value: "recruiting", label: "Recruiting / Staffing", description: "Talent acquisition" },
          { value: "consulting", label: "Consulting / Agency", description: "Professional services" },
          { value: "ecommerce", label: "E-commerce", description: "Online retail" },
          { value: "financial", label: "Financial Services", description: "Banking, insurance, investments" },
          { value: "healthcare", label: "Healthcare", description: "Medical & wellness services" },
          { value: "manufacturing", label: "Manufacturing", description: "Physical product production" },
          { value: "education", label: "Education / EdTech", description: "Learning & training" },
          { value: "other", label: "Other", description: "Something else" },
        ],
      },
      {
        id: "industrySpecific",
        question: "Please specify your industry",
        type: "text",
        placeholder: "e.g., Legal Services, Construction, etc.",
        required: true,
        dependsOn: {
          questionId: "industry",
          values: ["other"],
        },
      },
      {
        id: "salesModel",
        question: "Who do you sell to?",
        type: "select",
        required: true,
        options: [
          { value: "b2b", label: "B2B - Other Businesses", description: "Enterprise, SMB, or business customers" },
          { value: "b2c", label: "B2C - Consumers", description: "Individual end users" },
          { value: "b2b2c", label: "B2B2C - Both", description: "Business partners who serve consumers" },
          { value: "marketplace", label: "Marketplace / Platform", description: "Two-sided marketplace" },
        ],
      },

      // Step 2: Team & Scale
      {
        id: "companySize",
        question: "How many employees in your company?",
        type: "select",
        required: true,
        options: [
          { value: "1-10", label: "1-10 employees", description: "Startup / Small business" },
          { value: "11-50", label: "11-50 employees", description: "Growing company" },
          { value: "51-200", label: "51-200 employees", description: "Mid-size company" },
          { value: "201-500", label: "201-500 employees", description: "Large company" },
          { value: "501-1000", label: "501-1,000 employees", description: "Enterprise" },
          { value: "1000+", label: "1,000+ employees", description: "Large enterprise" },
        ],
      },
      {
        id: "teamSize",
        question: "How many people on your sales/marketing team?",
        type: "select",
        required: true,
        options: [
          { value: "solo", label: "Just me", description: "Solo founder or operator" },
          { value: "small", label: "2-5 people", description: "Small team" },
          { value: "medium", label: "6-20 people", description: "Mid-size team" },
          { value: "large", label: "20+ people", description: "Large team" },
        ],
      },

      // Step 3: Sales Process
      {
        id: "salesCycle",
        question: "What's your average sales cycle?",
        type: "select",
        required: true,
        options: [
          { value: "short", label: "Less than 1 week", description: "Fast transactional sales" },
          { value: "medium", label: "1-4 weeks", description: "Standard B2B process" },
          { value: "long", label: "1-3 months", description: "Complex sales with demos" },
          { value: "very_long", label: "3+ months", description: "Enterprise deals" },
        ],
      },
      {
        id: "averageDealSize",
        question: "What's your average deal size?",
        type: "select",
        required: true,
        dependsOn: {
          questionId: "salesModel",
          values: ["b2b", "b2b2c"],
        },
        options: [
          { value: "<1k", label: "Under $1,000", description: "Small deals" },
          { value: "1k-10k", label: "$1,000 - $10,000", description: "SMB deals" },
          { value: "10k-50k", label: "$10,000 - $50,000", description: "Mid-market deals" },
          { value: "50k-100k", label: "$50,000 - $100,000", description: "Large deals" },
          { value: "100k+", label: "$100,000+", description: "Enterprise deals" },
        ],
      },
      {
        id: "monthlyLeadVolume",
        question: "How many new leads do you get per month?",
        type: "select",
        required: true,
        options: [
          { value: "<10", label: "Less than 10", description: "Just starting out" },
          { value: "10-50", label: "10-50 leads", description: "Growing pipeline" },
          { value: "50-100", label: "50-100 leads", description: "Solid flow" },
          { value: "100-500", label: "100-500 leads", description: "High volume" },
          { value: "500+", label: "500+ leads", description: "Very high volume" },
        ],
      },

      // Step 4: Goals & Strategy
      {
        id: "primaryGoal",
        question: "What's your #1 goal right now?",
        type: "select",
        required: true,
        options: [
          { value: "generate_leads", label: "Generate more leads", description: "Fill the top of funnel" },
          { value: "close_deals", label: "Close more deals", description: "Improve conversion rates" },
          { value: "nurture_relationships", label: "Nurture relationships", description: "Stay top-of-mind" },
          { value: "automate_processes", label: "Automate processes", description: "Save time on repetitive tasks" },
          { value: "improve_conversion", label: "Improve conversion", description: "Optimize the funnel" },
          { value: "scale_operations", label: "Scale operations", description: "Handle more volume" },
        ],
      },
      {
        id: "channels",
        question: "Which channels do you use? (Select all that apply)",
        type: "multiselect",
        required: true,
        options: [
          { value: "email", label: "Email", description: "Email campaigns & sequences" },
          { value: "phone", label: "Phone/SMS", description: "Cold calling or texting" },
          { value: "social", label: "Social Media", description: "LinkedIn, Twitter, etc." },
          { value: "ads", label: "Paid Ads", description: "Google, Facebook, LinkedIn ads" },
          { value: "content", label: "Content Marketing", description: "Blog, SEO, webinars" },
          { value: "events", label: "Events", description: "Trade shows, conferences" },
        ],
      },

      // Step 5: Target Audience (for B2B)
      {
        id: "targetJobTitles",
        question: "What job titles do you typically sell to?",
        type: "multiselect",
        required: false,
        dependsOn: {
          questionId: "salesModel",
          values: ["b2b", "b2b2c"],
        },
        options: [
          { value: "ceo", label: "CEO / Founder" },
          { value: "cto", label: "CTO / VP Engineering" },
          { value: "cmo", label: "CMO / VP Marketing" },
          { value: "cfo", label: "CFO / VP Finance" },
          { value: "sales_leader", label: "VP Sales / Sales Director" },
          { value: "hr_leader", label: "CHRO / HR Director" },
          { value: "operations", label: "COO / Operations Manager" },
          { value: "manager", label: "Department Manager" },
          { value: "individual", label: "Individual Contributor" },
        ],
      },
      {
        id: "targetCompanySize",
        question: "What company sizes do you target?",
        type: "multiselect",
        required: false,
        dependsOn: {
          questionId: "salesModel",
          values: ["b2b", "b2b2c"],
        },
        options: [
          { value: "1-10", label: "1-10 employees (Startups)" },
          { value: "11-50", label: "11-50 employees (Small Business)" },
          { value: "51-200", label: "51-200 employees (SMB)" },
          { value: "201-1000", label: "201-1,000 employees (Mid-Market)" },
          { value: "1000+", label: "1,000+ employees (Enterprise)" },
        ],
      },

      // Step 6: Pain Points
      {
        id: "painPoints",
        question: "What are your biggest challenges? (Select up to 3)",
        type: "multiselect",
        required: true,
        options: [
          { value: "not_enough_leads", label: "Not enough leads" },
          { value: "low_conversion", label: "Low conversion rates" },
          { value: "long_sales_cycle", label: "Sales cycle too long" },
          { value: "manual_tasks", label: "Too many manual tasks" },
          { value: "lead_quality", label: "Poor lead quality" },
          { value: "tracking_follow_ups", label: "Tracking follow-ups" },
          { value: "team_collaboration", label: "Team collaboration" },
          { value: "data_scattered", label: "Data scattered everywhere" },
          { value: "reporting", label: "Lack of visibility/reporting" },
        ],
      },
    ];
  }

  /**
   * Get next question based on previous answers
   */
  static getNextQuestion(answers: OnboardingAnswers, allQuestions?: Question[]): Question | null {
    const questions = allQuestions || this.getAllQuestions();

    for (const question of questions) {
      // Skip if already answered
      if (answers[question.id] !== undefined) {
        continue;
      }

      // Check dependencies
      if (question.dependsOn) {
        const dependencyValue = answers[question.dependsOn.questionId];
        if (!question.dependsOn.values.includes(dependencyValue)) {
          continue; // Skip this question
        }
      }

      return question;
    }

    return null; // All questions answered
  }

  /**
   * Filter questions based on current answers
   */
  static getRelevantQuestions(answers: OnboardingAnswers): Question[] {
    const allQuestions = this.getAllQuestions();
    return allQuestions.filter((question) => {
      if (!question.dependsOn) return true;

      const dependencyValue = answers[question.dependsOn.questionId];
      return question.dependsOn.values.includes(dependencyValue);
    });
  }

  /**
   * Save business profile from onboarding answers
   */
  static async saveBusinessProfile(
    workspaceId: string,
    answers: OnboardingAnswers
  ): Promise<IBusinessProfile> {
    const profileData: Partial<IBusinessProfile> = {
      workspace: workspaceId as any,
      industry: answers.industry,
      industrySpecific: answers.industrySpecific,
      companySize: answers.companySize,
      teamSize: answers.teamSize,
      salesCycle: answers.salesCycle,
      averageDealSize: answers.averageDealSize,
      monthlyLeadVolume: answers.monthlyLeadVolume,
      primaryGoal: answers.primaryGoal,
      salesModel: answers.salesModel,

      // Channels
      channels: {
        email: answers.channels?.includes("email"),
        phone: answers.channels?.includes("phone"),
        social: answers.channels?.includes("social"),
        ads: answers.channels?.includes("ads"),
        content: answers.channels?.includes("content"),
        events: answers.channels?.includes("events"),
      },

      // Target Audience
      targetAudience: {
        jobTitles: answers.targetJobTitles || [],
        companySize: answers.targetCompanySize || [],
      },

      // Pain Points
      painPoints: answers.painPoints || [],

      completedAt: new Date(),
    };

    // Upsert profile
    const profile = await BusinessProfile.findOneAndUpdate(
      { workspace: workspaceId },
      profileData,
      { upsert: true, new: true }
    );

    return profile;
  }

  /**
   * Get business profile for a workspace
   */
  static async getBusinessProfile(workspaceId: string): Promise<IBusinessProfile | null> {
    return BusinessProfile.findOne({ workspace: workspaceId });
  }

  /**
   * Generate personalized recommendations based on profile
   */
  static generateRecommendations(profile: IBusinessProfile): string[] {
    const recommendations: string[] = [];

    // Lead generation recommendations
    if (profile.primaryGoal === "generate_leads") {
      if (profile.channels?.content) {
        recommendations.push("Set up lead magnets with gated content");
      }
      if (profile.channels?.social) {
        recommendations.push("Create LinkedIn automation workflows");
      }
    }

    // Deal closing recommendations
    if (profile.primaryGoal === "close_deals") {
      if (profile.salesCycle === "long" || profile.salesCycle === "very_long") {
        recommendations.push("Enable ABM features for deal tracking");
      }
      recommendations.push("Set up automated follow-up sequences");
    }

    // Pain point specific
    if (profile.painPoints?.includes("manual_tasks")) {
      recommendations.push("Create workflows to automate repetitive tasks");
    }

    if (profile.painPoints?.includes("tracking_follow_ups")) {
      recommendations.push("Enable SLA tracking and reminders");
    }

    return recommendations;
  }
}
