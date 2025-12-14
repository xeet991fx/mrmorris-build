import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Workflow from "../../../../models/Workflow";

export class CreateAutomationTool extends BaseCRMTool {
  get name() {
    return "create_automation";
  }

  get description() {
    return `Create CRM automations (workflows) based on business needs. Creates workflows like "Lead Nurture", "Follow-up", "Onboarding", "Win Celebration", etc. The workflow will be created as a draft for user review.`;
  }

  get schema() {
    return z.object({
      businessType: z
        .string()
        .describe("Type of business (e.g., SaaS, E-commerce, Consulting)"),
      automationType: z
        .enum([
          "lead-nurture",
          "follow-up",
          "onboarding",
          "win-celebration",
          "re-engagement",
          "custom",
        ])
        .describe("Type of automation workflow to create"),
      customDescription: z
        .string()
        .optional()
        .describe("Description if creating custom automation"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const workflowTemplate = this.generateWorkflowTemplate(
        input.automationType,
        input.businessType,
        input.customDescription
      );

      // Create the workflow in the database
      const workflow = await Workflow.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        ...workflowTemplate,
        status: "draft", // User can review and activate
      });

      return {
        success: true,
        automation: {
          id: workflow._id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
          stepCount: workflow.steps?.length || 0,
        },
        message: `Created ${input.automationType} automation "${workflow.name}". Review and activate it when ready in the Workflows section.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateWorkflowTemplate(
    type: string,
    business: string,
    custom?: string
  ): any {
    const templates: Record<string, any> = {
      "lead-nurture": {
        name: "Lead Nurture Sequence",
        triggerEntityType: "contact",
        description:
          "Automatically nurture new leads with a series of educational emails",
        steps: [
          {
            type: "wait",
            delay: { value: 1, unit: "hours" },
          },
          {
            type: "send_email",
            subject: "Welcome! Here's how we can help",
            body: `Thank you for your interest in ${business}. We're here to help you achieve your goals.`,
          },
          {
            type: "wait",
            delay: { value: 3, unit: "days" },
          },
          {
            type: "send_email",
            subject: `Case study: How companies succeed with ${business}`,
            body: "See how businesses like yours have achieved success.",
          },
          {
            type: "wait",
            delay: { value: 7, unit: "days" },
          },
          {
            type: "tag",
            tag: "nurtured",
          },
        ],
      },
      "follow-up": {
        name: "Cold Lead Follow-Up",
        triggerEntityType: "contact",
        description: "Follow up with leads that haven't responded",
        steps: [
          {
            type: "send_email",
            subject: "Following up on our conversation",
            body: "I wanted to check in and see if you had any questions.",
          },
          {
            type: "wait",
            delay: { value: 5, unit: "days" },
          },
          {
            type: "send_email",
            subject: "Quick question",
            body: "Do you have 5 minutes to discuss how we can help?",
          },
          {
            type: "create_task",
            description: "Call lead if no response",
          },
        ],
      },
      "onboarding": {
        name: "Customer Onboarding",
        triggerEntityType: "contact",
        description: "Welcome new customers and guide them through setup",
        steps: [
          {
            type: "send_email",
            subject: `Welcome to ${business}! Let's get started`,
            body: "We're excited to have you onboard. Here's what to expect next.",
          },
          {
            type: "wait",
            delay: { value: 2, unit: "days" },
          },
          {
            type: "send_email",
            subject: "Your onboarding checklist",
            body: "Follow these steps to get the most out of our platform.",
          },
          {
            type: "create_task",
            description: "Schedule kickoff call",
          },
        ],
      },
      "win-celebration": {
        name: "Deal Won Celebration",
        triggerEntityType: "deal",
        description: "Celebrate wins and request referrals",
        steps: [
          {
            type: "send_email",
            subject: "Thank you for choosing us!",
            body: "We're thrilled to work with you. Here's to great success together!",
          },
          {
            type: "notify_team",
            message: "New deal won!",
          },
          {
            type: "wait",
            delay: { value: 30, unit: "days" },
          },
          {
            type: "send_email",
            subject: "How are we doing? + Referral request",
            body: "We'd love to hear about your experience. Know anyone who might benefit from our services?",
          },
        ],
      },
      "re-engagement": {
        name: "Re-engage Inactive Contacts",
        triggerEntityType: "contact",
        description: "Re-engage contacts who haven't interacted recently",
        steps: [
          {
            type: "send_email",
            subject: "We miss you! Here's what's new",
            body: `We've been making some exciting updates to ${business}. Thought you'd like to know!`,
          },
          {
            type: "wait",
            delay: { value: 7, unit: "days" },
          },
          {
            type: "tag",
            tag: "re-engagement-attempt",
          },
        ],
      },
    };

    return (
      templates[type] || {
        name: custom || "Custom Automation",
        triggerEntityType: "contact",
        description: custom || "Custom workflow automation",
        steps: [],
      }
    );
  }
}
