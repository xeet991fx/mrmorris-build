import mongoose, { Document, Schema, Types } from "mongoose";

export interface IContact extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;

  // Basic Information
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;

  // Additional Details
  tags?: string[];
  source?: string; // Where did this contact come from? (e.g., "Website", "Referral", "Event")
  status?: "lead" | "prospect" | "customer" | "inactive";

  // Social/Communication
  linkedin?: string;
  twitter?: string;
  website?: string;

  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  // CRM Specific
  assignedTo?: Types.ObjectId; // User ID of assigned team member
  lastContactedAt?: Date;
  notes?: string;

  // AI Copilot Data
  aiInsights?: {
    sentiment?: "positive" | "neutral" | "negative";
    engagementScore?: number; // 0-100
    recommendedActions?: string[];
    lastAnalyzedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
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
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name must be less than 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name must be less than 50 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      sparse: true, // Allow multiple null values but unique non-null values
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name must be less than 100 characters"],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Job title must be less than 100 characters"],
    },

    // Additional Details
    tags: [{ type: String }],
    source: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["lead", "prospect", "customer", "inactive"],
      default: "lead",
    },

    // Social/Communication
    linkedin: { type: String },
    twitter: { type: String },
    website: { type: String },

    // Address
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },

    // CRM Specific
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastContactedAt: { type: Date },
    notes: { type: String },

    // AI Copilot Data
    aiInsights: {
      sentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
      },
      engagementScore: {
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
contactSchema.index({ workspaceId: 1, createdAt: -1 });
contactSchema.index({ workspaceId: 1, status: 1 });
contactSchema.index({ workspaceId: 1, email: 1 });
contactSchema.index({ workspaceId: 1, assignedTo: 1 });

// Text index for search
contactSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  company: "text",
});

const Contact = mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
