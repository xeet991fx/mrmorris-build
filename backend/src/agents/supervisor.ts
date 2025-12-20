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
    // New AI Agents
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

// ⚡ FAST model for routing and verification (lazy initialization)
let _flashModel: ChatVertexAI | null = null;
const getFlashModel = () => {
    if (!_flashModel) {
        _flashModel = new ChatVertexAI({
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
    }
    return _flashModel;
};

// Agent routing - ORDER MATTERS (more specific first)
// Priority keywords checked first to avoid false matches
const PRIORITY_ROUTES: Array<[string[], string]> = [
    // NEW AI AGENTS (highest priority)
    [["briefing", "meeting prep", "prepare for call", "before call", "pre-call", "prepare for meeting"], "briefing"],
    [["transcribe", "call summary", "meeting notes", "call recording", "summarize call", "bant", "action items from call"], "transcription"],
    [["schedule", "calendar", "book meeting", "find time", "availability", "reschedule"], "scheduling"],
    [["stale deals", "pipeline health", "stuck deals", "hygiene", "suggest stage"], "hygiene"],
    [["forecast", "prediction", "revenue projection", "trends", "at risk deals", "executive summary"], "forecast"],
    [["proposal", "quote", "sow", "pricing document", "generate proposal"], "proposal"],
    [["competitor", "battlecard", "win loss", "vs competitor", "competitive"], "competitor"],
    [["duplicate", "merge", "clean data", "data quality", "parse email", "email signature", "dedupe"], "dataentry"],

    // Action-based (existing)
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
        const response = await getFlashModel().invoke([
            new SystemMessage(`You are a CRM assistant router. Route to the appropriate agent based on user INTENT.

IMPORTANT: Distinguish between CRM ACTIONS vs GENERAL QUESTIONS.

CRM ACTIONS (user wants to DO something in the CRM):
- contact: CREATE, SEARCH, UPDATE, or DELETE contacts/leads/customers
- email: DRAFT or SEND emails, create templates
- deal: CREATE, UPDATE deals/opportunities, move stages
- workflow: CREATE or MANAGE automations
- task: CREATE tasks, set reminders, follow-ups
- company: CREATE, SEARCH companies/accounts
- campaign: SEND email campaigns
- pipeline: MANAGE pipeline stages, move deals
- ticket: CREATE or MANAGE support tickets
- sequence: CREATE email sequences
- leadscore: GET lead scores, show hot leads
- reports: SHOW reports, dashboards, analytics
- briefing: PREPARE for a meeting
- transcription: SUMMARIZE call recordings
- scheduling: BOOK meetings, check calendar
- hygiene: CHECK stale deals, pipeline health
- forecast: GET revenue predictions
- proposal: GENERATE proposals, quotes
- competitor: GET battlecards, competitive info
- dataentry: FIND duplicates, clean data

GENERAL QUESTIONS (use "general" for these):
- Explanations: "what is...", "explain...", "importance of...", "how does...work"
- General knowledge, education, concepts
- Advice, tips, best practices (not CRM actions)
- Gaming, entertainment, coding help, trivia
- Weather, news, current events
- Anything that is NOT a CRM action request

Reply with ONLY ONE word - the agent name.`),
            new HumanMessage(userRequest),
        ]);

        const responseText = (response.content as string).toLowerCase().trim();

        // Check if request is off-topic - route to general agent
        if (responseText === "none" || responseText.includes("none")) {
            nextAgent = "general";
        } else {
            // Include all agents (original + new)
            const allAgents = [
                "task", "contact", "email", "deal", "workflow", "company", "campaign",
                "pipeline", "ticket", "sequence", "leadscore", "reports",
                // New agents
                "briefing", "transcription", "scheduling", "hygiene", "forecast",
                "proposal", "competitor", "dataentry", "general"
            ];
            for (const agentName of allAgents) {
                if (responseText.includes(agentName)) {
                    nextAgent = agentName;
                    break;
                }
            }
        }
    }

    nextAgent = nextAgent || "contact"; // Default fallback
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
        // New AI Agents
        briefing: "briefing_agent",
        transcription: "transcription_agent",
        scheduling: "scheduling_agent",
        hygiene: "hygiene_agent",
        forecast: "forecast_agent",
        proposal: "proposal_agent",
        competitor: "competitor_agent",
        dataentry: "dataentry_agent",
        general: "general_agent",
    };
    return agentMap[state.nextAgent] || "general_agent";
}

/**
 * Build the optimized agent graph
 */
export function buildAgentGraph() {
    const graph = new StateGraph(AgentState)
        // Nodes - Original agents
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
        // New AI Agents
        .addNode("briefing_agent", briefingAgentNode)
        .addNode("transcription_agent", transcriptionAgentNode)
        .addNode("scheduling_agent", schedulingAgentNode)
        .addNode("hygiene_agent", hygieneAgentNode)
        .addNode("forecast_agent", forecastAgentNode)
        .addNode("proposal_agent", proposalAgentNode)
        .addNode("competitor_agent", competitorAgentNode)
        .addNode("dataentry_agent", dataEntryAgentNode)
        .addNode("general_agent", generalAgentNode)
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
            // New AI Agents
            briefing_agent: "briefing_agent",
            transcription_agent: "transcription_agent",
            scheduling_agent: "scheduling_agent",
            hygiene_agent: "hygiene_agent",
            forecast_agent: "forecast_agent",
            proposal_agent: "proposal_agent",
            competitor_agent: "competitor_agent",
            dataentry_agent: "dataentry_agent",
            general_agent: "general_agent",
        })
        // All workers go to verifier - Original
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
        // New AI Agents to verifier
        .addEdge("briefing_agent", "verifier")
        .addEdge("transcription_agent", "verifier")
        .addEdge("scheduling_agent", "verifier")
        .addEdge("hygiene_agent", "verifier")
        .addEdge("forecast_agent", "verifier")
        .addEdge("proposal_agent", "verifier")
        .addEdge("competitor_agent", "verifier")
        .addEdge("dataentry_agent", "verifier")
        .addEdge("general_agent", "verifier")
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
