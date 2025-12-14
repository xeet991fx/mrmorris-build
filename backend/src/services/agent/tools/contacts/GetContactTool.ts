import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class GetContactTool extends BaseCRMTool {
  get name() {
    return "get_contact";
  }

  get description() {
    return `Get detailed information about a specific contact. Use this to retrieve full contact details including all fields, tags, and metadata.`;
  }

  get schema() {
    return z.object({
      contactId: z.string().optional().describe("Contact ID to retrieve"),
      email: z.string().optional().describe("Email address to search (if ID not provided)"),
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

      // Find the contact
      const filter: any = { workspaceId: this.workspaceId };

      if (input.contactId) {
        filter._id = input.contactId;
      } else if (input.email) {
        filter.email = input.email;
      }

      const contact = await Contact.findOne(filter).lean();

      if (!contact) {
        return {
          success: false,
          error: `Contact not found`,
        };
      }

      return {
        success: true,
        contact: {
          id: contact._id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          jobTitle: contact.jobTitle,
          status: contact.status,
          tags: contact.tags || [],
          source: contact.source,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
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
