import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class BulkImportContactsTool extends BaseCRMTool {
  get name() {
    return "bulk_import_contacts";
  }

  get description() {
    return `Import multiple contacts at once. Use this when the user wants to add several contacts from a list. Handles duplicate detection automatically.`;
  }

  get schema() {
    return z.object({
      contacts: z.array(
        z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string(),
          phone: z.string().optional(),
          company: z.string().optional(),
          jobTitle: z.string().optional(),
          status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
          tags: z.array(z.string()).optional(),
          source: z.string().optional(),
        })
      ).describe("Array of contacts to import"),
      skipDuplicates: z.boolean().default(true).describe("Skip contacts with existing email addresses"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const results = {
        imported: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      for (const contactData of input.contacts) {
        try {
          // Check for duplicates
          const existing = await Contact.findOne({
            workspaceId: this.workspaceId,
            email: contactData.email,
          });

          if (existing) {
            if (input.skipDuplicates) {
              results.skipped.push({
                email: contactData.email,
                reason: "Email already exists",
              });
              continue;
            } else {
              results.errors.push({
                email: contactData.email,
                error: "Email already exists",
              });
              continue;
            }
          }

          // Create the contact
          const contact = await Contact.create({
            workspaceId: this.workspaceId,
            userId: this.userId,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            email: contactData.email,
            phone: contactData.phone,
            company: contactData.company,
            jobTitle: contactData.jobTitle,
            status: contactData.status || "lead",
            tags: contactData.tags || [],
            source: contactData.source,
          });

          results.imported.push({
            id: contact._id,
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            email: contact.email,
          });
        } catch (error: any) {
          results.errors.push({
            email: contactData.email,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        summary: {
          total: input.contacts.length,
          imported: results.imported.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
        results,
        message: `Imported ${results.imported.length} contacts, skipped ${results.skipped.length}, ${results.errors.length} errors`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
