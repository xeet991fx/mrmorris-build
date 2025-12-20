/**
 * Sequence Worker Agent
 * 
 * Handles email sequences: create, add steps, enroll contacts.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Sequence from "../../models/Sequence";
import Contact from "../../models/Contact";
import { v4 as uuidv4 } from "uuid";
import { createSafeRegex } from "../utils/escapeRegex";

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

async function executeSequenceTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_sequence": {
            const { name, steps } = args;

            const defaultSteps = steps || [
                { subject: "Introduction", body: "Hi {{firstName}},\n\nI wanted to reach out...", delayDays: 0 },
                { subject: "Following up", body: "Hi {{firstName}},\n\nJust checking in...", delayDays: 3 },
                { subject: "Last call", body: "Hi {{firstName}},\n\nOne last note...", delayDays: 7 },
            ];

            const sequence = await Sequence.create({
                workspaceId,
                userId,
                name: name || "New Sequence",
                status: "active",
                steps: defaultSteps.map((step: any, index: number) => ({
                    id: uuidv4(),
                    order: index,
                    type: "email",
                    subject: step.subject,
                    body: step.body,
                    delay: { value: step.delayDays || 0, unit: "days" },
                })),
            });

            return {
                success: true,
                sequenceId: sequence._id.toString(),
                message: `Sequence "${sequence.name}" created with ${defaultSteps.length} steps`,
            };
        }

        case "list_sequences": {
            const { status } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const sequences = await Sequence.find(filter)
                .select("name status steps")
                .limit(20)
                .lean();

            return {
                success: true,
                count: sequences.length,
                sequences: sequences.map((s: any) => ({
                    id: s._id.toString(),
                    name: s.name,
                    status: s.status,
                    stepCount: s.steps?.length || 0,
                })),
            };
        }

        case "add_sequence_step": {
            const { sequenceName, subject, body, delayDays } = args;

            const regex = createSafeRegex(sequenceName);
            const sequence = await Sequence.findOne({ workspaceId, name: regex });

            if (!sequence) {
                return { success: false, error: `Sequence "${sequenceName}" not found` };
            }

            const newStep = {
                id: uuidv4(),
                order: (sequence.steps?.length || 0),
                type: "email",
                subject: subject || "Follow up",
                body: body || "Hi {{firstName}},\n\n...",
                delay: { value: delayDays || 3, unit: "days" },
            };

            (sequence.steps as any[]).push(newStep);
            await sequence.save();

            return {
                success: true,
                message: `Added step ${sequence.steps?.length} to "${sequence.name}"`,
            };
        }

        case "enroll_in_sequence": {
            const { sequenceName, contactName } = args;

            const sequenceRegex = createSafeRegex(sequenceName);
            const sequence = await Sequence.findOne({ workspaceId, name: sequenceRegex, status: "active" });

            if (!sequence) {
                return { success: false, error: `Active sequence "${sequenceName}" not found` };
            }

            const contactRegex = createSafeRegex(contactName);
            const contact = await Contact.findOne({
                workspaceId,
                $or: [{ firstName: contactRegex }, { lastName: contactRegex }],
            });

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            // Add contact to sequence enrollments
            const enrollment = {
                contactId: contact._id,
                currentStepIndex: 0,
                enrolledAt: new Date(),
                status: "active",
                emailsSent: 0,
                emailsOpened: 0,
                emailsClicked: 0,
            };
            (sequence.enrollments as any[]).push(enrollment);
            await sequence.save();

            return {
                success: true,
                message: `${contact.firstName} ${contact.lastName} enrolled in "${sequence.name}"`,
            };
        }

        case "delete_sequence": {
            const { sequenceName } = args;

            const regex = createSafeRegex(sequenceName);
            const sequence = await Sequence.findOneAndDelete({ workspaceId, name: regex });

            if (!sequence) {
                return { success: false, error: `Sequence "${sequenceName}" not found` };
            }

            return {
                success: true,
                message: `Sequence "${sequence.name}" deleted successfully 🗑️`,
            };
        }

        case "update_sequence": {
            const { sequenceName, name, status } = args;

            const regex = createSafeRegex(sequenceName);
            const updates: any = {};
            if (name) updates.name = name;
            if (status) updates.status = status;

            const sequence = await Sequence.findOneAndUpdate(
                { workspaceId, name: regex },
                { $set: updates },
                { new: true }
            );

            if (!sequence) {
                return { success: false, error: `Sequence "${sequenceName}" not found` };
            }

            return {
                success: true,
                message: `Sequence "${sequence.name}" updated successfully ✏️`,
            };
        }

        case "pause_sequence": {
            const { sequenceName } = args;

            const regex = createSafeRegex(sequenceName);
            const sequence = await Sequence.findOneAndUpdate(
                { workspaceId, name: regex },
                { status: "paused" },
                { new: true }
            );

            if (!sequence) {
                return { success: false, error: `Sequence "${sequenceName}" not found` };
            }

            return {
                success: true,
                message: `Sequence "${sequence.name}" paused ⏸️`,
            };
        }

        case "bulk_delete_sequences": {
            const { status, olderThanDays } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!status && !olderThanDays) {
                return { success: false, error: "Please specify status or olderThanDays to bulk delete" };
            }

            const result = await Sequence.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} sequence(s) 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function sequenceAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🔄 Sequence Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Sequence Agent. Manage multi-step email sequences.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Available tools:
1. create_sequence - Create sequence. Args: { name, steps? }
2. update_sequence - Args: { sequenceName, name?, status? }
3. delete_sequence - Args: { sequenceName }
4. pause_sequence - Args: { sequenceName }
5. list_sequences - Args: { status? }
6. add_sequence_step - Args: { sequenceName, subject, body?, delayDays? }
7. enroll_in_sequence - Args: { sequenceName, contactName }
8. bulk_delete_sequences - Bulk delete. Args: { status?, olderThanDays? }

Examples:
- "delete all paused sequences" → {"tool": "bulk_delete_sequences", "args": {"status": "paused"}}
- "delete sequences older than 60 days" → {"tool": "bulk_delete_sequences", "args": {"olderThanDays": 60}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Sequence AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeSequenceTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "list_sequences" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No sequences found.";
                } else {
                    friendlyResponse = `Found ${result.count} sequence(s):\n${result.sequences.map((s: any) => `• ${s.name} (${s.stepCount} steps) - ${s.status}`).join("\n")}`;
                }
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with sequences! Try:\n• 'Delete the old sequence'\n• 'Pause the nurture sequence'\n• 'Show my sequences'")],
            finalResponse: "I can help with sequences!",
        };

    } catch (error: any) {
        console.error("❌ Sequence Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
