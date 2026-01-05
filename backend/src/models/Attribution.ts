import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Attribution Model
 *
 * Tracks all touchpoints in a customer journey and calculates
 * revenue attribution using multiple attribution models
 */

export type AttributionModel =
  | "first_touch"
  | "last_touch"
  | "linear"
  | "time_decay"
  | "u_shaped"
  | "w_shaped"
  | "custom";

export type TouchpointChannel =
  | "organic_search"
  | "paid_search"
  | "social"
  | "email"
  | "direct"
  | "referral"
  | "display"
  | "affiliate"
  | "video"
  | "content"
  | "webinar"
  | "event"
  | "cold_outreach"
  | "phone"
  | "chat"
  | "other";

export interface ITouchpoint {
  timestamp: Date;
  channel: TouchpointChannel;
  source?: string; // Google, Facebook, LinkedIn, etc.
  medium?: string; // cpc, organic, email, social, etc.
  campaign?: string;
  content?: string;
  term?: string; // Search keywords
  page?: string; // Landing page
  eventType?: string; // page_view, form_submit, email_open, etc.
  metadata?: Record<string, any>;

  // Attribution credits (calculated for each model)
  firstTouchCredit?: number; // 0-100%
  lastTouchCredit?: number; // 0-100%
  linearCredit?: number; // 0-100%
  timeDecayCredit?: number; // 0-100%
  uShapedCredit?: number; // 0-100%
  wShapedCredit?: number; // 0-100%
}

export interface IAttribution extends Document {
  workspaceId: Types.ObjectId;
  contactId: Types.ObjectId;
  opportunityId?: Types.ObjectId;

  // Journey
  touchpoints: ITouchpoint[];
  journeyStartDate: Date;
  journeyEndDate?: Date; // When they converted/closed

  // Conversion
  converted: boolean;
  convertedAt?: Date;
  conversionValue?: number; // Deal value
  conversionType?: "lead" | "mql" | "sql" | "opportunity" | "customer";

  // Attribution Credits by Channel (aggregated)
  channelAttribution: {
    firstTouch: Record<TouchpointChannel, number>; // Revenue attributed
    lastTouch: Record<TouchpointChannel, number>;
    linear: Record<TouchpointChannel, number>;
    timeDecay: Record<TouchpointChannel, number>;
    uShaped: Record<TouchpointChannel, number>;
    wShaped: Record<TouchpointChannel, number>;
  };

  // Top channels (for quick access)
  firstTouchChannel?: TouchpointChannel;
  lastTouchChannel?: TouchpointChannel;
  primaryChannel?: TouchpointChannel; // Most influential channel (based on linear model)

  // Journey metrics
  totalTouchpoints: number;
  uniqueChannels: number;
  journeyDurationDays: number;
  avgTimeBetweenTouches?: number; // Hours

  createdAt: Date;
  updatedAt: Date;
}

const touchpointSchema = new Schema<ITouchpoint>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    channel: {
      type: String,
      enum: [
        "organic_search",
        "paid_search",
        "social",
        "email",
        "direct",
        "referral",
        "display",
        "affiliate",
        "video",
        "content",
        "webinar",
        "event",
        "cold_outreach",
        "phone",
        "chat",
        "other",
      ],
      required: true,
    },
    source: String,
    medium: String,
    campaign: String,
    content: String,
    term: String,
    page: String,
    eventType: String,
    metadata: Schema.Types.Mixed,

    // Attribution credits
    firstTouchCredit: Number,
    lastTouchCredit: Number,
    linearCredit: Number,
    timeDecayCredit: Number,
    uShapedCredit: Number,
    wShapedCredit: Number,
  },
  { _id: false }
);

const attributionSchema = new Schema<IAttribution>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      index: true,
    },

    // Journey
    touchpoints: [touchpointSchema],
    journeyStartDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    journeyEndDate: Date,

    // Conversion
    converted: {
      type: Boolean,
      default: false,
      index: true,
    },
    convertedAt: Date,
    conversionValue: {
      type: Number,
      min: 0,
    },
    conversionType: {
      type: String,
      enum: ["lead", "mql", "sql", "opportunity", "customer"],
    },

    // Attribution Credits
    channelAttribution: {
      firstTouch: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
      lastTouch: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
      linear: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
      timeDecay: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
      uShaped: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
      wShaped: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
    },

    // Top channels
    firstTouchChannel: String,
    lastTouchChannel: String,
    primaryChannel: String,

    // Metrics
    totalTouchpoints: {
      type: Number,
      default: 0,
    },
    uniqueChannels: {
      type: Number,
      default: 0,
    },
    journeyDurationDays: {
      type: Number,
      default: 0,
    },
    avgTimeBetweenTouches: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes
attributionSchema.index({ workspaceId: 1, contactId: 1 }, { unique: true });
attributionSchema.index({ workspaceId: 1, converted: 1 });
attributionSchema.index({ workspaceId: 1, convertedAt: -1 });
attributionSchema.index({ workspaceId: 1, firstTouchChannel: 1 });
attributionSchema.index({ workspaceId: 1, "touchpoints.channel": 1 });

const Attribution = mongoose.model<IAttribution>("Attribution", attributionSchema);

export default Attribution;
