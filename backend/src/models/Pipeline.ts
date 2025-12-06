import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStage {
  _id: Types.ObjectId;
  name: string;
  order: number;
  color: string;
}

export interface IPipeline extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;

  // Basic Information
  name: string;
  description?: string;

  // Stages
  stages: IStage[];

  // Settings
  isDefault: boolean; // One default pipeline per workspace
  isActive: boolean; // Soft delete flag

  createdAt: Date;
  updatedAt: Date;
}

const stageSchema = new Schema<IStage>(
  {
    name: {
      type: String,
      required: [true, "Stage name is required"],
      trim: true,
      maxlength: [50, "Stage name must be less than 50 characters"],
    },
    order: {
      type: Number,
      required: [true, "Stage order is required"],
      min: 0,
    },
    color: {
      type: String,
      required: [true, "Stage color is required"],
      match: [/^#[0-9A-Fa-f]{6}$/, "Please enter a valid hex color"],
    },
  },
  { _id: true }
);

const pipelineSchema = new Schema<IPipeline>(
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
      required: [true, "Pipeline name is required"],
      trim: true,
      maxlength: [100, "Pipeline name must be less than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be less than 500 characters"],
    },

    // Stages
    stages: {
      type: [stageSchema],
      validate: {
        validator: function (stages: IStage[]) {
          return stages.length >= 1 && stages.length <= 20;
        },
        message: "Pipeline must have between 1 and 20 stages",
      },
    },

    // Settings
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
pipelineSchema.index({ workspaceId: 1, isActive: 1, createdAt: -1 });
pipelineSchema.index({ workspaceId: 1, isDefault: 1 });

// Ensure only one default pipeline per workspace
pipelineSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    // Remove default flag from other pipelines in this workspace
    await mongoose.model("Pipeline").updateMany(
      {
        workspaceId: this.workspaceId,
        _id: { $ne: this._id },
        isDefault: true,
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

const Pipeline = mongoose.model<IPipeline>("Pipeline", pipelineSchema);

export default Pipeline;
