import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";
import Company from "../../../../models/Company";
import Opportunity from "../../../../models/Opportunity";
import Campaign from "../../../../models/Campaign";

export class GetDashboardMetricsTool extends BaseCRMTool {
  get name() {
    return "get_dashboard_metrics";
  }

  get description() {
    return `Get key metrics and statistics for the CRM dashboard. Returns counts for contacts, companies, opportunities, total pipeline value, active campaigns, and other important metrics. Use this when the user asks for an overview, summary, or dashboard.`;
  }

  get schema() {
    return z.object({
      includeDetails: z
        .boolean()
        .default(false)
        .describe("Include detailed breakdowns (e.g., by status, temperature)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Get basic counts
      const [
        totalContacts,
        totalCompanies,
        totalOpportunities,
        totalCampaigns,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        activeCampaigns,
      ] = await Promise.all([
        Contact.countDocuments({ workspaceId: this.workspaceId }),
        Company.countDocuments({ workspaceId: this.workspaceId }),
        Opportunity.countDocuments({ workspaceId: this.workspaceId }),
        Campaign.countDocuments({ workspaceId: this.workspaceId }),
        Opportunity.countDocuments({
          workspaceId: this.workspaceId,
          status: "open",
        }),
        Opportunity.countDocuments({
          workspaceId: this.workspaceId,
          status: "won",
        }),
        Opportunity.countDocuments({
          workspaceId: this.workspaceId,
          status: "lost",
        }),
        Campaign.countDocuments({
          workspaceId: this.workspaceId,
          status: "active",
        }),
      ]);

      // Calculate pipeline value
      const pipelineAggregation = await Opportunity.aggregate([
        {
          $match: {
            workspaceId: this.workspaceId,
            status: "open",
          },
        },
        {
          $group: {
            _id: null,
            totalValue: { $sum: "$value" },
            avgValue: { $avg: "$value" },
            count: { $sum: 1 },
          },
        },
      ]);

      const pipelineValue = pipelineAggregation[0] || {
        totalValue: 0,
        avgValue: 0,
        count: 0,
      };

      const metrics: any = {
        contacts: {
          total: totalContacts,
        },
        companies: {
          total: totalCompanies,
        },
        opportunities: {
          total: totalOpportunities,
          open: openOpportunities,
          won: wonOpportunities,
          lost: lostOpportunities,
        },
        pipeline: {
          totalValue: pipelineValue.totalValue,
          averageValue: pipelineValue.avgValue,
          openDeals: pipelineValue.count,
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        winRate:
          wonOpportunities + lostOpportunities > 0
            ? (
                (wonOpportunities / (wonOpportunities + lostOpportunities)) *
                100
              ).toFixed(1) + "%"
            : "0%",
      };

      // Add detailed breakdowns if requested
      if (input.includeDetails) {
        // Contact status breakdown
        const contactsByStatus = await Contact.aggregate([
          { $match: { workspaceId: this.workspaceId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        metrics.contacts.byStatus = contactsByStatus.reduce(
          (acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
          },
          {}
        );

        // Deal temperature breakdown
        const oppsByTemperature = await Opportunity.aggregate([
          {
            $match: {
              workspaceId: this.workspaceId,
              status: "open",
              dealTemperature: { $exists: true },
            },
          },
          { $group: { _id: "$dealTemperature", count: { $sum: 1 } } },
        ]);

        metrics.opportunities.byTemperature = oppsByTemperature.reduce(
          (acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
          },
          {}
        );
      }

      return {
        success: true,
        metrics,
        summary: `CRM has ${totalContacts} contacts, ${totalCompanies} companies, ${openOpportunities} open deals worth $${pipelineValue.totalValue.toFixed(2)}, and ${activeCampaigns} active campaigns.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
