import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Pipeline from "../../../../models/Pipeline";

export class ListPipelinesTool extends BaseCRMTool {
  get name() {
    return "list_pipelines";
  }

  get description() {
    return `List all sales pipelines in the CRM. Use this to see available pipelines, their stages, and configuration.`;
  }

  get schema() {
    return z.object({
      includeStages: z.boolean().default(true).describe("Include stage details for each pipeline"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const pipelines = await Pipeline.find({
        workspaceId: this.workspaceId,
      })
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        count: pipelines.length,
        pipelines: pipelines.map((p) => ({
          id: p._id,
          name: p.name,
          description: p.description,
          isDefault: p.isDefault,
          stageCount: p.stages?.length || 0,
          stages: input.includeStages
            ? p.stages?.map((s: any) => ({
                id: s._id,
                name: s.name,
                order: s.order,
                probability: s.probability,
                color: s.color,
              }))
            : undefined,
          createdAt: p.createdAt,
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
