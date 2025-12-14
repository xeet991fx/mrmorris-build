import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";
import Pipeline from "../../../../models/Pipeline";

export class MoveOpportunityStageTool extends BaseCRMTool {
  get name() {
    return "move_opportunity_stage";
  }

  get description() {
    return `Move an opportunity to a different stage in the sales pipeline. Use this when a deal progresses or regresses through the sales process.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to move"),
      stageId: z.string().optional().describe("Target stage ID (if known)"),
      stageName: z.string().optional().describe("Target stage name (if stage ID not known)"),
      direction: z.enum(["forward", "backward"]).optional().describe("Move forward or backward one stage (alternative to specifying stage)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Find the opportunity
      const opportunity = await Opportunity.findOne({
        _id: input.opportunityId,
        workspaceId: this.workspaceId,
      }).lean();

      if (!opportunity) {
        return {
          success: false,
          error: `Opportunity not found`,
        };
      }

      // Get the pipeline to find stages
      const pipeline = await Pipeline.findById(opportunity.pipelineId).lean();

      if (!pipeline) {
        return {
          success: false,
          error: "Pipeline not found for this opportunity",
        };
      }

      let targetStageId: string | undefined;

      // Determine target stage
      if (input.stageId) {
        targetStageId = input.stageId;
      } else if (input.stageName) {
        const stage = pipeline.stages.find(
          (s: any) => s.name.toLowerCase() === input.stageName!.toLowerCase()
        );
        if (stage) {
          targetStageId = (stage._id as any).toString();
        }
      } else if (input.direction) {
        // Find current stage index
        const currentStageIndex = pipeline.stages.findIndex(
          (s: any) => (s._id as any).toString() === (opportunity.stageId as any).toString()
        );

        if (currentStageIndex === -1) {
          return {
            success: false,
            error: "Current stage not found in pipeline",
          };
        }

        const targetIndex =
          input.direction === "forward"
            ? currentStageIndex + 1
            : currentStageIndex - 1;

        if (targetIndex < 0 || targetIndex >= pipeline.stages.length) {
          return {
            success: false,
            error: `Cannot move ${input.direction} - already at ${input.direction === "forward" ? "last" : "first"} stage`,
          };
        }

        targetStageId = (pipeline.stages[targetIndex]._id as any).toString();
      }

      if (!targetStageId) {
        return {
          success: false,
          error: "Could not determine target stage - provide stageId, stageName, or direction",
        };
      }

      // Verify target stage exists
      const targetStage = pipeline.stages.find(
        (s: any) => (s._id as any).toString() === targetStageId
      );

      if (!targetStage) {
        return {
          success: false,
          error: "Target stage not found in pipeline",
        };
      }

      // Update the opportunity
      const updated = await Opportunity.findByIdAndUpdate(
        opportunity._id,
        {
          $set: {
            stageId: targetStageId,
            probability: (targetStage as any).probability || 0,
          },
        },
        { new: true }
      )
        .populate("pipelineId", "name")
        .populate("stageId", "name")
        .lean();

      if (!updated) {
        return {
          success: false,
          error: "Failed to update opportunity",
        };
      }

      return {
        success: true,
        opportunity: {
          id: updated._id,
          title: updated.title,
          value: updated.value,
          pipeline: {
            id: (updated.pipelineId as any)._id,
            name: (updated.pipelineId as any).name,
          },
          stage: {
            id: (updated.stageId as any)._id,
            name: (updated.stageId as any).name,
          },
          probability: updated.probability,
        },
        message: `Moved opportunity ${updated.title} to stage "${(updated.stageId as any).name}"`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
