import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class GetClosingSoonTool extends BaseCRMTool {
  get name() {
    return "get_closing_soon";
  }

  get description() {
    return `Get opportunities that are expected to close soon (within a specified number of days). Use this to prioritize deals that need immediate attention.`;
  }

  get schema() {
    return z.object({
      days: z.number().default(30).describe("Number of days to look ahead (default: 30)"),
      limit: z.number().default(10).describe("Maximum number of deals to return"),
      minValue: z.number().optional().describe("Minimum deal value to include"),
      pipelineId: z.string().optional().describe("Filter by specific pipeline"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const daysAhead = input.days || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      const filter: any = {
        workspaceId: this.workspaceId,
        status: "open",
        expectedCloseDate: {
          $lte: cutoffDate,
          $gte: new Date(),
        },
      };

      if (input.minValue) {
        filter.value = { $gte: input.minValue };
      }

      if (input.pipelineId) {
        filter.pipelineId = input.pipelineId;
      }

      const opportunities = await Opportunity.find(filter)
        .limit(input.limit || 10)
        .sort({ expectedCloseDate: 1, value: -1 })
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
        .populate("pipelineId", "name")
        .populate("stageId", "name")
        .select("title value expectedCloseDate status dealTemperature probability")
        .lean();

      // Calculate days until close for each opportunity
      const opportunitiesWithDays = opportunities.map((opp) => {
        const daysUntilClose = opp.expectedCloseDate
          ? Math.ceil(
              (new Date(opp.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        return {
          id: opp._id,
          title: opp.title,
          value: opp.value,
          expectedCloseDate: opp.expectedCloseDate,
          daysUntilClose,
          dealTemperature: opp.dealTemperature,
          probability: opp.probability,
          urgency: daysUntilClose <= 7 ? "urgent" : daysUntilClose <= 14 ? "high" : "medium",
          contact: opp.contactId
            ? {
                id: (opp.contactId as any)._id,
                name: `${(opp.contactId as any).firstName || ""} ${(opp.contactId as any).lastName || ""}`.trim(),
                email: (opp.contactId as any).email,
              }
            : undefined,
          company: opp.companyId
            ? {
                id: (opp.companyId as any)._id,
                name: (opp.companyId as any).name,
              }
            : undefined,
          pipeline: opp.pipelineId
            ? {
                id: (opp.pipelineId as any)._id,
                name: (opp.pipelineId as any).name,
              }
            : undefined,
          stage: opp.stageId
            ? {
                id: (opp.stageId as any)._id,
                name: (opp.stageId as any).name,
              }
            : undefined,
        };
      });

      return {
        success: true,
        count: opportunitiesWithDays.length,
        totalValue: opportunitiesWithDays.reduce((sum, opp) => sum + (opp.value || 0), 0),
        timeframe: `Next ${daysAhead} days`,
        opportunities: opportunitiesWithDays,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
