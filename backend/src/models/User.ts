import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser extends Document {
  email: string;
  password?: string; // Optional for OAuth users
  name: string;
  username?: string; // Optional unique username
  isVerified: boolean;
  authProvider: "email" | "google";
  googleId?: string;
  profilePicture?: string;
  timezone?: string; // User's preferred timezone (IANA timezone string)
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateVerificationToken(): string;
  generatePasswordResetToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be less than 30 characters"],
      match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
    googleId: {
      type: String,
      sparse: true, // Allows null values while maintaining uniqueness
      unique: true,
    },
    profilePicture: {
      type: String,
    },
    timezone: {
      type: String,
      default: 'America/New_York', // Default to Eastern Time
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if password exists and is modified)
userSchema.pre("save", async function (next) {
  // Skip if password doesn't exist (OAuth users) or hasn't been modified
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    // Return false if no password (OAuth users)
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Generate verification token - using cryptographically secure random bytes
userSchema.methods.generateVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');

  this.verificationToken = token;
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return token;
};

// Generate password reset token - using cryptographically secure random bytes
userSchema.methods.generatePasswordResetToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return token;
};

// Indexes for performance (email and googleId already have unique indexes defined)
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
