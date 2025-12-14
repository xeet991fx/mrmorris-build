import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Activity from "../../../../models/Activity";

export class GetActivitiesTool extends BaseCRMTool {
  get name() {
    return "get_activities";
  }

  get description() {
    return `Get activities (calls, emails, meetings, notes, tasks) from the CRM. Use this to view activity history for contacts, companies, or opportunities, or to see recent team activities.`;
  }

  get schema() {
    return z.object({
      entityType: z.enum(["contact", "company", "opportunity"]).optional().describe("Filter by entity type"),
      entityId: z.string().optional().describe("Filter by specific entity ID"),
      type: z.enum(["email", "call", "meeting", "note", "task"]).optional().describe("Filter by activity type"),
      limit: z.number().default(20).describe("Maximum number of activities to return"),
      includeCompleted: z.boolean().default(true).describe("Include completed tasks (default: true)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = { workspaceId: this.workspaceId };

      if (input.entityType) {
        filter.entityType = input.entityType;
      }

      if (input.entityId) {
        filter.entityId = input.entityId;
      }

      if (input.type) {
        filter.type = input.type;
      }

      // Filter out completed tasks if requested
      if (input.type === "task" && !input.includeCompleted) {
        filter.completed = { $ne: true };
      }

      const activities = await Activity.find(filter)
        .limit(input.limit || 20)
        .sort({ createdAt: -1 })
        .populate("userId", "firstName lastName email")
        .populate("entityId")
        .lean();

      return {
        success: true,
        count: activities.length,
        activities: activities.map((a) => ({
          id: a._id,
          type: a.type,
          title: a.title,
          description: a.description,
          entityType: a.entityType,
          entityId: a.entityId,
          direction: a.direction,
          duration: a.duration ? a.duration / 60 : undefined, // Convert to minutes
          dueDate: a.dueDate,
          completed: a.completed,
          user: a.userId
            ? {
                id: (a.userId as any)._id,
                name: `${(a.userId as any).firstName || ""} ${(a.userId as any).lastName || ""}`.trim(),
              }
            : undefined,
          createdAt: a.createdAt,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
