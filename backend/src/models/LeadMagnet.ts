import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Lead Magnet Model
 *
 * Manages gated content library (ebooks, whitepapers, templates, etc.)
 * Content drives 70% of B2B leads
 */

export type MagnetType =
  | "ebook"
  | "whitepaper"
  | "template"
  | "checklist"
  | "guide"
  | "case_study"
  | "report"
  | "webinar"
  | "video"
  | "tool"
  | "other";

export interface ILeadMagnet extends Document {
  workspaceId: Types.ObjectId;

  // Content Info
  title: string;
  description: string;
  type: MagnetType;
  coverImageUrl?: string;
  fileUrl?: string; // S3/storage URL
  fileName?: string;
  fileSize?: number; // bytes
  fileType?: string; // PDF, DOCX, etc.

  // Gating
  isGated: boolean; // Requires form submission
  formId?: Types.ObjectId; // Form to display
  requiredFields?: string[]; // email, phone, company, etc.

  // Delivery
  deliveryMethod: "instant_download" | "email" | "both";
  emailTemplateId?: Types.ObjectId;
  thankYouPageUrl?: string;

  // Analytics
  views: number;
  downloads: number;
  conversionRate: number; // views -> downloads
  averageReadTime?: number; // minutes (for PDFs/videos)

  // SEO & Discovery
  slug: string; // URL-friendly
  tags?: string[];
  category?: string;
  keywords?: string[];

  // Status
  status: "draft" | "published" | "archived";
  publishedAt?: Date;

  // Access Control
  isPublic: boolean; // Public or require login
  allowedDomains?: string[]; // Email domain restrictions

  createdAt: Date;
  updatedAt: Date;
}

const leadMagnetSchema = new Schema<ILeadMagnet>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: [
        "ebook",
        "whitepaper",
        "template",
        "checklist",
        "guide",
        "case_study",
        "report",
        "webinar",
        "video",
        "tool",
        "other",
      ],
      required: true,
    },
    coverImageUrl: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileType: String,

    // Gating
    isGated: {
      type: Boolean,
      default: true,
    },
    formId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
    },
    requiredFields: [String],

    // Delivery
    deliveryMethod: {
      type: String,
      enum: ["instant_download", "email", "both"],
      default: "instant_download",
    },
    emailTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "EmailTemplate",
    },
    thankYouPageUrl: String,

    // Analytics
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    downloads: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    averageReadTime: Number,

    // SEO
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    tags: [String],
    category: String,
    keywords: [String],

    // Status
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: Date,

    // Access
    isPublic: {
      type: Boolean,
      default: true,
    },
    allowedDomains: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
leadMagnetSchema.index({ workspaceId: 1, status: 1 });
leadMagnetSchema.index({ workspaceId: 1, type: 1 });
leadMagnetSchema.index({ slug: 1 }, { unique: true });
leadMagnetSchema.index({ workspaceId: 1, downloads: -1 }); // Top performers

// Update conversion rate before save
leadMagnetSchema.pre("save", function (next) {
  if (this.views > 0) {
    this.conversionRate = (this.downloads / this.views) * 100;
  }
  next();
});

// Static methods
leadMagnetSchema.statics.getTopPerformers = async function (
  workspaceId: Types.ObjectId,
  limit: number = 10
) {
  return this.find({
    workspaceId,
    status: "published",
  })
    .sort({ downloads: -1 })
    .limit(limit);
};

leadMagnetSchema.statics.getAnalytics = async function (workspaceId: Types.ObjectId) {
  const results = await this.aggregate([
    { $match: { workspaceId, status: "published" } },
    {
      $group: {
        _id: "$type",
        totalViews: { $sum: "$views" },
        totalDownloads: { $sum: "$downloads" },
        avgConversionRate: { $avg: "$conversionRate" },
        count: { $sum: 1 },
      },
    },
  ]);

  const total = await this.countDocuments({ workspaceId, status: "published" });
  const totalViews = results.reduce((sum, r) => sum + r.totalViews, 0);
  const totalDownloads = results.reduce((sum, r) => sum + r.totalDownloads, 0);

  return {
    total,
    totalViews,
    totalDownloads,
    overallConversionRate: totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0,
    byType: results,
  };
};

const LeadMagnet = mongoose.model<ILeadMagnet>("LeadMagnet", leadMagnetSchema);

export default LeadMagnet;
