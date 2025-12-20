/**
 * Pipeline Worker Agent
 * 
 * Handles pipeline management: create, add stages, get stats, forecast.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Pipeline from "../../models/Pipeline";
import Opportunity from "../../models/Opportunity";
import { v4 as uuidv4 } from "uuid";
import { createSafeRegex } from "../utils/escapeRegex";

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
                const regex = createSafeRegex(pipelineName);
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

            const regex = createSafeRegex(pipelineName);
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

        case "delete_pipeline": {
            const { pipelineName } = args;

            const regex = createSafeRegex(pipelineName);

            // Check if there are deals in this pipeline
            const pipeline = await Pipeline.findOne({ workspaceId, name: regex });
            if (!pipeline) {
                return { success: false, error: `Pipeline "${pipelineName}" not found` };
            }

            const dealsCount = await Opportunity.countDocuments({ pipelineId: pipeline._id });
            if (dealsCount > 0) {
                return { success: false, error: `Cannot delete pipeline with ${dealsCount} active deals. Move or delete deals first.` };
            }

            await Pipeline.findByIdAndDelete(pipeline._id);

            return {
                success: true,
                message: `Pipeline "${pipeline.name}" deleted successfully 🗑️`,
            };
        }

        case "delete_stage": {
            const { pipelineName, stageName } = args;

            const regex = createSafeRegex(pipelineName);
            const pipeline = await Pipeline.findOne({ workspaceId, name: regex });

            if (!pipeline) {
                return { success: false, error: `Pipeline "${pipelineName}" not found` };
            }

            const stageIndex = (pipeline.stages as any[]).findIndex(
                (s: any) => s.name.toLowerCase().includes(stageName.toLowerCase())
            );

            if (stageIndex === -1) {
                return { success: false, error: `Stage "${stageName}" not found in pipeline` };
            }

            const removedStage = (pipeline.stages as any[])[stageIndex];

            // Check for deals in this stage
            const dealsInStage = await Opportunity.countDocuments({
                pipelineId: pipeline._id,
                stageId: removedStage._id
            });

            if (dealsInStage > 0) {
                return { success: false, error: `Cannot delete stage with ${dealsInStage} deals. Move deals first.` };
            }

            (pipeline.stages as any[]).splice(stageIndex, 1);
            await pipeline.save();

            return {
                success: true,
                message: `Stage "${removedStage.name}" deleted from pipeline 🗑️`,
            };
        }

        case "rename_stage": {
            const { pipelineName, stageName, newName } = args;

            const regex = createSafeRegex(pipelineName);
            const pipeline = await Pipeline.findOne({ workspaceId, name: regex });

            if (!pipeline) {
                return { success: false, error: `Pipeline "${pipelineName}" not found` };
            }

            const stage = (pipeline.stages as any[]).find(
                (s: any) => s.name.toLowerCase().includes(stageName.toLowerCase())
            );

            if (!stage) {
                return { success: false, error: `Stage "${stageName}" not found` };
            }

            const oldName = stage.name;
            stage.name = newName;
            await pipeline.save();

            return {
                success: true,
                message: `Stage "${oldName}" renamed to "${newName}" ✏️`,
            };
        }

        case "reorder_stages": {
            const { pipelineName, stageOrder } = args;

            const regex = createSafeRegex(pipelineName);
            const pipeline = await Pipeline.findOne({ workspaceId, name: regex });

            if (!pipeline) {
                return { success: false, error: `Pipeline "${pipelineName}" not found` };
            }

            if (!Array.isArray(stageOrder)) {
                return { success: false, error: "stageOrder must be an array of stage names" };
            }

            const stages = pipeline.stages as any[];
            const newOrder: any[] = [];

            for (const stageName of stageOrder) {
                const stage = stages.find(
                    (s: any) => s.name.toLowerCase() === stageName.toLowerCase()
                );
                if (stage) newOrder.push(stage);
            }

            // Add any stages not in the order to the end
            for (const stage of stages) {
                if (!newOrder.includes(stage)) newOrder.push(stage);
            }

            // Update positions
            newOrder.forEach((s, i) => s.position = i);
            pipeline.stages = newOrder;
            await pipeline.save();

            return {
                success: true,
                message: `Pipeline stages reordered: ${newOrder.map((s: any) => s.name).join(" → ")} ✅`,
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

        const systemPrompt = `You are a CRM Pipeline Agent. Manage sales pipelines and stages.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Available tools:
1. create_pipeline - Args: { name?, stages? }
2. list_pipelines - Args: {}
3. get_pipeline_stats - Args: { pipelineName? }
4. add_stage - Args: { pipelineName, stageName, position? }
5. delete_pipeline - Args: { pipelineName }
6. delete_stage - Args: { pipelineName, stageName }
7. rename_stage - Rename a stage. Args: { pipelineName, stageName, newName }
8. reorder_stages - Reorder stages. Args: { pipelineName, stageOrder: ["stage1", "stage2", ...] }

Examples:
- "rename Proposal to Quote in Sales pipeline" → {"tool": "rename_stage", "args": {"pipelineName": "Sales", "stageName": "Proposal", "newName": "Quote"}}
- "reorder Sales stages" → {"tool": "reorder_stages", "args": {"pipelineName": "Sales", "stageOrder": ["Lead", "Demo", "Proposal", "Won"]}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
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
            messages: [new AIMessage("I can help with pipelines! Try:\n• 'Delete the old pipeline'\n• 'Remove Proposal stage from Sales'\n• 'Show pipeline stats'")],
            finalResponse: "I can help with pipelines!",
        };

    } catch (error: any) {
        console.error("❌ Pipeline Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
