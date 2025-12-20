/**
 * Forecast Agent - Revenue Prediction AI
 * 
 * Generates revenue forecasts, identifies trends, detects risks,
 * and creates AI-written executive summaries.
 * Uses Gemini 2.5 Pro for complex analysis.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import Opportunity from "../../models/Opportunity";
import Pipeline from "../../models/Pipeline";
import Activity from "../../models/Activity";

const forecastModel = new ChatVertexAI({
    model: "gemini-2.5-pro",
    temperature: 0.1,
    authOptions: {
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
    },
    safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
});

function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args !== undefined) return parsed;
        }
    } catch (e) { }
    return null;
}

function getDateRange(period: string): { start: Date; end: Date; label: string } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
        case "month":
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            return { start, end, label: now.toLocaleString("default", { month: "long", year: "numeric" }) };
        case "quarter":
            const quarter = Math.floor(now.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            end.setMonth((quarter + 1) * 3, 0);
            return { start, end, label: `Q${quarter + 1} ${now.getFullYear()}` };
        case "year":
            start.setMonth(0, 1);
            end.setMonth(11, 31);
            return { start, end, label: `${now.getFullYear()}` };
        default:
            // Next 30 days
            end.setDate(end.getDate() + 30);
            return { start, end, label: "Next 30 Days" };
    }
}

function daysSince(date: Date | undefined): number {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

async function executeForecastTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "get_forecast": {
            const { period = "month", pipelineId } = args;
            const dateRange = getDateRange(period);

            const filter: any = {
                workspaceId,
                status: "open",
                expectedCloseDate: { $gte: dateRange.start, $lte: dateRange.end },
            };
            if (pipelineId) filter.pipelineId = pipelineId;

            const deals = await Opportunity.find(filter).lean();

            // Calculate forecast categories
            let committed = 0;
            let bestCase = 0;
            let pipeline = 0;
            const dealDetails: any[] = [];

            for (const deal of deals) {
                const d = deal as any;
                const value = d.value || 0;
                const probability = d.probability || 50;
                const daysInactive = daysSince(d.lastActivityAt);

                // Adjust probability based on activity
                let adjustedProb = probability;
                if (daysInactive > 14) adjustedProb *= 0.7;
                if (daysInactive > 30) adjustedProb *= 0.5;

                bestCase += value;
                pipeline += value * (adjustedProb / 100);

                if (probability >= 80 && daysInactive < 14) {
                    committed += value;
                }

                dealDetails.push({
                    title: d.title,
                    value,
                    probability,
                    adjustedProbability: Math.round(adjustedProb),
                    expectedClose: d.expectedCloseDate,
                    category: probability >= 80 ? "committed" : probability >= 50 ? "probable" : "possible",
                });
            }

            // AI insight - SHORT format
            const forecastPrompt = `Analyze this forecast in MAX 50 words:

Period: ${dateRange.label} | Deals: ${deals.length}
Committed: $${committed.toLocaleString()} | Weighted: $${Math.round(pipeline).toLocaleString()} | Best Case: $${bestCase.toLocaleString()}

Return ONLY:
• One-sentence summary
• Biggest risk
• Top deal to focus on
• Confidence: high/medium/low`;

            const analysis = await forecastModel.invoke([new HumanMessage(forecastPrompt)]);

            return {
                success: true,
                period: dateRange.label,
                forecast: {
                    committed,
                    weightedPipeline: Math.round(pipeline),
                    bestCase,
                    dealCount: deals.length,
                },
                deals: dealDetails,
                analysis: analysis.content,
            };
        }

        case "get_trends": {
            const { metric = "deals_won", months = 6 } = args;
            const periods: any[] = [];

            for (let i = months - 1; i >= 0; i--) {
                const start = new Date();
                start.setMonth(start.getMonth() - i, 1);
                const end = new Date(start);
                end.setMonth(end.getMonth() + 1, 0);

                let value = 0;
                let count = 0;

                switch (metric) {
                    case "deals_won":
                        const won = await Opportunity.countDocuments({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        });
                        value = won;
                        count = won;
                        break;
                    case "revenue":
                        const wonDeals = await Opportunity.find({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        }).lean();
                        value = wonDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
                        count = wonDeals.length;
                        break;
                    case "avg_deal_size":
                        const allWon = await Opportunity.find({
                            workspaceId,
                            status: "won",
                            actualCloseDate: { $gte: start, $lte: end },
                        }).lean();
                        value = allWon.length > 0
                            ? allWon.reduce((sum, d: any) => sum + (d.value || 0), 0) / allWon.length
                            : 0;
                        count = allWon.length;
                        break;
                    case "win_rate":
                        const wonCount = await Opportunity.countDocuments({
                            workspaceId,
                            status: "won",
                            updatedAt: { $gte: start, $lte: end },
                        });
                        const lostCount = await Opportunity.countDocuments({
                            workspaceId,
                            status: "lost",
                            updatedAt: { $gte: start, $lte: end },
                        });
                        value = (wonCount + lostCount) > 0
                            ? Math.round((wonCount / (wonCount + lostCount)) * 100)
                            : 0;
                        count = wonCount + lostCount;
                        break;
                }

                periods.push({
                    period: start.toLocaleString("default", { month: "short", year: "numeric" }),
                    value: Math.round(value),
                    count,
                });
            }

            // Calculate trend
            const values = periods.map(p => p.value);
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
            const trendDirection = secondAvg > firstAvg ? "up" : secondAvg < firstAvg ? "down" : "stable";
            const trendPercent = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;

            // AI analysis - SHORT format
            const trendPrompt = `Analyze in MAX 30 words:

${metric.replace("_", " ").toUpperCase()}: ${periods.map(p => `${p.period}=${p.value}`).join(", ")}
Trend: ${trendDirection} ${Math.abs(trendPercent)}%

Return: One insight + one action item.`;

            const trendAnalysis = await forecastModel.invoke([new HumanMessage(trendPrompt)]);

            return {
                success: true,
                metric,
                periods,
                trend: {
                    direction: trendDirection,
                    percentChange: trendPercent,
                },
                analysis: trendAnalysis.content,
            };
        }

        case "get_risk_alerts": {
            const { threshold = 30 } = args;

            const openDeals = await Opportunity.find({
                workspaceId,
                status: "open",
            }).populate("contactId", "firstName lastName").lean();

            const riskyDeals: any[] = [];

            for (const deal of openDeals) {
                const d = deal as any;
                const risks: string[] = [];
                let riskScore = 0;

                // Check for risk factors
                if (daysSince(d.lastActivityAt) > 14) {
                    risks.push(`No activity for ${daysSince(d.lastActivityAt)} days`);
                    riskScore += 25;
                }
                if (d.expectedCloseDate && new Date(d.expectedCloseDate) < new Date()) {
                    risks.push("Past expected close date");
                    riskScore += 30;
                }
                if (!d.nextAction) {
                    risks.push("No next action defined");
                    riskScore += 15;
                }
                if (d.dealTemperature === "cold") {
                    risks.push("Deal marked as cold");
                    riskScore += 20;
                }
                if ((d.probability || 50) < 30) {
                    risks.push("Low probability");
                    riskScore += 15;
                }

                if (riskScore >= threshold) {
                    riskyDeals.push({
                        id: d._id.toString(),
                        title: d.title,
                        value: d.value,
                        contact: d.contactId ? `${d.contactId.firstName} ${d.contactId.lastName}` : null,
                        riskScore,
                        risks,
                        recommendation: riskScore > 60
                            ? "Urgent: Schedule immediate follow-up or consider closing"
                            : "Action needed: Re-engage within 48 hours",
                    });
                }
            }

            riskyDeals.sort((a, b) => (b.value * b.riskScore) - (a.value * a.riskScore));

            return {
                success: true,
                totalAtRisk: riskyDeals.length,
                totalValueAtRisk: riskyDeals.reduce((sum, d) => sum + (d.value || 0), 0),
                deals: riskyDeals.slice(0, 10),
            };
        }

        case "generate_executive_summary": {
            const { reportType = "weekly" } = args;

            // Gather data
            const now = new Date();
            const periodStart = new Date();
            periodStart.setDate(now.getDate() - (reportType === "weekly" ? 7 : reportType === "monthly" ? 30 : 90));

            const [
                newDeals,
                wonDeals,
                lostDeals,
                openDeals,
                activities,
            ] = await Promise.all([
                Opportunity.countDocuments({ workspaceId, createdAt: { $gte: periodStart } }),
                Opportunity.find({ workspaceId, status: "won", actualCloseDate: { $gte: periodStart } }).lean(),
                Opportunity.countDocuments({ workspaceId, status: "lost", updatedAt: { $gte: periodStart } }),
                Opportunity.find({ workspaceId, status: "open" }).lean(),
                Activity.countDocuments({ workspaceId, createdAt: { $gte: periodStart } }),
            ]);

            const wonValue = wonDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
            const pipelineValue = openDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
            const winRate = (wonDeals.length + lostDeals) > 0
                ? Math.round((wonDeals.length / (wonDeals.length + lostDeals)) * 100)
                : 0;

            // SHORT executive summary
            const summaryPrompt = `Write a ${reportType} sales summary in MAX 80 words.

DATA: New=${newDeals} | Won=${wonDeals.length} ($${wonValue.toLocaleString()}) | Lost=${lostDeals} | Win Rate=${winRate}% | Pipeline=$${pipelineValue.toLocaleString()}

Format:
**Headline:** [One attention-grabbing line]
**Wins:** [Key achievement]
**Watch:** [Main concern]
**Focus:** [Top priority this week]`;

            const summary = await forecastModel.invoke([new HumanMessage(summaryPrompt)]);

            return {
                success: true,
                reportType,
                period: `${periodStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                metrics: {
                    newDeals,
                    dealsWon: wonDeals.length,
                    wonValue,
                    dealsLost: lostDeals,
                    winRate,
                    openPipeline: openDeals.length,
                    pipelineValue,
                    activities,
                },
                summary: summary.content,
            };
        }

        case "compare_periods": {
            const { metric = "revenue", period1, period2 } = args;

            // Default to this month vs last month if not specified
            const thisMonth = new Date();
            thisMonth.setDate(1);
            const lastMonth = new Date(thisMonth);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const p1Start = period1 ? new Date(period1) : lastMonth;
            const p1End = new Date(p1Start);
            p1End.setMonth(p1End.getMonth() + 1);

            const p2Start = period2 ? new Date(period2) : thisMonth;
            const p2End = new Date(p2Start);
            p2End.setMonth(p2End.getMonth() + 1);

            let value1 = 0;
            let value2 = 0;

            if (metric === "revenue") {
                const deals1 = await Opportunity.find({
                    workspaceId,
                    status: "won",
                    actualCloseDate: { $gte: p1Start, $lt: p1End },
                }).lean();
                const deals2 = await Opportunity.find({
                    workspaceId,
                    status: "won",
                    actualCloseDate: { $gte: p2Start, $lt: p2End },
                }).lean();
                value1 = deals1.reduce((sum, d: any) => sum + (d.value || 0), 0);
                value2 = deals2.reduce((sum, d: any) => sum + (d.value || 0), 0);
            } else {
                value1 = await Opportunity.countDocuments({
                    workspaceId,
                    status: "won",
                    actualCloseDate: { $gte: p1Start, $lt: p1End },
                });
                value2 = await Opportunity.countDocuments({
                    workspaceId,
                    status: "won",
                    actualCloseDate: { $gte: p2Start, $lt: p2End },
                });
            }

            const change = value1 > 0 ? Math.round(((value2 - value1) / value1) * 100) : 0;

            return {
                success: true,
                metric,
                period1: { label: p1Start.toLocaleString("default", { month: "long" }), value: value1 },
                period2: { label: p2Start.toLocaleString("default", { month: "long" }), value: value2 },
                change: {
                    absolute: value2 - value1,
                    percentage: change,
                    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
                },
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function forecastAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📊 Forecast Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Forecasting Agent. Predict revenue and analyze sales trends.

Available tools:

1. get_forecast - Revenue prediction for a period
   Args: { period?: "month" | "quarter" | "year", pipelineId?: string }
   Returns: Forecast with committed, pipeline, best case

2. get_trends - Analyze metrics over time
   Args: { metric?: "deals_won" | "revenue" | "avg_deal_size" | "win_rate", months?: number }
   Returns: Trend data with analysis

3. get_risk_alerts - Find deals at risk
   Args: { threshold?: number (0-100) }
   Returns: At-risk deals with risk factors

4. generate_executive_summary - AI-written report
   Args: { reportType?: "weekly" | "monthly" | "quarterly" }
   Returns: Executive summary narrative

5. compare_periods - Compare metrics between periods
   Args: { metric?: string, period1?: string, period2?: string }
   Returns: Period comparison with change %

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "What's our Q1 forecast?" → {"tool": "get_forecast", "args": {"period": "quarter"}}
- "Show revenue trends" → {"tool": "get_trends", "args": {"metric": "revenue"}}
- "Which deals are at risk?" → {"tool": "get_risk_alerts", "args": {}}
- "Weekly summary" → {"tool": "generate_executive_summary", "args": {"reportType": "weekly"}}`;

        const response = await forecastModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Forecast AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeForecastTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "get_forecast") {
                friendlyResponse = `📊 **${result.period} Forecast**

| Category | Amount | Deals |
|----------|--------|-------|
| Committed | $${result.forecast.committed.toLocaleString()} | ${result.deals.filter((d: any) => d.category === "committed").length} |
| Weighted Pipeline | $${result.forecast.weightedPipeline.toLocaleString()} | ${result.forecast.dealCount} |
| Best Case | $${result.forecast.bestCase.toLocaleString()} | ${result.forecast.dealCount} |

${result.analysis}`;
            } else if (toolCall.tool === "get_trends") {
                const trendEmoji = result.trend.direction === "up" ? "📈" : result.trend.direction === "down" ? "📉" : "➡️";
                friendlyResponse = `${trendEmoji} **${result.metric.replace("_", " ").toUpperCase()} Trend** (${result.trend.direction} ${Math.abs(result.trend.percentChange)}%)

${result.periods.map((p: any) => `• ${p.period}: ${p.value.toLocaleString()}`).join("\n")}

${result.analysis}`;
            } else if (toolCall.tool === "get_risk_alerts") {
                if (result.totalAtRisk === 0) {
                    friendlyResponse = "✅ No high-risk deals found. Pipeline looks healthy!";
                } else {
                    friendlyResponse = `⚠️ **${result.totalAtRisk} Deals at Risk** ($${result.totalValueAtRisk.toLocaleString()} total value)

${result.deals.map((d: any) =>
                        `🔴 **${d.title}** ($${d.value?.toLocaleString() || 0}) - Risk Score: ${d.riskScore}
   Issues: ${d.risks.join(", ")}
   ${d.recommendation}`
                    ).join("\n\n")}`;
                }
            } else if (toolCall.tool === "generate_executive_summary") {
                friendlyResponse = `📋 **${result.reportType.charAt(0).toUpperCase() + result.reportType.slice(1)} Executive Summary**
*${result.period}*

**Key Metrics:**
• New Deals: ${result.metrics.newDeals}
• Won: ${result.metrics.dealsWon} ($${result.metrics.wonValue.toLocaleString()})
• Lost: ${result.metrics.dealsLost}
• Win Rate: ${result.metrics.winRate}%
• Open Pipeline: $${result.metrics.pipelineValue.toLocaleString()}

---

${result.summary}`;
            } else if (toolCall.tool === "compare_periods") {
                const changeEmoji = result.change.direction === "up" ? "📈" : result.change.direction === "down" ? "📉" : "➡️";
                friendlyResponse = `${changeEmoji} **${result.metric.toUpperCase()} Comparison**

• ${result.period1.label}: ${result.metric === "revenue" ? "$" : ""}${result.period1.value.toLocaleString()}
• ${result.period2.label}: ${result.metric === "revenue" ? "$" : ""}${result.period2.value.toLocaleString()}

**Change:** ${result.change.direction === "up" ? "+" : ""}${result.change.percentage}% (${result.change.direction === "up" ? "+" : ""}${result.metric === "revenue" ? "$" : ""}${result.change.absolute.toLocaleString()})`;
            } else {
                friendlyResponse = result.message || JSON.stringify(result);
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with forecasting! Try:\n• 'Show this month's forecast'\n• 'Revenue trends over 6 months'\n• 'Which deals are at risk?'\n• 'Weekly executive summary'")],
            finalResponse: "I can help with revenue forecasting!",
        };

    } catch (error: any) {
        console.error("❌ Forecast Agent error:", error);
        return { error: error.message, finalResponse: "Error generating forecast. Try again." };
    }
}
