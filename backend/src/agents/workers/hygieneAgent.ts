/**
 * Pipeline Hygiene Agent
 * 
 * Monitors pipeline health, flags stale deals, suggests stage changes,
 * and prompts reps for updates. Uses Gemini 2.5 Pro for analysis.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Opportunity from "../../models/Opportunity";
import Activity from "../../models/Activity";
import Task from "../../models/Task";
import Pipeline from "../../models/Pipeline";

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

function daysSince(date: Date | undefined): number {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

async function executeHygieneTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "get_stale_deals": {
            const daysInactive = args.daysInactive || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

            const filter: any = {
                workspaceId,
                status: "open",
                $or: [
                    { lastActivityAt: { $lt: cutoffDate } },
                    { lastActivityAt: { $exists: false } },
                ],
            };
            if (args.pipelineId) filter.pipelineId = args.pipelineId;

            const staleDeals = await Opportunity.find(filter)
                .populate("contactId", "firstName lastName email")
                .populate("assignedTo", "name email")
                .sort({ lastActivityAt: 1 })
                .limit(20)
                .lean();

            return {
                success: true,
                count: staleDeals.length,
                daysThreshold: daysInactive,
                deals: staleDeals.map((d: any) => ({
                    id: d._id.toString(),
                    title: d.title,
                    value: d.value,
                    daysInactive: daysSince(d.lastActivityAt),
                    lastActivity: d.lastActivityAt,
                    contact: d.contactId ? `${d.contactId.firstName} ${d.contactId.lastName}` : null,
                    assignedTo: d.assignedTo?.name || "Unassigned",
                    stage: d.stageId,
                })),
            };
        }

        case "suggest_stage_changes": {
            const filter: any = { workspaceId, status: "open" };
            if (args.opportunityId) filter._id = args.opportunityId;

            const deals = await Opportunity.find(filter)
                .populate("contactId", "firstName lastName")
                .limit(args.opportunityId ? 1 : 10)
                .lean();

            const suggestions = [];

            for (const deal of deals) {
                // Get recent activities
                const activities = await Activity.find({ opportunityId: (deal as any)._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();

                // Get pipeline stages for context
                const pipeline = await Pipeline.findById((deal as any).pipelineId).lean();
                const stages = (pipeline as any)?.stages || [];

                // Use AI to analyze - SHORT format
                const analysisPrompt = `Analyze deal stage in MAX 20 words per field:

Deal: ${(deal as any).title} | Value: $${(deal as any).value} | Stage: ${stages.find((s: any) => s._id.toString() === (deal as any).stageId?.toString())?.name || "Unknown"}
Days Inactive: ${daysSince((deal as any).lastActivityAt)} | Temperature: ${(deal as any).dealTemperature || "Unknown"}

Return ONLY JSON: {"RECOMMENDATION": "advance|stay|regress|at_risk|close_lost", "REASON": "brief reason", "SUGGESTED_ACTION": "one action", "CONFIDENCE": 0-100}`;

                try {
                    const analysis = await getProModel().invoke([new HumanMessage(analysisPrompt)]);
                    const content = analysis.content as string;
                    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || "{}");

                    suggestions.push({
                        dealId: (deal as any)._id.toString(),
                        dealTitle: (deal as any).title,
                        value: (deal as any).value,
                        currentStage: stages.find((s: any) => s._id.toString() === (deal as any).stageId?.toString())?.name,
                        recommendation: parsed.RECOMMENDATION || parsed.recommendation,
                        reason: parsed.REASON || parsed.reason,
                        suggestedAction: parsed.SUGGESTED_ACTION || parsed.suggested_action,
                        confidence: parsed.CONFIDENCE || parsed.confidence,
                    });
                } catch (e) {
                    suggestions.push({
                        dealId: (deal as any)._id.toString(),
                        dealTitle: (deal as any).title,
                        recommendation: "review_needed",
                        reason: "Could not analyze automatically",
                    });
                }
            }

            return {
                success: true,
                count: suggestions.length,
                suggestions,
            };
        }

        case "get_pipeline_health": {
            const filter: any = { workspaceId, status: "open" };
            if (args.pipelineId) filter.pipelineId = args.pipelineId;

            const deals = await Opportunity.find(filter).lean();

            // Calculate health metrics
            const now = new Date();
            const totalDeals = deals.length;
            const staleDeals = deals.filter((d: any) => daysSince(d.lastActivityAt) > 7).length;
            const overdueDeals = deals.filter((d: any) =>
                d.expectedCloseDate && new Date(d.expectedCloseDate) < now
            ).length;
            const noNextAction = deals.filter((d: any) => !d.nextAction).length;
            const coldDeals = deals.filter((d: any) => d.dealTemperature === "cold").length;

            const totalValue = deals.reduce((sum, d: any) => sum + (d.value || 0), 0);
            const avgDealAge = deals.reduce((sum, d: any) => sum + daysSince(d.createdAt), 0) / (totalDeals || 1);

            // Health score calculation
            const staleRate = totalDeals > 0 ? (staleDeals / totalDeals) * 100 : 0;
            const overdueRate = totalDeals > 0 ? (overdueDeals / totalDeals) * 100 : 0;
            const noActionRate = totalDeals > 0 ? (noNextAction / totalDeals) * 100 : 0;

            const healthScore = Math.max(0, 100 - (staleRate * 0.4) - (overdueRate * 0.3) - (noActionRate * 0.3));

            // AI recommendations
            const healthPrompt = `Based on these pipeline metrics, provide 3 actionable recommendations:

Total Open Deals: ${totalDeals}
Total Pipeline Value: $${totalValue.toLocaleString()}
Stale Deals (>7 days inactive): ${staleDeals} (${staleRate.toFixed(1)}%)
Overdue Deals (past expected close): ${overdueDeals} (${overdueRate.toFixed(1)}%)
Deals without Next Action: ${noNextAction} (${noActionRate.toFixed(1)}%)
Cold Deals: ${coldDeals}
Average Deal Age: ${avgDealAge.toFixed(0)} days
Health Score: ${healthScore.toFixed(0)}/100

Return JSON array of 3 recommendations: [{"priority": "high|medium|low", "action": "...", "impact": "..."}]`;

            let recommendations = [];
            try {
                const recs = await getProModel().invoke([new HumanMessage(healthPrompt)]);
                recommendations = JSON.parse((recs.content as string).match(/\[[\s\S]*\]/)?.[0] || "[]");
            } catch (e) {
                recommendations = [
                    { priority: "high", action: "Follow up on stale deals", impact: "Re-engage inactive opportunities" },
                ];
            }

            return {
                success: true,
                healthScore: Math.round(healthScore),
                metrics: {
                    totalDeals,
                    totalValue,
                    staleDeals,
                    overdueDeals,
                    noNextAction,
                    coldDeals,
                    avgDealAge: Math.round(avgDealAge),
                },
                recommendations,
            };
        }

        case "create_update_reminders": {
            const { opportunityIds, message } = args;

            if (!opportunityIds || opportunityIds.length === 0) {
                // Get stale deals if no IDs provided
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 7);

                const staleDeals = await Opportunity.find({
                    workspaceId,
                    status: "open",
                    $or: [
                        { lastActivityAt: { $lt: cutoff } },
                        { lastActivityAt: { $exists: false } },
                    ],
                }).limit(10).lean();

                if (staleDeals.length === 0) {
                    return { success: true, message: "No stale deals found. Pipeline is healthy! 🎉" };
                }

                // Create tasks for each stale deal
                const tasks = [];
                for (const deal of staleDeals) {
                    const task = await Task.create({
                        workspaceId,
                        userId: (deal as any).assignedTo || userId,
                        title: `Update deal: ${(deal as any).title}`,
                        description: message || `This deal hasn't been updated in ${daysSince((deal as any).lastActivityAt)} days. Please review and update the status.`,
                        priority: "high",
                        status: "pending",
                        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                        relatedTo: {
                            type: "opportunity",
                            id: (deal as any)._id,
                        },
                    });
                    tasks.push(task);
                }

                return {
                    success: true,
                    message: `Created ${tasks.length} reminder task(s) for stale deals`,
                    tasksCreated: tasks.length,
                };
            }

            // Create tasks for specific deals
            const tasks = [];
            for (const oppId of opportunityIds) {
                const deal = await Opportunity.findById(oppId);
                if (deal) {
                    const task = await Task.create({
                        workspaceId,
                        userId: deal.assignedTo || userId,
                        title: `Update deal: ${deal.title}`,
                        description: message || "Please review and update this deal.",
                        priority: "medium",
                        status: "pending",
                        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        relatedTo: {
                            type: "opportunity",
                            id: deal._id,
                        },
                    });
                    tasks.push(task);
                }
            }

            return {
                success: true,
                message: `Created ${tasks.length} reminder task(s)`,
                tasksCreated: tasks.length,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function hygieneAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🧹 Pipeline Hygiene Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Pipeline Hygiene Agent. Keep the sales pipeline healthy and productive.

Available tools:

1. get_stale_deals - Find deals without recent activity
   Args: { daysInactive?: number (default 7), pipelineId?: string }
   Returns: List of stale deals with last activity info

2. suggest_stage_changes - AI-powered stage movement recommendations
   Args: { opportunityId?: string } (analyzes all if empty)
   Returns: Stage change recommendations with reasoning

3. get_pipeline_health - Overall pipeline health metrics and score
   Args: { pipelineId?: string }
   Returns: Health score 0-100, metrics, AI recommendations

4. create_update_reminders - Create tasks for reps to update stale deals
   Args: { opportunityIds?: string[], message?: string }
   Returns: Tasks created for deal owners

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Show stale deals" → {"tool": "get_stale_deals", "args": {}}
- "Pipeline health" → {"tool": "get_pipeline_health", "args": {}}
- "Which deals should move stages?" → {"tool": "suggest_stage_changes", "args": {}}
- "Remind reps to update" → {"tool": "create_update_reminders", "args": {}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Hygiene AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeHygieneTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (toolCall.tool === "get_stale_deals") {
                if (result.count === 0) {
                    friendlyResponse = "🎉 Great news! No stale deals found. Your pipeline is active!";
                } else {
                    friendlyResponse = `⚠️ Found ${result.count} stale deal(s) (inactive >${result.daysThreshold} days):\n\n${result.deals.map((d: any) =>
                        `• **${d.title}** ($${d.value?.toLocaleString() || 0}) - ${d.daysInactive} days inactive\n  Contact: ${d.contact || "None"} | Owner: ${d.assignedTo}`
                    ).join("\n")
                        }`;
                }
            } else if (toolCall.tool === "get_pipeline_health") {
                const healthEmoji = result.healthScore >= 80 ? "🟢" : result.healthScore >= 60 ? "🟡" : "🔴";
                friendlyResponse = `${healthEmoji} **Pipeline Health Score: ${result.healthScore}/100**

📊 **Metrics:**
• Open Deals: ${result.metrics.totalDeals} ($${result.metrics.totalValue?.toLocaleString() || 0})
• Stale (>7 days): ${result.metrics.staleDeals}
• Overdue: ${result.metrics.overdueDeals}
• No Next Action: ${result.metrics.noNextAction}
• Avg Deal Age: ${result.metrics.avgDealAge} days

💡 **Recommendations:**
${result.recommendations?.map((r: any) => `• [${r.priority?.toUpperCase()}] ${r.action}`).join("\n") || "No recommendations"}`;
            } else if (toolCall.tool === "suggest_stage_changes") {
                if (result.count === 0) {
                    friendlyResponse = "No deals to analyze.";
                } else {
                    friendlyResponse = `🔄 **Stage Change Recommendations:**\n\n${result.suggestions.map((s: any) => {
                        const emoji = s.recommendation === "advance" ? "⬆️" :
                            s.recommendation === "regress" ? "⬇️" :
                                s.recommendation === "at_risk" ? "⚠️" : "➡️";
                        return `${emoji} **${s.dealTitle}** ($${s.value?.toLocaleString() || 0})\n   ${s.recommendation?.toUpperCase()}: ${s.reason}\n   Action: ${s.suggestedAction}`;
                    }).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "create_update_reminders") {
                friendlyResponse = result.message;
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
            messages: [new AIMessage("I can help with pipeline hygiene! Try:\n• 'Show stale deals'\n• 'Check pipeline health'\n• 'Which deals should move stages?'\n• 'Create reminders for stale deals'")],
            finalResponse: "I can help keep your pipeline healthy!",
        };

    } catch (error: any) {
        console.error("❌ Pipeline Hygiene Agent error:", error);
        return { error: error.message, finalResponse: "Error analyzing pipeline. Try again." };
    }
}
