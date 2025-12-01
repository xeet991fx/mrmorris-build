import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface AgentContext {
  workspaceId: string | null;
  workspaceName: string | null;
  currentPage: "dashboard" | "contacts" | "companies";
  selectedItems: {
    contacts?: string[];
    companies?: string[];
  };
}

export interface ChatMessage {
  role: "user" | "model";
  parts: string;
}

/**
 * Generate a streaming response from Gemini
 */
export async function* generateStreamingResponse(
  userMessage: string,
  context: AgentContext,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  try {
    // Use Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build context-aware system instruction
    const systemInstruction = buildSystemInstruction(context);

    // Format conversation history for Gemini
    const history = conversationHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    // Start chat with history
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    // Send message with context
    const result = await chat.sendMessageStream([
      { text: systemInstruction },
      { text: userMessage },
    ]);

    // Stream the response
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error(
      error.message || "Failed to generate response from Gemini"
    );
  }
}

/**
 * Generate a non-streaming response from Gemini
 */
export async function generateResponse(
  userMessage: string,
  context: AgentContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemInstruction = buildSystemInstruction(context);

    const history = conversationHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage([
      { text: systemInstruction },
      { text: userMessage },
    ]);

    return result.response.text();
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error(
      error.message || "Failed to generate response from Gemini"
    );
  }
}

/**
 * Build context-aware system instruction for Gemini
 */
function buildSystemInstruction(context: AgentContext): string {
  let instruction = `You are MrMorris AI, an intelligent CRM assistant integrated into the MrMorris platform.

Your capabilities include:
- Answering questions about CRM data (contacts, companies, deals)
- Analyzing trends and providing insights
- Helping users create, update, and manage CRM records
- Executing actions on behalf of the user (with confirmation for destructive operations)
- Providing suggestions and recommendations

Current Context:`;

  if (context.workspaceName) {
    instruction += `\n- Current Workspace: ${context.workspaceName}`;
  }

  instruction += `\n- Current Page: ${context.currentPage}`;

  const selectedContactsCount = context.selectedItems.contacts?.length || 0;
  const selectedCompaniesCount = context.selectedItems.companies?.length || 0;

  if (selectedContactsCount > 0 || selectedCompaniesCount > 0) {
    instruction += `\n- Selected Items:`;
    if (selectedContactsCount > 0) {
      instruction += `\n  - ${selectedContactsCount} contact${selectedContactsCount > 1 ? "s" : ""}`;
    }
    if (selectedCompaniesCount > 0) {
      instruction += `\n  - ${selectedCompaniesCount} ${selectedCompaniesCount > 1 ? "companies" : "company"}`;
    }
  }

  instruction += `\n\nWhen suggesting actions, use this JSON format:
\`\`\`action
{
  "action": "create_contact" | "update_contact" | "delete_contact" | "create_company" | "update_company" | "delete_company" | "send_email" | "create_deal",
  "params": { /* action-specific parameters */ },
  "requiresConfirmation": true | false
}
\`\`\`

Guidelines:
- Always be context-aware of the workspace, page, and selected items
- For destructive operations (delete, bulk update), always set requiresConfirmation to true
- Provide clear, actionable responses
- When analyzing data, provide insights and trends
- Be concise but thorough
- Use markdown formatting for better readability`;

  return instruction;
}

/**
 * Parse action commands from AI response
 */
export function parseActionFromResponse(response: string): {
  action: string;
  params: any;
  requiresConfirmation: boolean;
} | null {
  // Look for ```action code blocks
  const actionMatch = response.match(/```action\n([\s\S]*?)\n```/);

  if (!actionMatch) {
    return null;
  }

  try {
    const actionData = JSON.parse(actionMatch[1]);
    return {
      action: actionData.action,
      params: actionData.params,
      requiresConfirmation: actionData.requiresConfirmation ?? true,
    };
  } catch (error) {
    console.error("Failed to parse action from response:", error);
    return null;
  }
}
