import { SubAgent } from "deepagents";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Contact from "../../../models/Contact";
import Company from "../../../models/Company";
import Opportunity from "../../../models/Opportunity";

function createAnalyticsTools(workspaceId: string, userId: string): any[] {
    return [
        new DynamicStructuredTool({
            name: "get_dashboard_metrics",
            description: "Get key CRM dashboard metrics including contacts, deals, and revenue",
            schema: z.object({
                period: z.enum(["today", "week", "month", "quarter", "year"]).optional().default("month"),
            }),
            func: async (input) => {
                try {
                    const now = new Date();
                    let startDate: Date;

                    switch (input.period) {
                        case "today":
                            startDate = new Date(now.setHours(0, 0, 0, 0));
                            break;
                        case "week":
                            startDate = new Date(now.setDate(now.getDate() - 7));
                            break;
                        case "month":
                            startDate = new Date(now.setMonth(now.getMonth() - 1));
                            break;
                        case "quarter":
                            startDate = new Date(now.setMonth(now.getMonth() - 3));
                            break;
                        case "year":
                            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                            break;
                        default:
                            startDate = new Date(now.setMonth(now.getMonth() - 1));
                    }

                    const [contacts, companies, opportunities, wonDeals] = await Promise.all([
                        Contact.countDocuments({ workspaceId: workspaceId }),
                        Company.countDocuments({ workspaceId: workspaceId }),
                        Opportunity.find({ workspaceId: workspaceId, status: "open" }).lean(),
                        Opportunity.find({
                            workspaceId: workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: startDate },
                        }).lean(),
                    ]);

                    const pipelineValue = opportunities.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
                    const wonRevenue = wonDeals.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

                    return JSON.stringify({
                        success: true,
                        period: input.period,
                        metrics: {
                            totalContacts: contacts,
                            totalCompanies: companies,
                            openDeals: opportunities.length,
                            pipelineValue,
                            wonDeals: wonDeals.length,
                            wonRevenue,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "get_pipeline_analytics",
            description: "Get detailed pipeline analytics including conversion rates and stage breakdown",
            schema: z.object({}),
            func: async () => {
                try {
                    const opportunities = await Opportunity.find({ workspaceId: workspaceId }).lean();

                    const byStatus = {
                        open: opportunities.filter((o: any) => o.status === "open"),
                        won: opportunities.filter((o: any) => o.status === "won"),
                        lost: opportunities.filter((o: any) => o.status === "lost"),
                    };

                    const stageBreakdown: Record<string, { count: number; value: number }> = {};
                    byStatus.open.forEach((o: any) => {
                        const stageId = o.stageId?.toString() || "Unassigned";
                        if (!stageBreakdown[stageId]) {
                            stageBreakdown[stageId] = { count: 0, value: 0 };
                        }
                        stageBreakdown[stageId].count++;
                        stageBreakdown[stageId].value += o.value || 0;
                    });

                    const winRate =
                        byStatus.won.length + byStatus.lost.length > 0
                            ? (byStatus.won.length / (byStatus.won.length + byStatus.lost.length)) * 100
                            : 0;

                    const avgDealSize =
                        byStatus.won.length > 0
                            ? byStatus.won.reduce((sum: number, o: any) => sum + (o.value || 0), 0) / byStatus.won.length
                            : 0;

                    return JSON.stringify({
                        success: true,
                        analytics: {
                            totalDeals: opportunities.length,
                            openDeals: byStatus.open.length,
                            wonDeals: byStatus.won.length,
                            lostDeals: byStatus.lost.length,
                            winRate: winRate.toFixed(1) + "%",
                            avgDealSize: avgDealSize.toFixed(2),
                            pipelineValue: byStatus.open.reduce((sum: number, o: any) => sum + (o.value || 0), 0),
                            stageBreakdown,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "get_contact_engagement",
            description: "Analyze contact engagement levels and activity patterns",
            schema: z.object({
                segment: z.enum(["all", "leads", "prospects", "customers"]).optional().default("all"),
            }),
            func: async (input: any) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.segment !== "all") {
                        filter.status = input.segment === "leads" ? "lead" : input.segment === "prospects" ? "prospect" : "customer";
                    }

                    const contacts = await Contact.find(filter).lean();

                    const highEngagement = contacts.filter((c: any) => (c.score || 0) >= 70);
                    const mediumEngagement = contacts.filter((c: any) => (c.score || 0) >= 40 && (c.score || 0) < 70);
                    const lowEngagement = contacts.filter((c: any) => (c.score || 0) < 40);

                    return JSON.stringify({
                        success: true,
                        segment: input.segment,
                        engagement: {
                            total: contacts.length,
                            high: { count: highEngagement.length, percentage: ((highEngagement.length / contacts.length) * 100).toFixed(1) + "%" },
                            medium: { count: mediumEngagement.length, percentage: ((mediumEngagement.length / contacts.length) * 100).toFixed(1) + "%" },
                            low: { count: lowEngagement.length, percentage: ((lowEngagement.length / contacts.length) * 100).toFixed(1) + "%" },
                        },
                        topEngaged: highEngagement.slice(0, 5).map((c: any) => ({
                            name: `${c.firstName} ${c.lastName || ""}`.trim(),
                            email: c.email,
                            score: c.score,
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "generate_report",
            description: "Generate a summary report of CRM data",
            schema: z.object({
                type: z.enum(["sales", "marketing", "overview"]).describe("Type of report"),
                period: z.enum(["week", "month", "quarter"]).optional().default("month"),
            }),
            func: async (input: any) => {
                try {
                    const now = new Date();
                    let startDate: Date;

                    switch (input.period) {
                        case "week":
                            startDate = new Date(now.setDate(now.getDate() - 7));
                            break;
                        case "quarter":
                            startDate = new Date(now.setMonth(now.getMonth() - 3));
                            break;
                        default:
                            startDate = new Date(now.setMonth(now.getMonth() - 1));
                    }

                    const [contacts, opportunities, wonDeals] = await Promise.all([
                        Contact.find({ workspaceId: workspaceId, createdAt: { $gte: startDate } }).lean(),
                        Opportunity.find({ workspaceId: workspaceId, createdAt: { $gte: startDate } }).lean(),
                        Opportunity.find({ workspaceId: workspaceId, status: "won", actualCloseDate: { $gte: startDate } }).lean(),
                    ]);

                    const report = {
                        type: input.type,
                        period: input.period,
                        generatedAt: new Date().toISOString(),
                        summary: {
                            newContacts: contacts.length,
                            newDeals: opportunities.length,
                            wonDeals: wonDeals.length,
                            revenue: wonDeals.reduce((sum: number, o: any) => sum + (o.value || 0), 0),
                        },
                    };

                    return JSON.stringify({
                        success: true,
                        report,
                        message: `Generated ${input.type} report for the past ${input.period}`,
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "forecast_revenue",
            description: "Forecast expected revenue based on pipeline and probabilities",
            schema: z.object({
                months: z.number().optional().default(3).describe("Number of months to forecast"),
            }),
            func: async (input: any) => {
                try {
                    const opportunities = await Opportunity.find({
                        workspaceId: workspaceId,
                        status: "open",
                    }).lean();

                    // Calculate weighted pipeline value
                    const weightedValue = opportunities.reduce((sum: number, o: any) => {
                        const probability = (o.probability || 50) / 100;
                        return sum + (o.value || 0) * probability;
                    }, 0);

                    // Simple forecast based on win rate and pipeline
                    const wonDeals = await Opportunity.countDocuments({
                        workspaceId: workspaceId,
                        status: "won",
                    });
                    const lostDeals = await Opportunity.countDocuments({
                        workspaceId: workspaceId,
                        status: "lost",
                    });
                    const historicalWinRate = wonDeals + lostDeals > 0 ? wonDeals / (wonDeals + lostDeals) : 0.3;

                    const totalPipelineValue = opportunities.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
                    const forecastedRevenue = totalPipelineValue * historicalWinRate;

                    return JSON.stringify({
                        success: true,
                        forecast: {
                            months: input.months,
                            pipelineValue: totalPipelineValue,
                            weightedPipeline: weightedValue,
                            historicalWinRate: (historicalWinRate * 100).toFixed(1) + "%",
                            forecastedRevenue: forecastedRevenue.toFixed(2),
                            confidence: "Medium",
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),
    ];
}

// Export tools directly for use without SubAgent wrapper (to avoid channel conflicts)
export function getAnalyticsTools(workspaceId: string, userId: string): any[] {
    return createAnalyticsTools(workspaceId, userId);
}

export function createAnalyticsSubagent(workspaceId: string, userId: string): SubAgent {
    return {
        name: "analytics",
        description: "Specialized agent for CRM analytics, reporting, and insights. Use this for: dashboard metrics, pipeline analytics, engagement analysis, revenue forecasting, and generating reports.",
        systemPrompt: `You are an expert CRM data analyst and reporting assistant.

## Your Expertise
- Dashboard metrics and KPIs
- Pipeline analysis and forecasting
- Contact engagement scoring
- Revenue and conversion analysis
- Report generation

## Behavior Guidelines
1. Always provide context with metrics (comparisons, benchmarks, trends)
2. Highlight anomalies and opportunities
3. Make data actionable with recommendations
4. Use visual-friendly formatting for reports

## Response Format
- Lead with key insights, not raw numbers
- Use percentages and comparisons
- Structure reports with clear sections
- End with actionable recommendations`,
        tools: createAnalyticsTools(workspaceId, userId),
    };
}
