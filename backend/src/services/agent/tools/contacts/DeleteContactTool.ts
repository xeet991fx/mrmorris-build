import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class DeleteContactTool extends BaseCRMTool {
  get name() {
    return "delete_contact";
  }

  get description() {
    return `Delete a contact from the CRM. Use this when the user wants to remove a contact permanently. Use with caution as this action cannot be undone.`;
  }

  get schema() {
    return z.object({
      contactId: z.string().optional().describe("Contact ID to delete"),
      email: z.string().optional().describe("Email address to search and delete (if ID not provided)"),
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

      // Find the contact first
      const filter: any = { workspaceId: this.workspaceId };

      if (input.contactId) {
        filter._id = input.contactId;
      } else if (input.email) {
        filter.email = input.email;
      }

      const contact = await Contact.findOne(filter);

      if (!contact) {
        return {
          success: false,
          error: `Contact not found`,
        };
      }

      // Store info before deleting
      const contactInfo = {
        id: contact._id,
        name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: contact.email,
      };

      // Delete the contact
      await Contact.findByIdAndDelete(contact._id);

      return {
        success: true,
        message: `Deleted contact ${contactInfo.name} (${contactInfo.email})`,
        deletedContact: contactInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
