import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Project from "../../../../models/Project";
import Contact from "../../../../models/Contact";
import Company from "../../../../models/Company";

export class AnalyzeBusinessTool extends BaseCRMTool {
  get name() {
    return "analyze_business";
  }

  get description() {
    return `Analyze the user's business based on their project data and existing CRM records. Identifies industry, target market, sales process type, and recommends CRM configuration. Optionally includes web research for industry insights.`;
  }

  get schema() {
    return z.object({
      includeWebResearch: z
        .boolean()
        .default(false)
        .describe("Whether to search web for industry info (requires web_search tool)"),
      focusAreas: z
        .array(
          z.enum(["sales-process", "industry", "competitors", "integrations"])
        )
        .optional()
        .describe("Specific areas to focus the analysis on"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Get project/workspace info
      const project = await Project.findOne({
        _id: this.workspaceId,
        userId: this.userId,
      }).lean();

      if (!project) {
        return {
          success: false,
          error: "Workspace not found",
        };
      }

      // Get CRM data statistics
      const [contactCount, companyCount] = await Promise.all([
        Contact.countDocuments({ workspaceId: this.workspaceId }),
        Company.countDocuments({ workspaceId: this.workspaceId }),
      ]);

      // Get sample contacts to analyze industries
      const sampleContacts = await Contact.find({
        workspaceId: this.workspaceId,
      })
        .select("company tags status")
        .limit(50)
        .lean();

      const sampleCompanies = await Company.find({
        workspaceId: this.workspaceId,
      })
        .select("industry name")
        .limit(50)
        .lean();

      // Detect industry from project and company data
      const detectedIndustry = this.detectIndustry(
        project.name || "",
        "",
        sampleCompanies
      );

      // Analyze sales process based on data
      const suggestedSalesProcess = this.detectSalesProcess(
        contactCount,
        companyCount
      );

      // Generate recommendations
      const analysis = {
        projectName: project.name,
        createdAt: project.createdAt,
        crmStats: {
          contacts: contactCount,
          companies: companyCount,
        },
        detectedIndustry,
        suggestedSalesProcess,
        recommendations: this.generateRecommendations(
          detectedIndustry,
          suggestedSalesProcess
        ),
      };

      return {
        success: true,
        analysis,
        message: `Analyzed ${project.name}: Detected ${detectedIndustry} industry with ${suggestedSalesProcess} sales cycle.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private detectIndustry(
    projectName: string,
    description: string,
    companies: any[]
  ): string {
    const text = projectName.toLowerCase();

    // Check company industries first
    if (companies.length > 0) {
      const industries = companies
        .map((c) => c.industry)
        .filter((i) => i)
        .map((i) => i.toLowerCase());

      if (industries.length > 0) {
        // Find most common industry
        const industryCount: Record<string, number> = {};
        industries.forEach((ind) => {
          industryCount[ind] = (industryCount[ind] || 0) + 1;
        });

        const mostCommon = Object.entries(industryCount).sort(
          ([, a], [, b]) => b - a
        )[0];
        if (mostCommon) {
          return mostCommon[0];
        }
      }
    }

    // Fallback to keyword detection
    if (text.includes("saas") || text.includes("software"))
      return "SaaS";
    if (text.includes("ecommerce") || text.includes("retail") || text.includes("shop"))
      return "E-commerce";
    if (text.includes("consulting") || text.includes("services"))
      return "Professional Services";
    if (text.includes("real estate") || text.includes("property"))
      return "Real Estate";
    if (text.includes("healthcare") || text.includes("medical"))
      return "Healthcare";
    if (text.includes("finance") || text.includes("fintech"))
      return "Financial Services";

    return "General B2B";
  }

  private detectSalesProcess(contactCount: number, companyCount: number): string {
    // Simple heuristic based on CRM size
    if (contactCount > 500 || companyCount > 100) {
      return "enterprise"; // Long sales cycle
    } else if (contactCount > 100 || companyCount > 20) {
      return "consultative"; // Medium sales cycle
    } else {
      return "transactional"; // Short sales cycle
    }
  }

  private generateRecommendations(
    industry: string,
    salesProcess: string
  ): any {
    const recommendations: any = {
      workflows: [],
      sequences: [],
      integrations: [],
      pipelines: [],
    };

    // Workflow recommendations
    recommendations.workflows.push("Lead Nurture Sequence");
    if (salesProcess === "enterprise" || salesProcess === "consultative") {
      recommendations.workflows.push("Follow-up Automation");
      recommendations.workflows.push("Meeting Scheduler");
    }
    recommendations.workflows.push("Customer Onboarding");

    // Integration recommendations
    switch (industry.toLowerCase()) {
      case "saas":
      case "software":
        recommendations.integrations = [
          "Gmail/Outlook",
          "Google Calendar",
          "Stripe",
          "Slack",
        ];
        break;
      case "e-commerce":
      case "retail":
        recommendations.integrations = [
          "Shopify",
          "Stripe/PayPal",
          "Mailchimp",
          "Google Ads",
        ];
        break;
      case "professional services":
      case "consulting":
        recommendations.integrations = [
          "Gmail/Outlook",
          "Calendly",
          "Zoom",
          "QuickBooks",
        ];
        break;
      default:
        recommendations.integrations = [
          "Gmail/Outlook",
          "Google Calendar",
          "Zoom",
        ];
    }

    // Pipeline recommendations
    if (salesProcess === "enterprise") {
      recommendations.pipelines = [
        "8-stage Enterprise Pipeline (New Lead → Closed Won)",
      ];
    } else if (salesProcess === "consultative") {
      recommendations.pipelines = [
        "6-stage Consultative Pipeline (Lead → Customer)",
      ];
    } else {
      recommendations.pipelines = [
        "4-stage Transactional Pipeline (Lead → Sale)",
      ];
    }

    return recommendations;
  }
}
