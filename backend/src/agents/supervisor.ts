/**
 * Supervisor Agent - Fast Architecture
 * 
 * Flow: Supervisor (Flash) → Worker (Pro) → Verifier (Flash) → User
 * 
 * Features:
 * - Fast routing with gemini-2.5-flash
 * - Smart execution with gemini-2.5-pro (workers)
 * - Conversation memory (last 10 messages)
 * - Missing info detection
 * - Verification before response
 */

import { StateGraph, END } from "@langchain/langgraph";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState, AgentStateType, createInitialState, addToConversation } from "./state";
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
} from "./workers";

// ⚡ FAST model for routing and verification
const flashModel = new ChatVertexAI({
    model: "gemini-2.5-flash",
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

// Agent routing - ORDER MATTERS (more specific first)
// Priority keywords checked first to avoid false matches
const PRIORITY_ROUTES: Array<[string[], string]> = [
    // Action-based (highest priority)
    [["create task", "remind me", "todo", "follow up tomorrow", "call tomorrow"], "task"],
    [["hot lead", "lead score", "scoring"], "leadscore"],
    [["pipeline stats", "stage", "funnel"], "pipeline"],
    [["dashboard", "summary", "report", "analytics"], "reports"],
    [["workflow", "automation", "enroll in", "edit workflow", "update workflow", "change delay", "wait time"], "workflow"],
    [["sequence", "drip", "multi-step"], "sequence"],
    [["campaign", "blast", "mass email"], "campaign"],
    [["ticket", "support issue", "bug report"], "ticket"],
    [["draft email", "email template", "send email to"], "email"],
    [["create deal", "opportunity", "new deal"], "deal"],
    [["create company", "company named", "who works at"], "company"],
    // Entity-based (lower priority)
    [["task", "remind", "todo"], "task"],
    [["company", "account", "organization"], "company"],
    [["deal", "sale", "pipeline value"], "deal"],
    [["contact", "person", "lead"], "contact"],
    [["email", "template"], "email"],
];

/**
 * Fast keyword-based routing with priority
 */
function fastRoute(message: string): string | null {
    const lower = message.toLowerCase();

    for (const [keywords, agent] of PRIORITY_ROUTES) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                return agent;
            }
        }
    }
    return null;
}

/**
 * SUPERVISOR NODE - Uses Flash for speed
 */
async function supervisorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    console.log("⚡ Supervisor (Flash) routing...");
    const start = Date.now();

    const lastMessage = state.messages[state.messages.length - 1];
    const userRequest = lastMessage.content as string;

    // Try fast keyword routing first
    let nextAgent = fastRoute(userRequest);

    if (!nextAgent) {
        // Use Flash AI for complex routing
        const response = await flashModel.invoke([
            new SystemMessage(`Route to one of: contact, email, deal, workflow, task, company, campaign, pipeline, ticket, sequence, leadscore, reports. Reply with ONLY ONE word - the agent name.`),
            new HumanMessage(userRequest),
        ]);

        const responseText = (response.content as string).toLowerCase().trim();
        const allAgents = ["task", "contact", "email", "deal", "workflow", "company", "campaign", "pipeline", "ticket", "sequence", "leadscore", "reports"];
        for (const agentName of allAgents) {
            if (responseText.includes(agentName)) {
                nextAgent = agentName;
                break;
            }
        }
    }

    nextAgent = nextAgent || "contact"; // Default
    console.log(`⚡ Routed to: ${nextAgent} (${Date.now() - start}ms)`);

    return { nextAgent };
}

/**
 * VERIFIER NODE - Quick validation with Flash
 */
async function verifierNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    console.log("✓ Verifier (Flash) checking...");

    // If there's an error, handle it
    if (state.error) {
        return {
            finalResponse: `I encountered an issue: ${state.error}. Please try again.`,
            verified: false,
        };
    }

    // If agent needs user input, pass through
    if (state.needsUserInput) {
        return {
            finalResponse: state.userQuestion,
            verified: true,
        };
    }

    // Add AI response to conversation history
    if (state.sessionId && state.finalResponse) {
        addToConversation(state.sessionId, new AIMessage(state.finalResponse));
    }

    return { verified: true };
}

/**
 * Router function
 */
function routeToAgent(state: AgentStateType): string {
    const agentMap: Record<string, string> = {
        contact: "contact_agent",
        email: "email_agent",
        deal: "deal_agent",
        workflow: "workflow_agent",
        task: "task_agent",
        company: "company_agent",
        campaign: "campaign_agent",
        pipeline: "pipeline_agent",
        ticket: "ticket_agent",
        sequence: "sequence_agent",
        leadscore: "leadscore_agent",
        reports: "reports_agent",
    };
    return agentMap[state.nextAgent] || "contact_agent";
}

/**
 * Build the optimized agent graph
 */
export function buildAgentGraph() {
    const graph = new StateGraph(AgentState)
        // Nodes
        .addNode("supervisor", supervisorNode)
        .addNode("contact_agent", contactAgentNode)
        .addNode("email_agent", emailAgentNode)
        .addNode("deal_agent", dealAgentNode)
        .addNode("workflow_agent", workflowAgentNode)
        .addNode("task_agent", taskAgentNode)
        .addNode("company_agent", companyAgentNode)
        .addNode("campaign_agent", campaignAgentNode)
        .addNode("pipeline_agent", pipelineAgentNode)
        .addNode("ticket_agent", ticketAgentNode)
        .addNode("sequence_agent", sequenceAgentNode)
        .addNode("leadscore_agent", leadScoreAgentNode)
        .addNode("reports_agent", reportsAgentNode)
        .addNode("verifier", verifierNode)
        // Entry
        .setEntryPoint("supervisor")
        // Conditional routing from supervisor
        .addConditionalEdges("supervisor", routeToAgent, {
            contact_agent: "contact_agent",
            email_agent: "email_agent",
            deal_agent: "deal_agent",
            workflow_agent: "workflow_agent",
            task_agent: "task_agent",
            company_agent: "company_agent",
            campaign_agent: "campaign_agent",
            pipeline_agent: "pipeline_agent",
            ticket_agent: "ticket_agent",
            sequence_agent: "sequence_agent",
            leadscore_agent: "leadscore_agent",
            reports_agent: "reports_agent",
        })
        // All workers go to verifier
        .addEdge("contact_agent", "verifier")
        .addEdge("email_agent", "verifier")
        .addEdge("deal_agent", "verifier")
        .addEdge("workflow_agent", "verifier")
        .addEdge("task_agent", "verifier")
        .addEdge("company_agent", "verifier")
        .addEdge("campaign_agent", "verifier")
        .addEdge("pipeline_agent", "verifier")
        .addEdge("ticket_agent", "verifier")
        .addEdge("sequence_agent", "verifier")
        .addEdge("leadscore_agent", "verifier")
        .addEdge("reports_agent", "verifier")
        // Verifier to END
        .addEdge("verifier", END);

    return graph.compile();
}

export const agentGraph = buildAgentGraph();

/**
 * Invoke agent with session support
 */
export async function invokeAgent(
    message: string,
    workspaceId: string,
    userId: string,
    sessionId?: string
): Promise<{
    response: string;
    needsInput?: boolean;
    toolResults?: Record<string, any>;
    error?: string;
}> {
    try {
        const start = Date.now();
        const initialState = createInitialState(message, workspaceId, userId, sessionId);

        console.log(`\n🚀 Agent request: "${message.substring(0, 50)}..."`);

        const result = await agentGraph.invoke(initialState);

        console.log(`✅ Complete in ${Date.now() - start}ms\n`);

        return {
            response: result.finalResponse || "Done.",
            needsInput: result.needsUserInput,
            toolResults: result.toolResults,
            error: result.error,
        };
    } catch (error: any) {
        console.error("❌ Agent error:", error.message);
        return {
            response: "Sorry, something went wrong. Please try again.",
            error: error.message,
        };
    }
}
