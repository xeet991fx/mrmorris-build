import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class GetOpportunityTool extends BaseCRMTool {
  get name() {
    return "get_opportunity";
  }

  get description() {
    return `Get detailed information about a specific opportunity/deal. Use this to retrieve full details including all fields, contact, company, pipeline, and stage information.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to retrieve"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const opportunity = await Opportunity.findOne({
        _id: input.opportunityId,
        workspaceId: this.workspaceId,
      })
        .populate("contactId", "firstName lastName email phone company jobTitle")
        .populate("companyId", "name website industry companySize")
        .populate("pipelineId", "name stages")
        .populate("stageId", "name")
        .lean();

      if (!opportunity) {
        return {
          success: false,
          error: `Opportunity not found`,
        };
      }

      return {
        success: true,
        opportunity: {
          id: opportunity._id,
          title: opportunity.title,
          value: opportunity.value,
          currency: opportunity.currency || "USD",
          expectedCloseDate: opportunity.expectedCloseDate,
          status: opportunity.status,
          dealTemperature: opportunity.dealTemperature,
          probability: opportunity.probability,
          description: opportunity.description,
          contact: opportunity.contactId
            ? {
                id: (opportunity.contactId as any)._id,
                firstName: (opportunity.contactId as any).firstName,
                lastName: (opportunity.contactId as any).lastName,
                name: `${(opportunity.contactId as any).firstName || ""} ${(opportunity.contactId as any).lastName || ""}`.trim(),
                email: (opportunity.contactId as any).email,
                phone: (opportunity.contactId as any).phone,
                company: (opportunity.contactId as any).company,
                jobTitle: (opportunity.contactId as any).jobTitle,
              }
            : undefined,
          company: opportunity.companyId
            ? {
                id: (opportunity.companyId as any)._id,
                name: (opportunity.companyId as any).name,
                website: (opportunity.companyId as any).website,
                industry: (opportunity.companyId as any).industry,
                companySize: (opportunity.companyId as any).companySize,
              }
            : undefined,
          pipeline: opportunity.pipelineId
            ? {
                id: (opportunity.pipelineId as any)._id,
                name: (opportunity.pipelineId as any).name,
              }
            : undefined,
          stage: opportunity.stageId
            ? {
                id: (opportunity.stageId as any)._id,
                name: (opportunity.stageId as any).name,
              }
            : undefined,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt,
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
