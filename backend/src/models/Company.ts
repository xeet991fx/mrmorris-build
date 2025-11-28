import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICompany extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;

  // Basic Information
  name: string;
  industry?: string;
  website?: string;
  phone?: string;

  // Company Metrics
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  annualRevenue?: number;
  employeeCount?: number;

  // Social Links
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;

  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  // CRM Specific
  status: "lead" | "prospect" | "customer" | "churned";
  tags?: string[];
  source?: string;
  assignedTo?: Types.ObjectId;
  lastContactedAt?: Date;
  notes?: string;

  // Custom Fields
  customFields?: Map<string, any>;

  // AI Copilot Data
  aiInsights?: {
    sentiment?: "positive" | "neutral" | "negative";
    healthScore?: number; // 0-100
    recommendedActions?: string[];
    lastAnalyzedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Workspace ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    // Basic Information
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Company name must be less than 200 characters"],
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [100, "Industry must be less than 100 characters"],
    },
    website: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },

    // Company Metrics
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    },
    annualRevenue: {
      type: Number,
      min: [0, "Annual revenue cannot be negative"],
    },
    employeeCount: {
      type: Number,
      min: [0, "Employee count cannot be negative"],
    },

    // Social Links
    linkedinUrl: { type: String },
    twitterUrl: { type: String },
    facebookUrl: { type: String },

    // Address
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },

    // CRM Specific
    status: {
      type: String,
      enum: ["lead", "prospect", "customer", "churned"],
      default: "lead",
    },
    tags: [{ type: String }],
    source: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastContactedAt: { type: Date },
    notes: { type: String },

    // Custom Fields
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },

    // AI Copilot Data
    aiInsights: {
      sentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
      },
      healthScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      recommendedActions: [{ type: String }],
      lastAnalyzedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
companySchema.index({ workspaceId: 1, createdAt: -1 });
companySchema.index({ workspaceId: 1, status: 1 });
companySchema.index({ workspaceId: 1, name: 1 });
companySchema.index({ workspaceId: 1, assignedTo: 1 });

// Text index for search
companySchema.index({
  name: "text",
  industry: "text",
  website: "text",
});

const Company = mongoose.model<ICompany>("Company", companySchema);

export default Company;
