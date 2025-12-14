import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Sequence from "../../../../models/Sequence";

export class CreateSequenceTool extends BaseCRMTool {
  get name() {
    return "create_sequence";
  }

  get description() {
    return `Create a new email sequence for automated follow-ups. Use this to set up multi-step email campaigns that send emails over time.`;
  }

  get schema() {
    return z.object({
      name: z.string().describe("Sequence name (e.g., 'Lead Nurture Sequence')"),
      description: z.string().optional().describe("Description of the sequence"),
      steps: z.array(
        z.object({
          subject: z.string(),
          body: z.string(),
          delayDays: z.number().describe("Days to wait before sending this email"),
        })
      ).describe("Email steps in the sequence"),
      unenrollOnReply: z.boolean().default(true).describe("Stop sequence when contact replies"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Check if sequence with same name exists
      const existing = await Sequence.findOne({
        workspaceId: this.workspaceId,
        name: input.name,
      });

      if (existing) {
        return {
          success: false,
          error: `Sequence with name "${input.name}" already exists`,
        };
      }

      // Create steps with proper structure
      const steps = input.steps.map((step, index) => ({
        id: `step_${index + 1}`,
        order: index,
        type: "email" as const,
        subject: step.subject,
        body: step.body,
        delay: {
          value: step.delayDays,
          unit: "days" as const,
        },
      }));

      // Create the sequence
      const sequence = await Sequence.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        name: input.name,
        description: input.description,
        status: "draft",
        steps,
        unenrollOnReply: input.unenrollOnReply,
        enrollments: [],
        stats: {
          totalEnrolled: 0,
          currentlyActive: 0,
          completed: 0,
          replied: 0,
          unenrolled: 0,
        },
      });

      return {
        success: true,
        sequence: {
          id: sequence._id,
          name: sequence.name,
          description: sequence.description,
          status: sequence.status,
          stepCount: sequence.steps.length,
          unenrollOnReply: sequence.unenrollOnReply,
        },
        message: `Created sequence "${sequence.name}" with ${sequence.steps.length} steps. Activate it to start enrolling contacts.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
