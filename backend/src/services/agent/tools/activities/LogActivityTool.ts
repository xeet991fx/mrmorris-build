import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Activity from "../../../../models/Activity";

export class LogActivityTool extends BaseCRMTool {
  get name() {
    return "log_activity";
  }

  get description() {
    return `Log an activity (call, email, meeting, note, task) in the CRM. Use this to record interactions with contacts, companies, or opportunities.`;
  }

  get schema() {
    return z.object({
      type: z.enum(["email", "call", "meeting", "note", "task"]).describe("Type of activity"),
      title: z.string().describe("Activity title (e.g., 'Called John Smith')"),
      description: z.string().optional().describe("Activity details or notes"),
      entityType: z.enum(["contact", "company", "opportunity"]).optional().describe("What this activity relates to"),
      entityId: z.string().optional().describe("ID of the related entity"),
      direction: z.enum(["inbound", "outbound"]).optional().describe("For emails/calls - direction"),
      duration: z.number().optional().describe("Duration in minutes (for calls/meetings)"),
      dueDate: z.string().optional().describe("Due date for tasks (ISO format)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Create the activity
      const activityData: any = {
        workspaceId: this.workspaceId,
        userId: this.userId,
        type: input.type,
        title: input.title,
        description: input.description,
      };

      if (input.entityType && input.entityId) {
        activityData.entityType = input.entityType;
        activityData.entityId = input.entityId;

        // Also set opportunityId if entity is opportunity for backward compatibility
        if (input.entityType === "opportunity") {
          activityData.opportunityId = input.entityId;
        }
      }

      if (input.direction) {
        activityData.direction = input.direction;
      }

      if (input.duration) {
        activityData.duration = input.duration * 60; // Convert minutes to seconds
      }

      if (input.type === "task" && input.dueDate) {
        activityData.dueDate = new Date(input.dueDate);
        activityData.completed = false;
      }

      const activity = await Activity.create(activityData);

      return {
        success: true,
        activity: {
          id: activity._id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          entityType: activity.entityType,
          entityId: activity.entityId,
          direction: activity.direction,
          duration: activity.duration ? activity.duration / 60 : undefined, // Convert back to minutes
          dueDate: activity.dueDate,
          createdAt: activity.createdAt,
        },
        message: `Logged ${input.type} activity: ${input.title}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
