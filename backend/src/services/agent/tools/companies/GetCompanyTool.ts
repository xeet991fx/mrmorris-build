import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Company from "../../../../models/Company";

export class GetCompanyTool extends BaseCRMTool {
  get name() {
    return "get_company";
  }

  get description() {
    return `Get detailed information about a specific company. Use this to retrieve full company details including all fields, contacts, and metadata.`;
  }

  get schema() {
    return z.object({
      companyId: z.string().optional().describe("Company ID to retrieve"),
      name: z.string().optional().describe("Company name to search (if ID not provided)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (!input.companyId && !input.name) {
        return {
          success: false,
          error: "Either companyId or name must be provided",
        };
      }

      // Find the company
      const filter: any = { workspaceId: this.workspaceId };

      if (input.companyId) {
        filter._id = input.companyId;
      } else if (input.name) {
        filter.name = { $regex: input.name, $options: "i" };
      }

      const company = await Company.findOne(filter).lean();

      if (!company) {
        return {
          success: false,
          error: `Company not found`,
        };
      }

      return {
        success: true,
        company: {
          id: company._id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          companySize: company.companySize,
          address: company.address,
          phone: company.phone,
          status: company.status,
          tags: company.tags || [],
          socialProfiles: company.socialProfiles,
          customFields: company.customFields,
          notes: company.notes,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
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
