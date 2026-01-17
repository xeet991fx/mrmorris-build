import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStageHistory {
  stageId: Types.ObjectId;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  duration?: number; // Duration in milliseconds
}

export interface IOpportunity extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  pipelineId: Types.ObjectId;
  stageId: Types.ObjectId;

  // Core Information
  title: string;
  value: number;
  currency: string;
  probability?: number; // 0-100
  expectedCloseDate?: Date;
  actualCloseDate?: Date;

  // Relationships
  contactId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  associatedContacts?: Types.ObjectId[];

  // Details
  description?: string;
  source?: string;
  status: "open" | "won" | "lost" | "abandoned";
  lostReason?: string;

  // Assignment & Tracking
  assignedTo?: Types.ObjectId;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  lastActivityAt?: Date;

  // Next Action & Temperature
  nextAction?: string;
  nextActionDueDate?: Date;
  dealTemperature?: "hot" | "warm" | "cold";

  // Activity Counts
  activityCount?: number;
  emailCount?: number;
  callCount?: number;
  meetingCount?: number;

  // Stage History
  stageHistory: IStageHistory[];

  // Custom Fields
  customFields?: Map<string, any>;

  // AI Insights
  aiInsights?: {
    dealScore?: number; // 0-100
    closeProbability?: number; // AI-calculated close probability
    recommendedActions?: string[];
    riskFactors?: string[];
    lastAnalyzedAt?: Date;
    confidenceLevel?: number; // 0-100 AI confidence
  };

  // Salesforce Sync
  salesforceId?: string; // Salesforce Opportunity ID
  salesforceSyncedAt?: Date;
  salesforceSyncStatus?: 'synced' | 'pending' | 'error' | 'conflict';
  salesforceSyncError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const stageHistorySchema = new Schema<IStageHistory>(
  {
    stageId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    stageName: {
      type: String,
      required: true,
    },
    enteredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    exitedAt: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },
  },
  { _id: false }
);

const opportunitySchema = new Schema<IOpportunity>(
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
    pipelineId: {
      type: Schema.Types.ObjectId,
      ref: "Pipeline",
      required: [true, "Pipeline ID is required"],
      index: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      required: [true, "Stage ID is required"],
      index: true,
    },

    // Core Information
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be less than 200 characters"],
    },
    value: {
      type: Number,
      required: [true, "Value is required"],
      min: [0, "Value must be a positive number"],
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      maxlength: [3, "Currency code must be 3 characters"],
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
    },
    expectedCloseDate: {
      type: Date,
    },
    actualCloseDate: {
      type: Date,
    },

    // Relationships
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    associatedContacts: [{
      type: Schema.Types.ObjectId,
      ref: "Contact",
    }],

    // Details
    description: {
      type: String,
      maxlength: [2000, "Description must be less than 2000 characters"],
    },
    source: {
      type: String,
      trim: true,
      maxlength: [100, "Source must be less than 100 characters"],
    },
    status: {
      type: String,
      enum: ["open", "won", "lost", "abandoned"],
      default: "open",
    },
    lostReason: {
      type: String,
      maxlength: [500, "Lost reason must be less than 500 characters"],
    },

    // Assignment & Tracking
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    tags: [{ type: String }],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    lastActivityAt: {
      type: Date,
    },

    // Next Action & Temperature
    nextAction: {
      type: String,
      trim: true,
      maxlength: [200, "Next action must be less than 200 characters"],
    },
    nextActionDueDate: {
      type: Date,
    },
    dealTemperature: {
      type: String,
      enum: ["hot", "warm", "cold"],
    },

    // Activity Counts
    activityCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    emailCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    callCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    meetingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Stage History
    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },

    // Custom Fields
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },

    // AI Insights
    aiInsights: {
      dealScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      closeProbability: {
        type: Number,
        min: 0,
        max: 100,
      },
      recommendedActions: [{ type: String }],
      riskFactors: [{ type: String }],
      lastAnalyzedAt: { type: Date },
      confidenceLevel: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

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
opportunitySchema.index({ workspaceId: 1, pipelineId: 1, stageId: 1 });
opportunitySchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
opportunitySchema.index({ workspaceId: 1, assignedTo: 1 });
opportunitySchema.index({ workspaceId: 1, createdAt: -1 });
opportunitySchema.index({ workspaceId: 1, lastActivityAt: -1 }); // For stale deals
opportunitySchema.index({ workspaceId: 1, dealTemperature: 1 }); // For filtering by temperature

// Text index for search
opportunitySchema.index({
  title: "text",
  description: "text",
});

// Update lastActivityAt only when activity-related fields change
opportunitySchema.pre("save", function (next) {
  if (!this.isNew) {
    // Only update lastActivityAt for activity-related changes
    const activityFields = [
      'activityCount', 'emailCount', 'callCount', 'meetingCount',
      'stageId', 'status', 'nextAction', 'nextActionDueDate'
    ];

    const hasActivityChange = activityFields.some(field => this.isModified(field));

    if (hasActivityChange) {
      this.lastActivityAt = new Date();
    }
  }
  next();
});

const Opportunity = mongoose.model<IOpportunity>(
  "Opportunity",
  opportunitySchema
);

export default Opportunity;
