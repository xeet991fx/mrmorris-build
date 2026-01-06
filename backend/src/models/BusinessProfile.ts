/**
 * Business Profile Model
 * Stores detailed business information collected during onboarding
 * Used throughout the app for personalization, targeting, and automation
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IBusinessProfile extends Document {
  workspace: mongoose.Types.ObjectId;

  // Core Business Info
  industry: string;
  industrySpecific?: string; // For "other" industry
  companySize: string;
  companyName?: string;
  website?: string;

  // Sales & Marketing
  salesCycle: string;
  averageDealSize?: string;
  monthlyLeadVolume?: string;
  primaryGoal: string;
  salesModel: string; // B2B, B2C, B2B2C

  // Team Structure
  teamSize: string;
  roles?: string[]; // e.g., ["sales", "marketing", "support"]

  // Customer Profile
  targetAudience?: {
    jobTitles?: string[];
    industries?: string[];
    companySize?: string[];
    geography?: string[];
  };

  // Pain Points & Goals
  painPoints?: string[];
  keyMetrics?: string[];

  // Channel Preferences
  channels?: {
    email?: boolean;
    phone?: boolean;
    social?: boolean;
    ads?: boolean;
    content?: boolean;
    events?: boolean;
  };

  // Lead Sources
  leadSources?: string[];

  // Customization
  customFields?: {
    [key: string]: any;
  };

  // Metadata
  completedAt?: Date;
  lastUpdated: Date;
  version: number;
}

const BusinessProfileSchema = new Schema<IBusinessProfile>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      unique: true,
      index: true,
    },

    // Core Business Info
    industry: {
      type: String,
      required: true,
      enum: [
        "saas",
        "real_estate",
        "recruiting",
        "consulting",
        "ecommerce",
        "financial",
        "healthcare",
        "manufacturing",
        "education",
        "nonprofit",
        "other",
      ],
    },
    industrySpecific: String,
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    companyName: String,
    website: String,

    // Sales & Marketing
    salesCycle: {
      type: String,
      required: true,
      enum: ["short", "medium", "long", "very_long"],
    },
    averageDealSize: {
      type: String,
      enum: ["<1k", "1k-10k", "10k-50k", "50k-100k", "100k+"],
    },
    monthlyLeadVolume: {
      type: String,
      enum: ["<10", "10-50", "50-100", "100-500", "500+"],
    },
    primaryGoal: {
      type: String,
      required: true,
      enum: [
        "generate_leads",
        "close_deals",
        "nurture_relationships",
        "automate_processes",
        "improve_conversion",
        "scale_operations",
      ],
    },
    salesModel: {
      type: String,
      enum: ["b2b", "b2c", "b2b2c", "marketplace"],
    },

    // Team Structure
    teamSize: {
      type: String,
      required: true,
      enum: ["solo", "small", "medium", "large"],
    },
    roles: [String],

    // Customer Profile
    targetAudience: {
      jobTitles: [String],
      industries: [String],
      companySize: [String],
      geography: [String],
    },

    // Pain Points & Goals
    painPoints: [String],
    keyMetrics: [String],

    // Channel Preferences
    channels: {
      email: Boolean,
      phone: Boolean,
      social: Boolean,
      ads: Boolean,
      content: Boolean,
      events: Boolean,
    },

    // Lead Sources
    leadSources: [String],

    // Customization
    customFields: Schema.Types.Mixed,

    // Metadata
    completedAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BusinessProfileSchema.index({ workspace: 1 });

// Update lastUpdated on save
BusinessProfileSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model<IBusinessProfile>("BusinessProfile", BusinessProfileSchema);
