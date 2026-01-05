/**
 * UNIVERSAL AUTONOMOUS AGENT FRAMEWORK
 *
 * Apply this pattern to ALL agents to make them intelligent and autonomous.
 * This file contains the template function and documentation for building autonomous agents.
 */

import { Types } from "mongoose";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface AgentContext {
    workspaceId: Types.ObjectId | string;
    userRequest: string;
    Model: any; // The mongoose model to query
}

interface ToolCall {
    tool: string;
    args: Record<string, any>;
}

interface AgentResult {
    messages: any[];
    toolResults: Record<string, any>;
    finalResponse: string;
}

// ============================================
// HELPER FUNCTIONS (to be implemented per agent)
// ============================================

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
}

function parseToolCall(responseText: string): ToolCall | null {
    // Extract JSON from response
    const jsonMatch = responseText.match(/JSON:\s*(\{[\s\S]*?\})/);
    if (!jsonMatch) return null;

    try {
        const parsed = JSON.parse(jsonMatch[1]);
        return { tool: parsed.tool, args: parsed.args || {} };
    } catch {
        return null;
    }
}

// Placeholder - implement per agent
async function executeToolFunction(tool: string, args: Record<string, any>): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`Executing tool: ${tool}`, args);
    return { success: true, message: `Executed ${tool}` };
}

// Placeholder - implement with your LLM provider
function getProModel(): any {
    throw new Error("Implement getProModel() with your LLM provider");
}

// ============================================
// PHASE 1: AUTONOMOUS DATA GATHERING
// ============================================
// Before making decisions, GATHER CONTEXT from real CRM data

export async function gatherContext(ctx: AgentContext): Promise<string> {
    const existingData = await ctx.Model.find({ workspaceId: ctx.workspaceId })
        .select("name createdAt")
        .sort({ createdAt: -1 }) // Newest first
        .limit(10)
        .lean();

    const context = existingData.length > 0
        ? `EXISTING DATA:\n${existingData.map((item: any, index: number) => {
            const timeAgo = getTimeAgo(item.createdAt);
            const isNewest = index === 0 ? " 🆕 LATEST" : "";
            return `${index + 1}. ${item.name} - Created ${timeAgo}${isNewest}`;
        }).join('\n')}`
        : "No existing data";

    return context;
}

// ============================================
// PHASE 2: INTELLIGENT SYSTEM PROMPT
// ============================================

export function buildSystemPrompt(context: string, userRequest: string): string {
    return `You are an ELITE [AGENT TYPE] powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: You analyze REAL CRM data and make INTELLIGENT decisions.

📊 CURRENT CRM CONTEXT:
${context}

USER REQUEST: "${userRequest}"

🧠 YOUR AUTONOMOUS PROCESS:

STEP 1: CRITICAL INTENT ANALYSIS
🚨 What is the user trying to do?
- CREATE something new?
- MODIFY/UPDATE existing data?
- DELETE something?
- LIST/SEARCH data?
- GET insights/analysis?

Key signals:
- CREATE: "create", "make", "add", "new"
- MODIFY: "change", "update", "edit", "modify"
- DELETE: "delete", "remove", "get rid of"
- LIST: "show", "list", "what", "which"

STEP 2: CONTEXTUAL UNDERSTANDING
- Look at EXISTING DATA above
- Understand patterns and state
- Identify what's missing or what needs attention
- Consider user's business context

STEP 3: INTELLIGENT DECISION MAKING
- What's the BEST approach?
- What sensible defaults make sense?
- What personalization can I add?
- How can I make this helpful, not robotic?

💡 RESPONSE QUALITY STANDARDS:

✅ DO THIS:
- Use REAL data from context (names, timestamps, patterns)
- Make contextual suggestions based on existing state
- Provide specific, actionable outputs (not placeholders)
- Show your reasoning in ANALYSIS section

❌ NEVER DO THIS:
- Generic placeholders like "Welcome to our company!"
- Create new records when user wants to modify
- Ignore existing data in the CRM
- Give robotic, templated responses

🎨 EXAMPLE OF INTELLIGENCE:

BAD (Placeholder):
- Email: "Hi there, welcome!"
- Task: "Follow up"

GOOD (Contextual):
- Email: "Hi {{firstName}}, based on your interest in {{topic}}..."
- Task: "Call {{firstName}} {{lastName}} at {{company}} to discuss {{specific_need}} by EOD tomorrow"

🔧 AVAILABLE TOOLS:
[List tools here with examples]

📝 RESPONSE FORMAT:

ANALYSIS:
[Your thinking: What is user asking? CREATE/MODIFY/DELETE? Which specific item? What's the best approach?]

JSON:
{"tool": "tool_name", "args": {...}}

CRITICAL: Think contextually, not generically!`;
}

// ============================================
// PHASE 3: RESPONSE PROCESSING WITH REASONING
// ============================================

export async function processAgentResponse(
    systemPrompt: string,
    userRequest: string
): Promise<AgentResult | null> {
    const { SystemMessage, HumanMessage, AIMessage } = await import("@langchain/core/messages");

    const response = await getProModel().invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userRequest),
    ]);

    const responseText = response.content as string;

    // Extract AI's reasoning
    const analysisMatch = responseText.match(/ANALYSIS:(.*?)(?=JSON:|$)/s);
    const aiAnalysis = analysisMatch ? analysisMatch[1].trim() : "";

    console.log("🧠 AI Analysis:", aiAnalysis.substring(0, 200));

    // Extract and execute tool call
    const toolCall = parseToolCall(responseText);

    if (toolCall) {
        const result = await executeToolFunction(toolCall.tool, toolCall.args);

        // Build response with reasoning (optional - can hide for production)
        let friendlyResponse = "";

        // Show AI thinking (makes responses feel intelligent)
        if (aiAnalysis && aiAnalysis.length > 50) {
            friendlyResponse += `## 🧠 Analysis\n${aiAnalysis}\n\n---\n\n`;
        }

        // Add result
        friendlyResponse += result.success
            ? `✅ ${result.message}`
            : `❌ ${result.error}`;

        return {
            messages: [new AIMessage(friendlyResponse)],
            toolResults: { [toolCall.tool]: result, aiAnalysis },
            finalResponse: friendlyResponse,
        };
    }

    return null;
}

/*
=============================================================================
KEY PRINCIPLES FOR ALL AGENTS
=============================================================================

1. GATHER CONTEXT FIRST
   - Query existing CRM data
   - Sort by newest/relevant
   - Mark latest items
   - Include timestamps

2. UNDERSTAND INTENT
   - CREATE vs MODIFY vs DELETE
   - Be explicit about what you're detecting
   - Use signal words

3. THINK BEFORE ACTING
   - Analysis section for reasoning
   - Show understanding of context
   - Explain approach

4. USE REAL DATA
   - No placeholders
   - Reference actual CRM records
   - Use timestamps and patterns
   - Personalize based on context

5. BE CONTEXTUALLY INTELLIGENT
   - "Latest" = #1 in sorted list
   - Use existing patterns
   - Avoid duplication
   - Learn from CRM state

6. PROVIDE TRANSPARENCY
   - Show reasoning (optional)
   - Clear success/error messages
   - Detailed results

=============================================================================
APPLY THIS TO:
=============================================================================
✅ contactAgent - Gather existing contacts
✅ dealAgent - Gather existing deals + pipeline context
✅ emailAgent - Gather email templates + contact data
✅ taskAgent - Gather existing tasks + overdue context
✅ companyAgent - Gather companies + relationship data
✅ campaignAgent - Gather campaigns + performance data
✅ sequenceAgent - Gather sequences + engagement data
✅ ticketAgent - Gather tickets + status breakdown
✅ pipelineAgent - Gather pipeline stages + deal distribution
✅ leadScoreAgent - Gather scored leads + criteria
✅ reportsAgent - Gather recent reports + metrics
✅ hygieneAgent - Gather stale/problematic records
✅ briefingAgent - Gather contact + deal + company for meeting prep
✅ forecastAgent - Gather deals + historical data for predictions
✅ transcriptionAgent - Process call recordings with context
✅ proposalAgent - Gather deal + company data for proposals
✅ competitorAgent - Gather deals + win/loss data
✅ dataEntryAgent - Gather duplicates + data quality issues
✅ schedulingAgent - Gather calendar + meeting data

=============================================================================
*/

export default {
    gatherContext,
    buildSystemPrompt,
    processAgentResponse,
    getTimeAgo,
    parseToolCall,
};
