import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Referral Program Model
 *
 * Tracks customer referrals, rewards, and viral growth loops
 * Referred leads close 4x faster than other channels
 */

export type ReferralStatus = "pending" | "signed_up" | "qualified" | "converted" | "expired" | "invalid";
export type RewardType = "discount" | "credit" | "cash" | "product" | "service" | "points" | "custom";
export type RewardStatus = "pending" | "earned" | "claimed" | "delivered" | "expired";

export interface IReward {
  type: RewardType;
  value: number; // Dollar value or points
  description: string;
  code?: string; // Discount/promo code
  claimedAt?: Date;
  deliveredAt?: Date;
  expiresAt?: Date;
  status: RewardStatus;
}

export interface IReferral extends Document {
  workspaceId: Types.ObjectId;

  // Referrer (existing customer)
  referrerId: Types.ObjectId; // Contact who referred
  referrerEmail: string;
  referralCode: string; // Unique code like "JOHN2024" or "abc123"
  referralLink: string; // Full URL with tracking

  // Referred (new lead)
  referredContactId?: Types.ObjectId; // Created after sign up
  referredEmail: string;
  referredName?: string;

  // Status
  status: ReferralStatus;
  signedUpAt?: Date;
  qualifiedAt?: Date; // When they became MQL/SQL
  convertedAt?: Date; // When they became customer
  conversionValue?: number; // Deal value

  // Rewards
  referrerReward?: IReward;
  referredReward?: IReward; // Some programs reward the referred person too
  totalRewardValue: number;

  // Tracking
  clickCount: number;
  lastClickedAt?: Date;
  source?: string; // Where the referral link was shared (email, social, etc.)
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };

  // Metadata
  metadata?: Record<string, any>;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const rewardSchema = new Schema<IReward>(
  {
    type: {
      type: String,
      enum: ["discount", "credit", "cash", "product", "service", "points", "custom"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    code: String,
    claimedAt: Date,
    deliveredAt: Date,
    expiresAt: Date,
    status: {
      type: String,
      enum: ["pending", "earned", "claimed", "delivered", "expired"],
      required: true,
      default: "pending",
    },
  },
  { _id: false }
);

const referralSchema = new Schema<IReferral>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Referrer
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    referrerEmail: {
      type: String,
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referralLink: {
      type: String,
      required: true,
    },

    // Referred
    referredContactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      index: true,
    },
    referredEmail: {
      type: String,
      required: true,
      index: true,
    },
    referredName: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "signed_up", "qualified", "converted", "expired", "invalid"],
      required: true,
      default: "pending",
      index: true,
    },
    signedUpAt: Date,
    qualifiedAt: Date,
    convertedAt: Date,
    conversionValue: {
      type: Number,
      min: 0,
    },

    // Rewards
    referrerReward: rewardSchema,
    referredReward: rewardSchema,
    totalRewardValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tracking
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastClickedAt: Date,
    source: String,
    utmParams: {
      source: String,
      medium: String,
      campaign: String,
    },

    // Metadata
    metadata: Schema.Types.Mixed,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
referralSchema.index({ workspaceId: 1, referrerId: 1 });
referralSchema.index({ workspaceId: 1, status: 1 });
referralSchema.index({ workspaceId: 1, convertedAt: -1 });
// Note: referralCode already has unique: true and index: true in field definition

// Static methods
referralSchema.statics.getLeaderboard = async function (
  workspaceId: Types.ObjectId,
  limit: number = 10
) {
  return this.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: "$referrerId",
        totalReferrals: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] },
        },
        totalRewardValue: { $sum: "$totalRewardValue" },
        totalRevenue: { $sum: "$conversionValue" },
      },
    },
    { $sort: { conversions: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "contacts",
        localField: "_id",
        foreignField: "_id",
        as: "referrer",
      },
    },
    { $unwind: "$referrer" },
  ]);
};

referralSchema.statics.getStatistics = async function (workspaceId: Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { workspaceId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalValue: { $sum: "$conversionValue" },
      },
    },
  ]);

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const conversions = stats.find((s) => s._id === "converted")?.count || 0;
  const conversionRate = total > 0 ? (conversions / total) * 100 : 0;
  const totalRevenue = stats.find((s) => s._id === "converted")?.totalValue || 0;

  return {
    total,
    conversions,
    conversionRate,
    totalRevenue,
    breakdown: stats,
  };
};

const Referral = mongoose.model<IReferral>("Referral", referralSchema);

export default Referral;
