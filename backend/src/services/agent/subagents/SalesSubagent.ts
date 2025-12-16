import { SubAgent } from "deepagents";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Opportunity from "../../../models/Opportunity";
import Pipeline from "../../../models/Pipeline";

function createSalesTools(workspaceId: string, userId: string): any[] {
    return [
        new DynamicStructuredTool({
            name: "search_opportunities",
            description: "Search for deals/opportunities in the sales pipeline",
            schema: z.object({
                query: z.string().optional().describe("Search by deal name or contact"),
                stage: z.string().optional().describe("Pipeline stage name"),
                minValue: z.number().optional().describe("Minimum deal value"),
                maxValue: z.number().optional().describe("Maximum deal value"),
                status: z.enum(["open", "won", "lost"]).optional().describe("Deal status"),
                limit: z.number().optional().default(10),
            }),
            func: async (input: any) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.query) {
                        filter.title = { $regex: input.query, $options: "i" };
                    }
                    if (input.stage) filter.stageId = input.stage;
                    if (input.status) filter.status = input.status;
                    if (input.minValue || input.maxValue) {
                        filter.value = {};
                        if (input.minValue) filter.value.$gte = input.minValue;
                        if (input.maxValue) filter.value.$lte = input.maxValue;
                    }

                    const opportunities = await Opportunity.find(filter)
                        .sort({ value: -1 })
                        .limit(input.limit || 10)
                        .lean();

                    const totalValue = opportunities.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

                    return JSON.stringify({
                        success: true,
                        count: opportunities.length,
                        totalValue,
                        opportunities: opportunities.map((o: any) => ({
                            id: o._id,
                            title: o.title,
                            value: o.value,
                            stageId: o.stageId,
                            status: o.status,
                            probability: o.probability,
                            expectedCloseDate: o.expectedCloseDate,
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "create_opportunity",
            description: "Create a new deal/opportunity in the pipeline",
            schema: z.object({
                title: z.string().describe("Deal title"),
                value: z.number().describe("Deal value in dollars"),
                stageId: z.string().optional().describe("Pipeline stage ID"),
                pipelineId: z.string().optional().describe("Pipeline ID"),
                contactId: z.string().optional().describe("Associated contact ID"),
                companyId: z.string().optional().describe("Associated company ID"),
                expectedCloseDate: z.string().optional().describe("Expected close date (ISO format)"),
                probability: z.number().optional().describe("Win probability (0-100)"),
            }),
            func: async (input: any) => {
                try {
                    const opportunity = await Opportunity.create({
                        title: input.title,
                        value: input.value,
                        stageId: input.stageId,
                        pipelineId: input.pipelineId,
                        contactId: input.contactId,
                        companyId: input.companyId,
                        expectedCloseDate: input.expectedCloseDate,
                        probability: input.probability,
                        workspaceId: workspaceId,
                        userId: userId,
                        status: "open",
                        currency: "USD",
                    });
                    return JSON.stringify({
                        success: true,
                        message: `Created opportunity "${input.title}" worth $${input.value}`,
                        opportunity: {
                            id: opportunity._id,
                            title: opportunity.title,
                            value: opportunity.value,
                            stageId: opportunity.stageId,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "move_opportunity_stage",
            description: "Move an opportunity to a different pipeline stage",
            schema: z.object({
                opportunityId: z.string().describe("The opportunity ID"),
                newStageId: z.string().describe("The new stage ID"),
            }),
            func: async (input: any) => {
                try {
                    const opportunity = await Opportunity.findOneAndUpdate(
                        { _id: input.opportunityId, workspaceId: workspaceId },
                        { $set: { stageId: input.newStageId } },
                        { new: true }
                    );
                    if (!opportunity) {
                        return JSON.stringify({ success: false, error: "Opportunity not found" });
                    }
                    return JSON.stringify({
                        success: true,
                        message: `Moved "${opportunity.title}" to new stage`,
                        opportunity: {
                            id: opportunity._id,
                            title: opportunity.title,
                            stageId: opportunity.stageId,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "get_pipeline_stats",
            description: "Get statistics and metrics for the sales pipeline",
            schema: z.object({
                pipelineId: z.string().optional().describe("Specific pipeline ID, or gets default"),
            }),
            func: async (input: any) => {
                try {
                    // Get pipeline stages
                    const pipeline = await Pipeline.findOne({
                        workspaceId: workspaceId,
                        ...(input.pipelineId ? { _id: input.pipelineId } : {}),
                    }).lean();

                    // Get opportunity stats
                    const opportunities = await Opportunity.find({
                        workspaceId: workspaceId,
                        status: "open",
                    }).lean();

                    const stageStats: Record<string, { count: number; value: number }> = {};
                    let totalValue = 0;
                    let totalCount = 0;

                    opportunities.forEach((o: any) => {
                        const stageId = o.stageId?.toString() || "Unassigned";
                        if (!stageStats[stageId]) {
                            stageStats[stageId] = { count: 0, value: 0 };
                        }
                        stageStats[stageId].count++;
                        stageStats[stageId].value += o.value || 0;
                        totalValue += o.value || 0;
                        totalCount++;
                    });

                    return JSON.stringify({
                        success: true,
                        pipeline: pipeline ? { id: pipeline._id, name: (pipeline as any).name } : null,
                        stats: {
                            totalDeals: totalCount,
                            totalValue,
                            byStage: stageStats,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "get_hot_deals",
            description: "Get the hottest deals based on value, probability, and close date",
            schema: z.object({
                limit: z.number().optional().default(5).describe("Number of deals to return"),
            }),
            func: async (input: any) => {
                try {
                    const opportunities = await Opportunity.find({
                        workspaceId: workspaceId,
                        status: "open",
                    })
                        .sort({ value: -1, probability: -1 })
                        .limit(input.limit || 5)
                        .lean();

                    return JSON.stringify({
                        success: true,
                        hotDeals: opportunities.map((o: any) => ({
                            id: o._id,
                            title: o.title,
                            value: o.value,
                            stageId: o.stageId,
                            probability: o.probability,
                            expectedCloseDate: o.expectedCloseDate,
                            score: ((o.value || 0) / 1000) * ((o.probability || 50) / 100), // Simple heat score
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "win_lose_opportunity",
            description: "Mark an opportunity as won or lost",
            schema: z.object({
                opportunityId: z.string().describe("The opportunity ID"),
                outcome: z.enum(["won", "lost"]).describe("Whether the deal was won or lost"),
                reason: z.string().optional().describe("Reason for the outcome"),
            }),
            func: async (input: any) => {
                try {
                    const opportunity = await Opportunity.findOneAndUpdate(
                        { _id: input.opportunityId, workspaceId: workspaceId },
                        {
                            $set: {
                                status: input.outcome,
                                actualCloseDate: new Date(),
                                lostReason: input.outcome === "lost" ? input.reason : undefined,
                            },
                        },
                        { new: true }
                    );
                    if (!opportunity) {
                        return JSON.stringify({ success: false, error: "Opportunity not found" });
                    }
                    return JSON.stringify({
                        success: true,
                        message: `Marked "${opportunity.title}" as ${input.outcome}`,
                        opportunity: {
                            id: opportunity._id,
                            title: opportunity.title,
                            value: opportunity.value,
                            status: opportunity.status,
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
export function getSalesTools(workspaceId: string, userId: string): any[] {
    return createSalesTools(workspaceId, userId);
}

export function createSalesSubagent(workspaceId: string, userId: string): SubAgent {
    return {
        name: "sales-pipeline",
        description: "Specialized agent for sales pipeline and deal management. Use this for: searching opportunities, managing deals, pipeline analytics, forecasting, and tracking deal stages.",
        systemPrompt: `You are an expert sales pipeline and deal management assistant.

## Your Expertise
- Managing the sales pipeline and deal flow
- Tracking opportunities through stages
- Analyzing pipeline health and metrics
- Identifying hot deals and at-risk opportunities
- Forecasting and reporting

## Behavior Guidelines
1. Always provide value context (total pipeline value, deal sizes)
2. Highlight deals that need attention (stalled, high-value, closing soon)
3. Provide actionable insights, not just data
4. Calculate and share relevant metrics (conversion rates, avg deal size)

## Response Format
- Lead with key metrics and insights
- Use tables for comparative data
- Highlight risks and opportunities in **bold**
- Suggest next steps for deals`,
        tools: createSalesTools(workspaceId, userId),
    };
}
