/**
 * Reports Worker Agent
 * 
 * Handles analytics and reporting: sales, activity, pipeline, team performance.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import Task from "../../models/Task";
import Activity from "../../models/Activity";
async function executeReportsTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    switch (toolName) {
        case "get_sales_summary": {
            const { period } = args;

            let startDate = startOfMonth;
            if (period === "week") startDate = startOfWeek;
            else if (period === "year") startDate = new Date(now.getFullYear(), 0, 1);

            const deals = await Opportunity.find({ workspaceId }).lean();
            const closedWon = deals.filter((d: any) =>
                d.status === "won" && new Date(d.closedAt || d.updatedAt) >= startDate
            );
            const openDeals = deals.filter((d: any) => d.status === "open");

            const wonRevenue = closedWon.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

            return {
                success: true,
                period: period || "month",
                stats: {
                    dealsWon: closedWon.length,
                    revenue: wonRevenue,
                    openDeals: openDeals.length,
                    pipelineValue,
                },
            };
        }

        case "get_activity_summary": {
            const activities = await Activity.find({
                workspaceId,
                createdAt: { $gte: startOfWeek },
            }).lean();

            const byType: Record<string, number> = {};
            for (const activity of activities) {
                const type = (activity as any).type || "other";
                byType[type] = (byType[type] || 0) + 1;
            }

            return {
                success: true,
                period: "week",
                total: activities.length,
                byType,
            };
        }

        case "get_contact_summary": {
            const totalContacts = await Contact.countDocuments({ workspaceId });
            const newThisMonth = await Contact.countDocuments({
                workspaceId,
                createdAt: { $gte: startOfMonth },
            });
            const newThisWeek = await Contact.countDocuments({
                workspaceId,
                createdAt: { $gte: startOfWeek },
            });

            return {
                success: true,
                stats: {
                    total: totalContacts,
                    newThisMonth,
                    newThisWeek,
                },
            };
        }

        case "get_task_summary": {
            const tasks = await Task.find({ workspaceId }).lean();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const overdue = tasks.filter((t: any) =>
                t.status !== "completed" && new Date(t.dueDate) < today
            ).length;
            const pending = tasks.filter((t: any) => t.status === "pending").length;
            const completed = tasks.filter((t: any) => t.status === "completed").length;

            return {
                success: true,
                stats: {
                    total: tasks.length,
                    pending,
                    completed,
                    overdue,
                },
            };
        }

        case "get_dashboard_summary": {
            // All-in-one dashboard summary
            const [deals, contacts, tasks] = await Promise.all([
                Opportunity.find({ workspaceId }).lean(),
                Contact.countDocuments({ workspaceId }),
                Task.find({ workspaceId, status: { $ne: "completed" } }).lean(),
            ]);

            const openDeals = deals.filter((d: any) => d.status === "open");
            const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            const overdueTasks = tasks.filter((t: any) => new Date(t.dueDate) < new Date()).length;

            return {
                success: true,
                dashboard: {
                    contacts,
                    openDeals: openDeals.length,
                    pipelineValue,
                    pendingTasks: tasks.length,
                    overdueTasks,
                },
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function reportsAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📊 Reports Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Reports Agent. Provide analytics and insights.

Available tools:

1. get_sales_summary - Sales performance
   Args: { period? (week/month/year) }

2. get_activity_summary - Activity metrics
   Args: {}

3. get_contact_summary - Contact growth
   Args: {}

4. get_task_summary - Task status overview
   Args: {}

5. get_dashboard_summary - Quick overall summary
   Args: {}

Respond with JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Reports AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "ReportsAgent");

        if (toolCall) {
            const result = await executeReportsTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? "" : `Sorry: ${result.error}`;

            if (toolCall.tool === "get_sales_summary" && result.success) {
                friendlyResponse = `📈 Sales Summary (${result.period}):\n• Deals Won: ${result.stats.dealsWon}\n• Revenue: $${result.stats.revenue.toLocaleString()}\n• Open Deals: ${result.stats.openDeals}\n• Pipeline: $${result.stats.pipelineValue.toLocaleString()}`;
            } else if (toolCall.tool === "get_activity_summary" && result.success) {
                const types = Object.entries(result.byType).map(([k, v]) => `• ${k}: ${v}`).join("\n");
                friendlyResponse = `📊 Activity This Week: ${result.total} total\n${types}`;
            } else if (toolCall.tool === "get_contact_summary" && result.success) {
                friendlyResponse = `👥 Contacts:\n• Total: ${result.stats.total}\n• New This Month: ${result.stats.newThisMonth}\n• New This Week: ${result.stats.newThisWeek}`;
            } else if (toolCall.tool === "get_task_summary" && result.success) {
                friendlyResponse = `📋 Tasks:\n• Total: ${result.stats.total}\n• Pending: ${result.stats.pending}\n• Completed: ${result.stats.completed}\n• Overdue: ${result.stats.overdue} ⚠️`;
            } else if (toolCall.tool === "get_dashboard_summary" && result.success) {
                const d = result.dashboard;
                friendlyResponse = `🏠 Dashboard:\n• ${d.contacts} Contacts\n• ${d.openDeals} Open Deals ($${d.pipelineValue.toLocaleString()})\n• ${d.pendingTasks} Pending Tasks${d.overdueTasks > 0 ? ` (${d.overdueTasks} overdue ⚠️)` : ""}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with reports! Try:\n• 'Show me my dashboard'\n• 'Sales summary this month'\n• 'How many contacts do I have?'")],
            finalResponse: "I can help with reports!",
        };

    } catch (error: any) {
        console.error("❌ Reports Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
