import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAttachment extends Document {
  workspaceId: Types.ObjectId;
  opportunityId: Types.ObjectId;
  userId: Types.ObjectId; // uploader

  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  fileUrl: string; // storage URL

  // Metadata
  category?: "proposal" | "contract" | "presentation" | "other";
  description?: string;

  // AI
  aiExtractedText?: string; // for searchability
  aiSummary?: string;

  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Workspace ID is required"],
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      required: [true, "Opportunity ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: [255, "File name must be less than 255 characters"],
    },

    fileType: {
      type: String,
      required: [true, "File type is required"],
      trim: true,
    },

    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size must be positive"],
      max: [26214400, "File size must be less than 25MB"], // 25MB limit
    },

    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },

    // Metadata
    category: {
      type: String,
      enum: ["proposal", "contract", "presentation", "other"],
      default: "other",
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be less than 500 characters"],
    },

    // AI
    aiExtractedText: {
      type: String,
    },
    aiSummary: {
      type: String,
      maxlength: [1000, "AI summary must be less than 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
attachmentSchema.index({ workspaceId: 1, opportunityId: 1, createdAt: -1 });
attachmentSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });

const Attachment = mongoose.model<IAttachment>(
  "Attachment",
  attachmentSchema
);

export default Attachment;
