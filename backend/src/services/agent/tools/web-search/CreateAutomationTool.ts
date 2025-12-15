import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Workflow from "../../../../models/Workflow";
import { v4 as uuidv4 } from "uuid";

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
          triggerType: this.getTriggerType(input.automationType),
          actionCount: workflow.steps.filter((s: any) => s.type === "action").length,
        },
        message: `✅ Created "${workflow.name}" workflow with ${workflow.steps.length} steps. It's saved as a draft - go to Workflows to review and activate it.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getTriggerType(automationType: string): string {
    const triggerMap: Record<string, string> = {
      "lead-nurture": "contact_created",
      "follow-up": "contact_created",
      "onboarding": "deal_created",
      "win-celebration": "deal_stage_changed",
      "re-engagement": "manual",
    };
    return triggerMap[automationType] || "manual";
  }

  private generateStepId(): string {
    return uuidv4();
  }

  private generateWorkflowTemplate(
    type: string,
    business: string,
    custom?: string
  ): any {
    // Helper to create properly formatted steps
    const createTriggerStep = (
      name: string,
      triggerType: string,
      yPosition: number
    ) => ({
      id: this.generateStepId(),
      type: "trigger" as const,
      name,
      config: { triggerType },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    const createDelayStep = (
      name: string,
      value: number,
      unit: string,
      yPosition: number
    ) => ({
      id: this.generateStepId(),
      type: "delay" as const,
      name,
      config: {
        delayType: "duration",
        delayValue: value,
        delayUnit: unit,
      },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    const createEmailStep = (
      name: string,
      subject: string,
      body: string,
      yPosition: number
    ) => ({
      id: this.generateStepId(),
      type: "action" as const,
      name,
      config: {
        actionType: "send_email",
        emailSubject: subject,
        emailBody: body,
      },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    const createTagStep = (name: string, tagName: string, yPosition: number) => ({
      id: this.generateStepId(),
      type: "action" as const,
      name,
      config: {
        actionType: "add_tag",
        tagName,
      },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    const createTaskStep = (
      name: string,
      title: string,
      description: string,
      yPosition: number
    ) => ({
      id: this.generateStepId(),
      type: "action" as const,
      name,
      config: {
        actionType: "create_task",
        taskTitle: title,
        taskDescription: description,
        taskDueInDays: 1,
      },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    const createNotificationStep = (
      name: string,
      message: string,
      yPosition: number
    ) => ({
      id: this.generateStepId(),
      type: "action" as const,
      name,
      config: {
        actionType: "send_notification",
        notificationMessage: message,
      },
      position: { x: 250, y: yPosition },
      nextStepIds: [],
    });

    // Link steps together by setting nextStepIds
    const linkSteps = (steps: any[]) => {
      for (let i = 0; i < steps.length - 1; i++) {
        steps[i].nextStepIds = [steps[i + 1].id];
      }
      return steps;
    };

    const templates: Record<string, any> = {
      "lead-nurture": {
        name: "Lead Nurture Sequence",
        triggerEntityType: "contact",
        description: `Automatically nurture new leads for ${business} with a series of educational emails`,
        steps: linkSteps([
          createTriggerStep("New Lead Created", "contact_created", 0),
          createDelayStep("Wait 1 Minute", 1, "minutes", 100),
          createEmailStep(
            "Welcome Email",
            `Welcome! Here's how ${business} can help you`,
            `Hi {{firstName}},\n\nThank you for your interest in ${business}. We're excited to help you achieve your goals.\n\nHere's what you can expect from us:\n- Personalized guidance\n- Continuous support\n- Industry best practices\n\nBest regards,\nThe ${business} Team`,
            200
          ),
          createDelayStep("Wait 5 Minutes", 5, "minutes", 300),
          createEmailStep(
            "Value Email",
            `How companies succeed with ${business}`,
            `Hi {{firstName}},\n\nWe wanted to share some insights on how businesses like yours are achieving real results.\n\nWould you like to see how we can help you specifically? Reply to this email and let's chat!\n\nBest,\nThe ${business} Team`,
            400
          ),
          createDelayStep("Wait 10 Minutes", 10, "minutes", 500),
          createEmailStep(
            "CTA Email",
            "Ready to take the next step?",
            `Hi {{firstName}},\n\nI hope our previous emails have been helpful. Many of our customers started exactly where you are now.\n\nWould you be interested in a quick call to discuss your specific needs?\n\nBest regards,\nThe ${business} Team`,
            600
          ),
          createTagStep("Tag as Nurtured", "nurtured", 700),
        ]),
      },

      "follow-up": {
        name: "Lead Follow-Up Sequence",
        triggerEntityType: "contact",
        description: "Follow up with leads that haven't responded",
        steps: linkSteps([
          createTriggerStep("Lead Created", "contact_created", 0),
          createDelayStep("Wait 2 Minutes", 2, "minutes", 100),
          createEmailStep(
            "First Follow-up",
            "Following up on our conversation",
            `Hi {{firstName}},\n\nI wanted to check in and see if you had any questions about ${business}.\n\nI'm here to help if you need anything!\n\nBest,\nThe ${business} Team`,
            200
          ),
          createDelayStep("Wait 5 Minutes", 5, "minutes", 300),
          createEmailStep(
            "Second Follow-up",
            "Quick question for you",
            `Hi {{firstName}},\n\nDo you have 5 minutes to discuss how ${business} can help you achieve your goals?\n\nLet me know a good time to connect.\n\nBest,\nThe ${business} Team`,
            400
          ),
          createTaskStep(
            "Create Call Task",
            "Call Lead",
            "Lead hasn't responded to follow-up emails. Give them a call.",
            500
          ),
        ]),
      },

      onboarding: {
        name: "Customer Onboarding",
        triggerEntityType: "contact",
        description: "Welcome new customers and guide them through setup",
        steps: linkSteps([
          createTriggerStep("Deal Won", "deal_stage_changed", 0),
          createEmailStep(
            "Welcome Email",
            `Welcome to ${business}! Let's get started`,
            `Hi {{firstName}},\n\nCongratulations and welcome to ${business}! We're thrilled to have you as a customer.\n\nHere's what happens next:\n1. You'll receive your login credentials\n2. We'll schedule a kickoff call\n3. Our team will guide you through setup\n\nWe're excited to work with you!\n\nBest,\nThe ${business} Team`,
            100
          ),
          createTaskStep(
            "Schedule Kickoff",
            "Schedule Kickoff Call",
            "New customer needs kickoff call scheduled",
            200
          ),
          createDelayStep("Wait 3 Days", 3, "days", 300),
          createEmailStep(
            "Onboarding Checklist",
            "Your onboarding checklist",
            `Hi {{firstName}},\n\nWe want to make sure you're getting the most out of ${business}.\n\nHere's a quick checklist to ensure a smooth start:\n✅ Complete your profile\n✅ Connect your tools\n✅ Invite your team\n\nNeed help? Just reply to this email!\n\nBest,\nThe ${business} Team`,
            400
          ),
          createTagStep("Tag as Onboarding", "onboarding-complete", 500),
        ]),
      },

      "win-celebration": {
        name: "Deal Won Celebration",
        triggerEntityType: "deal",
        description: "Celebrate wins and request referrals",
        steps: linkSteps([
          createTriggerStep("Deal Won", "deal_stage_changed", 0),
          createEmailStep(
            "Thank You Email",
            "Thank you for choosing us!",
            `Hi {{firstName}},\n\nWe're thrilled to work with you! Thank you for choosing ${business}.\n\nOur team is committed to your success, and we can't wait to help you achieve great results.\n\nHere's to a fantastic partnership!\n\nBest,\nThe ${business} Team`,
            100
          ),
          createNotificationStep(
            "Notify Team",
            "🎉 New deal won! Time to celebrate!",
            200
          ),
          createDelayStep("Wait 30 Days", 30, "days", 300),
          createEmailStep(
            "Referral Request",
            "How are we doing? + A quick favor",
            `Hi {{firstName}},\n\nIt's been a month since you joined ${business}, and we hope things are going great!\n\nWe'd love to hear about your experience. And if you know anyone who might benefit from our services, we'd really appreciate a referral.\n\nThank you for being a valued customer!\n\nBest,\nThe ${business} Team`,
            400
          ),
        ]),
      },

      "re-engagement": {
        name: "Re-engage Inactive Contacts",
        triggerEntityType: "contact",
        description: "Re-engage contacts who haven't interacted recently",
        steps: linkSteps([
          createTriggerStep("Manual Trigger", "manual", 0),
          createEmailStep(
            "We Miss You",
            "We miss you! Here's what's new",
            `Hi {{firstName}},\n\nWe noticed it's been a while since we connected. We've been making some exciting updates to ${business} and thought you'd like to know!\n\nWould you like to catch up? Reply to this email and let's reconnect.\n\nBest,\nThe ${business} Team`,
            100
          ),
          createDelayStep("Wait 7 Days", 7, "days", 200),
          createEmailStep(
            "Last Chance",
            "One last thing...",
            `Hi {{firstName}},\n\nWe wanted to reach out one more time. Is there anything specific you were looking for that we can help with?\n\nIf not, no worries - we'll be here when you're ready!\n\nBest,\nThe ${business} Team`,
            300
          ),
          createTagStep("Tag as Re-engaged", "re-engagement-attempt", 400),
        ]),
      },
    };

    return (
      templates[type] || {
        name: custom || "Custom Automation",
        triggerEntityType: "contact",
        description: custom || "Custom workflow automation",
        steps: linkSteps([
          createTriggerStep("Manual Trigger", "manual", 0),
          createEmailStep(
            "Custom Email",
            "Hello from " + business,
            `Hi {{firstName}},\n\nThis is a custom workflow email.\n\nBest,\nThe ${business} Team`,
            100
          ),
        ]),
      }
    );
  }
}
