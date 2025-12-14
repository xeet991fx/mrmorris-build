import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Pipeline from "../../../../models/Pipeline";
import Opportunity from "../../../../models/Opportunity";

export class GetPipelineAnalyticsTool extends BaseCRMTool {
  get name() {
    return "get_pipeline_analytics";
  }

  get description() {
    return `Get comprehensive analytics for a sales pipeline including conversion rates, average deal size, velocity, and stage-by-stage breakdown.`;
  }

  get schema() {
    return z.object({
      pipelineId: z.string().describe("Pipeline ID to analyze"),
      timeframe: z.enum(["30days", "90days", "year", "all"]).default("90days").describe("Time period to analyze"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const pipeline = await Pipeline.findOne({
        _id: input.pipelineId,
        workspaceId: this.workspaceId,
      }).lean();

      if (!pipeline) {
        return {
          success: false,
          error: "Pipeline not found",
        };
      }

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeframe) {
        case "30days":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case "all":
          startDate.setFullYear(2000); // Far in the past
          break;
      }

      // Get all deals in this pipeline
      const allDeals = await Opportunity.find({
        workspaceId: this.workspaceId,
        pipelineId: input.pipelineId,
        createdAt: { $gte: startDate },
      }).lean();

      const openDeals = allDeals.filter((d) => d.status === "open");
      const wonDeals = allDeals.filter((d) => d.status === "won");
      const lostDeals = allDeals.filter((d) => d.status === "lost");

      // Calculate metrics
      const totalValue = allDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const lostValue = lostDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);

      const avgDealSize = allDeals.length > 0 ? totalValue / allDeals.length : 0;
      const avgWonDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

      const winRate = allDeals.length > 0 ? (wonDeals.length / allDeals.length) * 100 : 0;
      const lossRate = allDeals.length > 0 ? (lostDeals.length / allDeals.length) * 100 : 0;

      // Calculate average sales cycle (for won deals with actualCloseDate)
      const closedDealsWithDates = wonDeals.filter((d) => d.actualCloseDate && d.createdAt);
      const avgSalesCycle =
        closedDealsWithDates.length > 0
          ? closedDealsWithDates.reduce((sum, d) => {
              const days = Math.ceil(
                (new Date(d.actualCloseDate!).getTime() - new Date(d.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }, 0) / closedDealsWithDates.length
          : 0;

      // Stage breakdown
      const stageBreakdown = pipeline.stages.map((stage: any) => {
        const stageDeals = openDeals.filter(
          (d) => (d.stageId as any).toString() === (stage._id as any).toString()
        );
        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

        return {
          stageName: stage.name,
          stageOrder: stage.order,
          dealCount: stageDeals.length,
          totalValue: stageValue,
          avgDealSize: stageDeals.length > 0 ? stageValue / stageDeals.length : 0,
          probability: stage.probability,
        };
      });

      return {
        success: true,
        pipeline: {
          id: pipeline._id,
          name: pipeline.name,
        },
        timeframe: input.timeframe,
        summary: {
          totalDeals: allDeals.length,
          openDeals: openDeals.length,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          totalValue: Math.round(totalValue),
          wonValue: Math.round(wonValue),
          lostValue: Math.round(lostValue),
          pipelineValue: Math.round(pipelineValue),
          avgDealSize: Math.round(avgDealSize),
          avgWonDealSize: Math.round(avgWonDealSize),
          winRate: Math.round(winRate * 10) / 10,
          lossRate: Math.round(lossRate * 10) / 10,
          avgSalesCycleDays: Math.round(avgSalesCycle),
        },
        stageBreakdown,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
