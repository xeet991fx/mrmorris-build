/**
 * Dynamic Agent - Handles ANY request by discovering and using tools on-the-fly
 * 
 * This agent NEVER crashes. It:
 * 1. Discovers available models in real-time
 * 2. Analyzes user intent with AI
 * 3. Maps requests to appropriate models
 * 4. Executes operations dynamically
 * 5. Falls back gracefully if anything fails
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { discoverModels, safeImportModel, findBestModel, extractEntity } from "../utils/modelDiscovery";

export async function dynamicAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🔮 Dynamic Agent - Analyzing request dynamically...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // PHASE 1: Discover what models are available
        const availableModels = discoverModels();
        console.log(`📦 Available models (${availableModels.length}):`, availableModels.slice(0, 10).join(', '), '...');

        // PHASE 2: Extract entity from request
        const entity = extractEntity(userRequest);
        console.log(`🎯 Extracted entity:`, entity);

        // PHASE 3: Find best model match
        let bestModel: string | null = null;
        if (entity) {
            bestModel = findBestModel(entity, availableModels);
        }

        // PHASE 4: If no direct match, ask AI to analyze
        if (!bestModel) {
            console.log("🤖 No direct match, asking AI to analyze...");

            const analysisPrompt = `You are analyzing a CRM request. Figure out what the user wants.

USER REQUEST: "${userRequest}"

AVAILABLE MODELS: ${availableModels.slice(0, 30).join(', ')}

Respond with ONLY a JSON object:
{
  "action": "create|search|update|delete|get|help",
  "entity": "what they want to work with",
  "bestModel": "best matching model from available list or null",
  "canFulfill": true|false,
  "reasoning": "brief explanation"
}`;

            try {
                const analysis = await getProModel().invoke([
                    new SystemMessage(analysisPrompt),
                    new HumanMessage(userRequest),
                ]);

                const responseText = analysis.content as string;
                const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

                if (jsonMatch) {
                    const intent = JSON.parse(jsonMatch[0]);
                    console.log("🧠 AI Analysis:", intent);

                    if (intent.bestModel && availableModels.includes(intent.bestModel)) {
                        bestModel = intent.bestModel;
                    }

                    if (!intent.canFulfill) {
                        return {
                            messages: [new AIMessage(`I understand, but ${intent.reasoning}. Can you try rephrasing?`)],
                            finalResponse: `Cannot fulfill: ${intent.reasoning}`,
                        };
                    }
                }
            } catch (analyError) {
                console.warn("AI analysis failed, continuing with fallback");
            }
        }

        // PHASE 5: If we found a model, try to use it
        if (bestModel) {
            console.log(`✅ Using model: ${bestModel}`);

            const Model = await safeImportModel(bestModel);

            if (Model) {
                // Determine action from request
                const action = determineAction(userRequest);

                let result: any;
                switch (action) {
                    case 'create':
                        result = await executeCreate(Model, userRequest, state.workspaceId, state.userId);
                        break;
                    case 'search':
                    case 'get':
                    case 'find':
                        result = await executeSearch(Model, userRequest, state.workspaceId);
                        break;
                    default:
                        result = {
                            success: true,
                            message: `I can work with ${bestModel} records. Try asking me to create, search, or get them.`
                        };
                }

                const responseMessage = result.success
                    ? result.message
                    : `Sorry, I couldn't complete that: ${result.error}`;

                return {
                    messages: [new AIMessage(responseMessage)],
                    finalResponse: responseMessage,
                };
            }
        }

        // PHASE 6: Fallback - provide helpful guidance
        const helpMessage = entity
            ? `I understand you want to work with "${entity}", but I'm not sure how to handle that yet. Available features: contacts, companies, deals, tasks, tickets, campaigns, workflows.`
            : `I'm here to help! Try asking me to:\n• Create a deal\n• Search contacts\n• Add a task\n• Find companies\n• Create a ticket`;

        return {
            messages: [new AIMessage(helpMessage)],
            finalResponse: helpMessage,
        };

    } catch (error: any) {
        console.error("❌ Dynamic Agent error:", error);

        // NEVER crash - always return something useful
        const fallbackMessage = "I encountered an issue, but I'm still here to help. Try asking me to create a contact, deal, or task.";

        return {
            messages: [new AIMessage(fallbackMessage)],
            finalResponse: fallbackMessage,
            error: error.message,
        };
    }
}

/**
 * Determine action from natural language
 */
function determineAction(request: string): string {
    const lower = request.toLowerCase();

    if (lower.includes('create') || lower.includes('add') || lower.includes('new')) return 'create';
    if (lower.includes('search') || lower.includes('find') || lower.includes('get') || lower.includes('show')) return 'search';
    if (lower.includes('update') || lower.includes('edit') || lower.includes('change')) return 'update';
    if (lower.includes('delete') || lower.includes('remove')) return 'delete';

    return 'help';
}

/**
 * Execute create operation - extracts fields using AI
 */
async function executeCreate(
    Model: any,
    request: string,
    workspaceId: string,
    userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        // Use AI to extract structured data
        const extractionPrompt = `Extract data fields from this natural language request to create a database record.

REQUEST: "${request}"

Common fields: title, name, value, amount, description, notes, status, priority, type

Respond with ONLY JSON containing the mentioned fields:`;

        const extraction = await getProModel().invoke([
            new SystemMessage(extractionPrompt),
        ]);

        const responseText = extraction.content as string;
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

        if (!jsonMatch) {
            return { success: false, error: "Could not extract data from request" };
        }

        const data = JSON.parse(jsonMatch[0]);

        // Add CRM context
        data.workspaceId = workspaceId;
        data.userId = userId;
        if (!data.status) data.status = 'open';

        const record = await Model.create(data);

        return {
            success: true,
            message: `✅ Created ${Model.modelName}: **${data.title || data.name || 'New record'}**`,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Execute search operation
 */
async function executeSearch(
    Model: any,
    request: string,
    workspaceId: string
): Promise<{ success: boolean; message?: string; results?: any[]; error?: string }> {
    try {
        const records = await Model.find({ workspaceId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        if (records.length === 0) {
            return {
                success: true,
                message: `No ${Model.modelName} records found.`,
                results: [],
            };
        }

        const formattedResults = records.map((r: any) => {
            const name = r.title || r.name || r.firstName + ' ' + r.lastName || 'Record';
            const value = r.value ? ` - $${r.value.toLocaleString()}` : '';
            const status = r.status ? ` (${r.status})` : '';
            return `• **${name}**${value}${status}`;
        }).join('\n');

        return {
            success: true,
            message: `Found **${records.length}** ${Model.modelName} record(s):\n${formattedResults}`,
            results: records,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
