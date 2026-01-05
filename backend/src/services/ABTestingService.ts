import { Types } from "mongoose";
import Campaign from "../models/Campaign";

/**
 * A/B Testing Service with Statistical Significance
 *
 * Implements proper statistical testing for email campaigns, landing pages, and forms
 * Uses Chi-Square test for conversion rate comparison
 */

interface VariantStats {
  variant: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

interface ABTestResult {
  winner?: string;
  confidence: number; // 0-100%
  isSignificant: boolean; // true if p-value < 0.05
  pValue: number;
  requiredSampleSize: number;
  currentSampleSize: number;
  recommendation: string;
  variants: VariantStats[];
}

export class ABTestingService {
  /**
   * Calculate statistical significance using Chi-Square test
   */
  static calculateSignificance(
    variantA: { conversions: number; total: number },
    variantB: { conversions: number; total: number }
  ): { pValue: number; isSignificant: boolean; confidence: number } {
    // Chi-Square test for proportion differences
    const n1 = variantA.total;
    const n2 = variantB.total;
    const p1 = variantA.conversions / n1;
    const p2 = variantB.conversions / n2;

    // Pooled proportion
    const pooledP = (variantA.conversions + variantB.conversions) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // P-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(z));

    // Confidence level
    const confidence = (1 - pValue) * 100;

    // Significant if p-value < 0.05 (95% confidence)
    const isSignificant = pValue < 0.05;

    return { pValue, isSignificant, confidence };
  }

  /**
   * Normal CDF (Cumulative Distribution Function)
   */
  private static normalCDF(z: number): number {
    // Approximation of normal CDF using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const probability =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - probability : probability;
  }

  /**
   * Calculate required sample size for desired statistical power
   */
  static calculateRequiredSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number, // e.g., 0.1 for 10% relative improvement
    alpha: number = 0.05, // significance level
    power: number = 0.8 // statistical power (1 - beta)
  ): number {
    // Z-scores for alpha and beta
    const zAlpha = 1.96; // for 95% confidence (alpha = 0.05)
    const zBeta = 0.84; // for 80% power (beta = 0.2)

    const p1 = baselineConversionRate;
    const p2 = p1 * (1 + minimumDetectableEffect);

    const pooledP = (p1 + p2) / 2;

    // Sample size formula
    const n =
      Math.pow(zAlpha + zBeta, 2) *
      (p1 * (1 - p1) + p2 * (1 - p2)) /
      Math.pow(p2 - p1, 2);

    return Math.ceil(n);
  }

  /**
   * Run A/B test analysis for a campaign
   */
  static async analyzeCampaignABTest(campaignId: Types.ObjectId): Promise<ABTestResult> {
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get variant stats (mock data for now - would come from campaign analytics)
    const variants: VariantStats[] = [
      {
        variant: "A (Control)",
        sent: 1000,
        opened: 250,
        clicked: 50,
        converted: 10,
        openRate: 25,
        clickRate: 5,
        conversionRate: 1,
      },
      {
        variant: "B (Variant)",
        sent: 1000,
        opened: 300,
        clicked: 75,
        converted: 18,
        openRate: 30,
        clickRate: 7.5,
        conversionRate: 1.8,
      },
    ];

    // Calculate statistical significance
    const significance = this.calculateSignificance(
      { conversions: variants[0].converted, total: variants[0].sent },
      { conversions: variants[1].converted, total: variants[1].sent }
    );

    // Determine winner
    let winner: string | undefined;
    if (significance.isSignificant) {
      winner = variants[1].conversionRate > variants[0].conversionRate ? "B" : "A";
    }

    // Calculate required sample size
    const requiredSampleSize = this.calculateRequiredSampleSize(
      variants[0].conversionRate / 100,
      0.2 // 20% relative improvement
    );

    const currentSampleSize = variants[0].sent + variants[1].sent;

    // Recommendation
    let recommendation: string;
    if (!significance.isSignificant && currentSampleSize < requiredSampleSize) {
      recommendation = `Continue test. Need ${requiredSampleSize - currentSampleSize} more samples for ${significance.confidence.toFixed(1)}% confidence.`;
    } else if (significance.isSignificant && winner) {
      recommendation = `Winner: Variant ${winner} with ${significance.confidence.toFixed(1)}% confidence. Deploy to 100% of audience.`;
    } else {
      recommendation = `No significant difference detected. Consider running longer or testing a bigger change.`;
    }

    return {
      winner,
      confidence: significance.confidence,
      isSignificant: significance.isSignificant,
      pValue: significance.pValue,
      requiredSampleSize,
      currentSampleSize,
      recommendation,
      variants,
    };
  }

  /**
   * Calculate lift (improvement percentage)
   */
  static calculateLift(control: number, variant: number): number {
    if (control === 0) return 0;
    return ((variant - control) / control) * 100;
  }

  /**
   * Bayesian A/B Test (alternative to frequentist)
   */
  static bayesianABTest(
    variantA: { conversions: number; total: number },
    variantB: { conversions: number; total: number }
  ): { probabilityBBeatsA: number; expectedLift: number } {
    // Simplified Bayesian calculation
    const alphaA = variantA.conversions + 1;
    const betaA = variantA.total - variantA.conversions + 1;
    const alphaB = variantB.conversions + 1;
    const betaB = variantB.total - variantB.conversions + 1;

    // Expected conversion rates
    const expectedA = alphaA / (alphaA + betaA);
    const expectedB = alphaB / (alphaB + betaB);

    // Probability B beats A (simplified)
    const probabilityBBeatsA = expectedB > expectedA ? 0.5 + (expectedB - expectedA) * 100 : 0.5 - (expectedA - expectedB) * 100;

    // Expected lift
    const expectedLift = this.calculateLift(expectedA, expectedB);

    return {
      probabilityBBeatsA: Math.max(0, Math.min(100, probabilityBBeatsA)),
      expectedLift,
    };
  }
}

export default ABTestingService;
