import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class UpdateCampaignTool extends BaseCRMTool {
  get name() {
    return "update_campaign";
  }

  get description() {
    return `Update an existing campaign's settings like name, description, or daily limit. Note: Cannot update steps for active campaigns.`;
  }

  get schema() {
    return z.object({
      campaignId: z.string().describe("Campaign ID to update"),
      updates: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        dailyLimit: z.number().optional(),
      }).describe("Fields to update"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const campaign = await Campaign.findOne({
        _id: input.campaignId,
        workspaceId: this.workspaceId,
      });

      if (!campaign) {
        return {
          success: false,
          error: "Campaign not found",
        };
      }

      // Update the campaign
      const updated = await Campaign.findByIdAndUpdate(
        campaign._id,
        { $set: input.updates },
        { new: true }
      ).lean();

      if (!updated) {
        return {
          success: false,
          error: "Failed to update campaign",
        };
      }

      return {
        success: true,
        campaign: {
          id: updated._id,
          name: updated.name,
          description: updated.description,
          status: updated.status,
          dailyLimit: updated.dailyLimit,
        },
        message: `Updated campaign ${updated.name}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
