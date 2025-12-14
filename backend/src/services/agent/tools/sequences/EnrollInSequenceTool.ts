import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Sequence from "../../../../models/Sequence";
import Contact from "../../../../models/Contact";

export class EnrollInSequenceTool extends BaseCRMTool {
  get name() {
    return "enroll_in_sequence";
  }

  get description() {
    return `Enroll a contact in an email sequence. Use this to add contacts to automated follow-up sequences. The sequence must be active to enroll contacts.`;
  }

  get schema() {
    return z.object({
      sequenceId: z.string().describe("Sequence ID to enroll in"),
      contactId: z.string().optional().describe("Contact ID to enroll"),
      email: z.string().optional().describe("Contact email to search and enroll (if ID not provided)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (!input.contactId && !input.email) {
        return {
          success: false,
          error: "Either contactId or email must be provided",
        };
      }

      // Find the sequence
      const sequence = await Sequence.findOne({
        _id: input.sequenceId,
        workspaceId: this.workspaceId,
      });

      if (!sequence) {
        return {
          success: false,
          error: "Sequence not found",
        };
      }

      if (sequence.status !== "active") {
        return {
          success: false,
          error: `Sequence is ${sequence.status}. Only active sequences can enroll contacts.`,
        };
      }

      // Find the contact
      const contactFilter: any = { workspaceId: this.workspaceId };
      if (input.contactId) {
        contactFilter._id = input.contactId;
      } else if (input.email) {
        contactFilter.email = input.email;
      }

      const contact = await Contact.findOne(contactFilter);

      if (!contact) {
        return {
          success: false,
          error: "Contact not found",
        };
      }

      // Check if already enrolled
      const alreadyEnrolled = sequence.enrollments.some(
        (e: any) => e.contactId.toString() === (contact._id as any).toString() && e.status === "active"
      );

      if (alreadyEnrolled) {
        return {
          success: false,
          error: `Contact ${contact.email} is already enrolled in this sequence`,
        };
      }

      // Calculate next email time
      const firstStep = sequence.steps[0];
      const nextEmailAt = new Date();
      if (firstStep && firstStep.delay) {
        const delayMs = this.calculateDelayMs(firstStep.delay.value, firstStep.delay.unit);
        nextEmailAt.setTime(nextEmailAt.getTime() + delayMs);
      }

      // Add enrollment
      sequence.enrollments.push({
        contactId: contact._id as any,
        currentStepIndex: 0,
        status: "active",
        enrolledAt: new Date(),
        nextEmailAt,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
      } as any);

      // Update stats
      sequence.stats.totalEnrolled += 1;
      sequence.stats.currentlyActive += 1;

      await sequence.save();

      return {
        success: true,
        enrollment: {
          sequenceId: sequence._id,
          sequenceName: sequence.name,
          contactId: contact._id,
          contactName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          contactEmail: contact.email,
          nextEmailAt,
          currentStep: 0,
          totalSteps: sequence.steps.length,
        },
        message: `Enrolled ${contact.email} in sequence "${sequence.name}". First email scheduled for ${nextEmailAt.toLocaleString()}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private calculateDelayMs(value: number, unit: "hours" | "days" | "weeks"): number {
    const msPerHour = 60 * 60 * 1000;
    const msPerDay = 24 * msPerHour;
    const msPerWeek = 7 * msPerDay;

    switch (unit) {
      case "hours":
        return value * msPerHour;
      case "days":
        return value * msPerDay;
      case "weeks":
        return value * msPerWeek;
      default:
        return value * msPerDay;
    }
  }
}
