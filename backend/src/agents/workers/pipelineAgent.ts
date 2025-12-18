/**
 * Pipeline Worker Agent
 * 
 * Handles pipeline management: create, add stages, get stats, forecast.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import Pipeline from "../../models/Pipeline";
import Opportunity from "../../models/Opportunity";
import { v4 as uuidv4 } from "uuid";

const pipelineModel = new ChatVertexAI({
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

async function executePipelineTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_pipeline": {
            const { name, stages } = args;

            const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#6B7280"];
            const defaultStages = stages || ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

            const pipeline = await Pipeline.create({
                workspaceId,
                userId,
                name: name || "Sales Pipeline",
                stages: defaultStages.map((stageName: string, index: number) => ({
                    name: stageName,
                    order: index,
                    color: colors[index % colors.length],
                })),
                isDefault: true,
            });

            return {
                success: true,
                pipelineId: pipeline._id.toString(),
                message: `Pipeline "${pipeline.name}" created with ${defaultStages.length} stages`,
            };
        }

        case "list_pipelines": {
            const pipelines = await Pipeline.find({ workspaceId })
                .select("name stages isDefault")
                .lean();

            return {
                success: true,
                count: pipelines.length,
                pipelines: pipelines.map((p: any) => ({
                    id: p._id.toString(),
                    name: p.name,
                    stageCount: p.stages?.length || 0,
                    isDefault: p.isDefault,
                })),
            };
        }

        case "get_pipeline_stats": {
            const { pipelineName } = args;

            let pipeline;
            if (pipelineName) {
                const regex = new RegExp(pipelineName, "i");
                pipeline = await Pipeline.findOne({ workspaceId, name: regex });
            } else {
                pipeline = await Pipeline.findOne({ workspaceId, isDefault: true });
            }

            if (!pipeline) {
                return { success: false, error: "Pipeline not found" };
            }

            const deals = await Opportunity.find({
                workspaceId,
                pipelineId: pipeline._id,
                status: "open",
            }).lean();

            const totalValue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

            // Group by stage
            const stageStats: Record<string, { count: number; value: number }> = {};
            for (const stage of (pipeline.stages as any[])) {
                stageStats[stage.name] = { count: 0, value: 0 };
            }
            for (const deal of deals) {
                const stage = (pipeline.stages as any[]).find((s: any) =>
                    s._id.toString() === (deal as any).stageId?.toString()
                );
                if (stage) {
                    stageStats[stage.name].count++;
                    stageStats[stage.name].value += (deal as any).value || 0;
                }
            }

            return {
                success: true,
                pipeline: pipeline.name,
                stats: {
                    totalDeals: deals.length,
                    totalValue,
                    byStage: stageStats,
                },
            };
        }

        case "add_stage": {
            const { pipelineName, stageName, position } = args;

            const regex = new RegExp(pipelineName, "i");
            const pipeline = await Pipeline.findOne({ workspaceId, name: regex });

            if (!pipeline) {
                return { success: false, error: "Pipeline not found" };
            }

            const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#6B7280"];
            const newStage = {
                name: stageName,
                order: position || (pipeline.stages?.length || 0),
                color: colors[(pipeline.stages?.length || 0) % colors.length],
            };

            (pipeline.stages as any[]).push(newStage);
            await pipeline.save();

            return {
                success: true,
                message: `Added stage "${stageName}" to pipeline "${pipeline.name}"`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function pipelineAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📊 Pipeline Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Pipeline Agent. Manage sales pipelines and analyze deal flow.

Available tools:

1. create_pipeline - Create a new pipeline
   Args: { name?, stages? (array of stage names) }

2. list_pipelines - List all pipelines
   Args: {}

3. get_pipeline_stats - Get pipeline analytics
   Args: { pipelineName? }

4. add_stage - Add a stage to pipeline
   Args: { pipelineName, stageName, position? }

Respond with JSON: {"tool": "...", "args": {...}}`;

        const response = await pipelineModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Pipeline AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executePipelineTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "list_pipelines" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No pipelines found. Create one with: 'Create a sales pipeline'";
                } else {
                    friendlyResponse = `Found ${result.count} pipeline(s):\n${result.pipelines.map((p: any) => `• ${p.name} (${p.stageCount} stages)${p.isDefault ? " ⭐" : ""}`).join("\n")}`;
                }
            } else if (toolCall.tool === "get_pipeline_stats" && result.success) {
                const stages = Object.entries(result.stats.byStage)
                    .map(([name, stats]: [string, any]) => `• ${name}: ${stats.count} deals ($${stats.value.toLocaleString()})`)
                    .join("\n");
                friendlyResponse = `📊 ${result.pipeline}\n\n${result.stats.totalDeals} deals worth $${result.stats.totalValue.toLocaleString()}\n\nBy Stage:\n${stages}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with pipelines! Try:\n• 'Show my pipeline stats'\n• 'Create a pipeline'\n• 'Add a Demo stage to my pipeline'")],
            finalResponse: "I can help with pipelines!",
        };

    } catch (error: any) {
        console.error("❌ Pipeline Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
