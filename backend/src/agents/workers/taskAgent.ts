/**
 * Task Worker Agent
 * 
 * Handles task/to-do management: create, list, complete, assign tasks.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Task from "../../models/Task";
import Contact from "../../models/Contact";
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

async function executeTaskTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_task": {
            const { title, description, dueDate, contactName, priority } = args;

            // Calculate due date
            let due = new Date();
            if (dueDate) {
                if (typeof dueDate === "number") {
                    due.setDate(due.getDate() + dueDate);
                } else {
                    due = new Date(dueDate);
                }
            } else {
                due.setDate(due.getDate() + 1); // Default: tomorrow
            }

            // Find contact if specified
            let contactId = null;
            if (contactName) {
                const regex = createSafeRegex(contactName);
                const contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: regex }, { lastName: regex }],
                });
                if (contact) contactId = contact._id;
            }

            const task = await Task.create({
                workspaceId,
                userId,
                createdBy: userId,
                title,
                description: description || "",
                dueDate: due,
                priority: priority || "medium",
                status: "todo",
                relatedContactId: contactId,
            });

            return {
                success: true,
                taskId: task._id.toString(),
                message: `Task "${title}" created, due ${due.toLocaleDateString()}`,
            };
        }

        case "list_tasks": {
            const { status, filter } = args;

            const query: any = { workspaceId, userId };
            if (status) query.status = status;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (filter === "overdue") {
                query.dueDate = { $lt: today };
                query.status = { $ne: "completed" };
            } else if (filter === "today") {
                query.dueDate = { $gte: today, $lt: tomorrow };
            } else if (filter === "upcoming") {
                query.dueDate = { $gte: tomorrow };
            }

            const tasks = await Task.find(query)
                .populate("relatedContactId", "firstName lastName")
                .sort({ dueDate: 1 })
                .limit(20)
                .lean();

            return {
                success: true,
                count: tasks.length,
                tasks: tasks.map((t: any) => ({
                    id: t._id.toString(),
                    title: t.title,
                    dueDate: new Date(t.dueDate).toLocaleDateString(),
                    status: t.status,
                    priority: t.priority,
                    contact: t.relatedContactId ? `${t.relatedContactId.firstName} ${t.relatedContactId.lastName}` : null,
                })),
            };
        }

        case "complete_task": {
            const { taskTitle } = args;

            const regex = createSafeRegex(taskTitle);
            const task = await Task.findOneAndUpdate(
                { workspaceId, title: regex, status: { $ne: "completed" } },
                { status: "completed", completedAt: new Date() },
                { new: true }
            );

            if (!task) {
                return { success: false, error: `Task "${taskTitle}" not found` };
            }

            return {
                success: true,
                message: `Task "${task.title}" marked as complete! ✅`,
            };
        }

        case "delete_task": {
            const { taskTitle } = args;

            const regex = createSafeRegex(taskTitle);
            const task = await Task.findOneAndDelete({ workspaceId, title: regex });

            if (!task) {
                return { success: false, error: `Task "${taskTitle}" not found` };
            }

            return {
                success: true,
                message: `Task "${task.title}" deleted 🗑️`,
            };
        }

        case "update_task": {
            const { taskTitle, title, dueDate, priority, description } = args;

            const regex = createSafeRegex(taskTitle);
            const updates: any = {};
            if (title) updates.title = title;
            if (priority) updates.priority = priority;
            if (description) updates.description = description;
            if (dueDate) {
                const due = new Date();
                if (typeof dueDate === "number") {
                    due.setDate(due.getDate() + dueDate);
                } else {
                    updates.dueDate = new Date(dueDate);
                }
            }

            const task = await Task.findOneAndUpdate(
                { workspaceId, title: regex },
                { $set: updates },
                { new: true }
            );

            if (!task) {
                return { success: false, error: `Task "${taskTitle}" not found` };
            }

            return {
                success: true,
                message: `Task "${task.title}" updated ✏️`,
            };
        }

        case "bulk_delete_tasks": {
            const { status, priority, olderThanDays } = args;

            const filter: any = { workspaceId, userId };

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

            const result = await Task.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} task(s) 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function taskAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📋 Task Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Task Agent. Create and manage tasks.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Tools:
1. create_task - Args: { title, dueDate? (days), priority? }
2. list_tasks - Args: { filter? (overdue/today/upcoming) }
3. complete_task - Args: { taskTitle }
4. update_task - Args: { taskTitle, title?, dueDate?, priority? }
5. delete_task - Args: { taskTitle }
6. bulk_delete_tasks - Bulk delete. Args: { status?, priority?, olderThanDays? }

Examples:
- "delete all completed tasks" → {"tool": "bulk_delete_tasks", "args": {"status": "completed"}}
- "delete low priority tasks older than 30 days" → {"tool": "bulk_delete_tasks", "args": {"priority": "low", "olderThanDays": 30}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Task AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            console.log(`🔧 Executing task tool: ${toolCall.tool}`);

            const result = await executeTaskTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Task tool result:", result);

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "list_tasks" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No tasks found. You're all caught up! 🎉";
                } else {
                    friendlyResponse = `Found ${result.count} task(s):\n${result.tasks.map((t: any) => `• ${t.title} - Due: ${t.dueDate} (${t.priority})${t.contact ? ` - ${t.contact}` : ""}`).join("\n")}`;
                }
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with tasks! Try:\n• 'Update follow up task to urgent'\n• 'Delete the old task'\n• 'Show overdue tasks'")],
            finalResponse: "I can help with tasks!",
        };

    } catch (error: any) {
        console.error("❌ Task Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error. Please try again.",
        };
    }
}
