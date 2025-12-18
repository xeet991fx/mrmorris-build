/**
 * Deal Worker Agent
 * 
 * Handles deal/pipeline CRM operations: create, update, move stages.
 * Uses Google Vertex AI with Gemini 2.5 Flash.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import Opportunity from "../../models/Opportunity";
import Pipeline from "../../models/Pipeline";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";

// Initialize Gemini 2.5 Pro via Vertex AI
const dealModel = new ChatVertexAI({
    model: "gemini-2.5-pro",
    temperature: 0,
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

/**
 * Parse tool call from AI response
 */
function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args) return parsed;
        }
    } catch (e) { }
    return null;
}

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
                const searchRegex = new RegExp(contactName, "i");
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
                const searchRegex = new RegExp(query, "i");
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

        const systemPrompt = `You are a CRM Deal Agent. Analyze the user's request and decide which tool to use.

Available tools:
1. create_deal - Create a new deal. Args: { title, value, contactName?, stage?, notes? }
2. search_deals - Search deals. Args: { query?, status? }
3. update_deal - Update a deal. Args: { dealId, updates }
4. move_deal_stage - Move deal to new stage. Args: { dealId, newStage }
5. get_deal_summary - Get pipeline summary. Args: {}

Instructions:
- Extract relevant information from the user's request
- Respond with a JSON object: {"tool": "...", "args": {...}}

Respond with ONLY the JSON object, no other text.`;

        const response = await dealModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Deal AI Response:", responseText);

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

            let friendlyResponse = "";
            if (result.success) {
                if (toolCall.tool === "create_deal") {
                    friendlyResponse = result.message;
                } else if (toolCall.tool === "search_deals") {
                    if (result.count === 0) {
                        friendlyResponse = "No deals found.";
                    } else {
                        friendlyResponse = `Found ${result.count} deal(s):\n${result.deals.map((d: any) => `• ${d.title} - $${d.value} (${d.status})${d.contact ? ` with ${d.contact}` : ""}`).join("\n")}`;
                    }
                } else if (toolCall.tool === "update_deal" || toolCall.tool === "move_deal_stage") {
                    friendlyResponse = result.message;
                } else if (toolCall.tool === "get_deal_summary") {
                    friendlyResponse = `📊 Pipeline Summary:\n• Open Deals: ${result.summary.openDeals}\n• Total Value: $${result.summary.totalPipelineValue.toLocaleString()}`;
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help you create deals, search deals, move stages, or get pipeline summaries. What would you like to do?")],
            finalResponse: "I can help you create deals, search deals, move stages, or get pipeline summaries. What would you like to do?",
        };

    } catch (error: any) {
        console.error("❌ Deal Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error processing your deal request. Please try again.",
        };
    }
}
