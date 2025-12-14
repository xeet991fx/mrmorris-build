import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class GetCampaignPerformanceTool extends BaseCRMTool {
  get name() {
    return "get_campaign_performance";
  }

  get description() {
    return `Get performance metrics for email campaigns including open rates, click rates, reply rates, and engagement analytics.`;
  }

  get schema() {
    return z.object({
      campaignId: z.string().optional().describe("Specific campaign to analyze"),
      limit: z.number().default(10).describe("Number of campaigns to return (for overview)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (input.campaignId) {
        // Analyze specific campaign
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

        const stats = campaign.stats || {};

        // Calculate rates
        const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
        const clickRate = stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0;
        const replyRate = stats.delivered > 0 ? (stats.replied / stats.delivered) * 100 : 0;
        const bounceRate = stats.sent > 0 ? (stats.bounced / stats.sent) * 100 : 0;
        const unsubscribeRate = stats.delivered > 0 ? (stats.unsubscribed / stats.delivered) * 100 : 0;

        // Sentiment analysis on replies
        const positiveReplyRate =
          stats.replied > 0 ? (stats.positiveReplies / stats.replied) * 100 : 0;
        const negativeReplyRate =
          stats.replied > 0 ? (stats.negativeReplies / stats.replied) * 100 : 0;

        return {
          success: true,
          campaign: {
            id: campaign._id,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status,
            stepCount: campaign.steps?.length || 0,
          },
          enrollment: {
            total: campaign.totalEnrolled || 0,
            active: campaign.activeEnrollments || 0,
            completed: campaign.completedEnrollments || 0,
          },
          emailMetrics: {
            sent: stats.sent || 0,
            delivered: stats.delivered || 0,
            opened: stats.opened || 0,
            clicked: stats.clicked || 0,
            replied: stats.replied || 0,
            bounced: stats.bounced || 0,
            unsubscribed: stats.unsubscribed || 0,
          },
          performanceRates: {
            openRate: Math.round(openRate * 10) / 10,
            clickRate: Math.round(clickRate * 10) / 10,
            replyRate: Math.round(replyRate * 10) / 10,
            bounceRate: Math.round(bounceRate * 10) / 10,
            unsubscribeRate: Math.round(unsubscribeRate * 10) / 10,
          },
          replyAnalysis: {
            total: stats.replied || 0,
            positive: stats.positiveReplies || 0,
            negative: stats.negativeReplies || 0,
            positiveRate: Math.round(positiveReplyRate * 10) / 10,
            negativeRate: Math.round(negativeReplyRate * 10) / 10,
          },
          health: this.getCampaignHealth(openRate, clickRate, replyRate, bounceRate),
        };
      } else {
        // Get overview of all campaigns
        const campaigns = await Campaign.find({
          workspaceId: this.workspaceId,
        })
          .limit(input.limit || 10)
          .sort({ createdAt: -1 })
          .lean();

        const campaignPerformance = campaigns.map((campaign) => {
          const stats = campaign.stats || {};
          const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
          const clickRate = stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0;
          const replyRate = stats.delivered > 0 ? (stats.replied / stats.delivered) * 100 : 0;

          return {
            id: campaign._id,
            name: campaign.name,
            status: campaign.status,
            enrolled: campaign.totalEnrolled || 0,
            sent: stats.sent || 0,
            openRate: Math.round(openRate * 10) / 10,
            clickRate: Math.round(clickRate * 10) / 10,
            replyRate: Math.round(replyRate * 10) / 10,
            health: this.getCampaignHealth(openRate, clickRate, replyRate, 0),
          };
        });

        // Calculate totals
        const totals = campaigns.reduce(
          (acc, c) => {
            const stats = c.stats || {};
            return {
              sent: acc.sent + (stats.sent || 0),
              delivered: acc.delivered + (stats.delivered || 0),
              opened: acc.opened + (stats.opened || 0),
              clicked: acc.clicked + (stats.clicked || 0),
              replied: acc.replied + (stats.replied || 0),
            };
          },
          { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 }
        );

        const avgOpenRate = totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0;
        const avgClickRate = totals.delivered > 0 ? (totals.clicked / totals.delivered) * 100 : 0;
        const avgReplyRate = totals.delivered > 0 ? (totals.replied / totals.delivered) * 100 : 0;

        return {
          success: true,
          summary: {
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter((c) => c.status === "active").length,
            totalSent: totals.sent,
            avgOpenRate: Math.round(avgOpenRate * 10) / 10,
            avgClickRate: Math.round(avgClickRate * 10) / 10,
            avgReplyRate: Math.round(avgReplyRate * 10) / 10,
          },
          campaigns: campaignPerformance,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getCampaignHealth(
    openRate: number,
    clickRate: number,
    replyRate: number,
    bounceRate: number
  ): string {
    if (bounceRate > 10) return "Poor - High bounce rate";
    if (openRate < 10) return "Poor - Low engagement";
    if (openRate >= 30 && clickRate >= 5 && replyRate >= 2) return "Excellent";
    if (openRate >= 20 && clickRate >= 3) return "Good";
    if (openRate >= 15) return "Fair";
    return "Needs Improvement";
  }
}
