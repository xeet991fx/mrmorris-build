import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class CreateContactTool extends BaseCRMTool {
  get name() {
    return "create_contact";
  }

  get description() {
    return `Create a new contact in the CRM. Use this when the user wants to add a new person, lead, or prospect to the system.`;
  }

  get schema() {
    return z.object({
      firstName: z.string().optional().describe("First name"),
      lastName: z.string().optional().describe("Last name"),
      email: z.string().describe("Email address (required)"),
      phone: z.string().optional().describe("Phone number"),
      company: z.string().optional().describe("Company name"),
      jobTitle: z.string().optional().describe("Job title"),
      status: z
        .enum(["lead", "prospect", "customer", "inactive"])
        .optional()
        .describe("Contact status (default: lead)"),
      tags: z.array(z.string()).optional().describe("Tags to apply"),
      source: z.string().optional().describe("Lead source"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Check if contact already exists
      const existingContact = await Contact.findOne({
        workspaceId: this.workspaceId,
        email: input.email,
      });

      if (existingContact) {
        return {
          success: false,
          error: `Contact with email ${input.email} already exists`,
          existingContact: {
            id: existingContact._id,
            name: `${existingContact.firstName || ""} ${existingContact.lastName || ""}`.trim(),
            email: existingContact.email,
          },
        };
      }

      const contact = await Contact.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company,
        jobTitle: input.jobTitle,
        status: input.status || "lead",
        tags: input.tags || [],
        source: input.source,
      });

      return {
        success: true,
        contact: {
          id: contact._id,
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          status: contact.status,
        },
        message: `Created contact ${contact.firstName || ""} ${contact.lastName || ""} (${contact.email})`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
