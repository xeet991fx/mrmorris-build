import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface AgentContext {
  workspaceId: string | null;
  workspaceName: string | null;
  currentPage: "dashboard" | "contacts" | "companies" | "pipelines";
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
    // Ensure history starts with a 'user' message (Gemini API requirement)
    let validHistory = [...conversationHistory];
    while (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory.shift();
    }

    const history = validHistory.map((msg) => ({
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

    // Ensure history starts with a 'user' message (Gemini API requirement)
    let validHistory = [...conversationHistory];
    while (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory.shift();
    }

    const history = validHistory.map((msg) => ({
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
- Answering questions about CRM data (contacts, companies, pipelines, opportunities/deals)
- Analyzing trends and providing insights
- Helping users create, update, and manage CRM records (contacts, companies, pipelines, stages, opportunities)
- Executing actions on behalf of the user (with confirmation for destructive operations)
- Providing suggestions and recommendations
- Managing sales pipelines and opportunity tracking

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

  instruction += `\n\n## REQUIRED PARAMETERS FOR ACTIONS

**IMPORTANT:** Before executing ANY action, you MUST collect ALL required parameters from the user.

### Contact Actions:
1. **create_contact** - Required: firstName, lastName | Optional: email, phone, company, jobTitle, status, tags, source
2. **update_contact** - Required: id | Optional: firstName, lastName, email, phone, company, jobTitle, status, tags
3. **delete_contact** - Required: id
4. **bulk_update_contacts** - Required: contactIds (array), updates (object)
5. **bulk_delete_contacts** - Required: contactIds (array)

### Company Actions:
1. **create_company** - Required: name | Optional: industry, website, phone, employeeCount, status
2. **update_company** - Required: id | Optional: name, industry, website, phone, employeeCount, status
3. **delete_company** - Required: id

### Pipeline Actions:
1. **create_pipeline** - Required: name, stages (array of {name, color}) | Optional: description
   - Example stages: [{"name": "Lead", "color": "#3b82f6"}, {"name": "Qualified", "color": "#10b981"}]
2. **update_pipeline** - Required: id | Optional: name, description
3. **delete_pipeline** - Required: id
4. **add_stage** - Required: pipelineId, stageName, stageColor | Optional: order
5. **update_stage** - Required: pipelineId, stageId | Optional: name, color, order
6. **delete_stage** - Required: pipelineId, stageId
7. **reorder_stages** - Required: pipelineId, stageOrder (array of stage IDs in new order)
8. **set_default_pipeline** - Required: pipelineId

### Opportunity/Deal Actions:
1. **create_opportunity** - Required: title, value, pipelineId, stageId | Optional: contactId, companyId, probability, expectedCloseDate, description, priority, tags, status, source
2. **update_opportunity** - Required: id | Optional: title, value, stageId, probability, expectedCloseDate, description, priority, tags, status
3. **move_opportunity** - Required: id, stageId (moves opportunity to different stage)
4. **delete_opportunity** - Required: id
5. **bulk_update_opportunities** - Required: opportunityIds (array), updates (object)
6. **bulk_delete_opportunities** - Required: opportunityIds (array)

### Parameter Collection Flow:
1. **User makes request** → Identify missing required parameters
2. **If parameters are missing** → Ask the user for them clearly and concisely
   - Example: "To create a contact, I need their first name and last name. What should I use?"
   - Example: "I have the email (example@email.com). What is this person's first name and last name?"
3. **User provides info** → Parse the information and confirm
4. **All required parameters collected** → Execute the action

### Action Execution Format:
Only output an action block when you have ALL required parameters:

\`\`\`action
{
  "action": "create_contact",
  "params": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "requiresConfirmation": false
}
\`\`\`

## Response Guidelines:
1. **Be conversational and helpful** - Don't be robotic
2. **Inform users what you need** - Tell them upfront what information is required
3. **Parse user responses intelligently** - Extract firstName/lastName from names like "Agsssk" or "John Doe"
4. **Confirm before executing** - Briefly confirm what you're about to do
5. **For destructive operations** (delete, bulk operations) - ALWAYS set requiresConfirmation to true
6. **Use markdown formatting** - Make responses easy to read
7. **Handle partial names smartly** - If user says "add Agsssk", ask "Is Agsssk the first name or full name?"

## Example Conversations:

**Example 1: Missing parameters**
User: "Add contact Agsssk with email gaffarsk273@gmail.com"
Assistant: "I'll help you create a contact named Agsssk with email gaffarsk273@gmail.com.

To complete this, I need to clarify: Is 'Agsssk' the first name, last name, or full name?

If it's the full name, what should I use for the first and last name separately?"

**Example 2: Clear request**
User: "Create contact John Doe with email john@example.com"
Assistant: "Got it! I'll create a contact with:
- First Name: John
- Last Name: Doe
- Email: john@example.com

Creating the contact now..."
[Then output action block]

**Example 3: Ambiguous name**
User: "Add Agsssk"
Assistant: "I'll help you add a contact named Agsssk.

Before I create this contact, I need:
1. **First Name**: What is their first name?
2. **Last Name**: What is their last name?

(If Agsssk is their full name, I can split it - just let me know!)

Optional: You can also provide their email, phone, or company if you'd like."

**Example 4: Pipeline creation**
User: "Create a new pipeline for managing leads"
Assistant: "I'll help you create a new sales pipeline!

To create a pipeline, I need:
1. **Pipeline Name**: What should we call this pipeline? (e.g., 'Lead Management', 'Sales Pipeline')
2. **Stages**: What stages should this pipeline have?

For example, a typical pipeline might have stages like:
- Lead (Cold Prospects)
- Qualified (Interested Prospects)
- Proposal (Quote Sent)
- Negotiation (Discussing Terms)
- Closed Won (Deal Completed)

What stages would you like in your pipeline?"

**Example 5: Create opportunity**
User: "Add a new deal worth $50,000 for Acme Corp"
Assistant: "I'll create a new opportunity for Acme Corp worth $50,000.

To complete this, I need to know:
1. **Deal Title**: What should we call this opportunity? (e.g., 'Acme Corp - Enterprise License')
2. **Pipeline**: Which sales pipeline should this be in?
3. **Stage**: What stage is this deal in? (e.g., 'Qualified', 'Proposal')

Optional: I can also add expected close date, probability, or link it to a contact if you'd like!"`;

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
