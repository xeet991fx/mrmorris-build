import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class StartCampaignTool extends BaseCRMTool {
  get name() {
    return "start_campaign";
  }

  get description() {
    return `Activate a campaign to start sending emails. Use this to change a draft or paused campaign to active status.`;
  }

  get schema() {
    return z.object({
      campaignId: z.string().describe("Campaign ID to start"),
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

      if (campaign.status === "active") {
        return {
          success: false,
          error: "Campaign is already active",
        };
      }

      // Validate campaign has steps
      if (!campaign.steps || campaign.steps.length === 0) {
        return {
          success: false,
          error: "Cannot start campaign without email steps",
        };
      }

      // Update status to active
      campaign.status = "active";
      await campaign.save();

      return {
        success: true,
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          stepCount: campaign.steps.length,
        },
        message: `Started campaign "${campaign.name}". It is now active and will begin sending emails.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
