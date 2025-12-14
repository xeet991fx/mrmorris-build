import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class DeleteOpportunityTool extends BaseCRMTool {
  get name() {
    return "delete_opportunity";
  }

  get description() {
    return `Delete an opportunity/deal from the CRM. Use this when a deal should be permanently removed. Use with caution as this action cannot be undone.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to delete"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
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

      // Store info before deleting
      const opportunityInfo = {
        id: opportunity._id,
        title: opportunity.title,
        value: opportunity.value,
        status: opportunity.status,
      };

      // Delete the opportunity
      await Opportunity.findByIdAndDelete(opportunity._id);

      return {
        success: true,
        message: `Deleted opportunity ${opportunityInfo.title} ($${opportunityInfo.value})`,
        deletedOpportunity: opportunityInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
