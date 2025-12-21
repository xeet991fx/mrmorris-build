/**
 * Execution Planner
 *
 * Creates detailed execution plans for multi-agent coordination.
 * Determines which agents to run, in what order, and how to combine results.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Lazy-loaded Flash model
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

// Model optimized for JSON output (lower temperature for consistency)
let _jsonModel: ChatVertexAI | null = null;
const getJsonModel = () => {
    if (!_jsonModel) {
        _jsonModel = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0, // Zero temperature for deterministic JSON output
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
    return _jsonModel;
};

export interface AgentTask {
    agent: string;
    instruction: string;
    priority: number; // 1 = highest priority (run first)
    dependsOn: string[]; // Which agents must complete before this one
}

export interface ExecutionPlan {
    mode: 'parallel' | 'sequential';
    tasks: AgentTask[];
    aggregationStrategy: 'merge' | 'summarize' | 'prioritize';
    estimatedAgentCount: number;
}

/**
 * Predefined execution plans for common complex tasks
 */
const PREDEFINED_PLANS: Record<string, ExecutionPlan> = {
    // Meeting preparation
    'meeting_prep': {
        mode: 'parallel',
        tasks: [
            {
                agent: 'contact',
                instruction: 'Get contact information and recent interactions',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'deal',
                instruction: 'Get active deals and deal history',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'company',
                instruction: 'Get company information and account details',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'briefing',
                instruction: 'Generate comprehensive meeting briefing',
                priority: 2,
                dependsOn: ['contact', 'deal', 'company'],
            },
        ],
        aggregationStrategy: 'summarize',
        estimatedAgentCount: 4,
    },

    // Campaign creation
    'campaign_creation': {
        mode: 'sequential',
        tasks: [
            {
                agent: 'general',
                instruction: 'Research campaign best practices and industry trends',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'company',
                instruction: 'Identify target companies and segments',
                priority: 2,
                dependsOn: ['general'],
            },
            {
                agent: 'competitor',
                instruction: 'Analyze competitive positioning and messaging',
                priority: 2,
                dependsOn: ['general'],
            },
            {
                agent: 'campaign',
                instruction: 'Create campaign with messaging and workflow',
                priority: 3,
                dependsOn: ['company', 'competitor'],
            },
        ],
        aggregationStrategy: 'prioritize',
        estimatedAgentCount: 4,
    },

    // Deal analysis
    'deal_analysis': {
        mode: 'parallel',
        tasks: [
            {
                agent: 'deal',
                instruction: 'Get deal details and history',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'hygiene',
                instruction: 'Analyze deal health and identify issues',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'forecast',
                instruction: 'Generate revenue forecast and risk assessment',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'competitor',
                instruction: 'Provide competitive intelligence and battlecard',
                priority: 2,
                dependsOn: ['deal'],
            },
        ],
        aggregationStrategy: 'merge',
        estimatedAgentCount: 4,
    },

    // Data enrichment
    'data_enrichment': {
        mode: 'sequential',
        tasks: [
            {
                agent: 'general',
                instruction: 'Search web for contact and company information',
                priority: 1,
                dependsOn: [],
            },
            {
                agent: 'dataentry',
                instruction: 'Parse and structure the information',
                priority: 2,
                dependsOn: ['general'],
            },
            {
                agent: 'contact',
                instruction: 'Update contact record with new information',
                priority: 3,
                dependsOn: ['dataentry'],
            },
            {
                agent: 'company',
                instruction: 'Update company record with new information',
                priority: 3,
                dependsOn: ['dataentry'],
            },
        ],
        aggregationStrategy: 'prioritize',
        estimatedAgentCount: 4,
    },
};

/**
 * Detect predefined plan type from user message
 */
function detectPlanType(message: string): string | null {
    const lower = message.toLowerCase();

    // Meeting preparation
    if (
        /prepare.*meeting|meeting prep|before.*call|pre-?call/i.test(lower)
    ) {
        return 'meeting_prep';
    }

    // Campaign creation
    if (
        /(create|build|setup|launch).*campaign|campaign.*(setup|planning)/i.test(lower)
    ) {
        return 'campaign_creation';
    }

    // Deal analysis
    if (
        /(analyze|review|assess).*deal|deal.*(analysis|health|forecast)/i.test(lower)
    ) {
        return 'deal_analysis';
    }

    // Data enrichment
    if (
        /(enrich|update|complete).*(contact|company)|find.*information|research.*(contact|company)/i.test(lower)
    ) {
        return 'data_enrichment';
    }

    return null;
}

/**
 * AI-based execution planning (for custom/complex scenarios)
 */
async function aiExecutionPlan(
    message: string,
    suggestedAgents: string[],
    coordinationMode: 'parallel' | 'sequential',
    retryCount: number = 0
): Promise<ExecutionPlan> {
    const MAX_RETRIES = 2;
    const prompt = `Create an execution plan for a multi-agent CRM task.

USER REQUEST: "${message}"
SUGGESTED AGENTS: ${suggestedAgents.join(', ')}
COORDINATION MODE: ${coordinationMode}

Create a plan that:
1. Assigns clear instructions to each agent
2. Sets priorities (1 = highest, run first)
3. Defines dependencies (which agents need others to complete first)
4. Chooses aggregation strategy:
   - "merge": Combine all agent outputs equally
   - "summarize": Generate a summary from all outputs
   - "prioritize": Use primary agent output, supplement with others

Available agents and their capabilities:
- contact: Create, search, update, delete contacts
- email: Draft emails, create templates
- deal: Manage deals and opportunities
- workflow: Create and manage automations
- task: Create tasks and reminders
- company: Manage company accounts
- campaign: Send email campaigns
- pipeline: Manage pipeline stages
- ticket: Handle support tickets
- sequence: Create email sequences
- leadscore: Calculate lead scores
- reports: Generate reports and analytics
- briefing: Prepare meeting briefings
- transcription: Summarize call recordings
- scheduling: Book meetings and manage calendar
- hygiene: Analyze pipeline health and stale deals
- forecast: Generate revenue forecasts
- proposal: Create proposals and quotes
- competitor: Generate battlecards and competitive intelligence
- dataentry: Clean data, find duplicates, parse information
- general: Web search and general questions

OUTPUT FORMAT - Respond with ONLY valid JSON (no markdown, no comments, no extra text):
{
  "mode": "${coordinationMode}",
  "tasks": [
    {
      "agent": "agent_name",
      "instruction": "specific instruction for this agent",
      "priority": 1,
      "dependsOn": []
    }
  ],
  "aggregationStrategy": "merge",
  "estimatedAgentCount": 2
}

CRITICAL RULES:
- Output ONLY the JSON object, nothing else
- Use double quotes for all strings
- No trailing commas
- dependsOn must be an array (use [] if empty)
- Limit to 2-4 agents maximum
- Priority 1 = run first, higher numbers = run later
- mode must be exactly "${coordinationMode}"
- aggregationStrategy must be one of: "merge", "summarize", "prioritize"`;

    try {
        const response = await getJsonModel().invoke([
            new SystemMessage("You are an execution planning system. Generate a valid JSON execution plan."),
            new HumanMessage(prompt),
        ]);

        const responseText = response.content as string;

        // Try multiple extraction methods
        let jsonText: string | null = null;

        // Method 1: Look for code block with json
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim();
        }

        // Method 2: Extract complete JSON object (greedy match for nested objects)
        if (!jsonText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
        }

        // Method 3: Use entire response if it starts with {
        if (!jsonText && responseText.trim().startsWith('{')) {
            jsonText = responseText.trim();
        }

        if (jsonText) {
            // Clean up common JSON issues
            jsonText = jsonText
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys only

            try {
                const plan = JSON.parse(jsonText);

                // Validate the plan structure
                if (!plan.tasks || !Array.isArray(plan.tasks)) {
                    console.error("Invalid plan structure: tasks is not an array");
                    throw new Error("Invalid plan structure");
                }

                return {
                    mode: plan.mode || coordinationMode,
                    tasks: plan.tasks || [],
                    aggregationStrategy: plan.aggregationStrategy || 'merge',
                    estimatedAgentCount: plan.estimatedAgentCount || plan.tasks?.length || 2,
                };
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                console.error("Attempted to parse:", jsonText.substring(0, 500));
                throw parseError;
            }
        } else {
            console.error("No JSON found in response:", responseText.substring(0, 500));
        }
    } catch (error) {
        console.error(`AI execution planning error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return aiExecutionPlan(message, suggestedAgents, coordinationMode, retryCount + 1);
        }
    }

    // Fallback: Create simple plan with suggested agents
    console.log(`⚠️ Falling back to simple plan with ${suggestedAgents.length} agents`);
    return {
        mode: coordinationMode,
        tasks: suggestedAgents.slice(0, 4).map((agent, index) => ({
            agent,
            instruction: 'Process user request',
            priority: index + 1,
            dependsOn: coordinationMode === 'sequential' && index > 0 ? [suggestedAgents[index - 1]] : [],
        })),
        aggregationStrategy: 'merge',
        estimatedAgentCount: Math.min(suggestedAgents.length, 4),
    };
}

/**
 * Create execution plan for multi-agent coordination
 */
export async function createExecutionPlan(
    message: string,
    suggestedAgents: string[],
    coordinationMode: 'parallel' | 'sequential'
): Promise<ExecutionPlan> {
    console.log("📋 Creating execution plan...");
    const start = Date.now();

    // Try to use predefined plan first (fast path)
    const planType = detectPlanType(message);
    if (planType && PREDEFINED_PLANS[planType]) {
        console.log(`✓ Using predefined plan: ${planType} (${Date.now() - start}ms)`);
        return PREDEFINED_PLANS[planType];
    }

    // Use AI to create custom plan
    console.log("🤖 Generating custom execution plan with AI...");
    const plan = await aiExecutionPlan(message, suggestedAgents, coordinationMode);

    console.log(`📋 Plan created: ${plan.mode} mode, ${plan.tasks.length} agents (${Date.now() - start}ms)`);
    plan.tasks.forEach(task => {
        console.log(`   - ${task.agent} (priority: ${task.priority}, depends on: ${task.dependsOn.join(', ') || 'none'})`);
    });

    return plan;
}

/**
 * Optimize execution plan by removing redundant agents and resolving conflicts
 */
export function optimizeExecutionPlan(plan: ExecutionPlan): ExecutionPlan {
    // Remove duplicate agents (keep first occurrence)
    const seenAgents = new Set<string>();
    const optimizedTasks = plan.tasks.filter(task => {
        if (seenAgents.has(task.agent)) {
            return false;
        }
        seenAgents.add(task.agent);
        return true;
    });

    // Limit to 4 agents maximum (take highest priority)
    const limitedTasks = optimizedTasks
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 4);

    // Remove invalid dependencies (dependencies not in agent list)
    const agentNames = new Set(limitedTasks.map(t => t.agent));
    const cleanedTasks = limitedTasks.map(task => ({
        ...task,
        dependsOn: task.dependsOn.filter(dep => agentNames.has(dep)),
    }));

    return {
        ...plan,
        tasks: cleanedTasks,
        estimatedAgentCount: cleanedTasks.length,
    };
}

/**
 * Get execution order based on dependencies
 */
export function getExecutionOrder(plan: ExecutionPlan): string[][] {
    if (plan.mode === 'sequential') {
        // Sequential: Sort by priority
        const sorted = [...plan.tasks].sort((a, b) => a.priority - b.priority);
        return sorted.map(task => [task.agent]);
    }

    // Parallel: Group by dependency level
    const agentLevels: Map<string, number> = new Map();
    const taskMap = new Map(plan.tasks.map(t => [t.agent, t]));

    // Calculate dependency level for each agent
    function getLevel(agent: string, visited = new Set<string>()): number {
        if (agentLevels.has(agent)) {
            return agentLevels.get(agent)!;
        }

        if (visited.has(agent)) {
            return 0; // Circular dependency, treat as level 0
        }

        const task = taskMap.get(agent);
        if (!task || task.dependsOn.length === 0) {
            agentLevels.set(agent, 0);
            return 0;
        }

        visited.add(agent);
        const maxDepLevel = Math.max(
            ...task.dependsOn.map(dep => getLevel(dep, visited))
        );
        const level = maxDepLevel + 1;
        agentLevels.set(agent, level);

        return level;
    }

    // Calculate levels for all agents
    plan.tasks.forEach(task => getLevel(task.agent));

    // Group agents by level
    const levels: string[][] = [];
    plan.tasks.forEach(task => {
        const level = agentLevels.get(task.agent) || 0;
        if (!levels[level]) {
            levels[level] = [];
        }
        levels[level].push(task.agent);
    });

    return levels.filter(level => level.length > 0);
}
