import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class ListCampaignsTool extends BaseCRMTool {
  get name() {
    return "list_campaigns";
  }

  get description() {
    return `List email campaigns in the CRM. Use this to see all campaigns, filter by status (draft, active, paused, completed), and view campaign statistics like open rates and replies.`;
  }

  get schema() {
    return z.object({
      status: z
        .enum(["draft", "active", "paused", "completed"])
        .optional()
        .describe("Filter by campaign status"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum results to return (default: 10)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = { workspaceId: this.workspaceId };

      if (input.status) {
        filter.status = input.status;
      }

      const campaigns = await Campaign.find(filter)
        .limit(input.limit || 10)
        .sort({ createdAt: -1 })
        .select("name description status totalEnrolled activeEnrollments stats steps")
        .lean();

      return {
        success: true,
        count: campaigns.length,
        campaigns: campaigns.map((c) => ({
          id: c._id,
          name: c.name,
          description: c.description,
          status: c.status,
          totalEnrolled: c.totalEnrolled || 0,
          activeEnrollments: c.activeEnrollments || 0,
          steps: c.steps?.length || 0,
          stats: {
            sent: c.stats?.sent || 0,
            delivered: c.stats?.delivered || 0,
            opened: c.stats?.opened || 0,
            replied: c.stats?.replied || 0,
            openRate: c.stats?.sent
              ? ((c.stats.opened / c.stats.sent) * 100).toFixed(1) + "%"
              : "0%",
            replyRate: c.stats?.sent
              ? ((c.stats.replied / c.stats.sent) * 100).toFixed(1) + "%"
              : "0%",
          },
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
