import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Company from "../../../../models/Company";

export class SearchCompaniesTool extends BaseCRMTool {
  get name() {
    return "search_companies";
  }

  get description() {
    return `Search and filter companies in the CRM. Use this to find companies based on criteria like industry, size, search text, or tags. Returns a list of matching companies with their details.`;
  }

  get schema() {
    return z.object({
      search: z
        .string()
        .optional()
        .describe("Search term for company name, domain, or industry"),
      industry: z
        .string()
        .optional()
        .describe("Filter by industry"),
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

      if (input.industry) {
        filter.industry = { $regex: input.industry, $options: "i" };
      }

      if (input.tags && input.tags.length > 0) {
        filter.tags = { $in: input.tags };
      }

      if (input.search) {
        filter.$or = [
          { name: { $regex: input.search, $options: "i" } },
          { website: { $regex: input.search, $options: "i" } },
          { industry: { $regex: input.search, $options: "i" } },
        ];
      }

      const companies = await Company.find(filter)
        .limit(input.limit || 10)
        .select("name website industry companySize tags address")
        .lean();

      return {
        success: true,
        count: companies.length,
        companies: companies.map((c) => ({
          id: c._id,
          name: c.name,
          website: c.website,
          industry: c.industry,
          companySize: c.companySize,
          location: c.address
            ? `${c.address.city || ""}${c.address.city && c.address.state ? ", " : ""}${c.address.state || ""}`.trim()
            : undefined,
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
