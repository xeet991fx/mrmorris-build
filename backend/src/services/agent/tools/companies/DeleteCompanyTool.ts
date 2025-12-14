import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Company from "../../../../models/Company";

export class DeleteCompanyTool extends BaseCRMTool {
  get name() {
    return "delete_company";
  }

  get description() {
    return `Delete a company from the CRM. Use this when a company should be permanently removed. Use with caution as this action cannot be undone.`;
  }

  get schema() {
    return z.object({
      companyId: z.string().optional().describe("Company ID to delete"),
      name: z.string().optional().describe("Company name to search and delete (if ID not provided)"),
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

      // Find the company first
      const filter: any = { workspaceId: this.workspaceId };

      if (input.companyId) {
        filter._id = input.companyId;
      } else if (input.name) {
        filter.name = { $regex: input.name, $options: "i" };
      }

      const company = await Company.findOne(filter);

      if (!company) {
        return {
          success: false,
          error: `Company not found`,
        };
      }

      // Store info before deleting
      const companyInfo = {
        id: company._id,
        name: company.name,
        website: company.website,
      };

      // Delete the company
      await Company.findByIdAndDelete(company._id);

      return {
        success: true,
        message: `Deleted company ${companyInfo.name}`,
        deletedCompany: companyInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
