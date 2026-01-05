import mongoose, { Document, Schema, Types } from "mongoose";

export interface IContact extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  companyId?: Types.ObjectId; // Reference to Company

  // Basic Information
  firstName: string;
  lastName?: string;  // Optional - many contacts don't have last names
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;

  // Additional Details
  tags?: string[];
  source?: string; // Where did this contact come from? (e.g., "Website", "Referral", "Event")
  status?: "lead" | "prospect" | "customer" | "inactive" | "disqualified" | "nurture";

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

  // Custom Fields
  customFields?: Map<string, any>;

  // AI Copilot Data
  aiInsights?: {
    sentiment?: "positive" | "neutral" | "negative";
    engagementScore?: number; // 0-100
    recommendedActions?: string[];
    lastAnalyzedAt?: Date;
  };

  // Lead Qualification Data (separate from activity-based lead scoring)
  qualityScore?: number; // 0-100, based on fit (not activity)
  qualityGrade?: "A" | "B" | "C" | "D" | "F";
  qualified?: boolean;
  disqualificationReason?: string;
  qualifiedAt?: Date;

  // Behavioral Intent Scoring (buying signals)
  intentScore?: number; // Total intent score based on behavior
  intentUpdatedAt?: Date;

  // Additional location fields
  city?: string;
  state?: string;
  country?: string;

  // Apollo.io Enrichment Data
  apolloEnrichment?: {
    enrichedAt: Date;
    apolloId: string;
    confidence: number; // 0-1, how confident is the data
    dataSource: "apollo";
    fieldsEnriched: string[]; // ['email', 'phone', 'linkedin', etc.]
    creditsUsed: number;
  };

  // Email Verification (from Apollo or other providers)
  emailVerification?: {
    status: "valid" | "invalid" | "risky" | "unknown";
    verifiedAt: Date;
    provider: "apollo" | "zerobounce" | "other";
  };

  // Social Profiles (extended)
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };

  // Location (more structured than address)
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  // Title (using jobTitle for compatibility)
  title?: string;

  // Data Stewardship - Employment Tracking
  employmentStatus?: "active" | "left_company" | "unknown";
  lastVerifiedAt?: Date;
  previousCompany?: string;
  previousJobTitle?: string;
  linkedContactId?: Types.ObjectId; // Link to new contact after job change

  // Merge History (for deduplication)
  mergeHistory?: Array<{
    mergedContactId: Types.ObjectId;
    mergedAt: Date;
    mergedBy: Types.ObjectId; // User who performed the merge
    mergedData: any; // Snapshot of merged contact data
  }>;

  // Salesforce Sync
  salesforceId?: string; // Salesforce Contact ID
  salesforceSyncedAt?: Date; // Last time synced with Salesforce
  salesforceSyncStatus?: 'synced' | 'pending' | 'error' | 'conflict';
  salesforceSyncError?: string;

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
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
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
      trim: true,
      maxlength: [50, "Last name must be less than 50 characters"],
      default: "",
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
      enum: ["lead", "prospect", "customer", "inactive", "disqualified", "nurture"],
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
      engagementScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      recommendedActions: [{ type: String }],
      lastAnalyzedAt: { type: Date },
    },

    // Lead Qualification Data
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    qualityGrade: {
      type: String,
      enum: ["A", "B", "C", "D", "F"],
    },
    qualified: { type: Boolean },
    disqualificationReason: { type: String },
    qualifiedAt: { type: Date },

    // Behavioral Intent Scoring
    intentScore: {
      type: Number,
      min: 0,
      default: 0,
    },
    intentUpdatedAt: { type: Date },

    // Additional location fields
    city: { type: String },
    state: { type: String },
    country: { type: String },

    // Apollo.io Enrichment Data
    apolloEnrichment: {
      enrichedAt: { type: Date },
      apolloId: { type: String },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      dataSource: {
        type: String,
        enum: ["apollo"],
      },
      fieldsEnriched: [{ type: String }],
      creditsUsed: { type: Number },
    },

    // Email Verification
    emailVerification: {
      status: {
        type: String,
        enum: ["valid", "invalid", "risky", "unknown"],
      },
      verifiedAt: { type: Date },
      provider: {
        type: String,
        enum: ["apollo", "zerobounce", "other"],
      },
    },

    // Social Profiles (extended)
    socialProfiles: {
      linkedin: { type: String },
      twitter: { type: String },
      github: { type: String },
      facebook: { type: String },
    },

    // Location
    location: {
      city: { type: String },
      state: { type: String },
      country: { type: String },
    },

    // Title
    title: { type: String },

    // Data Stewardship - Employment Tracking
    employmentStatus: {
      type: String,
      enum: ["active", "left_company", "unknown"],
      default: "active",
    },
    lastVerifiedAt: { type: Date },
    previousCompany: { type: String },
    previousJobTitle: { type: String },
    linkedContactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
    },

    // Merge History (for deduplication)
    mergeHistory: [{
      mergedContactId: {
        type: Schema.Types.ObjectId,
        ref: "Contact",
        required: true,
      },
      mergedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      mergedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      mergedData: {
        type: Schema.Types.Mixed,
      },
    }],

    // Salesforce Sync
    salesforceId: {
      type: String,
      index: true,
      sparse: true,
    },
    salesforceSyncedAt: Date,
    salesforceSyncStatus: {
      type: String,
      enum: ['synced', 'pending', 'error', 'conflict'],
    },
    salesforceSyncError: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
contactSchema.index({ workspaceId: 1, createdAt: -1 });
contactSchema.index({ workspaceId: 1, status: 1 });
contactSchema.index({ workspaceId: 1, email: 1 }, { unique: true, sparse: true }); // Unique email per workspace
contactSchema.index({ workspaceId: 1, assignedTo: 1 });
contactSchema.index({ workspaceId: 1, companyId: 1 });

// Text index for search
contactSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  company: "text",
});

const Contact = mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
