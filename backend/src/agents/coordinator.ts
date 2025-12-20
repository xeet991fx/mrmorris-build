/**
 * Multi-Agent Coordinator
 *
 * Executes multiple agents in parallel or sequential mode
 * and aggregates their results into a cohesive response.
 */

import { AgentStateType } from "./state";
import { ExecutionPlan, getExecutionOrder } from "./executionPlanner";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import {
    contactAgentNode,
    emailAgentNode,
    dealAgentNode,
    workflowAgentNode,
    taskAgentNode,
    companyAgentNode,
    campaignAgentNode,
    pipelineAgentNode,
    ticketAgentNode,
    sequenceAgentNode,
    leadScoreAgentNode,
    reportsAgentNode,
    hygieneAgentNode,
    briefingAgentNode,
    forecastAgentNode,
    transcriptionAgentNode,
    proposalAgentNode,
    competitorAgentNode,
    dataEntryAgentNode,
    schedulingAgentNode,
    generalAgentNode,
} from "./workers";

// Agent node mapping
const AGENT_NODES: Record<string, (state: AgentStateType) => Promise<Partial<AgentStateType>>> = {
    contact: contactAgentNode,
    email: emailAgentNode,
    deal: dealAgentNode,
    workflow: workflowAgentNode,
    task: taskAgentNode,
    company: companyAgentNode,
    campaign: campaignAgentNode,
    pipeline: pipelineAgentNode,
    ticket: ticketAgentNode,
    sequence: sequenceAgentNode,
    leadscore: leadScoreAgentNode,
    reports: reportsAgentNode,
    hygiene: hygieneAgentNode,
    briefing: briefingAgentNode,
    forecast: forecastAgentNode,
    transcription: transcriptionAgentNode,
    proposal: proposalAgentNode,
    competitor: competitorAgentNode,
    dataentry: dataEntryAgentNode,
    scheduling: schedulingAgentNode,
    general: generalAgentNode,
};

// Lazy-loaded Pro model for result aggregation
let _proModel: ChatVertexAI | null = null;
const getProModel = () => {
    if (!_proModel) {
        _proModel = new ChatVertexAI({
            model: "gemini-2.5-pro",
            temperature: 0.7,
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
            safetySettings: [
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ],
        });
    }
    return _proModel;
};

export interface AgentResult {
    agent: string;
    response: string;
    toolResults: Record<string, any>;
    error?: string;
    executionTime: number;
}

/**
 * Execute a single agent node
 */
async function executeSingleAgent(
    agentName: string,
    state: AgentStateType,
    instruction?: string
): Promise<AgentResult> {
    const start = Date.now();
    console.log(`  🤖 Executing ${agentName} agent...`);

    const agentNode = AGENT_NODES[agentName];
    if (!agentNode) {
        console.error(`  ❌ Agent not found: ${agentName}`);
        return {
            agent: agentName,
            response: `Error: Agent '${agentName}' not found`,
            toolResults: {},
            error: `Agent not found: ${agentName}`,
            executionTime: Date.now() - start,
        };
    }

    try {
        // If we have a specific instruction, modify the state
        let agentState = state;
        if (instruction) {
            // Create a new message with the instruction
            agentState = {
                ...state,
                messages: [
                    {
                        ...state.messages[state.messages.length - 1],
                        content: instruction,
                    }
                ],
            };
        }

        // Execute agent
        const result = await agentNode(agentState);

        const executionTime = Date.now() - start;
        console.log(`  ✓ ${agentName} completed (${executionTime}ms)`);

        return {
            agent: agentName,
            response: result.finalResponse || '',
            toolResults: result.toolResults || {},
            error: result.error,
            executionTime,
        };
    } catch (error: any) {
        console.error(`  ❌ ${agentName} error:`, error.message);
        return {
            agent: agentName,
            response: '',
            toolResults: {},
            error: error.message,
            executionTime: Date.now() - start,
        };
    }
}

/**
 * Execute multiple agents in parallel
 */
async function executeParallel(
    agents: string[],
    state: AgentStateType,
    plan: ExecutionPlan
): Promise<AgentResult[]> {
    console.log(`⚡ Executing ${agents.length} agents in PARALLEL...`);

    // Get instructions for each agent from the plan
    const taskMap = new Map(plan.tasks.map(t => [t.agent, t.instruction]));

    // Execute all agents simultaneously
    const promises = agents.map(agent =>
        executeSingleAgent(agent, state, taskMap.get(agent))
    );

    const results = await Promise.all(promises);
    return results;
}

/**
 * Execute agents in sequential order (based on dependencies)
 */
async function executeSequential(
    executionOrder: string[][],
    state: AgentStateType,
    plan: ExecutionPlan
): Promise<AgentResult[]> {
    console.log(`🔄 Executing ${executionOrder.flat().length} agents SEQUENTIALLY...`);

    const allResults: AgentResult[] = [];
    const taskMap = new Map(plan.tasks.map(t => [t.agent, t.instruction]));

    // Execute each level (level = agents that can run in parallel)
    for (let levelIndex = 0; levelIndex < executionOrder.length; levelIndex++) {
        const level = executionOrder[levelIndex];
        console.log(`  📍 Level ${levelIndex + 1}: ${level.join(', ')}`);

        // Agents at the same level can run in parallel
        const promises = level.map(agent =>
            executeSingleAgent(agent, state, taskMap.get(agent))
        );

        const levelResults = await Promise.all(promises);
        allResults.push(...levelResults);

        // Update state with results for next level to use
        // This allows later agents to see earlier agent results
        if (levelIndex < executionOrder.length - 1) {
            state = {
                ...state,
                toolResults: {
                    ...state.toolResults,
                    ...Object.fromEntries(
                        levelResults.map(r => [r.agent, r.toolResults])
                    ),
                },
            };
        }
    }

    return allResults;
}

/**
 * Aggregate results from multiple agents
 */
async function aggregateResults(
    results: AgentResult[],
    plan: ExecutionPlan,
    userRequest: string
): Promise<string> {
    console.log(`📊 Aggregating ${results.length} agent results...`);
    const start = Date.now();

    // Filter out errors
    const successfulResults = results.filter(r => !r.error && r.response);

    if (successfulResults.length === 0) {
        const errors = results.filter(r => r.error).map(r => `${r.agent}: ${r.error}`);
        return `I encountered issues with all agents:\n${errors.join('\n')}`;
    }

    // If only one successful result, return it directly
    if (successfulResults.length === 1) {
        return successfulResults[0].response;
    }

    // Use AI to aggregate based on strategy
    let aggregationPrompt = '';

    switch (plan.aggregationStrategy) {
        case 'merge':
            aggregationPrompt = `Combine all agent outputs into a single, cohesive response.
Include information from all agents, organizing it logically.
Format the response clearly with sections if needed.`;
            break;

        case 'summarize':
            aggregationPrompt = `Create a comprehensive summary that synthesizes insights from all agents.
Focus on the most important and actionable information.
Present it as a unified briefing or report.`;
            break;

        case 'prioritize':
            aggregationPrompt = `Use the primary agent's output as the main response.
Supplement it with relevant information from other agents.
Ensure the response flows naturally and addresses the user's request completely.`;
            break;
    }

    const agentOutputs = successfulResults
        .map(r => `=== ${r.agent.toUpperCase()} AGENT ===\n${r.response}`)
        .join('\n\n');

    const fullPrompt = `You are aggregating results from multiple CRM agents.

USER REQUEST: "${userRequest}"

AGENT OUTPUTS:
${agentOutputs}

${aggregationPrompt}

IMPORTANT:
- Keep the response clear, concise, and actionable
- Use proper formatting (bullet points, sections, etc.)
- Don't mention "Agent A said" or "Agent B said" - present as unified response
- Focus on answering the user's request
- If agents have conflicting information, note it briefly`;

    try {
        const response = await getProModel().invoke([
            new SystemMessage("You are a result aggregation system. Combine multiple agent outputs into a clear, cohesive response."),
            new HumanMessage(fullPrompt),
        ]);

        const aggregated = response.content as string;
        console.log(`✓ Aggregation complete (${Date.now() - start}ms)`);

        return aggregated;
    } catch (error) {
        console.error("Aggregation error:", error);
        // Fallback: Just concatenate responses
        return successfulResults
            .map(r => `**${r.agent}**: ${r.response}`)
            .join('\n\n');
    }
}

/**
 * Main coordinator function - Execute multi-agent plan
 */
export async function executeMultiAgentPlan(
    state: AgentStateType,
    plan: ExecutionPlan
): Promise<Partial<AgentStateType>> {
    console.log("\n🎯 MULTI-AGENT COORDINATION");
    console.log(`   Mode: ${plan.mode}`);
    console.log(`   Agents: ${plan.tasks.map(t => t.agent).join(', ')}`);
    console.log(`   Strategy: ${plan.aggregationStrategy}`);

    const overallStart = Date.now();
    let results: AgentResult[];

    try {
        // Execute based on mode
        if (plan.mode === 'parallel') {
            const agents = plan.tasks.map(t => t.agent);
            results = await executeParallel(agents, state, plan);
        } else {
            const executionOrder = getExecutionOrder(plan);
            results = await executeSequential(executionOrder, state, plan);
        }

        // Aggregate results
        const userRequest = state.messages[state.messages.length - 1].content as string;
        const finalResponse = await aggregateResults(results, plan, userRequest);

        // Combine tool results from all agents
        const allToolResults = Object.fromEntries(
            results.map(r => [r.agent, r.toolResults])
        );

        // Check if any agent had errors
        const errors = results.filter(r => r.error);
        const errorSummary = errors.length > 0
            ? `\n\n(Note: ${errors.length} agent(s) encountered issues: ${errors.map(e => e.agent).join(', ')})`
            : '';

        const totalTime = Date.now() - overallStart;
        console.log(`\n✅ MULTI-AGENT COORDINATION COMPLETE (${totalTime}ms)`);
        console.log(`   Agents executed: ${results.length}`);
        console.log(`   Successful: ${results.filter(r => !r.error).length}`);
        console.log(`   Failed: ${errors.length}`);

        return {
            finalResponse: finalResponse + errorSummary,
            toolResults: {
                ...state.toolResults,
                multiAgentResults: allToolResults,
                executionPlan: plan,
            },
            error: errors.length === results.length ? 'All agents failed' : '',
        };

    } catch (error: any) {
        console.error("❌ Multi-agent coordination error:", error.message);
        return {
            finalResponse: '',
            error: `Multi-agent coordination failed: ${error.message}`,
            toolResults: state.toolResults,
        };
    }
}
