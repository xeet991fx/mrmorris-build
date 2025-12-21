/**
 * Ticket Worker Agent
 * 
 * Handles support ticket management: create, search, update, assign.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
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

        case "delete_ticket": {
            const { ticketId } = args;

            const ticket = await Ticket.findOneAndDelete(
                { workspaceId, _id: { $regex: ticketId } }
            );

            if (!ticket) {
                return { success: false, error: `Ticket not found` };
            }

            return {
                success: true,
                message: `Ticket #${ticket._id.toString().slice(-6)} deleted 🗑️`,
            };
        }

        case "bulk_delete_tickets": {
            const { status, priority, olderThanDays } = args;

            const filter: any = { workspaceId };

            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!status && !priority && !olderThanDays) {
                return { success: false, error: "Please specify status, priority, or olderThanDays to bulk delete" };
            }

            const result = await Ticket.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} ticket(s) 🗑️`,
                deletedCount: result.deletedCount,
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
5. delete_ticket - Args: { ticketId }
6. bulk_delete_tickets - Bulk delete. Args: { status?, priority?, olderThanDays? }

Examples:
- "delete all closed tickets" → {"tool": "bulk_delete_tickets", "args": {"status": "closed"}}
- "delete tickets from 2023" → {"tool": "bulk_delete_tickets", "args": {"olderThanDays": 365}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
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
            messages: [new AIMessage("I can help with tickets! Try:\n• 'Delete ticket abc123'\n• 'Show open tickets'\n• 'Close ticket #xyz'")],
            finalResponse: "I can help with tickets!",
        };

    } catch (error: any) {
        console.error("❌ Ticket Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
