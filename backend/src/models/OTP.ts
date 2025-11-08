import mongoose, { Document, Schema } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose: "registration" | "login" | "password-reset";
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "OTP code is required"],
    },
    purpose: {
      type: String,
      enum: ["registration", "login", "password-reset"],
      required: [true, "Purpose is required"],
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5, // Maximum 5 verification attempts
    },
  },
  {
    timestamps: true,
  }
);

// Index for automatic deletion of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookup
otpSchema.index({ email: 1, purpose: 1 });

const OTP = mongoose.model<IOTP>("OTP", otpSchema);

export default OTP;
