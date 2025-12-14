import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Workflow from "../../../../models/Workflow";

export class ListWorkflowsTool extends BaseCRMTool {
  get name() {
    return "list_workflows";
  }

  get description() {
    return `List automation workflows in the CRM. Use this to see all workflows, filter by status (draft, active, paused, archived), and view workflow details like triggers and actions.`;
  }

  get schema() {
    return z.object({
      status: z
        .enum(["draft", "active", "paused", "archived"])
        .optional()
        .describe("Filter by workflow status"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum results to return (default: 10)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = { workspaceId: this.workspaceId };

      if (input.status) {
        filter.status = input.status;
      }

      const workflows = await Workflow.find(filter)
        .limit(input.limit || 10)
        .sort({ createdAt: -1 })
        .select("name description status triggerEntityType steps")
        .lean();

      return {
        success: true,
        count: workflows.length,
        workflows: workflows.map((w) => ({
          id: w._id,
          name: w.name,
          description: w.description,
          status: w.status,
          triggerType: w.triggerEntityType || "manual",
          steps: w.steps?.length || 0,
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
