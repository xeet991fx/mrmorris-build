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
    modelType: ModelType = "gemini"
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
      ? "Autonomous mode - execute actions automatically"
      : "Confirmation mode - ask before executing actions";

    return `You are Mr. Morris, an expert CRM assistant. You help users manage their sales pipeline, contacts, campaigns, and workflows.

Your capabilities:
- Search and manage contacts and companies
- Create and track opportunities in the sales pipeline
- Launch and monitor email campaigns
- Enroll contacts in workflows and sequences
- Provide analytics and insights
- Search the web for business information and best practices
- Analyze the user's business and recommend CRM configuration
- Create automation workflows based on business needs
- Suggest relevant integrations for their industry

Available tools: ${toolNames}

Current mode: ${modeDescription}

When helping users:
1. Understand their intent clearly
2. Use the appropriate tools to fulfill their request
3. Provide clear, concise, and helpful responses
4. If multiple steps are needed, explain what you're doing
5. For business analysis, use web_search to research industries and best practices
6. For new users, use analyze_business to understand their needs and suggest_integrations

Be professional, efficient, and proactive in helping users succeed with their CRM.`;
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<string> {
    try {
      // Convert history to LangChain messages
      const messages: BaseMessage[] = [
        new SystemMessage(this.buildSystemPrompt()),
      ];

      // Add conversation history
      history.forEach((msg) => {
        if (msg.role === "user") {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current message
      messages.push(new HumanMessage(message));

      // Bind tools to the model
      const tools = this.toolRegistry.getAllTools().map((t) => t.toLangChainTool());
      const modelWithTools = this.model.bindTools(tools);

      // Get response from model
      const response = await modelWithTools.invoke(messages);

      // Check if model wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        const tool = this.toolRegistry.getTool(toolCall.name);

        if (!tool) {
          return `Error: Tool "${toolCall.name}" not found.`;
        }

        // Execute the tool
        const toolResult = await tool.execute(toolCall.args);

        // Format the response
        let responseText = response.content || "";

        // Add tool execution result
        if (toolResult.success) {
          responseText += `\n\nI executed the ${toolCall.name} tool and here's what I found:\n`;

          // Format different tool responses
          if (toolCall.name === "search_contacts") {
            if (toolResult.contacts && toolResult.contacts.length > 0) {
              responseText += `Found ${toolResult.count} contact(s):\n`;
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
            responseText += `Search results for "${toolResult.query}":\n`;
            if (typeof toolResult.results === "string") {
              responseText += toolResult.results;
            } else {
              responseText += JSON.stringify(toolResult.results, null, 2);
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
      return response.content || "I'm not sure how to help with that.";
    } catch (error: any) {
      console.error("LangGraphAgent error:", error);
      return `I encountered an error: ${error.message}. Please try again or rephrase your question.`;
    }
  }
}
