/**
 * Feature Extractor Service
 * Extracts ML features from CRM data (opportunities, contacts, companies, activities)
 */

import Opportunity from '../models/Opportunity';
import Contact from '../models/Contact';
import Company from '../models/Company';
import Activity from '../models/Activity';
import { Types } from 'mongoose';

export interface IExtractedFeatures {
  // Opportunity Features
  dealValue: number;
  dealAge: number; // days since created
  daysUntilExpectedClose: number; // days until expected close date
  probability: number; // 0-100
  stage: string;
  stagePosition: number; // 0-1, position in pipeline (0 = first stage, 1 = last stage)
  stageChangeCount: number; // How many times stage changed
  averageStageDuration: number; // Average days per stage

  // Contact Features
  contactSeniority: number; // 0-1 (0 = junior, 1 = C-level)
  contactEngagement: number; // 0-100, engagement score
  contactQualityScore: number; // 0-100
  contactIntentScore: number; // 0-100, buying intent

  // Company Features
  companySize: number; // Normalized company size (0-1)
  companyRevenue: number; // Annual revenue
  companyIndustry: string;
  companyStatus: string; // lead, prospect, customer
  companyAge: number; // days since created

  // Activity Features
  totalActivities: number;
  emailCount: number;
  callCount: number;
  meetingCount: number;
  taskCount: number;
  lastActivityDays: number; // days since last activity
  activityFrequency: number; // activities per day
  responseRate: number; // 0-1, email response rate

  // Engagement Metrics
  engagementScore: number; // 0-100, overall engagement
  daysSinceLastContact: number;
  touchpointCount: number; // Total interactions

  // Temporal Features
  dayOfWeek: number; // 0-6
  monthOfYear: number; // 1-12
  quarterOfYear: number; // 1-4
  isEndOfMonth: boolean;
  isEndOfQuarter: boolean;

  // Behavioral Features
  hasChampion: boolean; // Is contact a champion?
  hasDecisionMaker: boolean; // Is contact a decision maker?
  multiThreaded: boolean; // Multiple contacts engaged?
  competitorMentioned: boolean; // Competitor mentioned in notes?

  // Historical Features
  similarDealsWonCount: number; // Similar deals won in past
  similarDealsLostCount: number; // Similar deals lost in past
  winRateInIndustry: number; // 0-1, win rate in this industry
  avgDealCycleInIndustry: number; // Average days to close in this industry

  // Risk Indicators
  stagnantDays: number; // Days without stage change
  priceDiscountPercent: number; // Discount percentage
  budgetMismatch: number; // 0-1, how far from budget
  timelineMismatch: number; // 0-1, how far from expected timeline

  // Target Variable (for training)
  target?: number; // 0 or 1 (lost or won)
}

export class FeatureExtractorService {
  /**
   * Extract features from an opportunity
   */
  async extractFeatures(opportunityId: string | Types.ObjectId): Promise<IExtractedFeatures> {
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Fetch related data
    const contact = opportunity.contactId
      ? await Contact.findById(opportunity.contactId)
      : null;

    const company = opportunity.companyId
      ? await Company.findById(opportunity.companyId)
      : null;

    const activities = await Activity.find({
      workspaceId: opportunity.workspaceId,
      relatedTo: opportunityId,
    });

    // Extract features
    const features: IExtractedFeatures = {
      // Opportunity Features
      dealValue: opportunity.value || 0,
      dealAge: this.getDaysSince(opportunity.createdAt),
      daysUntilExpectedClose: opportunity.expectedCloseDate
        ? this.getDaysUntil(opportunity.expectedCloseDate)
        : 0,
      probability: opportunity.probability || 0,
      stage: opportunity.stageId.toString(),
      stagePosition: await this.getStagePosition(opportunity.pipelineId, opportunity.stageId),
      stageChangeCount: opportunity.stageHistory?.length || 0,
      averageStageDuration: this.getAverageStageDuration(opportunity.stageHistory || []),

      // Contact Features
      contactSeniority: contact ? this.getSeniorityScore(contact.jobTitle || '') : 0,
      contactEngagement: contact?.aiInsights?.engagementScore || 0,
      contactQualityScore: contact?.qualityScore || 0,
      contactIntentScore: contact?.intentScore || 0,

      // Company Features
      companySize: company ? this.normalizeCompanySize(company.companySize) : 0,
      companyRevenue: company?.annualRevenue || 0,
      companyIndustry: company?.industry || 'unknown',
      companyStatus: company?.status || 'lead',
      companyAge: company ? this.getDaysSince(company.createdAt) : 0,

      // Activity Features
      totalActivities: activities.length,
      emailCount: opportunity.emailCount || 0,
      callCount: opportunity.callCount || 0,
      meetingCount: opportunity.meetingCount || 0,
      taskCount: activities.filter((a) => a.type === 'task').length,
      lastActivityDays: opportunity.lastActivityAt
        ? this.getDaysSince(opportunity.lastActivityAt)
        : 999,
      activityFrequency: this.getActivityFrequency(activities, opportunity.createdAt),
      responseRate: this.calculateResponseRate(activities),

      // Engagement Metrics
      engagementScore: this.calculateEngagementScore(opportunity, activities),
      daysSinceLastContact: contact?.lastContactedAt
        ? this.getDaysSince(contact.lastContactedAt)
        : 999,
      touchpointCount: opportunity.activityCount || 0,

      // Temporal Features
      dayOfWeek: new Date().getDay(),
      monthOfYear: new Date().getMonth() + 1,
      quarterOfYear: Math.floor(new Date().getMonth() / 3) + 1,
      isEndOfMonth: this.isEndOfMonth(),
      isEndOfQuarter: this.isEndOfQuarter(),

      // Behavioral Features
      hasChampion: this.hasChampion(contact),
      hasDecisionMaker: this.hasDecisionMaker(contact),
      multiThreaded: (opportunity.associatedContacts?.length || 0) > 1,
      competitorMentioned: this.competitorMentioned(opportunity.description || ''),

      // Historical Features (these would require more complex queries)
      similarDealsWonCount: 0, // TODO: Implement
      similarDealsLostCount: 0, // TODO: Implement
      winRateInIndustry: 0, // TODO: Implement
      avgDealCycleInIndustry: 0, // TODO: Implement

      // Risk Indicators
      stagnantDays: this.getStagnantDays(opportunity.stageHistory || []),
      priceDiscountPercent: 0, // TODO: Implement if discount tracking exists
      budgetMismatch: 0, // TODO: Implement if budget tracking exists
      timelineMismatch: this.getTimelineMismatch(
        opportunity.expectedCloseDate,
        opportunity.createdAt
      ),

      // Target (only set during training)
      target: opportunity.status === 'won' ? 1 : opportunity.status === 'lost' ? 0 : undefined,
    };

    return features;
  }

  /**
   * Extract features for multiple opportunities (batch)
   */
  async extractFeaturesForMultiple(
    opportunityIds: (string | Types.ObjectId)[]
  ): Promise<IExtractedFeatures[]> {
    const features = [];
    for (const id of opportunityIds) {
      try {
        const feature = await this.extractFeatures(id);
        features.push(feature);
      } catch (error) {
        console.error(`Failed to extract features for opportunity ${id}:`, error);
      }
    }
    return features;
  }

  /**
   * Extract training data for a workspace
   * Returns features for all closed opportunities (won or lost)
   */
  async extractTrainingData(workspaceId: string | Types.ObjectId): Promise<IExtractedFeatures[]> {
    const opportunities = await Opportunity.find({
      workspaceId,
      status: { $in: ['won', 'lost'] },
      actualCloseDate: { $exists: true },
    }).limit(1000); // Limit to prevent memory issues

    const opportunityIds = opportunities.map((opp) => opp._id);
    return this.extractFeaturesForMultiple(opportunityIds);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getDaysUntil(date: Date): number {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private async getStagePosition(
    pipelineId: Types.ObjectId,
    stageId: Types.ObjectId
  ): Promise<number> {
    try {
      const Pipeline = (await import('../models/Pipeline')).default;
      const pipeline = await Pipeline.findById(pipelineId);
      if (!pipeline) return 0;

      const stageIndex = pipeline.stages.findIndex(
        (s: any) => s._id.toString() === stageId.toString()
      );
      if (stageIndex === -1) return 0;

      return stageIndex / (pipeline.stages.length - 1 || 1); // 0-1
    } catch {
      return 0;
    }
  }

  private getAverageStageDuration(stageHistory: any[]): number {
    if (!stageHistory || stageHistory.length === 0) return 0;

    const durations = stageHistory
      .filter((s) => s.duration)
      .map((s) => s.duration / (1000 * 60 * 60 * 24)); // Convert ms to days

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  private getSeniorityScore(jobTitle: string): number {
    const title = jobTitle.toLowerCase();
    if (title.includes('ceo') || title.includes('chief') || title.includes('president'))
      return 1.0;
    if (title.includes('vp') || title.includes('vice president') || title.includes('director'))
      return 0.8;
    if (title.includes('manager') || title.includes('head of')) return 0.6;
    if (title.includes('senior') || title.includes('lead')) return 0.4;
    return 0.2;
  }

  private normalizeCompanySize(size?: string): number {
    if (!size) return 0;
    const sizeMap: { [key: string]: number } = {
      '1-10': 0.1,
      '11-50': 0.3,
      '51-200': 0.5,
      '201-500': 0.7,
      '501-1000': 0.9,
      '1000+': 1.0,
    };
    return sizeMap[size] || 0;
  }

  private getActivityFrequency(activities: any[], createdAt: Date): number {
    const daysSince = this.getDaysSince(createdAt);
    if (daysSince === 0) return 0;
    return activities.length / daysSince;
  }

  private calculateResponseRate(activities: any[]): number {
    const emails = activities.filter((a) => a.type === 'email');
    if (emails.length === 0) return 0;

    const sentEmails = emails.filter((e) => e.direction === 'outbound');
    const receivedEmails = emails.filter((e) => e.direction === 'inbound');

    if (sentEmails.length === 0) return 0;
    return receivedEmails.length / sentEmails.length;
  }

  private calculateEngagementScore(opportunity: any, activities: any[]): number {
    let score = 0;

    // Activity count (0-30 points)
    score += Math.min(activities.length * 2, 30);

    // Email count (0-20 points)
    score += Math.min((opportunity.emailCount || 0) * 2, 20);

    // Call count (0-20 points)
    score += Math.min((opportunity.callCount || 0) * 4, 20);

    // Meeting count (0-30 points)
    score += Math.min((opportunity.meetingCount || 0) * 6, 30);

    return Math.min(score, 100);
  }

  private hasChampion(contact: any): boolean {
    if (!contact) return false;
    const title = (contact.jobTitle || '').toLowerCase();
    return title.includes('champion') || contact.tags?.includes('champion');
  }

  private hasDecisionMaker(contact: any): boolean {
    if (!contact) return false;
    const title = (contact.jobTitle || '').toLowerCase();
    return (
      title.includes('ceo') ||
      title.includes('chief') ||
      title.includes('president') ||
      title.includes('owner') ||
      contact.tags?.includes('decision-maker')
    );
  }

  private competitorMentioned(text: string): boolean {
    const competitors = [
      'salesforce',
      'hubspot',
      'pipedrive',
      'zoho',
      'monday',
      'competitor',
      'alternative',
    ];
    const lowerText = text.toLowerCase();
    return competitors.some((comp) => lowerText.includes(comp));
  }

  private getStagnantDays(stageHistory: any[]): number {
    if (!stageHistory || stageHistory.length === 0) return 0;

    const lastStage = stageHistory[stageHistory.length - 1];
    if (!lastStage.enteredAt) return 0;

    return this.getDaysSince(lastStage.enteredAt);
  }

  private getTimelineMismatch(expectedCloseDate?: Date, createdAt?: Date): number {
    if (!expectedCloseDate || !createdAt) return 0;

    const expectedDuration = this.getDaysUntil(expectedCloseDate);
    const actualDuration = this.getDaysSince(createdAt);

    // If expected close is in the past, high mismatch
    if (expectedDuration < 0) return 1;

    // Calculate mismatch ratio
    const mismatch = Math.abs(expectedDuration - actualDuration) / (actualDuration || 1);
    return Math.min(mismatch, 1);
  }

  private isEndOfMonth(): boolean {
    const date = new Date();
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay.getMonth() !== date.getMonth();
  }

  private isEndOfQuarter(): boolean {
    const month = new Date().getMonth();
    return month === 2 || month === 5 || month === 8 || month === 11;
  }
}

export const featureExtractorService = new FeatureExtractorService();
