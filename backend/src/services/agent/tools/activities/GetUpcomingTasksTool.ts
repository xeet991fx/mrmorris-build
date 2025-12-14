import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Activity from "../../../../models/Activity";

export class GetUpcomingTasksTool extends BaseCRMTool {
  get name() {
    return "get_upcoming_tasks";
  }

  get description() {
    return `Get upcoming tasks that are due soon. Use this to see what tasks need attention, filter by days ahead, or view overdue tasks.`;
  }

  get schema() {
    return z.object({
      days: z.number().default(7).describe("Look ahead this many days (default: 7)"),
      includeOverdue: z.boolean().default(true).describe("Include overdue tasks (default: true)"),
      limit: z.number().default(20).describe("Maximum number of tasks to return"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (input.days || 7));

      const filter: any = {
        workspaceId: this.workspaceId,
        type: "task",
        completed: { $ne: true },
      };

      // Build date filter
      if (input.includeOverdue) {
        // Include tasks from past to future date
        filter.dueDate = { $lte: futureDate };
      } else {
        // Only include tasks from now to future date
        filter.dueDate = {
          $gte: now,
          $lte: futureDate,
        };
      }

      const tasks = await Activity.find(filter)
        .limit(input.limit || 20)
        .sort({ dueDate: 1 }) // Earliest first
        .populate("userId", "firstName lastName email")
        .populate("assigneeId", "firstName lastName email")
        .populate("entityId")
        .lean();

      // Categorize tasks
      const categorizedTasks = tasks.map((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < now;
        const daysUntilDue = dueDate
          ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let urgency = "low";
        if (isOverdue) urgency = "overdue";
        else if (daysUntilDue !== null && daysUntilDue <= 1) urgency = "urgent";
        else if (daysUntilDue !== null && daysUntilDue <= 3) urgency = "high";
        else if (daysUntilDue !== null && daysUntilDue <= 7) urgency = "medium";

        return {
          id: task._id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          daysUntilDue,
          isOverdue,
          urgency,
          entityType: task.entityType,
          entityId: task.entityId,
          assignee: task.assigneeId
            ? {
                id: (task.assigneeId as any)._id,
                name: `${(task.assigneeId as any).firstName || ""} ${(task.assigneeId as any).lastName || ""}`.trim(),
              }
            : undefined,
          createdBy: task.userId
            ? {
                id: (task.userId as any)._id,
                name: `${(task.userId as any).firstName || ""} ${(task.userId as any).lastName || ""}`.trim(),
              }
            : undefined,
          createdAt: task.createdAt,
        };
      });

      // Count by urgency
      const summary = {
        total: categorizedTasks.length,
        overdue: categorizedTasks.filter((t) => t.urgency === "overdue").length,
        urgent: categorizedTasks.filter((t) => t.urgency === "urgent").length,
        high: categorizedTasks.filter((t) => t.urgency === "high").length,
        medium: categorizedTasks.filter((t) => t.urgency === "medium").length,
        low: categorizedTasks.filter((t) => t.urgency === "low").length,
      };

      return {
        success: true,
        timeframe: `Next ${input.days} days${input.includeOverdue ? " + overdue" : ""}`,
        summary,
        tasks: categorizedTasks,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
