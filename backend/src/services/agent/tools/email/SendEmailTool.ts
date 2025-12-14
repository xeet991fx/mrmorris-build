import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class SendEmailTool extends BaseCRMTool {
  get name() {
    return "send_email";
  }

  get description() {
    return `Send an email to a contact or custom email address. Use this when the user wants to send an email, follow up with someone, or send a message. You can provide a contact email or ID to send to.`;
  }

  get schema() {
    return z.object({
      to: z
        .string()
        .describe("Recipient email address or contact ID"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body content (can be HTML)"),
      contactId: z
        .string()
        .optional()
        .describe("Contact ID if sending to a known contact"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      let recipientEmail: string = input.to;
      let recipientName = "";

      // If contact ID provided or if 'to' looks like an ID, try to find contact
      if (input.contactId || !input.to.includes("@")) {
        const contactId = input.contactId || input.to;
        const contact = await Contact.findOne({
          _id: contactId,
          workspaceId: this.workspaceId,
        });

        if (contact) {
          if (!contact.email) {
            return {
              success: false,
              error: `Contact found but has no email address`,
            };
          }
          recipientEmail = contact.email;
          recipientName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        } else if (!input.to.includes("@")) {
          return {
            success: false,
            error: `Contact not found with ID: ${contactId}`,
          };
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return {
          success: false,
          error: `Invalid email address: ${recipientEmail}`,
        };
      }

      // Note: Email sending via agent requires email account configuration
      // For now, we'll log the intent and return success
      console.log(`📧 Agent requested to send email:
        To: ${recipientEmail} ${recipientName ? `(${recipientName})` : ''}
        Subject: ${input.subject}
        Body preview: ${input.body.substring(0, 100)}...
      `);

      return {
        success: true,
        message: `Email drafted for ${recipientName || recipientEmail}. Note: Actual email sending requires email account integration in the CRM.`,
        recipient: {
          email: recipientEmail,
          name: recipientName,
        },
        note: "To enable email sending, configure connected email accounts in the CRM settings.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
