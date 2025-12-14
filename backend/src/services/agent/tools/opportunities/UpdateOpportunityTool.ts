import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class UpdateOpportunityTool extends BaseCRMTool {
  get name() {
    return "update_opportunity";
  }

  get description() {
    return `Update an existing opportunity/deal in the CRM. Use this to modify deal information like name, value, close date, contact, company, or deal temperature.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to update"),
      updates: z.object({
        title: z.string().optional(),
        value: z.number().optional(),
        expectedCloseDate: z.string().optional().describe("Expected close date (ISO format)"),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        dealTemperature: z.enum(["cold", "warm", "hot"]).optional(),
        description: z.string().optional(),
      }).describe("Fields to update"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Find the opportunity
      const opportunity = await Opportunity.findOne({
        _id: input.opportunityId,
        workspaceId: this.workspaceId,
      });

      if (!opportunity) {
        return {
          success: false,
          error: `Opportunity not found`,
        };
      }

      // Update the opportunity
      const updated = await Opportunity.findByIdAndUpdate(
        opportunity._id,
        { $set: input.updates },
        { new: true }
      )
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
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
          expectedCloseDate: updated.expectedCloseDate,
          status: updated.status,
          dealTemperature: updated.dealTemperature,
          contact: updated.contactId
            ? {
                id: (updated.contactId as any)._id,
                name: `${(updated.contactId as any).firstName || ""} ${(updated.contactId as any).lastName || ""}`.trim(),
                email: (updated.contactId as any).email,
              }
            : undefined,
          company: updated.companyId
            ? {
                id: (updated.companyId as any)._id,
                name: (updated.companyId as any).name,
              }
            : undefined,
          pipeline: updated.pipelineId
            ? {
                id: (updated.pipelineId as any)._id,
                name: (updated.pipelineId as any).name,
              }
            : undefined,
          stage: updated.stageId
            ? {
                id: (updated.stageId as any)._id,
                name: (updated.stageId as any).name,
              }
            : undefined,
        },
        message: `Updated opportunity ${updated.title}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
