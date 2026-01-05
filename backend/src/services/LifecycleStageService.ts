import { Types } from "mongoose";
import Contact from "../models/Contact";
import ContactLifecycleHistory, {
  IContactLifecycleHistory,
  LifecycleStage,
} from "../models/ContactLifecycleHistory";
import LeadScore from "../models/LeadScore";

/**
 * Default SLA targets for each stage (in hours)
 * These represent best-practice timelines for B2B sales
 */
const DEFAULT_SLA_TARGETS: Record<LifecycleStage, number> = {
  subscriber: 0, // No SLA for subscribers
  lead: 24, // Respond within 24 hours
  mql: 48, // Marketing should qualify within 2 days
  sql: 72, // Sales should accept within 3 days
  sal: 168, // Sales should work lead within 7 days (1 week)
  opportunity: 720, // Should progress or close within 30 days
  customer: 0, // No SLA for customers
  evangelist: 0, // No SLA for evangelists
  churned: 0, // No SLA for churned
  disqualified: 0, // No SLA for disqualified
};

/**
 * Lifecycle stage progression rules
 * Defines valid transitions between stages
 */
const VALID_TRANSITIONS: Record<LifecycleStage, LifecycleStage[]> = {
  subscriber: ["lead", "disqualified"],
  lead: ["mql", "disqualified", "subscriber"],
  mql: ["sql", "lead", "disqualified"],
  sql: ["sal", "mql", "disqualified"],
  sal: ["opportunity", "sql", "disqualified"],
  opportunity: ["customer", "sal", "disqualified"],
  customer: ["evangelist", "churned"],
  evangelist: ["churned", "customer"],
  churned: ["lead", "subscriber"],
  disqualified: ["lead", "subscriber"],
};

/**
 * Automated progression criteria
 * When a contact meets these criteria, they automatically advance to the next stage
 */
interface ProgressionCriteria {
  minLeadScore?: number;
  minIntentScore?: number;
  minQualityScore?: number;
  requiredEngagements?: string[]; // e.g., ["demo_viewed", "pricing_page"]
  requiresManualReview?: boolean;
}

const PROGRESSION_CRITERIA: Record<LifecycleStage, ProgressionCriteria | null> = {
  subscriber: null,
  lead: {
    // Lead → MQL
    minLeadScore: 50,
    minIntentScore: 30,
  },
  mql: {
    // MQL → SQL (requires manual review by sales)
    minLeadScore: 70,
    minIntentScore: 50,
    minQualityScore: 60,
    requiresManualReview: true,
  },
  sql: {
    // SQL → SAL (manual)
    requiresManualReview: true,
  },
  sal: {
    // SAL → Opportunity (manual)
    requiresManualReview: true,
  },
  opportunity: {
    // Opportunity → Customer (manual)
    requiresManualReview: true,
  },
  customer: null,
  evangelist: null,
  churned: null,
  disqualified: null,
};

export class LifecycleStageService {
  /**
   * Transition a contact to a new lifecycle stage
   */
  static async transitionStage(
    contactId: Types.ObjectId,
    newStage: LifecycleStage,
    options: {
      userId?: Types.ObjectId;
      reason?: string;
      method?: "manual" | "automated" | "workflow" | "api" | "import";
      metadata?: Record<string, any>;
      skipValidation?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string; history?: IContactLifecycleHistory }> {
    try {
      const contact = await Contact.findById(contactId);
      if (!contact) {
        return { success: false, message: "Contact not found" };
      }

      const currentStage = contact.lifecycleStage || "lead";

      // Skip if already in this stage
      if (currentStage === newStage) {
        return { success: true, message: "Already in this stage" };
      }

      // Validate transition unless skipValidation is true
      if (!options.skipValidation) {
        const validTransitions = VALID_TRANSITIONS[currentStage];
        if (!validTransitions.includes(newStage)) {
          return {
            success: false,
            message: `Invalid transition from ${currentStage} to ${newStage}. Valid transitions: ${validTransitions.join(", ")}`,
          };
        }
      }

      // Get current stage metrics
      const currentHistory = await ContactLifecycleHistory.findOne({
        contactId,
        currentStage,
      }).sort({ transitionedAt: -1 });

      let timeInStage = 0;
      if (currentHistory) {
        const now = new Date();
        const enteredAt = currentHistory.currentStageEnteredAt || currentHistory.transitionedAt;
        timeInStage = (now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60); // Convert to hours
      }

      // Calculate SLA status
      const slaTarget = DEFAULT_SLA_TARGETS[currentStage];
      let slaStatus: "on_track" | "at_risk" | "breached" = "on_track";
      let slaBreachedAt: Date | undefined;

      if (slaTarget > 0 && timeInStage > 0) {
        if (timeInStage > slaTarget) {
          slaStatus = "breached";
          slaBreachedAt = new Date(Date.now() - (timeInStage - slaTarget) * 60 * 60 * 1000);
        } else if (timeInStage > slaTarget * 0.8) {
          slaStatus = "at_risk";
        }
      }

      // Get lead score for metadata
      const leadScore = await LeadScore.findOne({
        contactId,
        workspaceId: contact.workspaceId,
      });

      // Create lifecycle history record
      const historyData = {
        contactId,
        workspaceId: contact.workspaceId,
        currentStage: newStage,
        currentStageEnteredAt: new Date(),
        previousStage: currentStage,
        previousStageExitedAt: new Date(),
        transitionedFrom: currentStage,
        transitionedTo: newStage,
        transitionedAt: new Date(),
        transitionedBy: options.userId,
        transitionReason: options.reason,
        transitionMethod: options.method || "manual",
        slaTarget: DEFAULT_SLA_TARGETS[currentStage],
        slaStatus,
        timeInStage,
        slaBreachedAt,
        metadata: {
          score: leadScore?.currentScore || 0,
          intentScore: contact.intentScore || 0,
          qualityScore: contact.qualityScore || 0,
          qualityGrade: contact.qualityGrade,
          ...options.metadata,
        },
      };

      const history = await ContactLifecycleHistory.create(historyData);

      // Update contact
      await Contact.findByIdAndUpdate(contactId, {
        lifecycleStage: newStage,
        lifecycleStageUpdatedAt: new Date(),
        previousLifecycleStage: currentStage,
      });

      return {
        success: true,
        message: `Successfully transitioned from ${currentStage} to ${newStage}`,
        history,
      };
    } catch (error: any) {
      console.error("Error transitioning lifecycle stage:", error);
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Check if a contact meets criteria for automatic progression
   */
  static async checkAutomaticProgression(
    contactId: Types.ObjectId
  ): Promise<{ shouldProgress: boolean; nextStage?: LifecycleStage; reason?: string }> {
    try {
      const contact = await Contact.findById(contactId);
      if (!contact) {
        return { shouldProgress: false };
      }

      const currentStage = contact.lifecycleStage || "lead";
      const criteria = PROGRESSION_CRITERIA[currentStage];

      // No automatic progression criteria
      if (!criteria) {
        return { shouldProgress: false };
      }

      // Requires manual review
      if (criteria.requiresManualReview) {
        return { shouldProgress: false };
      }

      // Get lead score
      const leadScore = await LeadScore.findOne({
        contactId,
        workspaceId: contact.workspaceId,
      });

      // Check criteria
      const reasons: string[] = [];

      if (criteria.minLeadScore && (!leadScore || leadScore.currentScore < criteria.minLeadScore)) {
        return { shouldProgress: false };
      } else if (criteria.minLeadScore) {
        reasons.push(`Lead score: ${leadScore?.currentScore}/${criteria.minLeadScore}`);
      }

      if (criteria.minIntentScore && (!contact.intentScore || contact.intentScore < criteria.minIntentScore)) {
        return { shouldProgress: false };
      } else if (criteria.minIntentScore) {
        reasons.push(`Intent score: ${contact.intentScore}/${criteria.minIntentScore}`);
      }

      if (criteria.minQualityScore && (!contact.qualityScore || contact.qualityScore < criteria.minQualityScore)) {
        return { shouldProgress: false };
      } else if (criteria.minQualityScore) {
        reasons.push(`Quality score: ${contact.qualityScore}/${criteria.minQualityScore}`);
      }

      // Determine next stage
      const validTransitions = VALID_TRANSITIONS[currentStage];
      const nextStage = validTransitions[0]; // First valid transition

      return {
        shouldProgress: true,
        nextStage,
        reason: `Automatic progression: ${reasons.join(", ")}`,
      };
    } catch (error) {
      console.error("Error checking automatic progression:", error);
      return { shouldProgress: false };
    }
  }

  /**
   * Process automatic progressions for all contacts in a workspace
   */
  static async processAutomaticProgressions(workspaceId: Types.ObjectId): Promise<number> {
    try {
      // Get all contacts eligible for automatic progression (lead or mql)
      const contacts = await Contact.find({
        workspaceId,
        lifecycleStage: { $in: ["lead", "mql"] },
      });

      let progressedCount = 0;

      for (const contact of contacts) {
        const { shouldProgress, nextStage, reason } = await this.checkAutomaticProgression(
          contact._id as Types.ObjectId
        );

        if (shouldProgress && nextStage) {
          const result = await this.transitionStage(contact._id as Types.ObjectId, nextStage, {
            method: "automated",
            reason,
          });

          if (result.success) {
            progressedCount++;
          }
        }
      }

      return progressedCount;
    } catch (error) {
      console.error("Error processing automatic progressions:", error);
      return 0;
    }
  }

  /**
   * Get SLA breaches for a workspace
   */
  static async getSLABreaches(
    workspaceId: Types.ObjectId,
    options: {
      stage?: LifecycleStage;
      limit?: number;
    } = {}
  ) {
    try {
      const query: any = {
        workspaceId,
        slaStatus: "breached",
      };

      if (options.stage) {
        query.currentStage = options.stage;
      }

      return await ContactLifecycleHistory.find(query)
        .populate("contactId", "firstName lastName email lifecycleStage")
        .sort({ slaBreachedAt: 1 })
        .limit(options.limit || 100);
    } catch (error) {
      console.error("Error getting SLA breaches:", error);
      return [];
    }
  }

  /**
   * Get funnel metrics for a workspace
   */
  static async getFunnelMetrics(
    workspaceId: Types.ObjectId,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    try {
      const matchStage: any = { workspaceId };

      if (options.startDate || options.endDate) {
        matchStage.transitionedAt = {};
        if (options.startDate) {
          matchStage.transitionedAt.$gte = options.startDate;
        }
        if (options.endDate) {
          matchStage.transitionedAt.$lte = options.endDate;
        }
      }

      // Get current stage counts
      const stageCounts = await Contact.aggregate([
        { $match: { workspaceId } },
        {
          $group: {
            _id: "$lifecycleStage",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get average time in each stage
      const avgTimeInStage = await ContactLifecycleHistory.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$currentStage",
            avgTime: { $avg: "$timeInStage" },
            count: { $sum: 1 },
          },
        },
      ]);

      // Get conversion rates between stages
      const conversions = await ContactLifecycleHistory.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              from: "$transitionedFrom",
              to: "$transitionedTo",
            },
            count: { $sum: 1 },
          },
        },
      ]);

      // Get SLA metrics
      const slaMetrics = await ContactLifecycleHistory.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$currentStage",
            totalLeads: { $sum: 1 },
            breached: {
              $sum: { $cond: [{ $eq: ["$slaStatus", "breached"] }, 1, 0] },
            },
            atRisk: {
              $sum: { $cond: [{ $eq: ["$slaStatus", "at_risk"] }, 1, 0] },
            },
            onTrack: {
              $sum: { $cond: [{ $eq: ["$slaStatus", "on_track"] }, 1, 0] },
            },
          },
        },
      ]);

      return {
        stageCounts: stageCounts.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        avgTimeInStage: avgTimeInStage.reduce((acc: any, item: any) => {
          acc[item._id] = {
            hours: item.avgTime,
            days: item.avgTime / 24,
            count: item.count,
          };
          return acc;
        }, {}),
        conversions: conversions.map((c: any) => ({
          from: c._id.from,
          to: c._id.to,
          count: c.count,
        })),
        slaMetrics: slaMetrics.reduce((acc: any, item: any) => {
          acc[item._id] = {
            total: item.totalLeads,
            breached: item.breached,
            atRisk: item.atRisk,
            onTrack: item.onTrack,
            breachRate: item.totalLeads > 0 ? (item.breached / item.totalLeads) * 100 : 0,
          };
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("Error getting funnel metrics:", error);
      return null;
    }
  }

  /**
   * Get lifecycle history for a contact
   */
  static async getContactHistory(contactId: Types.ObjectId) {
    return await ContactLifecycleHistory.find({ contactId })
      .populate("transitionedBy", "firstName lastName email")
      .sort({ transitionedAt: -1 });
  }

  /**
   * Get contacts by stage with pagination
   */
  static async getContactsByStage(
    workspaceId: Types.ObjectId,
    stage: LifecycleStage,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "lifecycleStageUpdatedAt";
    const sortOrder = options.sortOrder === "asc" ? 1 : -1;

    const query = { workspaceId, lifecycleStage: stage };

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "firstName lastName email")
        .populate("companyId", "name domain"),
      Contact.countDocuments(query),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default LifecycleStageService;
