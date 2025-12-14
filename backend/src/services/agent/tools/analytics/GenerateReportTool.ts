import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";
import Company from "../../../../models/Company";
import Opportunity from "../../../../models/Opportunity";
import Activity from "../../../../models/Activity";

export class GenerateReportTool extends BaseCRMTool {
  get name() {
    return "generate_report";
  }

  get description() {
    return `Generate comprehensive CRM reports including summary statistics, trends, and insights for a specified time period.`;
  }

  get schema() {
    return z.object({
      reportType: z
        .enum(["summary", "sales", "activities", "contacts"])
        .default("summary")
        .describe("Type of report to generate"),
      timeframe: z.enum(["7days", "30days", "90days", "year"]).default("30days"),
      includeCharts: z.boolean().default(false).describe("Include chart data for visualization"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      switch (input.timeframe) {
        case "7days":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30days":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90days":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      let report: any = {
        reportType: input.reportType,
        timeframe: input.timeframe,
        generatedAt: now,
        period: {
          start: startDate,
          end: now,
        },
      };

      switch (input.reportType) {
        case "summary":
          report = { ...report, ...(await this.generateSummaryReport(startDate, now)) };
          break;
        case "sales":
          report = { ...report, ...(await this.generateSalesReport(startDate, now)) };
          break;
        case "activities":
          report = { ...report, ...(await this.generateActivitiesReport(startDate, now)) };
          break;
        case "contacts":
          report = { ...report, ...(await this.generateContactsReport(startDate, now)) };
          break;
      }

      return {
        success: true,
        report,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async generateSummaryReport(startDate: Date, endDate: Date) {
    const [contacts, companies, opportunities, activities] = await Promise.all([
      Contact.find({ workspaceId: this.workspaceId, createdAt: { $gte: startDate } }).lean(),
      Company.find({ workspaceId: this.workspaceId, createdAt: { $gte: startDate } }).lean(),
      Opportunity.find({ workspaceId: this.workspaceId, createdAt: { $gte: startDate } }).lean(),
      Activity.find({ workspaceId: this.workspaceId, createdAt: { $gte: startDate } }).lean(),
    ]);

    const wonDeals = opportunities.filter((o) => o.status === "won");
    const lostDeals = opportunities.filter((o) => o.status === "lost");
    const openDeals = opportunities.filter((o) => o.status === "open");

    const totalRevenue = wonDeals.reduce((sum, o) => sum + (o.value || 0), 0);
    const pipelineValue = openDeals.reduce((sum, o) => sum + (o.value || 0), 0);

    return {
      summary: {
        contacts: {
          total: contacts.length,
          new: contacts.length,
          byStatus: {
            lead: contacts.filter((c) => c.status === "lead").length,
            prospect: contacts.filter((c) => c.status === "prospect").length,
            customer: contacts.filter((c) => c.status === "customer").length,
          },
        },
        companies: {
          total: companies.length,
          new: companies.length,
        },
        opportunities: {
          total: opportunities.length,
          new: opportunities.length,
          open: openDeals.length,
          won: wonDeals.length,
          lost: lostDeals.length,
          winRate:
            wonDeals.length + lostDeals.length > 0
              ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 * 10) / 10
              : 0,
        },
        revenue: {
          won: Math.round(totalRevenue),
          pipeline: Math.round(pipelineValue),
          avgDealSize: wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0,
        },
        activities: {
          total: activities.length,
          emails: activities.filter((a) => a.type === "email").length,
          calls: activities.filter((a) => a.type === "call").length,
          meetings: activities.filter((a) => a.type === "meeting").length,
          notes: activities.filter((a) => a.type === "note").length,
          tasks: activities.filter((a) => a.type === "task").length,
        },
      },
    };
  }

  private async generateSalesReport(startDate: Date, endDate: Date) {
    const opportunities = await Opportunity.find({
      workspaceId: this.workspaceId,
      createdAt: { $gte: startDate },
    }).lean();

    const wonDeals = opportunities.filter((o) => o.status === "won");
    const lostDeals = opportunities.filter((o) => o.status === "lost");
    const openDeals = opportunities.filter((o) => o.status === "open");

    const totalRevenue = wonDeals.reduce((sum, o) => sum + (o.value || 0), 0);
    const lostRevenue = lostDeals.reduce((sum, o) => sum + (o.value || 0), 0);
    const pipelineValue = openDeals.reduce((sum, o) => sum + (o.value || 0), 0);

    // Group deals by close date for trending
    const dealsByMonth = wonDeals.reduce((acc: any, deal) => {
      if (deal.actualCloseDate) {
        const month = new Date(deal.actualCloseDate).toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, value: 0 };
        }
        acc[month].count++;
        acc[month].value += deal.value || 0;
      }
      return acc;
    }, {});

    return {
      salesMetrics: {
        dealsCreated: opportunities.length,
        dealsWon: wonDeals.length,
        dealsLost: lostDeals.length,
        dealsOpen: openDeals.length,
        revenue: {
          won: Math.round(totalRevenue),
          lost: Math.round(lostRevenue),
          pipeline: Math.round(pipelineValue),
        },
        averages: {
          dealSize: wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0,
          winRate:
            wonDeals.length + lostDeals.length > 0
              ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 * 10) / 10
              : 0,
        },
        topDeals: wonDeals
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 5)
          .map((d) => ({
            id: d._id,
            title: d.title,
            value: d.value,
            closeDate: d.actualCloseDate,
          })),
        trendData: Object.entries(dealsByMonth).map(([month, data]: [string, any]) => ({
          period: month,
          count: data.count,
          value: Math.round(data.value),
        })),
      },
    };
  }

  private async generateActivitiesReport(startDate: Date, endDate: Date) {
    const activities = await Activity.find({
      workspaceId: this.workspaceId,
      createdAt: { $gte: startDate },
    })
      .populate("userId", "firstName lastName")
      .lean();

    // Group by type
    const byType = activities.reduce((acc: any, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    // Group by user
    const byUser = activities.reduce((acc: any, activity) => {
      if (activity.userId) {
        const userName = `${(activity.userId as any).firstName || ""} ${(activity.userId as any).lastName || ""}`.trim();
        acc[userName] = (acc[userName] || 0) + 1;
      }
      return acc;
    }, {});

    // Calculate daily activity average
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = Math.round((activities.length / days) * 10) / 10;

    return {
      activityMetrics: {
        total: activities.length,
        dailyAverage,
        byType,
        byUser: Object.entries(byUser)
          .map(([user, count]) => ({ user, count }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10),
        recentActivities: activities
          .slice(0, 10)
          .map((a) => ({
            id: a._id,
            type: a.type,
            title: a.title,
            createdAt: a.createdAt,
          })),
      },
    };
  }

  private async generateContactsReport(startDate: Date, endDate: Date) {
    const contacts = await Contact.find({
      workspaceId: this.workspaceId,
      createdAt: { $gte: startDate },
    }).lean();

    // Group by status
    const byStatus = contacts.reduce((acc: any, contact) => {
      acc[contact.status || "unknown"] = (acc[contact.status || "unknown"] || 0) + 1;
      return acc;
    }, {});

    // Group by source
    const bySource = contacts.reduce((acc: any, contact) => {
      if (contact.source) {
        acc[contact.source] = (acc[contact.source] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      contactMetrics: {
        total: contacts.length,
        byStatus,
        bySource: Object.entries(bySource)
          .map(([source, count]) => ({ source, count }))
          .sort((a: any, b: any) => b.count - a.count),
        recentContacts: contacts.slice(0, 10).map((c) => ({
          id: c._id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email,
          status: c.status,
          createdAt: c.createdAt,
        })),
      },
    };
  }
}
