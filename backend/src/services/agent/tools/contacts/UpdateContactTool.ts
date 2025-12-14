import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class UpdateContactTool extends BaseCRMTool {
  get name() {
    return "update_contact";
  }

  get description() {
    return `Update an existing contact in the CRM. Use this to modify contact information like name, email, phone, company, status, or tags. You can search by contact ID or email.`;
  }

  get schema() {
    return z.object({
      contactId: z.string().optional().describe("Contact ID to update"),
      email: z.string().optional().describe("Email address to search and update (if ID not provided)"),
      updates: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
      }).describe("Fields to update"),
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

      const contact = await Contact.findOne(filter);

      if (!contact) {
        return {
          success: false,
          error: `Contact not found`,
        };
      }

      // Update the contact
      const updated = await Contact.findByIdAndUpdate(
        contact._id,
        { $set: input.updates },
        { new: true }
      ).select("firstName lastName email phone company jobTitle status tags");

      return {
        success: true,
        contact: {
          id: updated?._id,
          name: `${updated?.firstName || ""} ${updated?.lastName || ""}`.trim(),
          email: updated?.email,
          phone: updated?.phone,
          company: updated?.company,
          jobTitle: updated?.jobTitle,
          status: updated?.status,
          tags: updated?.tags || [],
        },
        message: `Updated contact ${updated?.firstName || ""} ${updated?.lastName || ""} (${updated?.email})`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
