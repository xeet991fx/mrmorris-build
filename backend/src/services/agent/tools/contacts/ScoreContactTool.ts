import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";

export class ScoreContactTool extends BaseCRMTool {
  get name() {
    return "score_contact";
  }

  get description() {
    return `Calculate a lead score for a contact based on engagement, profile completeness, and behavior. Higher scores indicate better qualified leads.`;
  }

  get schema() {
    return z.object({
      contactId: z.string().optional().describe("Contact ID to score"),
      email: z.string().optional().describe("Email address to search and score (if ID not provided)"),
      updateContact: z.boolean().default(true).describe("Whether to update the contact's score in the database"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (!input.contactId && !input.email) {
        return {
          success: false,
          error: "Either contactId or email must be provided",
        };
      }

      // Find the contact
      const filter: any = { workspaceId: this.workspaceId };

      if (input.contactId) {
        filter._id = input.contactId;
      } else if (input.email) {
        filter.email = input.email;
      }

      const contact = await Contact.findOne(filter);

      if (!contact) {
        return {
          success: false,
          error: `Contact not found`,
        };
      }

      // Calculate lead score based on various factors
      let score = 0;
      const scoreBreakdown: any = {
        profileCompleteness: 0,
        engagement: 0,
        fit: 0,
        behavior: 0,
      };

      // Profile Completeness (0-25 points)
      let completenessScore = 0;
      if (contact.firstName) completenessScore += 5;
      if (contact.lastName) completenessScore += 5;
      if (contact.phone) completenessScore += 5;
      if (contact.company) completenessScore += 5;
      if (contact.jobTitle) completenessScore += 5;
      scoreBreakdown.profileCompleteness = completenessScore;
      score += completenessScore;

      // Status Score (0-25 points)
      const statusScores: Record<string, number> = {
        customer: 25,
        prospect: 20,
        lead: 10,
        inactive: 0,
      };
      const statusScore = statusScores[contact.status || "lead"] || 0;
      scoreBreakdown.fit = statusScore;
      score += statusScore;

      // Tags indicate engagement (0-25 points)
      const tagsScore = Math.min((contact.tags?.length || 0) * 5, 25);
      scoreBreakdown.engagement = tagsScore;
      score += tagsScore;

      // Recency Score (0-25 points) - based on last update
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(contact.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      let recencyScore = 25;
      if (daysSinceUpdate > 90) recencyScore = 5;
      else if (daysSinceUpdate > 60) recencyScore = 10;
      else if (daysSinceUpdate > 30) recencyScore = 15;
      else if (daysSinceUpdate > 7) recencyScore = 20;
      scoreBreakdown.behavior = recencyScore;
      score += recencyScore;

      // Normalize to 0-100
      const finalScore = Math.min(Math.round(score), 100);

      // Determine grade
      let grade = "D";
      if (finalScore >= 80) grade = "A";
      else if (finalScore >= 60) grade = "B";
      else if (finalScore >= 40) grade = "C";

      // Update contact if requested
      // Note: The Contact model doesn't have a leadScore field currently
      // If we wanted to persist scores, we'd need to add it to the model

      return {
        success: true,
        contact: {
          id: contact._id,
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          email: contact.email,
          status: contact.status,
        },
        score: {
          total: finalScore,
          grade,
          breakdown: scoreBreakdown,
          interpretation: this.getScoreInterpretation(finalScore),
        },
        message: `Contact scored ${finalScore}/100 (Grade ${grade})`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getScoreInterpretation(score: number): string {
    if (score >= 80) return "Hot lead - High priority for outreach";
    if (score >= 60) return "Warm lead - Good potential, continue nurturing";
    if (score >= 40) return "Cold lead - Requires more engagement";
    return "Very cold lead - Consider re-qualification or removal";
  }
}
