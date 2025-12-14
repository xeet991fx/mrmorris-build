import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class CalculateDealScoreTool extends BaseCRMTool {
  get name() {
    return "calculate_deal_score";
  }

  get description() {
    return `Calculate a priority score for an opportunity based on value, probability, temperature, and timing. Higher scores indicate deals that should be prioritized.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to score"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const opportunity = await Opportunity.findOne({
        _id: input.opportunityId,
        workspaceId: this.workspaceId,
      })
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
        .lean();

      if (!opportunity) {
        return {
          success: false,
          error: `Opportunity not found`,
        };
      }

      // Calculate score based on multiple factors
      let score = 0;
      const scoreBreakdown: any = {
        value: 0,
        probability: 0,
        temperature: 0,
        timing: 0,
      };

      // Value Score (0-30 points)
      // Normalize based on deal value
      const value = opportunity.value || 0;
      let valueScore = 0;
      if (value >= 100000) valueScore = 30;
      else if (value >= 50000) valueScore = 25;
      else if (value >= 25000) valueScore = 20;
      else if (value >= 10000) valueScore = 15;
      else if (value >= 5000) valueScore = 10;
      else if (value > 0) valueScore = 5;
      scoreBreakdown.value = valueScore;
      score += valueScore;

      // Probability Score (0-30 points)
      const probabilityScore = Math.round((opportunity.probability || 0) * 0.3);
      scoreBreakdown.probability = probabilityScore;
      score += probabilityScore;

      // Temperature Score (0-25 points)
      const temperatureScores: Record<string, number> = {
        hot: 25,
        warm: 15,
        cold: 5,
      };
      const temperatureScore = temperatureScores[opportunity.dealTemperature || "cold"] || 0;
      scoreBreakdown.temperature = temperatureScore;
      score += temperatureScore;

      // Timing Score (0-15 points) - based on close date
      let timingScore = 0;
      if (opportunity.expectedCloseDate) {
        const daysUntilClose = Math.ceil(
          (new Date(opportunity.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilClose < 0) {
          timingScore = 0; // Overdue
        } else if (daysUntilClose <= 7) {
          timingScore = 15; // Within a week
        } else if (daysUntilClose <= 14) {
          timingScore = 12; // Within 2 weeks
        } else if (daysUntilClose <= 30) {
          timingScore = 9; // Within a month
        } else if (daysUntilClose <= 60) {
          timingScore = 6; // Within 2 months
        } else {
          timingScore = 3; // More than 2 months
        }
      }
      scoreBreakdown.timing = timingScore;
      score += timingScore;

      // Normalize to 0-100
      const finalScore = Math.min(Math.round(score), 100);

      // Determine priority level
      let priority = "Low";
      if (finalScore >= 80) priority = "Critical";
      else if (finalScore >= 60) priority = "High";
      else if (finalScore >= 40) priority = "Medium";

      // Calculate expected value
      const expectedValue = Math.round((value * (opportunity.probability || 0)) / 100);

      return {
        success: true,
        opportunity: {
          id: opportunity._id,
          title: opportunity.title,
          value: opportunity.value,
          probability: opportunity.probability,
          dealTemperature: opportunity.dealTemperature,
          expectedCloseDate: opportunity.expectedCloseDate,
          contact: opportunity.contactId
            ? {
                id: (opportunity.contactId as any)._id,
                name: `${(opportunity.contactId as any).firstName || ""} ${(opportunity.contactId as any).lastName || ""}`.trim(),
                email: (opportunity.contactId as any).email,
              }
            : undefined,
          company: opportunity.companyId
            ? {
                id: (opportunity.companyId as any)._id,
                name: (opportunity.companyId as any).name,
              }
            : undefined,
        },
        score: {
          total: finalScore,
          priority,
          breakdown: scoreBreakdown,
          expectedValue,
          interpretation: this.getScoreInterpretation(finalScore),
        },
        message: `Deal scored ${finalScore}/100 (${priority} Priority)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getScoreInterpretation(score: number): string {
    if (score >= 80) return "Critical priority - Focus heavily on closing this deal";
    if (score >= 60) return "High priority - Allocate significant resources to this opportunity";
    if (score >= 40) return "Medium priority - Continue steady progress on this deal";
    return "Low priority - Maintain basic follow-up";
  }
}
