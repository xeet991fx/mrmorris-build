import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  timezone: string; // e.g., 'America/New_York', 'UTC'
  allowedDomains: string[]; // Whitelist of domains allowed to track for this project
  trackingEnabled: boolean; // Master switch to enable/disable tracking
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
    timezone: {
      type: String,
      default: "UTC",
      trim: true,
    },
    allowedDomains: {
      type: [String],
      default: [], // Empty array = allow all domains (backward compatible)
      validate: {
        validator: function(domains: string[]) {
          // Validate domain format (e.g., "example.com" or "*.example.com")
          const domainRegex = /^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
          return domains.every(domain => domainRegex.test(domain) || domain === '*');
        },
        message: 'Invalid domain format. Use "example.com" or "*.example.com"'
      }
    },
    trackingEnabled: {
      type: Boolean,
      default: true, // Enabled by default
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

