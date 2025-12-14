import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Company from "../../../../models/Company";

export class CreateCompanyTool extends BaseCRMTool {
  get name() {
    return "create_company";
  }

  get description() {
    return `Create a new company in the CRM. Use this to add companies when the user mentions adding or creating a new organization, business, or company.`;
  }

  get schema() {
    return z.object({
      name: z.string().describe("Company name (required)"),
      website: z.string().optional().describe("Company website URL"),
      industry: z.string().optional().describe("Company industry"),
      companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]).optional().describe("Company size"),
      city: z.string().optional().describe("City"),
      state: z.string().optional().describe("State"),
      country: z.string().optional().describe("Country"),
      tags: z.array(z.string()).optional().describe("Tags to apply to the company"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Check if company already exists
      if (input.website) {
        const existingCompany = await Company.findOne({
          workspaceId: this.workspaceId,
          website: input.website,
        });

        if (existingCompany) {
          return {
            success: false,
            error: `Company with website ${input.website} already exists`,
            existingCompany: {
              id: existingCompany._id,
              name: existingCompany.name,
            },
          };
        }
      }

      const company = await Company.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        name: input.name,
        website: input.website,
        industry: input.industry,
        companySize: input.companySize,
        address: {
          city: input.city,
          state: input.state,
          country: input.country,
        },
        tags: input.tags || [],
        status: "lead",
      });

      return {
        success: true,
        company: {
          id: company._id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          companySize: company.companySize,
        },
        message: `Created company "${input.name}" successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
