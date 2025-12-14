import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class SearchOpportunitiesTool extends BaseCRMTool {
  get name() {
    return "search_opportunities";
  }

  get description() {
    return `Search and filter opportunities/deals in the CRM. Use this to find deals based on criteria like status, stage, value range, temperature, or search text. Returns a list of matching opportunities with their details.`;
  }

  get schema() {
    return z.object({
      search: z
        .string()
        .optional()
        .describe("Search term for opportunity title or description"),
      status: z
        .enum(["open", "won", "lost", "abandoned"])
        .optional()
        .describe("Filter by opportunity status"),
      dealTemperature: z
        .enum(["hot", "warm", "cold"])
        .optional()
        .describe("Filter by deal temperature"),
      minValue: z
        .number()
        .optional()
        .describe("Minimum deal value"),
      maxValue: z
        .number()
        .optional()
        .describe("Maximum deal value"),
      pipelineId: z
        .string()
        .optional()
        .describe("Filter by pipeline ID"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum results to return (default: 10)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = { workspaceId: this.workspaceId };

      if (input.status) {
        filter.status = input.status;
      }

      if (input.dealTemperature) {
        filter.dealTemperature = input.dealTemperature;
      }

      if (input.pipelineId) {
        filter.pipelineId = input.pipelineId;
      }

      if (input.minValue !== undefined || input.maxValue !== undefined) {
        filter.value = {};
        if (input.minValue !== undefined) {
          filter.value.$gte = input.minValue;
        }
        if (input.maxValue !== undefined) {
          filter.value.$lte = input.maxValue;
        }
      }

      if (input.search) {
        filter.$or = [
          { title: { $regex: input.search, $options: "i" } },
          { description: { $regex: input.search, $options: "i" } },
        ];
      }

      const opportunities = await Opportunity.find(filter)
        .limit(input.limit || 10)
        .sort({ createdAt: -1 })
        .select(
          "title value currency status dealTemperature expectedCloseDate contactId companyId pipelineId stageId probability"
        )
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
        .lean();

      return {
        success: true,
        count: opportunities.length,
        opportunities: opportunities.map((opp) => ({
          id: opp._id,
          title: opp.title,
          value: opp.value,
          currency: opp.currency,
          status: opp.status,
          dealTemperature: opp.dealTemperature,
          probability: opp.probability,
          expectedCloseDate: opp.expectedCloseDate,
          contact: opp.contactId
            ? {
                id: (opp.contactId as any)._id,
                name: `${(opp.contactId as any).firstName || ""} ${(opp.contactId as any).lastName || ""}`.trim(),
                email: (opp.contactId as any).email,
              }
            : null,
          company: opp.companyId
            ? {
                id: (opp.companyId as any)._id,
                name: (opp.companyId as any).name,
              }
            : null,
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
