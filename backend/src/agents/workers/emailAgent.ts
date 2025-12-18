/**
 * Email Worker Agent
 * 
 * Handles email-related CRM operations: drafts, templates, sending.
 * Uses Google Vertex AI with Gemini 2.5 Flash.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import EmailTemplate from "../../models/EmailTemplate";
import Contact from "../../models/Contact";

// Initialize Gemini 2.5 Pro via Vertex AI
const emailModel = new ChatVertexAI({
    model: "gemini-2.5-pro",
    temperature: 0.3, // Slightly creative for email writing
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

/**
 * Parse tool call from AI response
 */
function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args) return parsed;
        }
    } catch (e) { }
    return null;
}

/**
 * Execute email tools
 */
async function executeEmailTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "draft_email": {
            const { to, subject, body, tone, purpose } = args;

            // Generate email content using AI if body not fully provided
            let emailBody = body;
            if (!body && purpose) {
                const draftPrompt = `Write a professional ${tone || "friendly"} email for: ${purpose}`;
                const draftResponse = await emailModel.invoke([
                    new SystemMessage("You are an expert email writer. Write concise, professional emails."),
                    new HumanMessage(draftPrompt),
                ]);
                emailBody = draftResponse.content as string;
            }

            return {
                success: true,
                draft: {
                    to,
                    subject: subject || `Regarding: ${purpose || "your request"}`,
                    body: emailBody,
                },
                message: "Email draft created successfully",
            };
        }

        case "create_template": {
            const { name, subject, body, category } = args;

            const template = await EmailTemplate.create({
                workspaceId,
                userId,
                name,
                subject,
                body,
                category: category || "general",
                isActive: true,
            });

            return {
                success: true,
                templateId: template._id.toString(),
                message: `Template "${name}" created successfully`,
            };
        }

        case "list_templates": {
            const { category } = args;

            const query: any = { workspaceId, isActive: true };
            if (category) query.category = category;

            const templates = await EmailTemplate.find(query)
                .select("name subject category")
                .limit(20)
                .lean();

            return {
                success: true,
                count: templates.length,
                templates: templates.map((t: any) => ({
                    id: t._id.toString(),
                    name: t.name,
                    subject: t.subject,
                    category: t.category,
                })),
            };
        }

        case "get_contact_email": {
            const { contactName } = args;
            const searchRegex = new RegExp(contactName, "i");

            const contact = await Contact.findOne({
                workspaceId,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                ],
            }).select("firstName lastName email company").lean();

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            return {
                success: true,
                contact: {
                    name: `${(contact as any).firstName} ${(contact as any).lastName}`.trim(),
                    email: (contact as any).email,
                    company: (contact as any).company,
                },
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Email Agent Node
 */
export async function emailAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📧 Email Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Email Agent. Analyze the user's request and decide which tool to use.

Available tools:
1. draft_email - Draft an email. Args: { to, subject, body, tone, purpose }
2. create_template - Create an email template. Args: { name, subject, body, category }
3. list_templates - List email templates. Args: { category? }
4. get_contact_email - Get a contact's email. Args: { contactName }

Instructions:
- Extract relevant information from the user's request
- Respond with a JSON object: {"tool": "...", "args": {...}}

Respond with ONLY the JSON object, no other text.`;

        const response = await emailModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Email AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            console.log(`🔧 Executing email tool: ${toolCall.tool}`);

            const result = await executeEmailTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Email tool result:", result);

            let friendlyResponse = "";
            if (result.success) {
                if (toolCall.tool === "draft_email") {
                    friendlyResponse = `Here's your email draft:\n\n**To:** ${result.draft.to || "[recipient]"}\n**Subject:** ${result.draft.subject}\n\n${result.draft.body}`;
                } else if (toolCall.tool === "create_template") {
                    friendlyResponse = result.message;
                } else if (toolCall.tool === "list_templates") {
                    if (result.count === 0) {
                        friendlyResponse = "No email templates found.";
                    } else {
                        friendlyResponse = `Found ${result.count} template(s):\n${result.templates.map((t: any) => `• ${t.name} (${t.category})`).join("\n")}`;
                    }
                } else if (toolCall.tool === "get_contact_email") {
                    friendlyResponse = `${result.contact.name}'s email is ${result.contact.email}${result.contact.company ? ` (${result.contact.company})` : ""}`;
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help you draft emails, create templates, or find contact emails. What would you like to do?")],
            finalResponse: "I can help you draft emails, create templates, or find contact emails. What would you like to do?",
        };

    } catch (error: any) {
        console.error("❌ Email Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error processing your email request. Please try again.",
        };
    }
}
