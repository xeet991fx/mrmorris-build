import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Import subagents
import { getContactTools } from "./subagents/ContactSubagent";
import { getSalesTools } from "./subagents/SalesSubagent";
import { getCampaignTools } from "./subagents/CampaignSubagent";
import { getAnalyticsTools } from "./subagents/AnalyticsSubagent";

// Import models for direct tools
import Project from "../../models/Project";
import Workflow from "../../models/Workflow";

export type ModelType = "gemini-2.5-flash" | "gemini-2.5-pro";

export interface DeepAgentOptions {
    autonomousMode?: boolean;
    modelType?: ModelType;
}

// CRM System Prompt for the main agent
const CRM_SYSTEM_PROMPT = `You are Mr. Morris, an expert CRM assistant for sales and marketing teams. You are PROACTIVE and ACTION-ORIENTED.

## Your Role
You are a comprehensive CRM assistant with access to specialized tools for:
- **Contact Management**: Search, create, update contacts and score leads
- **Sales Pipeline**: Manage deals, opportunities, and pipeline analytics
- **Campaign Management**: Create campaigns, sequences, and marketing automation
- **Analytics**: Dashboard metrics, reports, forecasting, and insights

## Tool Categories & When to Use Them

### Contact Tools
- search_contacts: Find contacts with filters (status, name, email, company)
- create_contact: Add new contacts to the CRM
- update_contact: Modify existing contact information
- score_contacts: Analyze and score lead engagement

### Sales Tools
- search_opportunities: Find deals in the pipeline
- create_opportunity: Create new deals/opportunities
- move_opportunity_stage: Move deals through pipeline stages
- get_pipeline_stats: Get pipeline metrics and statistics
- get_hot_deals: Find high-value, high-probability deals
- win_lose_opportunity: Mark deals as won or lost

### Campaign Tools
- list_campaigns: View all marketing campaigns
- create_campaign: Set up new email campaigns
- start_campaign: Activate a campaign
- list_sequences: View email automation sequences
- create_sequence: Build new email sequences
- enroll_in_sequence: Add contacts to sequences
- get_sequence_stats: View sequence performance

### Analytics Tools
- get_dashboard_metrics: Key CRM metrics (contacts, deals, revenue)
- get_pipeline_analytics: Conversion rates and stage breakdown
- get_contact_engagement: Engagement levels and activity patterns
- generate_report: Create sales/marketing/overview reports
- forecast_revenue: Revenue forecasting based on pipeline

### Workspace Tools
- analyze_business: Analyze workspace configuration and get recommendations
- list_workflows: View automation workflows

## Behavior Guidelines
1. **Be Proactive**: Take action without asking unnecessary questions
2. **Use Smart Defaults**: Infer parameters from context when not specified
3. **Provide Context**: Always explain what you found and why it matters
4. **Be Concise**: Lead with key insights, use bullet points
5. **Format Well**: Use **bold** for important info, structure responses clearly

## Response Pattern
1. Execute the tool(s) needed
2. Summarize what you found/did
3. Highlight key insights or important items
4. Suggest next steps when appropriate

## Examples
- "Show me my hottest leads" → Use search_contacts with status=lead, sortBy=score
- "What's my pipeline worth?" → Use get_pipeline_stats to get total value
- "Create a follow-up campaign" → Use create_campaign, then create_sequence
- "How are we doing this month?" → Use get_dashboard_metrics with period=month`;

// Create main agent tools (non-subagent tools)
function createMainAgentTools(workspaceId: string, userId: string): any[] {
    const tools: any[] = [
        new DynamicStructuredTool({
            name: "analyze_business",
            description: "Analyze the current workspace/business configuration and provide recommendations",
            schema: z.object({}),
            func: async () => {
                try {
                    const project = await Project.findById(workspaceId).lean();
                    if (!project) {
                        return JSON.stringify({ success: false, error: "Workspace not found" });
                    }

                    return JSON.stringify({
                        success: true,
                        analysis: {
                            projectName: (project as any).name,
                            detectedIndustry: (project as any).industry || "General",
                            suggestedSalesProcess: "Standard B2B",
                            recommendations: {
                                workflows: ["Lead Nurture", "Follow-up Automation", "Onboarding"],
                                integrations: ["Email", "Calendar", "LinkedIn"],
                            },
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "list_workflows",
            description: "List all automation workflows in the workspace",
            schema: z.object({
                status: z.enum(["active", "inactive", "draft"]).optional(),
            }),
            func: async (input: any) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.status) filter.status = input.status;

                    const workflows = await Workflow.find(filter).lean();
                    return JSON.stringify({
                        success: true,
                        count: workflows.length,
                        workflows: workflows.map((w: any) => ({
                            id: w._id,
                            name: w.name,
                            status: w.status,
                            triggerType: w.triggerType,
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),
    ];

    // Note: Web search tool (Tavily) can be added if needed
    // Currently disabled due to package compatibility issues

    return tools;
}

// Sensitive tools that require confirmation in non-autonomous mode
const SENSITIVE_TOOLS_CONFIG: Record<string, { allowedDecisions: ("approve" | "reject" | "edit")[] }> = {
    delete_contact: { allowedDecisions: ["approve", "reject"] },
    delete_company: { allowedDecisions: ["approve", "reject"] },
    delete_opportunity: { allowedDecisions: ["approve", "reject"] },
    send_email: { allowedDecisions: ["approve", "edit", "reject"] },
    bulk_import_contacts: { allowedDecisions: ["approve", "edit", "reject"] },
    start_campaign: { allowedDecisions: ["approve", "reject"] },
    enroll_in_sequence: { allowedDecisions: ["approve", "edit", "reject"] },
};

/**
 * Create a CRM DeepAgent with specialized subagents
 */
export function createCRMDeepAgent(
    workspaceId: string,
    userId: string,
    options: DeepAgentOptions = {}
) {
    const { autonomousMode = true, modelType = "gemini-2.5-flash" } = options;

    // Create the model
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = new ChatGoogleGenerativeAI({
        model: modelType,
        temperature: 0.7,
        maxOutputTokens: 8192,
        apiKey,
    });

    // Get tools for main agent
    const tools = createMainAgentTools(workspaceId, userId);

    // Gather all tools from subagents directly (without creating SubAgent wrappers to avoid channel conflicts)
    const allTools = [
        ...tools,
        ...getContactTools(workspaceId, userId),
        ...getSalesTools(workspaceId, userId),
        ...getCampaignTools(workspaceId, userId),
        ...getAnalyticsTools(workspaceId, userId),
    ];

    // Create the deep agent without subagents to avoid channel conflicts
    const agent = createDeepAgent({
        model,
        tools: allTools,
        // subagents, // Disabled due to channel conflict - tools are merged above
        systemPrompt: CRM_SYSTEM_PROMPT,
        interruptOn: autonomousMode ? {} : SENSITIVE_TOOLS_CONFIG,
    });

    return agent;
}

/**
 * Agent event types for streaming to frontend
 */
export interface AgentStreamEvent {
    type: "thinking" | "planning" | "tool_start" | "tool_result" | "subagent_start" | "subagent_result" | "message" | "done" | "error";
    data: {
        content?: string;
        toolName?: string;
        toolArgs?: any;
        toolResult?: any;
        subagentName?: string;
        todos?: Array<{ id: string; text: string; completed: boolean }>;
        timestamp?: number;
    };
}

/**
 * Format agent events for SSE streaming
 */
export function formatAgentEvent(event: AgentStreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}
