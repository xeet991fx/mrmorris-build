import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import Contact from "../../../../models/Contact";
import Activity from "../../../../models/Activity";

export class GetContactEngagementTool extends BaseCRMTool {
  get name() {
    return "get_contact_engagement";
  }

  get description() {
    return `Analyze contact engagement levels based on activities, emails, and interactions. Use this to identify most/least engaged contacts and engagement trends.`;
  }

  get schema() {
    return z.object({
      contactId: z.string().optional().describe("Specific contact to analyze"),
      limit: z.number().default(10).describe("Number of contacts to return (for top/bottom lists)"),
      sortBy: z.enum(["most_engaged", "least_engaged"]).default("most_engaged"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (input.contactId) {
        // Analyze specific contact
        const contact = await Contact.findOne({
          _id: input.contactId,
          workspaceId: this.workspaceId,
        }).lean();

        if (!contact) {
          return {
            success: false,
            error: "Contact not found",
          };
        }

        // Get contact activities
        const activities = await Activity.find({
          workspaceId: this.workspaceId,
          entityType: "contact",
          entityId: contact._id,
        }).lean();

        const engagementScore = this.calculateEngagementScore(activities, contact);

        return {
          success: true,
          contact: {
            id: contact._id,
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            email: contact.email,
            status: contact.status,
          },
          engagement: {
            score: engagementScore.score,
            grade: engagementScore.grade,
            activityCount: activities.length,
            emailCount: activities.filter((a) => a.type === "email").length,
            callCount: activities.filter((a) => a.type === "call").length,
            meetingCount: activities.filter((a) => a.type === "meeting").length,
            lastActivity: activities.length > 0 ? activities[0].createdAt : null,
            breakdown: engagementScore.breakdown,
          },
        };
      } else {
        // Get engagement overview for all contacts
        const contacts = await Contact.find({
          workspaceId: this.workspaceId,
        }).lean();

        // Get all activities
        const activities = await Activity.find({
          workspaceId: this.workspaceId,
          entityType: "contact",
        }).lean();

        // Calculate scores for each contact
        const contactScores = contacts.map((contact) => {
          const contactActivities = activities.filter(
            (a) => (a.entityId as any).toString() === (contact._id as any).toString()
          );
          const score = this.calculateEngagementScore(contactActivities, contact);

          return {
            id: contact._id,
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            email: contact.email,
            status: contact.status,
            engagementScore: score.score,
            engagementGrade: score.grade,
            activityCount: contactActivities.length,
            lastActivity:
              contactActivities.length > 0
                ? contactActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
                    .createdAt
                : null,
          };
        });

        // Sort and limit
        contactScores.sort((a, b) => {
          if (input.sortBy === "most_engaged") {
            return b.engagementScore - a.engagementScore;
          } else {
            return a.engagementScore - b.engagementScore;
          }
        });

        const topContacts = contactScores.slice(0, input.limit || 10);

        // Calculate averages
        const avgScore =
          contactScores.length > 0
            ? contactScores.reduce((sum, c) => sum + c.engagementScore, 0) / contactScores.length
            : 0;

        return {
          success: true,
          summary: {
            totalContacts: contacts.length,
            avgEngagementScore: Math.round(avgScore),
            highlyEngaged: contactScores.filter((c) => c.engagementScore >= 70).length,
            moderatelyEngaged: contactScores.filter((c) => c.engagementScore >= 40 && c.engagementScore < 70)
              .length,
            lowEngagement: contactScores.filter((c) => c.engagementScore < 40).length,
          },
          contacts: topContacts,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private calculateEngagementScore(activities: any[], contact: any): { score: number; grade: string; breakdown: any } {
    let score = 0;
    const breakdown: any = {
      activityFrequency: 0,
      activityRecency: 0,
      activityDiversity: 0,
      responseRate: 0,
    };

    // Activity frequency (0-30 points)
    const activityCount = activities.length;
    breakdown.activityFrequency = Math.min(activityCount * 2, 30);
    score += breakdown.activityFrequency;

    // Activity recency (0-30 points)
    if (activities.length > 0) {
      const latestActivity = activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(latestActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity <= 7) breakdown.activityRecency = 30;
      else if (daysSinceActivity <= 14) breakdown.activityRecency = 25;
      else if (daysSinceActivity <= 30) breakdown.activityRecency = 20;
      else if (daysSinceActivity <= 60) breakdown.activityRecency = 10;
      else breakdown.activityRecency = 5;

      score += breakdown.activityRecency;
    }

    // Activity diversity (0-20 points)
    const activityTypes = new Set(activities.map((a) => a.type));
    breakdown.activityDiversity = activityTypes.size * 5;
    score += breakdown.activityDiversity;

    // Response rate (0-20 points) - based on inbound activities
    const inboundActivities = activities.filter((a) => a.direction === "inbound");
    if (activities.length > 0) {
      breakdown.responseRate = Math.min((inboundActivities.length / activities.length) * 20, 20);
      score += breakdown.responseRate;
    }

    // Determine grade
    let grade = "D";
    if (score >= 80) grade = "A";
    else if (score >= 60) grade = "B";
    else if (score >= 40) grade = "C";

    return { score: Math.min(Math.round(score), 100), grade, breakdown };
  }
}
