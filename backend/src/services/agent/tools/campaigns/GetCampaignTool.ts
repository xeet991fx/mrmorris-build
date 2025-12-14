import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class GetCampaignTool extends BaseCRMTool {
  get name() {
    return "get_campaign";
  }

  get description() {
    return `Get detailed information about a specific email campaign. Use this to view campaign configuration, steps, and current status.`;
  }

  get schema() {
    return z.object({
      campaignId: z.string().describe("Campaign ID to retrieve"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const campaign = await Campaign.findOne({
        _id: input.campaignId,
        workspaceId: this.workspaceId,
      }).lean();

      if (!campaign) {
        return {
          success: false,
          error: "Campaign not found",
        };
      }

      return {
        success: true,
        campaign: {
          id: campaign._id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          steps: campaign.steps?.map((s: any) => ({
            id: s.id,
            order: s.order,
            subject: s.subject,
            delayDays: s.delayDays,
            delayHours: s.delayHours,
          })),
          enrollment: {
            total: campaign.totalEnrolled || 0,
            active: campaign.activeEnrollments || 0,
            completed: campaign.completedEnrollments || 0,
          },
          sendingSchedule: campaign.sendingSchedule,
          dailyLimit: campaign.dailyLimit,
          stats: campaign.stats,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
