import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Pipeline from "../../../../models/Pipeline";
import Opportunity from "../../../../models/Opportunity";

export class GetPipelineStatsTool extends BaseCRMTool {
  get name() {
    return "get_pipeline_stats";
  }

  get description() {
    return `Get statistics and analytics for a specific sales pipeline. Shows deal counts, total values, conversion rates, and velocity for each stage.`;
  }

  get schema() {
    return z.object({
      pipelineId: z.string().describe("Pipeline ID to analyze"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Get the pipeline
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

      // Get all opportunities in this pipeline
      const opportunities = await Opportunity.find({
        workspaceId: this.workspaceId,
        pipelineId: input.pipelineId,
        status: "open",
      }).lean();

      // Calculate stats for each stage
      const stageStats = pipeline.stages.map((stage: any) => {
        const stageOpps = opportunities.filter(
          (opp) => (opp.stageId as any).toString() === (stage._id as any).toString()
        );

        const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);
        const avgValue = stageOpps.length > 0 ? totalValue / stageOpps.length : 0;

        return {
          stageId: stage._id,
          stageName: stage.name,
          order: stage.order,
          probability: stage.probability,
          dealCount: stageOpps.length,
          totalValue,
          avgValue: Math.round(avgValue),
          deals: stageOpps.map((opp) => ({
            id: opp._id,
            title: opp.title,
            value: opp.value,
          })),
        };
      });

      // Calculate overall pipeline stats
      const totalDeals = opportunities.length;
      const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
      const avgDealValue = totalDeals > 0 ? totalValue / totalDeals : 0;

      // Calculate weighted pipeline value (total value * probability)
      const weightedValue = opportunities.reduce((sum, opp) => {
        return sum + (opp.value || 0) * ((opp.probability || 0) / 100);
      }, 0);

      return {
        success: true,
        pipeline: {
          id: pipeline._id,
          name: pipeline.name,
        },
        summary: {
          totalDeals,
          totalValue,
          avgDealValue: Math.round(avgDealValue),
          weightedValue: Math.round(weightedValue),
          stageCount: pipeline.stages.length,
        },
        stageStats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
