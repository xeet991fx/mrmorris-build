/**
 * Ticket Worker Agent
 * 
 * Handles support ticket management: create, search, update, assign.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

const ticketModel = new ChatVertexAI({
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

async function executeTicketTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_ticket": {
            const { subject, description, priority, contactEmail } = args;

            const ticket = await Ticket.create({
                workspaceId,
                createdBy: userId,
                subject: subject || "Support Request",
                description: description || "No description provided",
                priority: priority || "medium",
                status: "open",
                requesterEmail: contactEmail || "unknown@example.com",
                source: "api",
            });

            return {
                success: true,
                ticketNumber: (ticket as any).ticketNumber,
                message: `Ticket ${(ticket as any).ticketNumber} created: "${subject || 'Support Request'}"`,
            };
        }

        case "list_tickets": {
            const { status, priority } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (priority) filter.priority = priority;

            const tickets = await Ticket.find(filter)
                .populate("relatedContactId", "firstName lastName")
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            return {
                success: true,
                count: tickets.length,
                tickets: tickets.map((t: any) => ({
                    id: t._id.toString().slice(-6),
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    contact: t.relatedContactId ? `${t.relatedContactId.firstName} ${t.relatedContactId.lastName}` : null,
                })),
            };
        }

        case "update_ticket": {
            const { ticketId, status, priority } = args;

            const update: any = {};
            if (status) update.status = status;
            if (priority) update.priority = priority;

            const ticket = await Ticket.findOneAndUpdate(
                { workspaceId, _id: { $regex: ticketId } },
                { $set: update },
                { new: true }
            );

            if (!ticket) {
                return { success: false, error: `Ticket "${ticketId}" not found` };
            }

            return {
                success: true,
                message: `Ticket #${ticket._id.toString().slice(-6)} updated`,
            };
        }

        case "close_ticket": {
            const { ticketId } = args;

            const ticket = await Ticket.findOneAndUpdate(
                { workspaceId, _id: { $regex: ticketId } },
                { status: "closed", closedAt: new Date() },
                { new: true }
            );

            if (!ticket) {
                return { success: false, error: `Ticket not found` };
            }

            return {
                success: true,
                message: `Ticket #${ticket._id.toString().slice(-6)} closed ✅`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function ticketAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🎫 Ticket Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Ticket Agent. Create and manage support tickets.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Tools:
1. create_ticket - Args: { subject, description?, priority? }
2. list_tickets - Args: { status?, priority? }
3. update_ticket - Args: { ticketId, status?, priority? }
4. close_ticket - Args: { ticketId }

Examples:
- "open a ticket for login bug" → {"tool": "create_ticket", "args": {"subject": "Login bug", "description": "User reported login bug", "priority": "medium"}}
- "show tickets" → {"tool": "list_tickets", "args": {}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await ticketModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Ticket AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeTicketTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "list_tickets" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No tickets found. 🎉";
                } else {
                    friendlyResponse = `Found ${result.count} ticket(s):\n${result.tickets.map((t: any) => `• #${t.id}: ${t.title} [${t.status}] ${t.priority === "urgent" ? "🔴" : ""}`).join("\n")}`;
                }
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with tickets! Try:\n• 'Create an urgent ticket for login bug'\n• 'Show open tickets'\n• 'Close ticket #abc123'")],
            finalResponse: "I can help with tickets!",
        };

    } catch (error: any) {
        console.error("❌ Ticket Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
