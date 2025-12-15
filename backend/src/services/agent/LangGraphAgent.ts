import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ToolRegistry } from "./ToolRegistry";
import { ModelFactory, ModelType } from "./ModelFactory";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export class LangGraphCRMAgent {
  private model: any; // ChatModel from LangChain
  private toolRegistry: ToolRegistry;
  private workspaceId: string;
  private userId: string;
  private autonomousMode: boolean;

  constructor(
    workspaceId: string,
    userId: string,
    autonomousMode: boolean,
    modelType: ModelType = "gemini-2.5-flash"
  ) {
    this.workspaceId = workspaceId;
    this.userId = userId;
    this.autonomousMode = autonomousMode;
    this.toolRegistry = new ToolRegistry(workspaceId, userId);
    this.model = ModelFactory.createModel(modelType);
  }

  private buildSystemPrompt(): string {
    const toolNames = this.toolRegistry.getToolNames().join(", ");
    const modeDescription = this.autonomousMode
      ? "Autonomous mode - execute actions without asking"
      : "Confirmation mode - execute common tasks, ask only for truly ambiguous requests";

    return `You are Mr. Morris, an expert CRM assistant for sales and marketing teams. You are PROACTIVE and ACTION-ORIENTED.

## CRITICAL RULES:
1. **DO NOT ASK UNNECESSARY QUESTIONS** - If the user's intent is reasonably clear, EXECUTE the action immediately
2. **INFER CONTEXT** - Use common sense. "hottest leads" = high score/recent activity. "build workflow" = create_automation
3. **ONE QUESTION MAX** - If you MUST ask, ask only ONE critical question, then proceed with reasonable defaults
4. **ALWAYS USE TOOLS** - Don't just describe what you could do - DO IT using the appropriate tool

## AVAILABLE TOOLS: ${toolNames}

## CURRENT MODE: ${modeDescription}

## INTENT MAPPING (execute immediately, don't ask):
- "find/search contacts" → search_contacts
- "hottest leads" → search_contacts with status=lead, sorted by score/activity
- "build/create workflow/automation" → create_automation (infer type from context)
- "new lead nurture" → create_automation with automationType="lead-nurture"
- "SaaS lead generation" → create_automation with automationType="lead-nurture", businessType="SaaS"
- "analyze my business" → analyze_business
- "search for [topic]" → web_search

## SMART DEFAULTS:
- Business type not specified? Ask ONCE, default to "General Business"
- Workflow type not specified? Use "lead-nurture" for new leads
- Search query vague? Search broadly and present results to narrow down

## RESPONSE FORMAT:
- Be CONCISE - no fluff, no lengthy explanations
- Lead with ACTION (what you did), not questions
- Use bullet points for lists
- Format important info in **bold**

## EXAMPLES OF GOOD BEHAVIOR:
User: "find my leads"
You: [execute search_contacts with status=lead] "Found X leads..."

User: "build me a workflow for new leads"
You: [execute create_automation with lead-nurture] "Created Lead Nurture workflow with X steps..."

User: "who are my hottest leads"
You: [execute search_contacts sorted by score] "Here are your most engaged leads..."

Remember: You are a DOER, not an interviewer. Take action first, ask questions only when absolutely necessary.`
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<string> {
    try {
      // Convert history to LangChain messages
      const messages: BaseMessage[] = [
        new SystemMessage(this.buildSystemPrompt()),
      ];

      // Add conversation history - ensure content is always a string
      if (history && Array.isArray(history)) {
        history.forEach((msg) => {
          if (!msg || !msg.content) return;

          const content = typeof msg.content === 'string' ? msg.content : String(msg.content);

          if (msg.role === "user") {
            messages.push(new HumanMessage({ content }));
          } else if (msg.role === "assistant") {
            messages.push(new AIMessage({ content }));
          }
        });
      }

      // Add current message - ensure it's a string
      const currentMessage = typeof message === 'string' ? message : String(message);
      messages.push(new HumanMessage({ content: currentMessage }));

      // Bind tools to the model
      const tools = this.toolRegistry.getAllTools().map((t) => t.toLangChainTool());
      console.log(`📦 Available tools: ${this.toolRegistry.getToolNames().join(", ")}`);
      const modelWithTools = this.model.bindTools(tools);

      // Get response from model
      const response = await modelWithTools.invoke(messages);

      // Validate response
      if (!response) {
        throw new Error("Model returned no response");
      }

      // Debug: Log tool calls
      console.log(`🔧 Tool calls from model: ${response.tool_calls?.length || 0}`);
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(`🔧 Tool requested: ${response.tool_calls[0].name}`);
      }

      // Check if model wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        const tool = this.toolRegistry.getTool(toolCall.name);

        if (!tool) {
          return `Error: Tool "${toolCall.name}" not found.`;
        }

        // Execute the tool
        const toolResult = await tool.execute(toolCall.args);

        // Initialize response text - DON'T include raw response.content which may contain JSON
        let responseText = "";

        // Add tool execution result
        if (toolResult.success) {
          // Add intro for non-web_search tools (web_search has its own formatting)
          if (toolCall.name !== "web_search") {
            responseText = `✅ I executed the **${toolCall.name.replace(/_/g, ' ')}** tool:\n\n`;
          }

          // Format different tool responses
          if (toolCall.name === "search_contacts") {
            if (toolResult.contacts && toolResult.contacts.length > 0) {
              responseText += `**Found ${toolResult.count} contact(s):**\n\n`;
              toolResult.contacts.slice(0, 5).forEach((contact: any, i: number) => {
                responseText += `${i + 1}. ${contact.name} (${contact.email}) - ${contact.status}`;
                if (contact.company) responseText += ` at ${contact.company}`;
                responseText += `\n`;
              });
              if (toolResult.count > 5) {
                responseText += `\n...and ${toolResult.count - 5} more contact(s).`;
              }
            } else {
              responseText += "No contacts found matching your criteria.";
            }
          } else if (toolCall.name === "analyze_business") {
            const analysis = toolResult.analysis;
            responseText += `\nBusiness: ${analysis.projectName}`;
            responseText += `\nIndustry: ${analysis.detectedIndustry}`;
            responseText += `\nSales Process: ${analysis.suggestedSalesProcess}`;
            responseText += `\nCRM Stats: ${analysis.crmStats.contacts} contacts, ${analysis.crmStats.companies} companies`;

            if (analysis.recommendations) {
              responseText += `\n\nRecommendations:`;
              if (analysis.recommendations.workflows?.length > 0) {
                responseText += `\n- Workflows: ${analysis.recommendations.workflows.join(", ")}`;
              }
              if (analysis.recommendations.integrations?.length > 0) {
                responseText += `\n- Integrations: ${analysis.recommendations.integrations.join(", ")}`;
              }
              if (analysis.recommendations.pipelines?.length > 0) {
                responseText += `\n- Pipeline: ${analysis.recommendations.pipelines[0]}`;
              }
            }
          } else if (toolCall.name === "create_automation") {
            responseText += toolResult.message || "Automation created successfully!";
            if (toolResult.automation) {
              responseText += `\nWorkflow: "${toolResult.automation.name}"`;
              responseText += `\nStatus: ${toolResult.automation.status}`;
              responseText += `\nTrigger: ${toolResult.automation.triggerType}`;
              responseText += `\nActions: ${toolResult.automation.actionCount}`;
            }
          } else if (toolCall.name === "web_search") {
            // Format web search results nicely
            responseText = `🔍 **Web Search Results for "${toolResult.query}"**\n\n`;

            // Add AI-generated answer if available
            if (toolResult.answer && toolResult.answer !== "No summarized answer available.") {
              responseText += `**📝 Summary:**\n${toolResult.answer}\n\n`;
              responseText += `---\n\n`;
            }

            // Format individual results
            if (Array.isArray(toolResult.results) && toolResult.results.length > 0) {
              responseText += `**📚 Sources (${toolResult.resultCount} results):**\n\n`;
              toolResult.results.forEach((result: any, index: number) => {
                responseText += `**${index + 1}. ${result.title}**\n`;
                responseText += `🔗 ${result.url}\n`;
                if (result.content) {
                  // Clean up the content - remove "..." if already added
                  const content = result.content.replace(/\.\.\.+$/, '').trim();
                  responseText += `${content}\n\n`;
                }
              });
            } else if (typeof toolResult.results === "string") {
              responseText += toolResult.results;
            } else {
              responseText += "No results found for this search.";
            }
          } else {
            // Generic tool result display
            responseText += JSON.stringify(toolResult, null, 2);
          }
        } else {
          responseText += `\n\nError executing ${toolCall.name}: ${toolResult.error}`;
        }

        return responseText;
      }

      // No tool calls, return model's response
      if (response.content) {
        return typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      }

      return "I'm not sure how to help with that.";
    } catch (error: any) {
      console.error("LangGraphAgent error:", error);
      console.error("Error stack:", error.stack);
      return `I encountered an error: ${error.message}. Please try again or rephrase your question.`;
    }
  }
}
