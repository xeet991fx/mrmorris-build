import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class PauseCampaignTool extends BaseCRMTool {
  get name() {
    return "pause_campaign";
  }

  get description() {
    return `Pause an active campaign to temporarily stop sending emails. Use this to halt a campaign without deleting it.`;
  }

  get schema() {
    return z.object({
      campaignId: z.string().describe("Campaign ID to pause"),
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

      if (campaign.status === "paused") {
        return {
          success: false,
          error: "Campaign is already paused",
        };
      }

      if (campaign.status !== "active") {
        return {
          success: false,
          error: `Cannot pause a ${campaign.status} campaign. Only active campaigns can be paused.`,
        };
      }

      // Update status to paused
      campaign.status = "paused";
      await campaign.save();

      return {
        success: true,
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
        },
        message: `Paused campaign "${campaign.name}". No new emails will be sent until it is reactivated.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
