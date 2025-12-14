import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class GetHotDealsTool extends BaseCRMTool {
  get name() {
    return "get_hot_deals";
  }

  get description() {
    return `Get a list of hot deals/opportunities that are high priority. These are deals marked as 'hot' temperature and/or have high probability of closing.`;
  }

  get schema() {
    return z.object({
      limit: z.number().default(10).describe("Maximum number of hot deals to return"),
      minValue: z.number().optional().describe("Minimum deal value to include"),
      pipelineId: z.string().optional().describe("Filter by specific pipeline"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = {
        workspaceId: this.workspaceId,
        status: "open",
        $or: [
          { dealTemperature: "hot" },
          { probability: { $gte: 70 } },
        ],
      };

      if (input.minValue) {
        filter.value = { $gte: input.minValue };
      }

      if (input.pipelineId) {
        filter.pipelineId = input.pipelineId;
      }

      const opportunities = await Opportunity.find(filter)
        .limit(input.limit || 10)
        .sort({ value: -1, probability: -1 })
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
        .populate("pipelineId", "name")
        .populate("stageId", "name")
        .select("title value expectedCloseDate status dealTemperature probability")
        .lean();

      return {
        success: true,
        count: opportunities.length,
        totalValue: opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0),
        opportunities: opportunities.map((opp) => ({
          id: opp._id,
          title: opp.title,
          value: opp.value,
          expectedCloseDate: opp.expectedCloseDate,
          dealTemperature: opp.dealTemperature,
          probability: opp.probability,
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
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
