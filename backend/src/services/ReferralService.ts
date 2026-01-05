import { Types } from "mongoose";
import Referral, { IReferral, RewardType } from "../models/Referral";
import Contact from "../models/Contact";
import crypto from "crypto";

/**
 * Referral Service
 *
 * Manages referral program: code generation, tracking, rewards
 * Referred leads close 4x faster and have higher LTV
 */

export class ReferralService {
  /**
   * Generate unique referral code
   */
  static generateReferralCode(referrerName: string): string {
    const cleanName = referrerName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 6);
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${cleanName}${random}`;
  }

  /**
   * Create referral code for a contact
   */
  static async createReferralLink(
    workspaceId: Types.ObjectId,
    referrerId: Types.ObjectId,
    options: {
      customCode?: string;
      referrerReward?: { type: RewardType; value: number; description: string };
      referredReward?: { type: RewardType; value: number; description: string };
    } = {}
  ): Promise<{ referralCode: string; referralLink: string }> {
    const referrer = await Contact.findById(referrerId);

    if (!referrer) {
      throw new Error("Referrer contact not found");
    }

    // Generate unique code
    let referralCode = options.customCode || this.generateReferralCode(referrer.firstName);

    // Ensure uniqueness
    let exists = await Referral.findOne({ referralCode });
    while (exists) {
      referralCode = this.generateReferralCode(referrer.firstName);
      exists = await Referral.findOne({ referralCode });
    }

    // Generate referral link (would be your actual domain)
    const baseUrl = process.env.FRONTEND_URL || "https://yourdomain.com";
    const referralLink = `${baseUrl}/ref/${referralCode}`;

    return { referralCode, referralLink };
  }

  /**
   * Create a referral
   */
  static async createReferral(
    workspaceId: Types.ObjectId,
    referrerId: Types.ObjectId,
    referredEmail: string,
    options: {
      referredName?: string;
      source?: string;
      referrerReward?: { type: RewardType; value: number; description: string };
      referredReward?: { type: RewardType; value: number; description: string };
    } = {}
  ): Promise<IReferral> {
    const referrer = await Contact.findById(referrerId);

    if (!referrer) {
      throw new Error("Referrer not found");
    }

    // Generate referral code and link
    const { referralCode, referralLink } = await this.createReferralLink(
      workspaceId,
      referrerId,
      options
    );

    // Default rewards (10% discount for referrer, 10% for referred)
    const defaultReferrerReward = {
      type: "discount" as RewardType,
      value: 10,
      description: "10% off your next purchase",
      status: "pending" as const,
    };

    const defaultReferredReward = {
      type: "discount" as RewardType,
      value: 10,
      description: "10% off your first purchase",
      status: "pending" as const,
    };

    const referral = await Referral.create({
      workspaceId,
      referrerId,
      referrerEmail: referrer.email,
      referralCode,
      referralLink,
      referredEmail,
      referredName: options.referredName,
      status: "pending",
      referrerReward: options.referrerReward || defaultReferrerReward,
      referredReward: options.referredReward || defaultReferredReward,
      totalRewardValue:
        (options.referrerReward?.value || 10) + (options.referredReward?.value || 10),
      clickCount: 0,
      source: options.source,
    });

    return referral;
  }

  /**
   * Track referral link click
   */
  static async trackClick(referralCode: string, source?: string): Promise<IReferral | null> {
    const referral = await Referral.findOne({ referralCode });

    if (!referral) {
      return null;
    }

    referral.clickCount += 1;
    referral.lastClickedAt = new Date();

    if (source && !referral.source) {
      referral.source = source;
    }

    await referral.save();

    return referral;
  }

  /**
   * Process referral sign-up (when referred person creates account)
   */
  static async processSignUp(
    referralCode: string,
    referredContactId: Types.ObjectId
  ): Promise<IReferral | null> {
    const referral = await Referral.findOne({ referralCode });

    if (!referral) {
      return null;
    }

    referral.referredContactId = referredContactId;
    referral.status = "signed_up";
    referral.signedUpAt = new Date();

    // Mark referred reward as earned
    if (referral.referredReward) {
      referral.referredReward.status = "earned";
    }

    await referral.save();

    return referral;
  }

  /**
   * Process referral qualification (when referred becomes MQL/SQL)
   */
  static async processQualification(referredContactId: Types.ObjectId): Promise<IReferral | null> {
    const referral = await Referral.findOne({ referredContactId });

    if (!referral || referral.status !== "signed_up") {
      return null;
    }

    referral.status = "qualified";
    referral.qualifiedAt = new Date();

    await referral.save();

    return referral;
  }

  /**
   * Process referral conversion (when referred becomes customer)
   */
  static async processConversion(
    referredContactId: Types.ObjectId,
    conversionValue: number
  ): Promise<IReferral | null> {
    const referral = await Referral.findOne({ referredContactId });

    if (!referral) {
      return null;
    }

    referral.status = "converted";
    referral.convertedAt = new Date();
    referral.conversionValue = conversionValue;

    // Mark referrer reward as earned
    if (referral.referrerReward) {
      referral.referrerReward.status = "earned";
    }

    await referral.save();

    return referral;
  }

  /**
   * Get referrals for a referrer
   */
  static async getReferralsForReferrer(
    referrerId: Types.ObjectId,
    options: {
      status?: string;
      limit?: number;
    } = {}
  ) {
    const query: any = { referrerId };

    if (options.status) {
      query.status = options.status;
    }

    return await Referral.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .populate("referredContactId", "firstName lastName email lifecycleStage");
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(workspaceId: Types.ObjectId, limit: number = 10) {
    return await (Referral as any).getLeaderboard(workspaceId, limit);
  }

  /**
   * Get statistics
   */
  static async getStatistics(workspaceId: Types.ObjectId) {
    return await (Referral as any).getStatistics(workspaceId);
  }

  /**
   * Claim reward
   */
  static async claimReward(
    referralId: Types.ObjectId,
    rewardType: "referrer" | "referred"
  ): Promise<IReferral | null> {
    const referral = await Referral.findById(referralId);

    if (!referral) {
      return null;
    }

    const reward = rewardType === "referrer" ? referral.referrerReward : referral.referredReward;

    if (!reward || reward.status !== "earned") {
      throw new Error("Reward not available for claiming");
    }

    reward.status = "claimed";
    reward.claimedAt = new Date();

    // Generate discount code if needed
    if (reward.type === "discount" && !reward.code) {
      reward.code = `REF${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }

    await referral.save();

    return referral;
  }
}

export default ReferralService;
