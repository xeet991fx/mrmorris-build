import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Lifecycle Stage Definitions:
 *
 * 1. Subscriber - Opted in, minimal engagement
 * 2. Lead - Showed initial interest (form fill, content download)
 * 3. MQL (Marketing Qualified Lead) - Met marketing criteria (scoring threshold, engagement level)
 * 4. SQL (Sales Qualified Lead) - Sales team accepted, meets BANT criteria
 * 5. SAL (Sales Accepted Lead) - Sales actively working, in discovery/demo
 * 6. Opportunity - Deal in pipeline with potential value
 * 7. Customer - Closed won, paying customer
 * 8. Evangelist - Promoter, referral source, high NPS
 * 9. Churned - Former customer, no longer active
 * 10. Disqualified - Doesn't meet ICP, not a good fit
 */

export type LifecycleStage =
  | "subscriber"
  | "lead"
  | "mql"
  | "sql"
  | "sal"
  | "opportunity"
  | "customer"
  | "evangelist"
  | "churned"
  | "disqualified";

export interface IContactLifecycleHistory extends Document {
  contactId: Types.ObjectId;
  workspaceId: Types.ObjectId;

  // Current Stage
  currentStage: LifecycleStage;
  currentStageEnteredAt: Date;

  // Previous Stage
  previousStage?: LifecycleStage;
  previousStageExitedAt?: Date;

  // Transition Details
  transitionedFrom?: LifecycleStage;
  transitionedTo: LifecycleStage;
  transitionedAt: Date;
  transitionedBy?: Types.ObjectId; // User who triggered (manual) or null (automated)
  transitionReason?: string; // Why this transition happened
  transitionMethod: "manual" | "automated" | "workflow" | "api" | "import";

  // SLA Tracking
  slaTarget?: number; // Expected time in stage (hours)
  slaStatus?: "on_track" | "at_risk" | "breached";
  timeInStage?: number; // Actual time spent (hours)
  slaBreachedAt?: Date;

  // Metadata
  metadata?: {
    score?: number; // Lead score at transition
    intentScore?: number; // Intent score at transition
    qualityGrade?: string; // Quality grade at transition
    triggeredBy?: string; // Workflow name, rule name, etc.
    automationId?: Types.ObjectId; // Reference to workflow/automation
    notes?: string;
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

const contactLifecycleHistorySchema = new Schema<IContactLifecycleHistory>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // Current Stage
    currentStage: {
      type: String,
      enum: [
        "subscriber",
        "lead",
        "mql",
        "sql",
        "sal",
        "opportunity",
        "customer",
        "evangelist",
        "churned",
        "disqualified",
      ],
      required: true,
      index: true,
    },
    currentStageEnteredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Previous Stage
    previousStage: {
      type: String,
      enum: [
        "subscriber",
        "lead",
        "mql",
        "sql",
        "sal",
        "opportunity",
        "customer",
        "evangelist",
        "churned",
        "disqualified",
      ],
    },
    previousStageExitedAt: {
      type: Date,
    },

    // Transition Details
    transitionedFrom: {
      type: String,
      enum: [
        "subscriber",
        "lead",
        "mql",
        "sql",
        "sal",
        "opportunity",
        "customer",
        "evangelist",
        "churned",
        "disqualified",
      ],
    },
    transitionedTo: {
      type: String,
      enum: [
        "subscriber",
        "lead",
        "mql",
        "sql",
        "sal",
        "opportunity",
        "customer",
        "evangelist",
        "churned",
        "disqualified",
      ],
      required: true,
    },
    transitionedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    transitionedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transitionReason: {
      type: String,
      maxlength: 500,
    },
    transitionMethod: {
      type: String,
      enum: ["manual", "automated", "workflow", "api", "import"],
      required: true,
      default: "automated",
    },

    // SLA Tracking
    slaTarget: {
      type: Number, // Hours
      min: 0,
    },
    slaStatus: {
      type: String,
      enum: ["on_track", "at_risk", "breached"],
      default: "on_track",
    },
    timeInStage: {
      type: Number, // Hours
      min: 0,
    },
    slaBreachedAt: {
      type: Date,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes
contactLifecycleHistorySchema.index({ contactId: 1, transitionedAt: -1 });
contactLifecycleHistorySchema.index({ workspaceId: 1, currentStage: 1 });
contactLifecycleHistorySchema.index({ workspaceId: 1, transitionedAt: -1 });
contactLifecycleHistorySchema.index({ workspaceId: 1, slaStatus: 1 });

// Get most recent lifecycle record for a contact
contactLifecycleHistorySchema.statics.getCurrentStage = async function (
  contactId: Types.ObjectId
) {
  return this.findOne({ contactId }).sort({ transitionedAt: -1 }).limit(1);
};

// Get full lifecycle history for a contact
contactLifecycleHistorySchema.statics.getHistory = async function (
  contactId: Types.ObjectId
) {
  return this.find({ contactId }).sort({ transitionedAt: 1 });
};

// Get contacts in specific stage with SLA status
contactLifecycleHistorySchema.statics.getContactsByStage = async function (
  workspaceId: Types.ObjectId,
  stage: LifecycleStage,
  slaStatus?: "on_track" | "at_risk" | "breached"
) {
  const query: any = {
    workspaceId,
    currentStage: stage,
  };

  if (slaStatus) {
    query.slaStatus = slaStatus;
  }

  return this.find(query).sort({ currentStageEnteredAt: 1 });
};

// Auto-sync Contact.lifecycleStage when lifecycle history changes (fixes A2)
contactLifecycleHistorySchema.post("save", async function (doc) {
  try {
    const Contact = mongoose.model("Contact");
    await Contact.findByIdAndUpdate(doc.contactId, {
      lifecycleStage: doc.currentStage,
      lifecycleStageUpdatedAt: doc.currentStageEnteredAt,
      previousLifecycleStage: doc.previousStage,
    });
  } catch (error) {
    console.error("Failed to sync Contact lifecycleStage:", error);
  }
});

const ContactLifecycleHistory = mongoose.model<IContactLifecycleHistory>(
  "ContactLifecycleHistory",
  contactLifecycleHistorySchema
);

export default ContactLifecycleHistory;
