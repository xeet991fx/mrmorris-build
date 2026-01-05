import mongoose, { Schema, Document, Types } from "mongoose";

// Industry-specific, conversion-optimized form templates
export interface IFormTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  industry: "saas" | "b2b" | "ecommerce" | "consulting" | "agency" | "finance" | "healthcare" | "education" | "real_estate" | "general";
  useCase: "demo_request" | "trial_signup" | "contact_sales" | "pricing_inquiry" | "consultation" | "newsletter" | "content_download" | "event_registration" | "quote_request" | "partnership";

  // Conversion metrics (industry benchmarks)
  averageConversionRate: number; // e.g., 0.18 for 18%
  benchmark: "low" | "average" | "high" | "exceptional"; // Based on industry data

  // Template metadata
  complexity: "simple" | "moderate" | "advanced";
  estimatedCompletionTime: number; // seconds
  recommendedFor: string[]; // ["SaaS startups", "B2B sales teams", etc.]

  // Best practices guidance
  strategy: {
    goal: string; // "Qualify leads before demo"
    whenToUse: string; // "When you need to pre-qualify enterprise buyers"
    conversionTips: string[]; // Array of actionable tips
    commonMistakes: string[]; // What to avoid
  };

  // Form configuration (matches Form model structure)
  fields: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    helpText?: string; // Best practice guidance for this field
    qualificationWeight?: number; // How much this field contributes to lead score
    example?: string; // Example answer
    mapping?: string; // CRM field mapping
    options?: Array<{ label: string; value: string }>;
    validation?: any;
    conditionalLogic?: any;
  }>;

  // Multi-step configuration
  isMultiStep: boolean;
  steps?: Array<{
    name: string;
    description: string;
    fields: string[]; // field IDs
    strategy: string; // Why this step exists
  }>;

  // Success configuration
  submitButtonText: string;
  successMessage: string;
  successStrategy: string; // Best practice for post-submit experience

  // Follow-up recommendations
  recommendedFollowup: {
    emailTemplate?: string;
    suggestedSLA: number; // hours
    qualificationRules: Array<{
      condition: string;
      action: string;
      reason: string;
    }>;
  };

  // Template metadata
  createdBy: "system" | "community" | "custom";
  usageCount: number;
  rating: number;
  featured: boolean;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const FormTemplateSchema = new Schema<IFormTemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    industry: {
      type: String,
      enum: ["saas", "b2b", "ecommerce", "consulting", "agency", "finance", "healthcare", "education", "real_estate", "general"],
      required: true,
      index: true,
    },
    useCase: {
      type: String,
      enum: ["demo_request", "trial_signup", "contact_sales", "pricing_inquiry", "consultation", "newsletter", "content_download", "event_registration", "quote_request", "partnership"],
      required: true,
      index: true,
    },

    averageConversionRate: { type: Number, required: true },
    benchmark: {
      type: String,
      enum: ["low", "average", "high", "exceptional"],
      required: true,
    },

    complexity: {
      type: String,
      enum: ["simple", "moderate", "advanced"],
      required: true,
    },
    estimatedCompletionTime: { type: Number, required: true },
    recommendedFor: [{ type: String }],

    strategy: {
      goal: { type: String, required: true },
      whenToUse: { type: String, required: true },
      conversionTips: [{ type: String }],
      commonMistakes: [{ type: String }],
    },

    fields: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        label: { type: String, required: true },
        placeholder: String,
        required: { type: Boolean, default: false },
        helpText: String,
        qualificationWeight: Number,
        example: String,
        mapping: String,
        options: [
          {
            label: String,
            value: String,
          },
        ],
        validation: Schema.Types.Mixed,
        conditionalLogic: Schema.Types.Mixed,
      },
    ],

    isMultiStep: { type: Boolean, default: false },
    steps: [
      {
        name: { type: String },
        description: { type: String },
        fields: [{ type: String }],
        strategy: { type: String },
      },
    ],

    submitButtonText: { type: String, required: true },
    successMessage: { type: String, required: true },
    successStrategy: { type: String },

    recommendedFollowup: {
      emailTemplate: String,
      suggestedSLA: Number,
      qualificationRules: [
        {
          condition: String,
          action: String,
          reason: String,
        },
      ],
    },

    createdBy: {
      type: String,
      enum: ["system", "community", "custom"],
      default: "system",
    },
    usageCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    featured: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes for efficient querying
FormTemplateSchema.index({ industry: 1, useCase: 1 });
FormTemplateSchema.index({ featured: 1, rating: -1 });
FormTemplateSchema.index({ tags: 1 });
FormTemplateSchema.index({ benchmark: 1 });

// Static method to get templates by industry
FormTemplateSchema.statics.getByIndustry = function (industry: string) {
  return this.find({ industry }).sort({ featured: -1, rating: -1 });
};

// Static method to get templates by use case
FormTemplateSchema.statics.getByUseCase = function (useCase: string) {
  return this.find({ useCase }).sort({ featured: -1, rating: -1 });
};

// Increment usage count
FormTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  return this.save();
};

export default mongoose.model<IFormTemplate>("FormTemplate", FormTemplateSchema);
