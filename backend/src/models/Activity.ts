import mongoose, { Document, Schema, Types } from "mongoose";

export interface IActivity extends Document {
  workspaceId: Types.ObjectId;
  userId?: Types.ObjectId; // who performed the action (optional for automated workflows)
  opportunityId?: Types.ObjectId; // optional - can be contact or company activity

  // Entity linking (polymorphic)
  entityType?: "contact" | "deal" | "company" | "opportunity";
  entityId?: Types.ObjectId;

  type:
    | "email"
    | "call"
    | "meeting"
    | "note"
    | "stage_change"
    | "file_upload"
    | "task"
    | "ai_suggestion"
    | "workflow_action"; // New type for workflow-generated activities

  title: string; // "Called John Smith"
  description?: string; // Call notes

  // Communication-specific
  direction?: "inbound" | "outbound"; // for emails/calls
  duration?: number; // for calls (seconds)
  emailSubject?: string;
  emailBody?: string; // store for AI analysis

  // Task-specific
  dueDate?: Date;
  completed?: boolean;
  assigneeId?: Types.ObjectId; // Task assignee

  // File-specific
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;

  // Workflow context
  workflowId?: Types.ObjectId;
  workflowEnrollmentId?: Types.ObjectId;
  workflowStepId?: string;
  automated?: boolean; // True if created by workflow

  // Metadata
  metadata?: {
    fromStage?: string;
    toStage?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any; // Allow additional metadata
  };

  // AI
  isAutoLogged?: boolean; // AI-generated
  aiConfidence?: number; // 0-100

  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
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
      required: false, // Optional for workflow automation
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      required: false, // Optional - can link to other entities
      // index: true, // Removed - covered by compound index below
    },

    // Entity linking (polymorphic)
    entityType: {
      type: String,
      enum: ["contact", "deal", "company", "opportunity"],
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "email",
        "call",
        "meeting",
        "note",
        "stage_change",
        "file_upload",
        "task",
        "ai_suggestion",
        "workflow_action",
      ],
      required: [true, "Activity type is required"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be less than 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description must be less than 5000 characters"],
    },

    // Communication-specific
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
    },
    duration: {
      type: Number, // seconds
      min: 0,
    },
    emailSubject: {
      type: String,
      trim: true,
      maxlength: [300, "Email subject must be less than 300 characters"],
    },
    emailBody: {
      type: String,
      maxlength: [10000, "Email body must be less than 10000 characters"],
    },

    // Task-specific
    dueDate: {
      type: Date,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Workflow context
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: "Workflow",
      index: true,
    },
    workflowEnrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowEnrollment",
      index: true,
    },
    workflowStepId: {
      type: String,
    },
    automated: {
      type: Boolean,
      default: false,
      index: true,
    },

    // File-specific
    fileUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: 0,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },

    // AI
    isAutoLogged: {
      type: Boolean,
      default: false,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
activitySchema.index({ workspaceId: 1, opportunityId: 1, createdAt: -1 }); // Timeline view
activitySchema.index({ workspaceId: 1, type: 1, createdAt: -1 }); // Filter by type
activitySchema.index({ workspaceId: 1, userId: 1, createdAt: -1 }); // My activities
activitySchema.index({ workspaceId: 1, entityType: 1, entityId: 1, createdAt: -1 }); // Entity timeline
activitySchema.index({ workspaceId: 1, workflowId: 1, createdAt: -1 }); // Workflow activities
activitySchema.index({ workspaceId: 1, automated: 1, createdAt: -1 }); // Automated vs manual

const Activity = mongoose.model<IActivity>("Activity", activitySchema);

export default Activity;
