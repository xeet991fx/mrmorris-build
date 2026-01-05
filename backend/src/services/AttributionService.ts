import { Types } from "mongoose";
import Attribution, {
  IAttribution,
  ITouchpoint,
  TouchpointChannel,
  AttributionModel,
} from "../models/Attribution";
import TrackingEvent from "../models/TrackingEvent";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";

/**
 * Attribution Service
 *
 * Calculates revenue attribution across multiple touchpoints using various models:
 * - First Touch: 100% credit to first interaction
 * - Last Touch: 100% credit to last interaction before conversion
 * - Linear: Equal credit to all touchpoints
 * - Time Decay: More credit to recent touchpoints (exponential decay)
 * - U-Shaped: 40% first, 40% last, 20% distributed evenly
 * - W-Shaped: 30% first, 30% opportunity creation, 30% last, 10% distributed
 */

export class AttributionService {
  /**
   * Build attribution record for a contact from tracking events
   */
  static async buildAttributionRecord(
    contactId: Types.ObjectId,
    workspaceId: Types.ObjectId
  ): Promise<IAttribution | null> {
    try {
      // Get all tracking events for this contact
      const events = await TrackingEvent.find({ contactId, workspaceId }).sort({ timestamp: 1 });

      if (events.length === 0) {
        console.log(`No tracking events found for contact ${contactId}`);
        return null;
      }

      // Convert events to touchpoints
      const touchpoints: ITouchpoint[] = events.map((event) => ({
        timestamp: event.timestamp,
        channel: this.mapEventToChannel(event),
        source: event.utmSource || event.source,
        medium: event.utmMedium,
        campaign: event.utmCampaign,
        content: event.utmContent,
        term: event.utmTerm,
        page: event.metadata?.page || event.metadata?.url,
        eventType: event.eventType,
        metadata: event.metadata,
      }));

      // Get contact for conversion data
      const contact = await Contact.findById(contactId);
      const opportunity = await Opportunity.findOne({ contactId }).sort({ createdAt: -1 });

      const converted = contact?.lifecycleStage === "customer" || false;
      const conversionValue = opportunity?.value || 0;

      // Calculate journey metrics
      const journeyStartDate = touchpoints[0].timestamp;
      const journeyEndDate = converted ? touchpoints[touchpoints.length - 1].timestamp : undefined;
      const uniqueChannels = new Set(touchpoints.map((t) => t.channel)).size;
      const journeyDurationDays = journeyEndDate
        ? (journeyEndDate.getTime() - journeyStartDate.getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      // Calculate attribution credits for each model
      const touchpointsWithCredits = this.calculateAttributionCredits(touchpoints, conversionValue);

      // Aggregate channel attribution
      const channelAttribution = this.aggregateChannelAttribution(
        touchpointsWithCredits,
        conversionValue
      );

      // Create or update attribution record
      const attribution = await Attribution.findOneAndUpdate(
        { contactId, workspaceId },
        {
          contactId,
          workspaceId,
          opportunityId: opportunity?._id,
          touchpoints: touchpointsWithCredits,
          journeyStartDate,
          journeyEndDate,
          converted,
          convertedAt: converted ? journeyEndDate : undefined,
          conversionValue,
          conversionType: contact?.lifecycleStage,
          channelAttribution,
          firstTouchChannel: touchpoints[0]?.channel,
          lastTouchChannel: touchpoints[touchpoints.length - 1]?.channel,
          primaryChannel: this.getPrimaryChannel(channelAttribution.linear),
          totalTouchpoints: touchpoints.length,
          uniqueChannels,
          journeyDurationDays,
        },
        { upsert: true, new: true }
      );

      return attribution;
    } catch (error) {
      console.error("Error building attribution record:", error);
      return null;
    }
  }

  /**
   * Calculate attribution credits for all models
   */
  private static calculateAttributionCredits(
    touchpoints: ITouchpoint[],
    conversionValue: number
  ): ITouchpoint[] {
    const n = touchpoints.length;

    return touchpoints.map((touchpoint, index) => {
      // First Touch: 100% to first touchpoint
      const firstTouchCredit = index === 0 ? 100 : 0;

      // Last Touch: 100% to last touchpoint
      const lastTouchCredit = index === n - 1 ? 100 : 0;

      // Linear: Equal distribution
      const linearCredit = 100 / n;

      // Time Decay: Exponential decay (half-life = 7 days)
      const daysFromEnd =
        (touchpoints[n - 1].timestamp.getTime() - touchpoint.timestamp.getTime()) /
        (1000 * 60 * 60 * 24);
      const halfLife = 7;
      const decay = Math.pow(0.5, daysFromEnd / halfLife);
      const timeDecayCredit = (decay / touchpoints.reduce((sum, t, i) => {
        const daysFromEndT =
          (touchpoints[n - 1].timestamp.getTime() - t.timestamp.getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + Math.pow(0.5, daysFromEndT / halfLife);
      }, 0)) * 100;

      // U-Shaped: 40% first, 40% last, 20% distributed
      let uShapedCredit = 0;
      if (index === 0) {
        uShapedCredit = 40;
      } else if (index === n - 1) {
        uShapedCredit = 40;
      } else {
        uShapedCredit = 20 / (n - 2);
      }

      // W-Shaped: 30% first, 30% opportunity creation (middle), 30% last, 10% distributed
      let wShapedCredit = 0;
      const middleIndex = Math.floor(n / 2);
      if (index === 0) {
        wShapedCredit = 30;
      } else if (index === middleIndex) {
        wShapedCredit = 30;
      } else if (index === n - 1) {
        wShapedCredit = 30;
      } else {
        wShapedCredit = 10 / (n - 3);
      }

      return {
        ...touchpoint,
        firstTouchCredit,
        lastTouchCredit,
        linearCredit,
        timeDecayCredit,
        uShapedCredit,
        wShapedCredit,
      };
    });
  }

  /**
   * Aggregate attribution credits by channel
   */
  private static aggregateChannelAttribution(
    touchpoints: ITouchpoint[],
    conversionValue: number
  ): {
    firstTouch: Record<TouchpointChannel, number>;
    lastTouch: Record<TouchpointChannel, number>;
    linear: Record<TouchpointChannel, number>;
    timeDecay: Record<TouchpointChannel, number>;
    uShaped: Record<TouchpointChannel, number>;
    wShaped: Record<TouchpointChannel, number>;
  } {
    const models = ["firstTouch", "lastTouch", "linear", "timeDecay", "uShaped", "wShaped"];
    const result: any = {};

    for (const model of models) {
      result[model] = {};

      for (const touchpoint of touchpoints) {
        const credit =
          model === "firstTouch"
            ? touchpoint.firstTouchCredit || 0
            : model === "lastTouch"
            ? touchpoint.lastTouchCredit || 0
            : model === "linear"
            ? touchpoint.linearCredit || 0
            : model === "timeDecay"
            ? touchpoint.timeDecayCredit || 0
            : model === "uShaped"
            ? touchpoint.uShapedCredit || 0
            : touchpoint.wShapedCredit || 0;

        const revenue = (credit / 100) * conversionValue;

        if (!result[model][touchpoint.channel]) {
          result[model][touchpoint.channel] = 0;
        }
        result[model][touchpoint.channel] += revenue;
      }
    }

    return result;
  }

  /**
   * Get primary channel (highest attributed revenue in linear model)
   */
  private static getPrimaryChannel(
    linearAttribution: Record<TouchpointChannel, number>
  ): TouchpointChannel {
    let maxRevenue = 0;
    let primaryChannel: TouchpointChannel = "other";

    for (const [channel, revenue] of Object.entries(linearAttribution)) {
      if (revenue > maxRevenue) {
        maxRevenue = revenue;
        primaryChannel = channel as TouchpointChannel;
      }
    }

    return primaryChannel;
  }

  /**
   * Map tracking event to attribution channel
   */
  private static mapEventToChannel(event: any): TouchpointChannel {
    const source = event.utmSource?.toLowerCase() || event.source?.toLowerCase() || "";
    const medium = event.utmMedium?.toLowerCase() || "";

    // Paid search
    if (medium === "cpc" || medium === "ppc" || source.includes("google-ads")) {
      return "paid_search";
    }

    // Organic search
    if (source.includes("google") || source.includes("bing") || medium === "organic") {
      return "organic_search";
    }

    // Social
    if (
      ["facebook", "linkedin", "twitter", "instagram", "tiktok"].some((s) => source.includes(s)) ||
      medium === "social"
    ) {
      return "social";
    }

    // Email
    if (medium === "email" || event.eventType === "email_opened") {
      return "email";
    }

    // Referral
    if (medium === "referral") {
      return "referral";
    }

    // Display
    if (medium === "display" || medium === "banner") {
      return "display";
    }

    // Video
    if (source.includes("youtube") || medium === "video") {
      return "video";
    }

    // Webinar
    if (source.includes("webinar") || event.metadata?.eventType === "webinar") {
      return "webinar";
    }

    // Direct
    if (medium === "direct" || (!source && !medium)) {
      return "direct";
    }

    return "other";
  }

  /**
   * Get attribution report for workspace
   */
  static async getAttributionReport(
    workspaceId: Types.ObjectId,
    options: {
      model?: AttributionModel;
      startDate?: Date;
      endDate?: Date;
      channel?: TouchpointChannel;
    } = {}
  ) {
    const { model = "linear", startDate, endDate, channel } = options;

    const query: any = {
      workspaceId,
      converted: true,
    };

    if (startDate || endDate) {
      query.convertedAt = {};
      if (startDate) query.convertedAt.$gte = startDate;
      if (endDate) query.convertedAt.$lte = endDate;
    }

    const attributions = await Attribution.find(query);

    // Aggregate revenue by channel for selected model
    const channelRevenue: Record<string, number> = {};
    let totalRevenue = 0;

    for (const attribution of attributions) {
      const modelKey =
        model === "first_touch"
          ? "firstTouch"
          : model === "last_touch"
          ? "lastTouch"
          : model === "time_decay"
          ? "timeDecay"
          : model === "u_shaped"
          ? "uShaped"
          : model === "w_shaped"
          ? "wShaped"
          : "linear";

      const channelData = attribution.channelAttribution[modelKey];

      for (const [ch, revenue] of Object.entries(channelData)) {
        if (!channel || ch === channel) {
          channelRevenue[ch] = (channelRevenue[ch] || 0) + (revenue as number);
          totalRevenue += revenue as number;
        }
      }
    }

    // Calculate ROI (if we have cost data)
    const channelROI: Record<string, { revenue: number; cost: number; roi: number }> = {};

    for (const [ch, revenue] of Object.entries(channelRevenue)) {
      // TODO: Integrate with campaign cost data
      channelROI[ch] = {
        revenue,
        cost: 0, // Would come from campaign budgets
        roi: 0, // (revenue - cost) / cost * 100
      };
    }

    return {
      model,
      totalRevenue,
      totalConversions: attributions.length,
      channelRevenue,
      channelROI,
      avgConversionValue: attributions.length > 0 ? totalRevenue / attributions.length : 0,
    };
  }

  /**
   * Build attribution for all contacts in workspace
   */
  static async buildAllAttributions(workspaceId: Types.ObjectId): Promise<number> {
    const contacts = await Contact.find({ workspaceId });

    let built = 0;

    for (const contact of contacts) {
      const attribution = await this.buildAttributionRecord(
        contact._id as Types.ObjectId,
        workspaceId
      );

      if (attribution) {
        built++;
      }
    }

    return built;
  }
}

export default AttributionService;
