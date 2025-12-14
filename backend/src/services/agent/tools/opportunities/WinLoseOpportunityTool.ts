import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Opportunity from "../../../../models/Opportunity";

export class WinLoseOpportunityTool extends BaseCRMTool {
  get name() {
    return "win_lose_opportunity";
  }

  get description() {
    return `Mark an opportunity as won or lost. Use this to close deals and update their final status. This is different from deleting - the opportunity is kept for reporting.`;
  }

  get schema() {
    return z.object({
      opportunityId: z.string().describe("Opportunity ID to close"),
      outcome: z.enum(["won", "lost"]).describe("Whether the deal was won or lost"),
      reason: z.string().optional().describe("Reason for winning or losing (especially useful for lost deals)"),
      actualCloseDate: z.string().optional().describe("Actual close date (ISO format, defaults to today)"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const opportunity = await Opportunity.findOne({
        _id: input.opportunityId,
        workspaceId: this.workspaceId,
      });

      if (!opportunity) {
        return {
          success: false,
          error: `Opportunity not found`,
        };
      }

      if (opportunity.status !== "open") {
        return {
          success: false,
          error: `Opportunity is already closed with status: ${opportunity.status}`,
        };
      }

      // Determine new status
      const newStatus = input.outcome === "won" ? "won" : "lost";

      // Update the opportunity
      const updateData: any = {
        status: newStatus,
        probability: input.outcome === "won" ? 100 : 0,
      };

      // Add close date
      if (input.actualCloseDate) {
        updateData.actualCloseDate = new Date(input.actualCloseDate);
      } else {
        updateData.actualCloseDate = new Date();
      }

      // Add loss reason if provided
      if (input.reason) {
        updateData.lossReason = input.reason;
      }

      const updated = await Opportunity.findByIdAndUpdate(
        opportunity._id,
        { $set: updateData },
        { new: true }
      )
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name")
        .lean();

      if (!updated) {
        return {
          success: false,
          error: "Failed to update opportunity",
        };
      }

      return {
        success: true,
        opportunity: {
          id: updated._id,
          title: updated.title,
          value: updated.value,
          status: updated.status,
          actualCloseDate: updated.actualCloseDate,
          contact: updated.contactId
            ? {
                id: (updated.contactId as any)._id,
                name: `${(updated.contactId as any).firstName || ""} ${(updated.contactId as any).lastName || ""}`.trim(),
                email: (updated.contactId as any).email,
              }
            : undefined,
          company: updated.companyId
            ? {
                id: (updated.companyId as any)._id,
                name: (updated.companyId as any).name,
              }
            : undefined,
        },
        message:
          input.outcome === "won"
            ? `Congratulations! Marked ${updated.title} as WON ($${updated.value})`
            : `Marked ${updated.title} as LOST${input.reason ? ` - Reason: ${input.reason}` : ""}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
