import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Sequence from "../../../../models/Sequence";
import Contact from "../../../../models/Contact";

export class PauseSequenceEnrollmentTool extends BaseCRMTool {
  get name() {
    return "pause_sequence_enrollment";
  }

  get description() {
    return `Pause or unenroll a contact from an email sequence. Use this to stop automated emails for a specific contact.`;
  }

  get schema() {
    return z.object({
      sequenceId: z.string().describe("Sequence ID"),
      contactId: z.string().optional().describe("Contact ID to unenroll"),
      email: z.string().optional().describe("Contact email to search and unenroll (if ID not provided)"),
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

      // Find the enrollment
      const enrollment = sequence.enrollments.find(
        (e: any) => e.contactId.toString() === (contact._id as any).toString() && e.status === "active"
      );

      if (!enrollment) {
        return {
          success: false,
          error: `Contact ${contact.email} is not actively enrolled in this sequence`,
        };
      }

      // Update enrollment status
      (enrollment as any).status = "unenrolled";
      (enrollment as any).completedAt = new Date();

      // Update stats
      sequence.stats.currentlyActive = Math.max(0, sequence.stats.currentlyActive - 1);
      sequence.stats.unenrolled += 1;

      await sequence.save();

      return {
        success: true,
        message: `Unenrolled ${contact.email} from sequence "${sequence.name}"`,
        enrollment: {
          sequenceId: sequence._id,
          sequenceName: sequence.name,
          contactId: contact._id,
          contactEmail: contact.email,
          status: "unenrolled",
          emailsSent: (enrollment as any).emailsSent || 0,
          currentStep: (enrollment as any).currentStepIndex || 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
