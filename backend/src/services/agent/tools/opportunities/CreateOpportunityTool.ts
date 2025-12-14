import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";
import Pipeline from "../../../../models/Pipeline";
import Contact from "../../../../models/Contact";
import Company from "../../../../models/Company";

export class CreateOpportunityTool extends BaseCRMTool {
  get name() {
    return "create_opportunity";
  }

  get description() {
    return `Create a new opportunity/deal in the CRM. Use this when the user wants to add a new deal, opportunity, or sales prospect. You can link it to a contact or company.`;
  }

  get schema() {
    return z.object({
      title: z.string().describe("Opportunity title (required)"),
      value: z.number().describe("Deal value/amount (required)"),
      currency: z.string().default("USD").describe("Currency code (default: USD)"),
      pipelineId: z.string().optional().describe("Pipeline ID (will use default if not provided)"),
      contactEmail: z.string().optional().describe("Contact email to link to this opportunity"),
      companyName: z.string().optional().describe("Company name to link to this opportunity"),
      expectedCloseDate: z.string().optional().describe("Expected close date (ISO string)"),
      probability: z.number().optional().describe("Close probability (0-100)"),
      dealTemperature: z.enum(["hot", "warm", "cold"]).optional().describe("Deal temperature"),
      description: z.string().optional().describe("Opportunity description"),
      tags: z.array(z.string()).optional().describe("Tags to apply"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      // Find or get default pipeline
      let pipelineId = input.pipelineId;

      if (!pipelineId) {
        const defaultPipeline = await Pipeline.findOne({
          workspaceId: this.workspaceId,
        }).sort({ createdAt: 1 });

        if (!defaultPipeline) {
          return {
            success: false,
            error: "No pipeline found. Please create a pipeline first.",
          };
        }

        pipelineId = (defaultPipeline._id as any).toString();
      }

      // Get pipeline to find first stage
      const pipeline = await Pipeline.findById(pipelineId);

      if (!pipeline || pipeline.workspaceId.toString() !== this.workspaceId) {
        return {
          success: false,
          error: "Pipeline not found or access denied",
        };
      }

      if (!pipeline.stages || pipeline.stages.length === 0) {
        return {
          success: false,
          error: "Pipeline has no stages. Please add stages to the pipeline first.",
        };
      }

      const firstStage = pipeline.stages[0];

      // Find contact if email provided
      let contactId;
      if (input.contactEmail) {
        const contact = await Contact.findOne({
          workspaceId: this.workspaceId,
          email: input.contactEmail,
        });
        if (contact) {
          contactId = contact._id;
        }
      }

      // Find company if name provided
      let companyId;
      if (input.companyName) {
        const company = await Company.findOne({
          workspaceId: this.workspaceId,
          name: { $regex: input.companyName, $options: "i" },
        });
        if (company) {
          companyId = company._id;
        }
      }

      // Create the opportunity
      const opportunity = await Opportunity.create({
        workspaceId: this.workspaceId,
        userId: this.userId,
        pipelineId: pipelineId,
        stageId: firstStage._id,
        title: input.title,
        value: input.value,
        currency: input.currency || "USD",
        probability: input.probability || (firstStage as any).probability || 10,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
        contactId,
        companyId,
        dealTemperature: input.dealTemperature,
        description: input.description,
        tags: input.tags || [],
        status: "open",
        stageHistory: [
          {
            stageId: firstStage._id,
            stageName: firstStage.name,
            enteredAt: new Date(),
          },
        ],
      });

      return {
        success: true,
        opportunity: {
          id: opportunity._id,
          title: opportunity.title,
          value: opportunity.value,
          currency: opportunity.currency,
          status: opportunity.status,
          stage: firstStage.name,
          probability: opportunity.probability,
        },
        message: `Created opportunity "${input.title}" with value ${input.currency} ${input.value}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
