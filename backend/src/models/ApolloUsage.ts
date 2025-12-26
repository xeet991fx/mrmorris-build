import mongoose, { Document, Schema, Types } from "mongoose";

export interface IApolloUsage extends Document {
  workspaceId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  action:
    | "enrich_contact"
    | "enrich_company"
    | "search"
    | "verify_email"
    | "bulk_enrich"
    | "import";
  creditsUsed: number;
  success: boolean;
  entityId?: string; // Contact or Company ID
  error?: string;
  timestamp: Date;
  responseTime?: number; // in milliseconds
  metadata?: {
    searchCriteria?: any;
    resultsCount?: number;
    fieldsEnriched?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const apolloUsageSchema = new Schema<IApolloUsage>(
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
    action: {
      type: String,
      enum: [
        "enrich_contact",
        "enrich_company",
        "search",
        "verify_email",
        "bulk_enrich",
        "import",
      ],
      required: [true, "Action is required"],
      index: true,
    },
    creditsUsed: {
      type: Number,
      required: [true, "Credits used is required"],
      min: [0, "Credits used cannot be negative"],
    },
    success: {
      type: Boolean,
      required: [true, "Success status is required"],
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    error: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      // index: true, // Removed - covered by compound indexes below (lines 97-100)
    },
    responseTime: {
      type: Number,
      min: [0, "Response time cannot be negative"],
    },
    metadata: {
      searchCriteria: {
        type: Schema.Types.Mixed,
      },
      resultsCount: {
        type: Number,
      },
      fieldsEnriched: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
apolloUsageSchema.index({ workspaceId: 1, timestamp: -1 });
apolloUsageSchema.index({ workspaceId: 1, action: 1, timestamp: -1 });
apolloUsageSchema.index({ workspaceId: 1, userId: 1, timestamp: -1 });
apolloUsageSchema.index({ workspaceId: 1, success: 1, timestamp: -1 });

// Index for credit usage aggregation
apolloUsageSchema.index({ workspaceId: 1, success: 1, creditsUsed: 1 });

const ApolloUsage = mongoose.model<IApolloUsage>(
  "ApolloUsage",
  apolloUsageSchema
);

export default ApolloUsage;
