import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Sequence from "../../../../models/Sequence";

export class ListSequencesTool extends BaseCRMTool {
  get name() {
    return "list_sequences";
  }

  get description() {
    return `List email sequences in the CRM. Use this to see all sequences, filter by status (draft, active, paused, archived), and view sequence details like steps and enrollments.`;
  }

  get schema() {
    return z.object({
      status: z
        .enum(["draft", "active", "paused", "archived"])
        .optional()
        .describe("Filter by sequence status"),
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

      const sequences = await Sequence.find(filter)
        .limit(input.limit || 10)
        .sort({ createdAt: -1 })
        .select("name description status steps stats enrollments")
        .lean();

      return {
        success: true,
        count: sequences.length,
        sequences: sequences.map((s) => ({
          id: s._id,
          name: s.name,
          description: s.description,
          status: s.status,
          stepCount: s.steps?.length || 0,
          activeEnrollments: s.stats?.currentlyActive || 0,
          totalEnrolled: s.stats?.totalEnrolled || 0,
          replied: s.stats?.replied || 0,
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
