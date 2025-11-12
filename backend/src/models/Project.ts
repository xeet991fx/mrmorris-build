import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  onboardingCompleted: boolean;
  onboardingData: {
    business: {
      name?: string;
      description?: string;
      product?: string;
      problem?: string;
      audience?: string;
      region?: string;
      stage?: "Idea" | "Pre-launch" | "Launched but no revenue" | "Generating revenue" | "Scaling";
    };
    goals: {
      primary?: "Get early users / signups" | "Generate leads or demo calls" | "Drive website traffic" | "Increase sales" | "Build brand awareness";
      budget?: number;
      timeline?: "Within 2 weeks" | "Within 1 month" | "Long-term brand building";
    };
    channels: {
      preferred?: string[];
      tools?: string[];
      past_experience?: "Yes, but results were poor" | "Yes, some success" | "No, starting fresh";
    };
    brand: {
      tone?: "Professional" | "Friendly" | "Bold" | "Educational" | "Fun / Quirky" | "Other";
      perception?: string;
      unique_value?: string;
    };
    offer: {
      offer_type?: "Free trial" | "Free demo" | "Free resource / lead magnet" | "Direct purchase only";
      cta?: string;
      tracking_setup?: boolean;
    };
    competition: {
      competitors?: string[];
      inspiration?: string[];
    };
    advanced: {
      uploads?: string[];
      business_type?: "B2B" | "B2C" | "Both";
      automation_level?: "Fully automated" | "Notify before changes" | "Ask every time";
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true, // Index for fast queries by userId
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [3, "Project name must be at least 3 characters"],
      maxlength: [100, "Project name must be less than 100 characters"],
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingData: {
      business: {
        name: { type: String },
        description: { type: String },
        product: { type: String },
        problem: { type: String },
        audience: { type: String },
        region: { type: String },
        stage: {
          type: String,
          enum: [
            "Idea",
            "Pre-launch",
            "Launched but no revenue",
            "Generating revenue",
            "Scaling",
          ],
        },
      },
      goals: {
        primary: {
          type: String,
          enum: [
            "Get early users / signups",
            "Generate leads or demo calls",
            "Drive website traffic",
            "Increase sales",
            "Build brand awareness",
          ],
        },
        budget: { type: Number },
        timeline: {
          type: String,
          enum: [
            "Within 2 weeks",
            "Within 1 month",
            "Long-term brand building",
          ],
        },
      },
      channels: {
        preferred: [{ type: String }],
        tools: [{ type: String }],
        past_experience: {
          type: String,
          enum: [
            "Yes, but results were poor",
            "Yes, some success",
            "No, starting fresh",
          ],
        },
      },
      brand: {
        tone: {
          type: String,
          enum: [
            "Professional",
            "Friendly",
            "Bold",
            "Educational",
            "Fun / Quirky",
            "Other",
          ],
        },
        perception: { type: String },
        unique_value: { type: String },
      },
      offer: {
        offer_type: {
          type: String,
          enum: [
            "Free trial",
            "Free demo",
            "Free resource / lead magnet",
            "Direct purchase only",
          ],
        },
        cta: { type: String },
        tracking_setup: { type: Boolean },
      },
      competition: {
        competitors: [{ type: String }],
        inspiration: [{ type: String }],
      },
      advanced: {
        uploads: [{ type: String }],
        business_type: {
          type: String,
          enum: ["B2B", "B2C", "Both"],
        },
        automation_level: {
          type: String,
          enum: [
            "Fully automated",
            "Notify before changes",
            "Ask every time",
          ],
        },
      },
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// Indexes for performance
projectSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's projects sorted by creation date
projectSchema.index({ createdAt: -1 }); // Index for general sorting

const Project = mongoose.model<IProject>("Project", projectSchema);

export default Project;
