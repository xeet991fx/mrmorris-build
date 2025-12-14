import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Company from "../../../../models/Company";

export class UpdateCompanyTool extends BaseCRMTool {
  get name() {
    return "update_company";
  }

  get description() {
    return `Update an existing company in the CRM. Use this to modify company details like industry, size, location, or tags. You can search by company ID or name.`;
  }

  get schema() {
    return z.object({
      companyId: z.string().optional().describe("Company ID to update"),
      companyName: z.string().optional().describe("Company name to search and update (if ID not provided)"),
      updates: z.object({
        name: z.string().optional(),
        website: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]).optional(),
        tags: z.array(z.string()).optional(),
      }).describe("Fields to update"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (!input.companyId && !input.companyName) {
        return {
          success: false,
          error: "Either companyId or companyName must be provided",
        };
      }

      // Find the company
      const filter: any = { workspaceId: this.workspaceId };

      if (input.companyId) {
        filter._id = input.companyId;
      } else if (input.companyName) {
        filter.name = { $regex: input.companyName, $options: "i" };
      }

      const company = await Company.findOne(filter);

      if (!company) {
        return {
          success: false,
          error: `Company not found`,
        };
      }

      // Update the company
      const updated = await Company.findByIdAndUpdate(
        company._id,
        { $set: input.updates },
        { new: true }
      ).select("name website industry companySize tags");

      return {
        success: true,
        company: {
          id: updated?._id,
          name: updated?.name,
          website: updated?.website,
          industry: updated?.industry,
          companySize: updated?.companySize,
          tags: updated?.tags || [],
        },
        message: `Updated company "${updated?.name}" successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
