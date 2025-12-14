import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Campaign from "../../../../models/Campaign";

export class CreateCampaignTool extends BaseCRMTool {
  get name() {
    return "create_campaign";
  }

  get description() {
    return `Create a new email campaign with multiple steps. Use this to set up automated email campaigns with scheduled follow-ups.`;
  }

  get schema() {
    return z.object({
      name: z.string().describe("Campaign name"),
      description: z.string().optional().describe("Campaign description"),
      steps: z.array(
        z.object({
          subject: z.string(),
          body: z.string(),
          delayDays: z.number().describe("Days to wait before sending this email"),
        })
      ).describe("Email steps in the campaign"),
      dailyLimit: z.number().default(50).describe("Maximum emails to send per day"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Check if campaign with same name exists
      const existing = await Campaign.findOne({
        workspaceId: this.workspaceId,
        name: input.name,
      });

      if (existing) {
        return {
          success: false,
          error: `Campaign with name "${input.name}" already exists`,
        };
      }

      // Create steps
      const steps = input.steps.map((step, index) => ({
        id: `step_${index + 1}`,
        order: index,
        type: "email" as const,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        delayHours: 0,
        useAIPersonalization: false,
      }));

      // Create the campaign
      const campaign = await Campaign.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        name: input.name,
        description: input.description,
        status: "draft",
        steps,
        dailyLimit: input.dailyLimit || 50,
        fromAccounts: [],
        sendingSchedule: {
          timezone: "UTC",
          startTime: "09:00",
          endTime: "17:00",
          sendOnWeekends: false,
        },
        totalEnrolled: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          unsubscribed: 0,
          positiveReplies: 0,
          negativeReplies: 0,
        },
      });

      return {
        success: true,
        campaign: {
          id: campaign._id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          stepCount: campaign.steps.length,
          dailyLimit: campaign.dailyLimit,
        },
        message: `Created campaign "${campaign.name}" with ${campaign.steps.length} steps. Activate it to start sending emails.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
