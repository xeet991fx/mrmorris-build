/**
 * Contact Worker Agent
 * 
 * Handles all contact-related CRM operations.
 * Uses Google Vertex AI with Gemini 2.5 Pro for intelligent parsing.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";

// Initialize Gemini 2.5 Pro via Vertex AI
const contactModel = new ChatVertexAI({
    model: "gemini-2.5-pro",
    temperature: 0,
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
 * Parse the AI response to extract tool calls
 */
function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args) {
                return parsed;
            }
        }
    } catch (e) {
        // Not a tool call
    }
    return null;
}

/**
 * Execute contact tools
 */
async function executeContactTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_contact": {
            const { firstName, lastName, email, phone, company, jobTitle, notes } = args;

            if (email) {
                const existing = await Contact.findOne({ workspaceId, email });
                if (existing) {
                    return { success: false, error: `Contact with email ${email} already exists` };
                }
            }

            const contact = await Contact.create({
                workspaceId,
                userId,
                firstName: firstName || "",
                lastName: lastName || "",
                email: email || "",
                phone: phone || "",
                company: company || "",
                jobTitle: jobTitle || "",
                notes: notes || "",
                status: "lead",
                source: "AI Agent",
            });

            await eventPublisher.publish("contact.created", {
                contactId: contact._id.toString(),
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Created contact: ${firstName} ${lastName}`,
                contactId: contact._id.toString(),
            };
        }

        case "search_contacts": {
            const { query, limit = 10 } = args;
            const searchRegex = new RegExp(query, "i");

            const contacts = await Contact.find({
                workspaceId,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                    { company: searchRegex },
                ],
            })
                .limit(limit)
                .select("firstName lastName email company status")
                .lean();

            return {
                success: true,
                count: contacts.length,
                contacts: contacts.map((c: any) => ({
                    id: c._id.toString(),
                    name: `${c.firstName} ${c.lastName}`.trim(),
                    email: c.email,
                    company: c.company,
                })),
            };
        }

        case "update_contact": {
            const { contactId, updates } = args;

            const contact = await Contact.findOneAndUpdate(
                { _id: contactId, workspaceId },
                { $set: updates },
                { new: true }
            );

            if (!contact) {
                return { success: false, error: "Contact not found" };
            }

            await eventPublisher.publish("contact.updated", {
                contactId: contact._id.toString(),
                updates,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Updated contact: ${contact.firstName} ${contact.lastName}`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Contact Agent Node
 */
export async function contactAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🧑‍💼 Contact Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Contact Agent. Analyze the user's request and decide which tool to use.

Available tools:
1. create_contact - Create a new contact. Args: { firstName, lastName, email, phone, company, jobTitle, notes }
2. search_contacts - Search for contacts. Args: { query, limit }
3. update_contact - Update a contact. Args: { contactId, updates }

Instructions:
- Extract the relevant information from the user's request
- Respond with a JSON object containing "tool" and "args"
- Example: {"tool": "create_contact", "args": {"firstName": "John", "lastName": "Smith", "email": "john@example.com", "company": "Acme"}}

Respond with ONLY the JSON object, no other text.`;

        const response = await contactModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            console.log(`🔧 Executing tool: ${toolCall.tool}`);

            const result = await executeContactTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Tool result:", result);

            let friendlyResponse = "";
            if (result.success) {
                if (toolCall.tool === "create_contact") {
                    friendlyResponse = `I've created the contact "${toolCall.args.firstName} ${toolCall.args.lastName || ""}"${toolCall.args.company ? ` from ${toolCall.args.company}` : ""}. ${result.message}`;
                } else if (toolCall.tool === "search_contacts") {
                    if (result.count === 0) {
                        friendlyResponse = `I couldn't find any contacts matching "${toolCall.args.query}".`;
                    } else {
                        friendlyResponse = `I found ${result.count} contact(s):\n${result.contacts.map((c: any) => `• ${c.name} (${c.email || "no email"}) - ${c.company || "no company"}`).join("\n")}`;
                    }
                } else if (toolCall.tool === "update_contact") {
                    friendlyResponse = result.message;
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that action: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I'm not sure what you'd like me to do. Try asking me to create a contact, search for contacts, or update a contact.")],
            finalResponse: "I'm not sure what you'd like me to do. Try asking me to create a contact, search for contacts, or update a contact.",
        };

    } catch (error: any) {
        console.error("❌ Contact Agent error:", error);
        return {
            error: error.message || "Contact agent failed",
            finalResponse: "I encountered an error while processing your request. Please try again.",
        };
    }
}
