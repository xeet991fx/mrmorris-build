import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Pipeline from "../../../../models/Pipeline";

export class CreatePipelineTool extends BaseCRMTool {
  get name() {
    return "create_pipeline";
  }

  get description() {
    return `Create a new sales pipeline with custom stages. Use this when the user wants to set up a new sales process or customize their pipeline.`;
  }

  get schema() {
    return z.object({
      name: z.string().describe("Pipeline name (e.g., 'SaaS Sales Pipeline')"),
      description: z.string().optional().describe("Description of the pipeline"),
      stages: z.array(
        z.object({
          name: z.string(),
          probability: z.number().min(0).max(100).optional(),
          color: z.string().optional(),
        })
      ).describe("Stages for the pipeline (will be auto-ordered)"),
      isDefault: z.boolean().default(false).describe("Whether this should be the default pipeline"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Check if pipeline with same name exists
      const existing = await Pipeline.findOne({
        workspaceId: this.workspaceId,
        name: input.name,
      });

      if (existing) {
        return {
          success: false,
          error: `Pipeline with name "${input.name}" already exists`,
        };
      }

      // If this is to be the default pipeline, unset other defaults
      if (input.isDefault) {
        await Pipeline.updateMany(
          {
            workspaceId: this.workspaceId,
            isDefault: true,
          },
          {
            $set: { isDefault: false },
          }
        );
      }

      // Create stages with auto-incrementing order
      const stages = input.stages.map((stage, index) => ({
        name: stage.name,
        order: index,
        probability: stage.probability !== undefined ? stage.probability : (index + 1) * (100 / input.stages.length),
        color: stage.color || this.getDefaultStageColor(index),
      }));

      // Create the pipeline
      const pipeline = await Pipeline.create({
        workspaceId: this.workspaceId,
        createdBy: this.userId,
        name: input.name,
        description: input.description,
        stages,
        isDefault: input.isDefault,
      });

      return {
        success: true,
        pipeline: {
          id: pipeline._id,
          name: pipeline.name,
          description: pipeline.description,
          isDefault: pipeline.isDefault,
          stageCount: pipeline.stages.length,
          stages: pipeline.stages.map((s: any) => ({
            id: s._id,
            name: s.name,
            order: s.order,
            probability: s.probability,
            color: s.color,
          })),
        },
        message: `Created pipeline "${pipeline.name}" with ${pipeline.stages.length} stages`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getDefaultStageColor(index: number): string {
    const colors = [
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#f59e0b", // amber
      "#10b981", // green
      "#6366f1", // indigo
      "#14b8a6", // teal
      "#f97316", // orange
    ];
    return colors[index % colors.length];
  }
}
