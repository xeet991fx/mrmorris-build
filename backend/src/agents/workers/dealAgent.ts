/**
 * Deal Worker Agent
 * 
 * Handles deal/pipeline CRM operations: create, update, move stages.
 * Uses Google Vertex AI with Gemini 2.5 Flash.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import Opportunity from "../../models/Opportunity";
import Pipeline from "../../models/Pipeline";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";
import { createSafeRegex } from "../utils/escapeRegex";

/**
 * Execute deal tools
 */
async function executeDealTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_deal": {
            const { title, value, contactName, stage, notes } = args;

            // Find the default pipeline
            let pipeline = await Pipeline.findOne({ workspaceId, isDefault: true });
            if (!pipeline) {
                pipeline = await Pipeline.findOne({ workspaceId });
            }
            if (!pipeline) {
                return { success: false, error: "No pipeline found. Please create a pipeline first." };
            }

            // Find contact if specified
            let contactId = null;
            if (contactName) {
                const searchRegex = createSafeRegex(contactName);
                const contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
                });
                if (contact) contactId = contact._id;
            }

            // Get the first stage if not specified
            const stageId = stage || (pipeline.stages && pipeline.stages[0]?._id);

            const deal = await Opportunity.create({
                workspaceId,
                userId,
                title,
                value: value || 0,
                pipelineId: pipeline._id,
                stageId,
                contactId,
                status: "open",
                notes: notes || "",
            });

            await eventPublisher.publish("deal.created", {
                dealId: deal._id.toString(),
                title: deal.title,
                value: deal.value,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                dealId: deal._id.toString(),
                message: `Deal "${title}" created with value $${value || 0}`,
            };
        }

        case "search_deals": {
            const { query, status } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (query) {
                const searchRegex = createSafeRegex(query);
                filter.title = searchRegex;
            }

            const deals = await Opportunity.find(filter)
                .populate("contactId", "firstName lastName")
                .select("title value status stageId")
                .limit(10)
                .lean();

            return {
                success: true,
                count: deals.length,
                deals: deals.map((d: any) => ({
                    id: d._id.toString(),
                    title: d.title,
                    value: d.value,
                    status: d.status,
                    contact: d.contactId ? `${d.contactId.firstName} ${d.contactId.lastName}` : null,
                })),
            };
        }

        case "update_deal": {
            const { dealId, updates } = args;

            const deal = await Opportunity.findOneAndUpdate(
                { _id: dealId, workspaceId },
                { $set: updates },
                { new: true }
            );

            if (!deal) {
                return { success: false, error: "Deal not found" };
            }

            await eventPublisher.publish("deal.updated", {
                dealId: deal._id.toString(),
                updates,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Deal "${deal.title}" updated successfully`,
            };
        }

        case "move_deal_stage": {
            const { dealId, newStage } = args;

            const deal = await Opportunity.findOne({ _id: dealId, workspaceId });
            if (!deal) {
                return { success: false, error: "Deal not found" };
            }

            const pipeline = await Pipeline.findById(deal.pipelineId);
            if (!pipeline) {
                return { success: false, error: "Pipeline not found" };
            }

            // Find the stage by name
            const targetStage = (pipeline.stages as any[]).find(
                (s: any) => s.name.toLowerCase().includes(newStage.toLowerCase())
            );

            if (!targetStage) {
                const stageNames = (pipeline.stages as any[]).map((s: any) => s.name).join(", ");
                return { success: false, error: `Stage "${newStage}" not found. Available: ${stageNames}` };
            }

            deal.stageId = targetStage._id;
            await deal.save();

            await eventPublisher.publish("deal.stage_changed", {
                dealId: deal._id.toString(),
                newStage: targetStage.name,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Deal "${deal.title}" moved to "${targetStage.name}"`,
            };
        }

        case "get_deal_summary": {
            const deals = await Opportunity.find({ workspaceId, status: "open" })
                .select("title value status")
                .lean();

            const totalValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            const count = deals.length;

            return {
                success: true,
                summary: {
                    openDeals: count,
                    totalPipelineValue: totalValue,
                },
            };
        }

        case "delete_deal": {
            const { dealId, dealName } = args;

            let deal;
            if (dealId) {
                deal = await Opportunity.findOneAndDelete({ _id: dealId, workspaceId });
            } else if (dealName) {
                const searchRegex = createSafeRegex(dealName);
                deal = await Opportunity.findOneAndDelete({ workspaceId, title: searchRegex });
            }

            if (!deal) {
                return { success: false, error: `Deal not found` };
            }

            await eventPublisher.publish("deal.deleted", {
                dealId: deal._id.toString(),
                title: deal.title,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Deal "${deal.title}" deleted successfully 🗑️`,
            };
        }

        case "bulk_delete_deals": {
            const { status, olderThanDays, stage } = args;

            const filter: any = { workspaceId };

            if (status) filter.status = status;
            if (stage) filter.stage = createSafeRegex(stage);
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!status && !stage && !olderThanDays) {
                return { success: false, error: "Please specify status, stage, or olderThanDays to bulk delete" };
            }

            const result = await Opportunity.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} deal(s) 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Deal Agent Node
 */
export async function dealAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("💰 Deal Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // PHASE 1: AUTONOMOUS CONTEXT GATHERING
        console.log("🧠 Gathering deal pipeline context...");

        const [existingDeals, Deal] = await Promise.all([
            (await import("../../models/Deal")).default.find({ workspaceId: state.workspaceId })
                .select("title value stage status contactId createdAt")
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            (await import("../../models/Deal")).default
        ]);

        const getTimeAgo = (date: any): string => {
            if (!date) return "unknown";
            const diffMs = new Date().getTime() - new Date(date).getTime();
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return `${Math.floor(diffDays / 7)}w ago`;
        };

        const dealContext = existingDeals.length > 0
            ? `EXISTING DEALS (sorted NEWEST first):\n${existingDeals.map((d: any, i: number) => {
                const timeAgo = getTimeAgo(d.createdAt);
                const isNewest = i === 0 ? " 🆕 LATEST" : "";
                return `${i + 1}. "${d.title}" - $${d.value} (${d.stage || "unknown stage"}) - Created ${timeAgo}${isNewest}`;
              }).join('\n')}`
            : "No deals found. This will be the first deal.";

        const totalValue = existingDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
        const avgValue = existingDeals.length > 0 ? Math.round(totalValue / existingDeals.length) : 0;
        const pipelineStats = `\nPipeline Stats: ${existingDeals.length} deals, Total value: $${totalValue.toLocaleString()}, Avg: $${avgValue.toLocaleString()}`;

        console.log("✓ Pipeline context gathered");

        // PHASE 2: INTELLIGENT SYSTEM PROMPT
        const systemPrompt = `You are an ELITE Sales Pipeline Manager powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: You analyze REAL pipeline data and make INTELLIGENT decisions.

📊 CURRENT PIPELINE CONTEXT:
${dealContext}${pipelineStats}

USER REQUEST: "${userRequest}"

🧠 YOUR AUTONOMOUS PROCESS:

STEP 1: INTENT ANALYSIS
- CREATE new deal?
- SEARCH/FIND deals?
- UPDATE/MOVE deal stage?
- DELETE deal(s)?
- GET pipeline summary?

STEP 2: CONTEXTUAL INTELLIGENCE
- Check EXISTING DEALS for patterns
- If creating: Compare value to average ($${avgValue})
- If deleting latest: #1 is newest (marked 🆕)
- Identify stale/at-risk deals

STEP 3: SMART INSIGHTS
- Flag high-value deals (>avg)
- Suggest stages based on context
- Avoid duplicates

🔧 AVAILABLE TOOLS:

1. create_deal - { title, value, contactName?, stage? }
2. search_deals - { query?, status? }
3. update_deal - { dealId, updates }
4. move_deal_stage - { dealId, newStage }
5. get_deal_summary - {}
6. delete_deal - { dealId?, dealName? }
7. bulk_delete_deals - { status?, stage?, olderThanDays? }

💡 EXAMPLES OF INTELLIGENCE:

❌ BAD: "Created deal for $50,000"
✅ GOOD: "Created $50K deal - This is above your average deal size ($${avgValue.toLocaleString()}), marking as high-value opportunity 🎯"

📝 RESPONSE FORMAT:

ANALYSIS:
[Your thinking: What is user asking? Any value insights? Which deal if deleting?]

JSON:
{"tool": "tool_name", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Deal AI Response (first 300 chars):", responseText.substring(0, 300));

        // PHASE 3: EXTRACT REASONING
        const analysisMatch = responseText.match(/ANALYSIS:(.*?)(?=JSON:|$)/s);
        const aiAnalysis = analysisMatch ? analysisMatch[1].trim() : "";
        if (aiAnalysis) console.log("🧠 AI Analysis:", aiAnalysis.substring(0, 150));

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            console.log(`🔧 Executing deal tool: ${toolCall.tool}`);

            const result = await executeDealTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Deal tool result:", result);

            // PHASE 4: CONTEXTUAL RESPONSE
            let friendlyResponse = "";
            if (result.success) {
                if (toolCall.tool === "create_deal") {
                    const value = toolCall.args.value || 0;
                    const highValue = value > avgValue ? " 🎯 (High-value!)" : "";
                    friendlyResponse = `✅ ${result.message}${highValue}`;
                } else if (toolCall.tool === "delete_deal") {
                    friendlyResponse = `✅ ${result.message}`;
                } else if (toolCall.tool === "search_deals") {
                    if (result.count === 0) {
                        friendlyResponse = "No deals found matching your criteria.";
                    } else {
                        friendlyResponse = `Found **${result.count} deal(s)**:\n${result.deals.map((d: any) => `• **${d.title}** - $${d.value.toLocaleString()} (${d.status})${d.contact ? ` with ${d.contact}` : ""}`).join("\n")}`;
                    }
                } else if (toolCall.tool === "update_deal" || toolCall.tool === "move_deal_stage") {
                    friendlyResponse = `✅ ${result.message}`;
                } else if (toolCall.tool === "get_deal_summary") {
                    friendlyResponse = `📊 **Pipeline Summary**\n• Open Deals: ${result.summary.openDeals}\n• Total Value: $${result.summary.totalPipelineValue.toLocaleString()}\n• Average: $${avgValue.toLocaleString()}`;
                } else {
                    friendlyResponse = result.message || "Done!";
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result, aiAnalysis: aiAnalysis || null },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help manage your sales pipeline! Try:\n• 'Create a $50k deal with Acme Corp'\n• 'Show my high-value deals'\n• 'Delete the latest deal'\n• 'Get pipeline summary'")],
            finalResponse: "I can help manage your sales pipeline!",
        };

    } catch (error: any) {
        console.error("❌ Deal Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error processing your deal request. Please try again.",
        };
    }
}
