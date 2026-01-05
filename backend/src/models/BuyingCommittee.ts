import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Buying Committee Model
 *
 * Tracks decision-makers and influencers in B2B deals
 * Essential for Account-Based Marketing (ABM) strategies
 */

export type Role =
  | "champion"
  | "decision_maker"
  | "influencer"
  | "user"
  | "blocker"
  | "gatekeeper"
  | "economic_buyer"
  | "technical_buyer";

export type EngagementLevel = "high" | "medium" | "low" | "none";
export type Sentiment = "positive" | "neutral" | "negative" | "unknown";

export interface ICommitteeMember {
  contactId: Types.ObjectId;
  role: Role;
  influence: number; // 0-100, how much influence they have
  engagementLevel: EngagementLevel;
  sentiment: Sentiment;
  lastInteraction?: Date;
  notes?: string;
  isPrimaryContact: boolean;
}

export interface IBuyingCommittee extends Document {
  workspaceId: Types.ObjectId;
  companyId: Types.ObjectId;
  opportunityId?: Types.ObjectId;

  // Committee Members
  members: ICommitteeMember[];

  // Committee Health
  championIdentified: boolean;
  decisionMakerIdentified: boolean;
  committeeSize: number;
  avgInfluence: number; // Average influence score
  avgEngagement: number; // Average engagement level
  consensusScore: number; // 0-100, agreement level

  // Stakeholder Coverage
  hasChampion: boolean;
  hasDecisionMaker: boolean;
  hasEconomicBuyer: boolean;
  hasTechnicalBuyer: boolean;
  coverageScore: number; // 0-100, % of key roles identified

  // Deal Progress
  dealStage?: string;
  dealValue?: number;
  closeDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const committeeMemberSchema = new Schema<ICommitteeMember>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    role: {
      type: String,
      enum: [
        "champion",
        "decision_maker",
        "influencer",
        "user",
        "blocker",
        "gatekeeper",
        "economic_buyer",
        "technical_buyer",
      ],
      required: true,
    },
    influence: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    engagementLevel: {
      type: String,
      enum: ["high", "medium", "low", "none"],
      default: "none",
    },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative", "unknown"],
      default: "unknown",
    },
    lastInteraction: Date,
    notes: String,
    isPrimaryContact: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const buyingCommitteeSchema = new Schema<IBuyingCommittee>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      index: true,
    },

    // Members
    members: [committeeMemberSchema],

    // Health Metrics
    championIdentified: {
      type: Boolean,
      default: false,
    },
    decisionMakerIdentified: {
      type: Boolean,
      default: false,
    },
    committeeSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgInfluence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    avgEngagement: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    consensusScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Coverage
    hasChampion: {
      type: Boolean,
      default: false,
    },
    hasDecisionMaker: {
      type: Boolean,
      default: false,
    },
    hasEconomicBuyer: {
      type: Boolean,
      default: false,
    },
    hasTechnicalBuyer: {
      type: Boolean,
      default: false,
    },
    coverageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Deal
    dealStage: String,
    dealValue: {
      type: Number,
      min: 0,
    },
    closeDate: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
buyingCommitteeSchema.index({ workspaceId: 1, companyId: 1 }, { unique: true });
buyingCommitteeSchema.index({ workspaceId: 1, coverageScore: -1 });
buyingCommitteeSchema.index({ workspaceId: 1, dealStage: 1 });

// Calculate metrics before saving
buyingCommitteeSchema.pre("save", function (next) {
  const committee = this;

  // Committee size
  committee.committeeSize = committee.members.length;

  // Check for key roles
  committee.hasChampion = committee.members.some((m) => m.role === "champion");
  committee.hasDecisionMaker = committee.members.some((m) => m.role === "decision_maker");
  committee.hasEconomicBuyer = committee.members.some((m) => m.role === "economic_buyer");
  committee.hasTechnicalBuyer = committee.members.some((m) => m.role === "technical_buyer");

  committee.championIdentified = committee.hasChampion;
  committee.decisionMakerIdentified = committee.hasDecisionMaker;

  // Coverage score (% of key roles identified)
  const keyRoles = [
    committee.hasChampion,
    committee.hasDecisionMaker,
    committee.hasEconomicBuyer,
    committee.hasTechnicalBuyer,
  ];
  committee.coverageScore = (keyRoles.filter(Boolean).length / 4) * 100;

  // Average influence
  if (committee.members.length > 0) {
    committee.avgInfluence =
      committee.members.reduce((sum, m) => sum + m.influence, 0) / committee.members.length;
  }

  // Average engagement (convert levels to numbers)
  const engagementMap = { high: 100, medium: 50, low: 25, none: 0 };
  if (committee.members.length > 0) {
    committee.avgEngagement =
      committee.members.reduce((sum, m) => sum + engagementMap[m.engagementLevel], 0) /
      committee.members.length;
  }

  // Consensus score (based on sentiment alignment)
  const sentiments = committee.members.map((m) => m.sentiment).filter((s) => s !== "unknown");
  if (sentiments.length > 0) {
    const positiveCount = sentiments.filter((s) => s === "positive").length;
    committee.consensusScore = (positiveCount / sentiments.length) * 100;
  }

  next();
});

const BuyingCommittee = mongoose.model<IBuyingCommittee>(
  "BuyingCommittee",
  buyingCommitteeSchema
);

export default BuyingCommittee;
