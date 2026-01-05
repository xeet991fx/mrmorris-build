import { Types } from "mongoose";
import Contact from "../models/Contact";
import LeadScore from "../models/LeadScore";
import LeadRecycling, { ILeadRecycling, RecyclingReason } from "../models/LeadRecycling";
import TrackingEvent from "../models/TrackingEvent";

/**
 * Lead Recycling Service
 *
 * Automatically detect dead/stale leads and trigger re-engagement campaigns
 * to recover lost opportunities and maximize revenue
 */

interface DetectionCriteria {
  inactiveDays?: number; // Days since last activity
  minScore?: number; // Below this score = dead
  scoreDropPercent?: number; // Score dropped by this % = dying
  noEngagementDays?: number; // No opens/clicks in X days
  lifecycleStages?: string[]; // Only recycle from these stages
}

const DEFAULT_CRITERIA: DetectionCriteria = {
  inactiveDays: 30, // 30 days no activity
  minScore: 20, // Score below 20
  scoreDropPercent: 50, // Score dropped by 50%
  noEngagementDays: 45, // No engagement in 45 days
  lifecycleStages: ["lead", "mql", "sql", "sal", "opportunity"],
};

export class LeadRecyclingService {
  /**
   * Detect dead leads that need recycling
   */
  static async detectDeadLeads(
    workspaceId: Types.ObjectId,
    criteria: DetectionCriteria = DEFAULT_CRITERIA
  ): Promise<{
    detected: number;
    leads: Array<{ contactId: Types.ObjectId; reason: RecyclingReason; criteria: any }>;
  }> {
    const detected: Array<{ contactId: Types.ObjectId; reason: RecyclingReason; criteria: any }> =
      [];

    // Get all contacts in eligible lifecycle stages
    const contacts = await Contact.find({
      workspaceId,
      lifecycleStage: { $in: criteria.lifecycleStages || DEFAULT_CRITERIA.lifecycleStages },
    });

    for (const contact of contacts) {
      // Skip if already in recycling
      const existingRecycling = await LeadRecycling.findOne({
        contactId: contact._id,
        status: { $in: ["detected", "in_recycling"] },
      });

      if (existingRecycling) continue;

      // Check 1: Inactive for too long
      if (contact.lastContactedAt && criteria.inactiveDays) {
        const daysSinceContact =
          (Date.now() - contact.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceContact >= criteria.inactiveDays) {
          detected.push({
            contactId: contact._id as Types.ObjectId,
            reason: "inactive",
            criteria: {
              daysSinceLastActivity: Math.floor(daysSinceContact),
              lifecycleStage: contact.lifecycleStage,
            },
          });
          continue;
        }
      }

      // Check 2: Score too low
      const leadScore = await LeadScore.findOne({
        workspaceId,
        contactId: contact._id,
      });

      if (leadScore && criteria.minScore && leadScore.currentScore < criteria.minScore) {
        detected.push({
          contactId: contact._id as Types.ObjectId,
          reason: "low_score",
          criteria: {
            currentScore: leadScore.currentScore,
            previousScore: leadScore.previousScore,
            lifecycleStage: contact.lifecycleStage,
          },
        });
        continue;
      }

      // Check 3: Score dropped significantly
      if (
        leadScore &&
        criteria.scoreDropPercent &&
        leadScore.previousScore > 0
      ) {
        const dropPercent =
          ((leadScore.previousScore - leadScore.currentScore) / leadScore.previousScore) * 100;

        if (dropPercent >= criteria.scoreDropPercent) {
          detected.push({
            contactId: contact._id as Types.ObjectId,
            reason: "stale",
            criteria: {
              currentScore: leadScore.currentScore,
              previousScore: leadScore.previousScore,
              scoreDropPercent: Math.floor(dropPercent),
              lifecycleStage: contact.lifecycleStage,
            },
          });
          continue;
        }
      }

      // Check 4: No engagement (opens/clicks) in X days
      if (criteria.noEngagementDays) {
        const lastEngagement = await TrackingEvent.findOne({
          contactId: contact._id,
          eventType: { $in: ["email_opened", "email_clicked", "link_clicked", "page_viewed"] },
        })
          .sort({ timestamp: -1 })
          .limit(1);

        if (lastEngagement) {
          const daysSinceEngagement =
            (Date.now() - lastEngagement.timestamp.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceEngagement >= criteria.noEngagementDays) {
            detected.push({
              contactId: contact._id as Types.ObjectId,
              reason: "no_engagement",
              criteria: {
                noEngagementDays: Math.floor(daysSinceEngagement),
                lifecycleStage: contact.lifecycleStage,
              },
            });
            continue;
          }
        } else if (contact.createdAt) {
          // Never had any engagement
          const daysSinceCreation =
            (Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceCreation >= criteria.noEngagementDays) {
            detected.push({
              contactId: contact._id as Types.ObjectId,
              reason: "no_engagement",
              criteria: {
                noEngagementDays: Math.floor(daysSinceCreation),
                neverEngaged: true,
                lifecycleStage: contact.lifecycleStage,
              },
            });
          }
        }
      }
    }

    return {
      detected: detected.length,
      leads: detected,
    };
  }

  /**
   * Create recycling records for detected dead leads
   */
  static async createRecyclingRecords(
    workspaceId: Types.ObjectId,
    leads: Array<{ contactId: Types.ObjectId; reason: RecyclingReason; criteria: any }>
  ): Promise<number> {
    let created = 0;

    for (const lead of leads) {
      try {
        await LeadRecycling.create({
          workspaceId,
          contactId: lead.contactId,
          detectedAt: new Date(),
          detectedReason: lead.reason,
          detectionCriteria: lead.criteria,
          status: "detected",
          currentAttempt: 0,
          maxAttempts: 5,
          nextAttemptAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          nextAttemptMethod: "email",
        });

        created++;
      } catch (error) {
        console.error(`Failed to create recycling record for ${lead.contactId}:`, error);
      }
    }

    return created;
  }

  /**
   * Process re-engagement attempts (send emails, SMS, etc.)
   */
  static async processReEngagementAttempts(
    workspaceId: Types.ObjectId
  ): Promise<{ processed: number; sent: number }> {
    const now = new Date();

    // Get all recycling records ready for next attempt
    const recyclingLeads = await LeadRecycling.find({
      workspaceId,
      status: { $in: ["detected", "in_recycling"] },
      $or: [{ nextAttemptAt: { $lte: now } }, { nextAttemptAt: null }],
      currentAttempt: { $lt: 5 }, // Max 5 attempts
    })
      .populate("contactId")
      .limit(100); // Process 100 at a time

    let processed = 0;
    let sent = 0;

    for (const recycling of recyclingLeads) {
      try {
        const contact = recycling.contactId as any;

        if (!contact) {
          console.warn(`Contact not found for recycling ${recycling._id}`);
          continue;
        }

        // Determine next attempt method (rotate between channels)
        const method = this.getNextAttemptMethod(recycling.currentAttempt);

        // Record attempt
        recycling.attempts.push({
          attemptNumber: recycling.currentAttempt + 1,
          method,
          sentAt: new Date(),
          status: "sent",
        });

        recycling.currentAttempt += 1;
        recycling.status = "in_recycling";
        recycling.lastAttemptAt = new Date();

        if (!recycling.firstAttemptAt) {
          recycling.firstAttemptAt = new Date();
        }

        if (method === "email") {
          recycling.totalEmailsSent += 1;
        }

        // Schedule next attempt (exponential backoff: 1 day, 3 days, 7 days, 14 days, 30 days)
        const daysUntilNext = this.getNextAttemptDelay(recycling.currentAttempt);
        recycling.nextAttemptAt = new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);
        recycling.nextAttemptMethod = this.getNextAttemptMethod(recycling.currentAttempt);

        // Mark as exhausted if reached max attempts
        if (recycling.currentAttempt >= recycling.maxAttempts) {
          recycling.status = "exhausted";
          recycling.exhaustedAt = new Date();
        }

        await recycling.save();

        processed++;
        sent++;

        // Note: Actual email/SMS sending would be integrated with your email service
        // For now, we're just tracking the attempts
      } catch (error) {
        console.error(`Failed to process recycling for ${recycling.contactId}:`, error);
      }
    }

    return { processed, sent };
  }

  /**
   * Check for re-engagement (lead showed activity)
   */
  static async checkForReEngagement(
    contactId: Types.ObjectId,
    workspaceId: Types.ObjectId
  ): Promise<boolean> {
    const recycling = await LeadRecycling.findOne({
      contactId,
      workspaceId,
      status: { $in: ["detected", "in_recycling"] },
    });

    if (!recycling) return false;

    // Mark as re-engaged
    recycling.status = "re_engaged";
    recycling.reEngagedAt = new Date();
    await recycling.save();

    console.log(`✅ Lead ${contactId} re-engaged!`);

    return true;
  }

  /**
   * Get re-engagement statistics
   */
  static async getStatistics(workspaceId: Types.ObjectId) {
    const [statusBreakdown, timeline, successRate] = await Promise.all([
      // Status breakdown
      LeadRecycling.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Timeline (last 30 days)
      LeadRecycling.aggregate([
        {
          $match: {
            workspaceId,
            detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Success rate
      (LeadRecycling as any).getSuccessRate(workspaceId),
    ]);

    // Calculate ROI (assuming each re-engaged lead = $500 average deal value)
    const avgDealValue = 500;
    const reEngagedCount = successRate.reEngaged;
    const estimatedRevenue = reEngagedCount * avgDealValue;

    return {
      statusBreakdown: statusBreakdown.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      timeline,
      successRate: successRate.successRate,
      totalRecycled: successRate.total,
      reEngaged: successRate.reEngaged,
      estimatedRevenue,
      breakdown: successRate.breakdown,
    };
  }

  /**
   * Helper: Get next attempt method (rotate channels)
   */
  private static getNextAttemptMethod(attemptNumber: number): "email" | "sms" | "call" | "linkedin" {
    const methods: Array<"email" | "sms" | "call" | "linkedin"> = ["email", "sms", "email", "call", "email"];
    return methods[attemptNumber] || "email";
  }

  /**
   * Helper: Get delay until next attempt (exponential backoff)
   */
  private static getNextAttemptDelay(attemptNumber: number): number {
    const delays = [1, 3, 7, 14, 30]; // Days
    return delays[attemptNumber] || 30;
  }

  /**
   * Get leads ready for recycling
   */
  static async getLeadsReadyForRecycling(workspaceId: Types.ObjectId, limit: number = 50) {
    return await LeadRecycling.find({
      workspaceId,
      status: { $in: ["detected", "in_recycling"] },
      nextAttemptAt: { $lte: new Date() },
    })
      .populate("contactId", "firstName lastName email lifecycleStage")
      .sort({ nextAttemptAt: 1 })
      .limit(limit);
  }
}

export default LeadRecyclingService;
