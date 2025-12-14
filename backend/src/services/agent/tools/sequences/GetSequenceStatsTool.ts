import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Sequence from "../../../../models/Sequence";

export class GetSequenceStatsTool extends BaseCRMTool {
  get name() {
    return "get_sequence_stats";
  }

  get description() {
    return `Get detailed statistics and performance metrics for an email sequence. Shows enrollment counts, email performance, and step-by-step breakdown.`;
  }

  get schema() {
    return z.object({
      sequenceId: z.string().describe("Sequence ID to analyze"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      const sequence = await Sequence.findOne({
        _id: input.sequenceId,
        workspaceId: this.workspaceId,
      })
        .populate("enrollments.contactId", "firstName lastName email")
        .lean();

      if (!sequence) {
        return {
          success: false,
          error: "Sequence not found",
        };
      }

      // Calculate engagement metrics
      const enrollments = sequence.enrollments || [];
      const totalEmailsSent = enrollments.reduce((sum: number, e: any) => sum + (e.emailsSent || 0), 0);
      const totalEmailsOpened = enrollments.reduce((sum: number, e: any) => sum + (e.emailsOpened || 0), 0);
      const totalEmailsClicked = enrollments.reduce((sum: number, e: any) => sum + (e.emailsClicked || 0), 0);

      const openRate = totalEmailsSent > 0 ? (totalEmailsOpened / totalEmailsSent) * 100 : 0;
      const clickRate = totalEmailsSent > 0 ? (totalEmailsClicked / totalEmailsSent) * 100 : 0;

      // Status breakdown
      const statusBreakdown = {
        active: enrollments.filter((e: any) => e.status === "active").length,
        completed: enrollments.filter((e: any) => e.status === "completed").length,
        unenrolled: enrollments.filter((e: any) => e.status === "unenrolled").length,
        replied: enrollments.filter((e: any) => e.status === "replied").length,
        bounced: enrollments.filter((e: any) => e.status === "bounced").length,
      };

      // Recent enrollments
      const recentEnrollments = enrollments
        .slice(0, 5)
        .map((e: any) => ({
          contactId: e.contactId?._id,
          contactName: e.contactId ? `${e.contactId.firstName || ""} ${e.contactId.lastName || ""}`.trim() : "Unknown",
          contactEmail: e.contactId?.email,
          status: e.status,
          currentStep: e.currentStepIndex,
          totalSteps: sequence.steps?.length || 0,
          enrolledAt: e.enrolledAt,
          emailsSent: e.emailsSent || 0,
        }));

      return {
        success: true,
        sequence: {
          id: sequence._id,
          name: sequence.name,
          description: sequence.description,
          status: sequence.status,
          stepCount: sequence.steps?.length || 0,
        },
        stats: {
          enrollmentCounts: {
            total: sequence.stats?.totalEnrolled || enrollments.length,
            ...statusBreakdown,
          },
          emailMetrics: {
            sent: totalEmailsSent,
            opened: totalEmailsOpened,
            clicked: totalEmailsClicked,
            openRate: Math.round(openRate * 10) / 10,
            clickRate: Math.round(clickRate * 10) / 10,
          },
          recentEnrollments,
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
