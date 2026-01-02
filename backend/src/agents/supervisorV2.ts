/**
 * Supervisor Agent V2 - Multi-Agent Coordination
 *
 * Flow:
 * - Simple tasks: Supervisor → Worker → Verifier → User
 * - Complex tasks: Supervisor → Planner → Coordinator → Aggregator → Verifier → User
 *
 * Features:
 * - Dynamic complexity analysis
 * - Multi-agent coordination (2-4 agents)
 * - Parallel and sequential execution
 * - Intelligent result aggregation
 */

import { StateGraph, END } from "@langchain/langgraph";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState, AgentStateType, createInitialState, addToConversation } from "./state";
import { analyzeTaskComplexity } from "./complexityAnalyzer";
import { createExecutionPlan, optimizeExecutionPlan } from "./executionPlanner";
import { executeMultiAgentPlan } from "./coordinator";
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
    landingPageAgentNode,
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
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ],
        });
    }
    return _flashModel;
};

// Agent routing - ORDER MATTERS (more specific first)
const PRIORITY_ROUTES: Array<[string[], string]> = [
    // LANDING PAGE CREATION (highest priority)
    [["landing page", "create page", "generate page", "build page", "website page", "make landing", "create a page"], "landingpage"],

    // WORKFLOW CREATION (high priority - must come before other agents with keyword overlap)
    [["create workflow", "create a workflow", "workflow called", "new workflow"], "workflow"],

    // NEW AI AGENTS (high priority)
    [["briefing", "meeting prep", "prepare for call", "before call", "pre-call", "prepare for meeting"], "briefing"],
    [["transcribe", "call summary", "meeting notes", "call recording", "summarize call", "bant", "action items from call"], "transcription"],
    [["schedule", "calendar", "book meeting", "find time", "availability", "reschedule"], "scheduling"],
    [["stale deals", "pipeline health", "stuck deals", "hygiene", "suggest stage"], "hygiene"],
    [["forecast", "prediction", "revenue projection", "trends", "at risk deals", "executive summary"], "forecast"],
    [["proposal", "quote", "sow", "pricing document", "generate proposal"], "proposal"],
    [["competitor", "battlecard", "win loss", "vs competitor", "competitive"], "competitor"],
    [["duplicate", "merge", "clean data", "data quality", "parse email", "email signature", "dedupe"], "dataentry"],

    // Action-based (existing)
    [["delete contact", "remove contact", "delete contacts", "remove contacts"], "contact"],
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
 * SUPERVISOR NODE - Enhanced with complexity analysis
 */
async function supervisorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    console.log("\n🎯 SUPERVISOR - Analyzing request...");
    const start = Date.now();

    const lastMessage = state.messages[state.messages.length - 1];
    const userRequest = lastMessage.content as string;

    // Step 1: Check fast routing FIRST for dedicated agent keywords
    // This prevents complexity analyzer from overriding specific dedicated agents
    let nextAgent = fastRoute(userRequest);

    if (nextAgent) {
        console.log(`✓ FAST ROUTE to: ${nextAgent} (${Date.now() - start}ms)`);
        return {
            nextAgent,
            isComplexTask: false,
            coordinationMode: 'single',
        };
    }

    // Step 2: Analyze task complexity only if no dedicated agent matched
    const complexityAnalysis = await analyzeTaskComplexity(userRequest);

    // Step 3: If complex, route to planner. Otherwise, route to single agent
    if (complexityAnalysis.requiresMultipleAgents && complexityAnalysis.confidence >= 70) {
        console.log(`✓ COMPLEX TASK detected (${Date.now() - start}ms)`);
        console.log(`   Mode: ${complexityAnalysis.coordinationMode}`);
        console.log(`   Agents: ${complexityAnalysis.suggestedAgents.join(', ')}`);

        return {
            nextAgent: 'planner',
            isComplexTask: true,
            coordinationMode: complexityAnalysis.coordinationMode,
        };
    }

    // Step 4: Simple task - use AI routing

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

        if (responseText === "none" || responseText.includes("none")) {
            nextAgent = "general";
        } else {
            const allAgents = [
                "task", "contact", "email", "deal", "workflow", "company", "campaign",
                "pipeline", "ticket", "sequence", "leadscore", "reports",
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
    console.log(`✓ SIMPLE TASK - Routed to: ${nextAgent} (${Date.now() - start}ms)`);

    return {
        nextAgent,
        isComplexTask: false,
        coordinationMode: 'single',
    };
}

/**
 * PLANNER NODE - Creates execution plan for multi-agent tasks
 */
async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    console.log("\n📋 PLANNER - Creating execution plan...");
    const start = Date.now();

    const userRequest = state.messages[state.messages.length - 1].content as string;

    // Create execution plan
    // coordinationMode could be 'single' but createExecutionPlan only accepts 'parallel' or 'sequential'
    const mode = state.coordinationMode === 'sequential' ? 'sequential' : 'parallel';
    const plan = await createExecutionPlan(
        userRequest,
        [], // Let the planner suggest agents
        mode
    );

    // Optimize plan
    const optimizedPlan = optimizeExecutionPlan(plan);

    console.log(`✓ Plan ready (${Date.now() - start}ms)`);

    return {
        executionPlan: optimizedPlan,
        nextAgent: 'coordinator',
    };
}

/**
 * COORDINATOR NODE - Executes multi-agent plan
 */
async function coordinatorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    if (!state.executionPlan) {
        return {
            error: 'No execution plan available',
            finalResponse: 'Error: Missing execution plan',
        };
    }

    return await executeMultiAgentPlan(state, state.executionPlan);
}

/**
 * VERIFIER NODE - Quick validation with Flash
 */
async function verifierNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    console.log("\n✓ VERIFIER - Checking response quality...");

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

    // Get user request and agent response
    const userMessage = state.messages[0]?.content as string || "";
    const agentResponse = state.finalResponse || "";

    // Skip verification for very short responses or missing content
    if (!agentResponse || agentResponse.length < 10) {
        console.log("⚠️  Skipping verification - response too short");
        return { verified: true };
    }

    // Skip AI verification for simple, successful-looking responses
    const isSimpleQuery = userMessage.split(' ').length <= 10;
    const hasGoodLength = agentResponse.length >= 50 && agentResponse.length <= 2000;
    const hasNoErrors = !state.error && !agentResponse.toLowerCase().includes('error');

    if (isSimpleQuery && hasGoodLength && hasNoErrors) {
        console.log("✓ Verified (simple query with good response, skipped AI check)");

        // Add AI response to conversation history
        if (state.sessionId && state.finalResponse) {
            addToConversation(state.sessionId, new AIMessage(state.finalResponse));
        }

        return { verified: true };
    }

    try {
        // Use Flash model for quick quality check
        const verificationPrompt = `You are a quality checker for AI agent responses.

USER REQUEST: "${userMessage}"
AGENT RESPONSE: "${agentResponse}"

Quickly verify if the response:
1. Directly addresses the user's request
2. Is complete (not cut off or incomplete)
3. Is helpful and actionable
4. Doesn't contain obvious errors or hallucinations

Respond with ONLY a JSON object:
{
  "isValid": true/false,
  "issue": "brief description if invalid, otherwise null",
  "confidence": 0-100
}`;

        const verification = await getFlashModel().invoke([
            new SystemMessage("You are a quality verification system. Respond only with JSON."),
            new HumanMessage(verificationPrompt),
        ]);

        const verificationText = verification.content as string;
        const jsonMatch = verificationText.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);

            if (!result.isValid && result.confidence > 70) {
                console.log(`⚠️  Verification failed: ${result.issue}`);
                return {
                    finalResponse: `${agentResponse}\n\n(Note: There may be an issue with this response: ${result.issue})`,
                    verified: false,
                };
            }

            console.log(`✓ Verified (confidence: ${result.confidence}%)`);
        }
    } catch (error) {
        console.error("Verification error:", error);
    }

    // Add AI response to conversation history
    if (state.sessionId && state.finalResponse) {
        addToConversation(state.sessionId, new AIMessage(state.finalResponse));
    }

    return { verified: true };
}

/**
 * Router function - Enhanced for multi-agent flow
 */
function routeFromSupervisor(state: AgentStateType): string {
    // If complex task, go to planner
    if (state.isComplexTask) {
        return "planner";
    }

    // Otherwise, route to single agent
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
        briefing: "briefing_agent",
        transcription: "transcription_agent",
        scheduling: "scheduling_agent",
        hygiene: "hygiene_agent",
        forecast: "forecast_agent",
        proposal: "proposal_agent",
        competitor: "competitor_agent",
        dataentry: "dataentry_agent",
        general: "general_agent",
        landingpage: "landingpage_agent",
    };
    return agentMap[state.nextAgent] || "general_agent";
}

/**
 * Build the enhanced multi-agent graph
 */
export function buildAgentGraphV2() {
    const graph = new StateGraph(AgentState)
        // Core nodes
        .addNode("supervisor", supervisorNode)
        .addNode("planner", plannerNode)
        .addNode("coordinator", coordinatorNode)
        .addNode("verifier", verifierNode)

        // Worker agent nodes
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
        .addNode("briefing_agent", briefingAgentNode)
        .addNode("transcription_agent", transcriptionAgentNode)
        .addNode("scheduling_agent", schedulingAgentNode)
        .addNode("hygiene_agent", hygieneAgentNode)
        .addNode("forecast_agent", forecastAgentNode)
        .addNode("proposal_agent", proposalAgentNode)
        .addNode("competitor_agent", competitorAgentNode)
        .addNode("dataentry_agent", dataEntryAgentNode)
        .addNode("general_agent", generalAgentNode)
        .addNode("landingpage_agent", landingPageAgentNode)

        // Entry point
        .setEntryPoint("supervisor")

        // Routing from supervisor
        .addConditionalEdges("supervisor", routeFromSupervisor, {
            planner: "planner",
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
            briefing_agent: "briefing_agent",
            transcription_agent: "transcription_agent",
            scheduling_agent: "scheduling_agent",
            hygiene_agent: "hygiene_agent",
            forecast_agent: "forecast_agent",
            proposal_agent: "proposal_agent",
            competitor_agent: "competitor_agent",
            dataentry_agent: "dataentry_agent",
            general_agent: "general_agent",
            landingpage_agent: "landingpage_agent",
        })

        // Multi-agent flow
        .addEdge("planner", "coordinator")
        .addEdge("coordinator", "verifier")

        // Single-agent flow - all workers go to verifier
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
        .addEdge("briefing_agent", "verifier")
        .addEdge("transcription_agent", "verifier")
        .addEdge("scheduling_agent", "verifier")
        .addEdge("hygiene_agent", "verifier")
        .addEdge("forecast_agent", "verifier")
        .addEdge("proposal_agent", "verifier")
        .addEdge("competitor_agent", "verifier")
        .addEdge("dataentry_agent", "verifier")
        .addEdge("general_agent", "verifier")
        .addEdge("landingpage_agent", "verifier")

        // Verifier to END
        .addEdge("verifier", END);

    return graph.compile();
}

export const agentGraphV2 = buildAgentGraphV2();

/**
 * Helper function to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Agent timeout after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

/**
 * Invoke agent V2 with multi-agent coordination support
 */
export async function invokeAgentV2(
    message: string,
    workspaceId: string,
    userId: string,
    sessionId?: string,
    timeoutMs: number = 45000 // 45 second timeout (longer for multi-agent)
): Promise<{
    response: string;
    needsInput?: boolean;
    toolResults?: Record<string, any>;
    error?: string;
}> {
    try {
        const start = Date.now();
        const initialState = createInitialState(message, workspaceId, userId, sessionId);

        console.log(`\n🚀 Agent V2 request: "${message.substring(0, 50)}..." (timeout: ${timeoutMs}ms)`);

        const result = await withTimeout(
            agentGraphV2.invoke(initialState),
            timeoutMs
        );

        console.log(`✅ Complete in ${Date.now() - start}ms\n`);

        return {
            response: result.finalResponse || "Done.",
            needsInput: result.needsUserInput,
            toolResults: result.toolResults,
            error: result.error,
        };
    } catch (error: any) {
        console.error("❌ Agent error:", error.message);

        if (error.message?.includes('timeout')) {
            return {
                response: "The request took too long to process. Please try a simpler request or try again later.",
                error: error.message,
            };
        }

        return {
            response: "Sorry, something went wrong. Please try again.",
            error: error.message,
        };
    }
}
