/**
 * Task Complexity Analyzer
 *
 * Determines if a task requires multiple agents working together
 * or can be handled by a single agent.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Lazy-loaded Flash model for fast complexity analysis
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

export interface ComplexityAnalysis {
    isComplex: boolean;
    requiresMultipleAgents: boolean;
    suggestedAgents: string[];
    coordinationMode: 'single' | 'parallel' | 'sequential';
    reasoning: string;
    confidence: number;
}

/**
 * Pattern-based complexity detection (fast path)
 */
const COMPLEX_TASK_PATTERNS = [
    // Meeting preparation patterns
    /prepare (for|me for) (meeting|call|discussion)/i,
    /meeting prep/i,
    /before (the |my )?call/i,
    /pre-?call (prep|preparation)/i,

    // Campaign creation patterns
    /(create|build|setup|launch) (a |an )?(new )?campaign/i,
    /campaign (setup|planning|strategy)/i,
    /multi-?channel campaign/i,

    // Deal analysis patterns
    /(analyze|review|assess) (the |my )?deal/i,
    /deal (analysis|health|status|forecast)/i,
    /pipeline (analysis|review|health)/i,
    /forecast.*deal/i,
    /deal.*forecast/i,

    // Data enrichment patterns
    /(enrich|update|complete) (contact|company) (data|information)/i,
    /find (and )?(update|enrich|complete)/i,
    /gather.*information/i,
    /(research|find) (company|contact) (info|information|data)/i,

    // Multi-step indicators
    /and (then|also|additionally)/i,
    /(first|then|next|finally|after that)/i,
    /multiple (tasks|steps|actions)/i,
];

/**
 * Fast pattern-based complexity check
 */
function quickComplexityCheck(message: string): boolean {
    const lower = message.toLowerCase();

    // Check for explicit multi-step indicators
    const hasMultipleSteps = COMPLEX_TASK_PATTERNS.some(pattern => pattern.test(lower));

    // Check for multiple action verbs (create, update, send, etc.)
    const actionVerbs = ['create', 'update', 'send', 'delete', 'analyze', 'generate', 'find', 'research', 'prepare'];
    const verbCount = actionVerbs.filter(verb => lower.includes(verb)).length;

    return hasMultipleSteps || verbCount >= 2;
}

/**
 * AI-based complexity analysis (fallback for ambiguous cases)
 */
async function aiComplexityAnalysis(message: string): Promise<ComplexityAnalysis> {
    const prompt = `Analyze this CRM task request and determine if it requires MULTIPLE agents working together.

USER REQUEST: "${message}"

SINGLE-AGENT TASKS (simple, focused):
- Create a contact
- Send an email
- Update a deal
- Search for contacts
- Get a report
- One specific action

MULTI-AGENT TASKS (complex, multi-dimensional):
1. MEETING PREPARATION: Requires contact + deal + briefing + company agents
   Example: "Prepare for my call with Acme Corp tomorrow"

2. CAMPAIGN CREATION: Requires general (research) + company + campaign + email agents
   Example: "Create a nurture campaign for enterprise leads"

3. DEAL ANALYSIS: Requires deal + hygiene + forecast + competitor agents
   Example: "Analyze the health of the Acme Corp deal and forecast"

4. DATA ENRICHMENT: Requires general (web search) + contact + company + dataentry agents
   Example: "Find and update information for John Smith"

IMPORTANT:
- If the task has ONE clear action → SINGLE agent
- If the task requires gathering data from MULTIPLE sources → PARALLEL agents
- If the task has SEQUENTIAL steps (do A, then B, then C) → SEQUENTIAL agents

Respond with ONLY a JSON object:
{
  "isComplex": true/false,
  "requiresMultipleAgents": true/false,
  "suggestedAgents": ["agent1", "agent2", ...],
  "coordinationMode": "single" | "parallel" | "sequential",
  "reasoning": "brief explanation",
  "confidence": 0-100
}

Available agents: contact, email, deal, workflow, task, company, campaign, pipeline, ticket, sequence, leadscore, reports, briefing, transcription, scheduling, hygiene, forecast, proposal, competitor, dataentry, general`;

    try {
        const response = await getFlashModel().invoke([
            new SystemMessage("You are a task complexity analyzer. Respond only with JSON."),
            new HumanMessage(prompt),
        ]);

        const responseText = response.content as string;
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                isComplex: analysis.isComplex || false,
                requiresMultipleAgents: analysis.requiresMultipleAgents || false,
                suggestedAgents: analysis.suggestedAgents || [],
                coordinationMode: analysis.coordinationMode || 'single',
                reasoning: analysis.reasoning || 'No reasoning provided',
                confidence: analysis.confidence || 50,
            };
        }
    } catch (error) {
        console.error("AI complexity analysis error:", error);
    }

    // Default to single agent on error
    return {
        isComplex: false,
        requiresMultipleAgents: false,
        suggestedAgents: [],
        coordinationMode: 'single',
        reasoning: 'Error in analysis, defaulting to single agent',
        confidence: 0,
    };
}

/**
 * Main complexity analysis function
 *
 * Uses a two-tier approach:
 * 1. Fast pattern matching for obvious complex tasks
 * 2. AI analysis for ambiguous cases
 */
export async function analyzeTaskComplexity(message: string): Promise<ComplexityAnalysis> {
    console.log("🔍 Analyzing task complexity...");
    const start = Date.now();

    // Fast path: Check for obvious complexity patterns
    const isLikelyComplex = quickComplexityCheck(message);

    if (!isLikelyComplex) {
        // Quick check says it's simple - confirm with AI
        console.log(`✓ Quick check: SIMPLE task (${Date.now() - start}ms)`);

        // For very simple requests, skip AI analysis
        const lower = message.toLowerCase();
        if (lower.split(' ').length <= 5) {
            return {
                isComplex: false,
                requiresMultipleAgents: false,
                suggestedAgents: [],
                coordinationMode: 'single',
                reasoning: 'Short, simple request',
                confidence: 95,
            };
        }
    }

    // Use AI for detailed analysis
    const analysis = await aiComplexityAnalysis(message);
    console.log(`🔍 Complexity analysis: ${analysis.coordinationMode.toUpperCase()} mode (${Date.now() - start}ms)`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Reasoning: ${analysis.reasoning}`);

    return analysis;
}

/**
 * Determine if agents should run in parallel or sequential
 */
export function determineExecutionMode(
    agents: string[],
    message: string
): 'parallel' | 'sequential' {
    // If only 1 agent, doesn't matter
    if (agents.length <= 1) return 'parallel';

    const lower = message.toLowerCase();

    // Sequential indicators
    const sequentialKeywords = [
        'then', 'after', 'next', 'first', 'second', 'third',
        'once', 'when done', 'after that', 'followed by'
    ];

    const hasSequentialIndicator = sequentialKeywords.some(keyword =>
        lower.includes(keyword)
    );

    if (hasSequentialIndicator) {
        return 'sequential';
    }

    // Check if agents have dependencies
    // For example: briefing agent needs contact + deal data
    const dependentAgentPairs: Array<[string, string[]]> = [
        ['briefing', ['contact', 'deal', 'company']], // Briefing needs data first
        ['email', ['contact', 'company']], // Email needs context
        ['proposal', ['deal', 'company', 'competitor']], // Proposal needs research
        ['forecast', ['deal', 'pipeline']], // Forecast needs deal data
    ];

    for (const [dependent, dependencies] of dependentAgentPairs) {
        if (agents.includes(dependent)) {
            const hasDependency = dependencies.some(dep => agents.includes(dep));
            if (hasDependency) {
                return 'sequential'; // Dependencies detected
            }
        }
    }

    // Default to parallel (faster)
    return 'parallel';
}
