import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class SearchContactsTool extends BaseCRMTool {
  get name() {
    return "search_contacts";
  }

  get description() {
    return `Search and filter contacts in the CRM. Use this to find contacts based on criteria like status, tags, company, or search text. Returns a list of matching contacts with their details.`;
  }

  get schema() {
    return z.object({
      search: z
        .string()
        .optional()
        .describe("Search term for name, email, or company"),
      status: z
        .enum(["lead", "prospect", "customer", "inactive"])
        .optional()
        .describe("Filter by contact status"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum results to return (default: 10)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const filter: any = { workspaceId: this.workspaceId };

      if (input.status) {
        filter.status = input.status;
      }

      if (input.tags && input.tags.length > 0) {
        filter.tags = { $in: input.tags };
      }

      if (input.search) {
        filter.$or = [
          { firstName: { $regex: input.search, $options: "i" } },
          { lastName: { $regex: input.search, $options: "i" } },
          { email: { $regex: input.search, $options: "i" } },
          { company: { $regex: input.search, $options: "i" } },
        ];
      }

      const contacts = await Contact.find(filter)
        .limit(input.limit || 10)
        .select(
          "firstName lastName email company status phone jobTitle tags"
        )
        .lean();

      return {
        success: true,
        count: contacts.length,
        contacts: contacts.map((c) => ({
          id: c._id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email,
          company: c.company,
          status: c.status,
          phone: c.phone,
          jobTitle: c.jobTitle,
          tags: c.tags || [],
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
