import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Voice Drop Campaign Model
 *
 * Ringless voicemail campaigns (bypass ringing, straight to voicemail)
 * Novel channel with high attention rates
 */

export type VoiceDropStatus = "scheduled" | "sending" | "delivered" | "failed" | "cancelled";

export interface IVoiceDropRecipient {
  contactId: Types.ObjectId;
  phone: string;
  status: "pending" | "delivered" | "failed" | "invalid_number";
  deliveredAt?: Date;
  errorMessage?: string;
  duration?: number; // seconds
  cost?: number; // cents
}

export interface IVoiceDrop extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;

  // Campaign Info
  name: string;
  description?: string;

  // Voice Message
  audioFileUrl: string; // Pre-recorded message URL
  audioFileName: string;
  audioDuration: number; // seconds
  transcription?: string; // Optional text version

  // Recipients
  recipients: IVoiceDropRecipient[];
  totalRecipients: number;
  delivered: number;
  failed: number;

  // Scheduling
  status: VoiceDropStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Settings
  sendingSpeed: "slow" | "medium" | "fast"; // Calls per hour
  timeZoneRespect: boolean; // Send during business hours
  retryFailed: boolean;
  maxRetries: number;

  // Analytics
  listenRate?: number; // % who listened to full message
  averageListenTime?: number; // seconds
  callbackRate?: number; // % who called back
  callbackNumbers?: string[]; // Phone numbers that called back

  // Costs
  estimatedCost: number; // Total cost estimate (cents)
  actualCost: number; // Actual spent (cents)
  costPerDrop: number; // Per voicemail (cents)

  // Compliance
  optOutNumbers?: string[]; // DNC list
  complianceNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const voiceDropRecipientSchema = new Schema<IVoiceDropRecipient>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "failed", "invalid_number"],
      default: "pending",
    },
    deliveredAt: Date,
    errorMessage: String,
    duration: Number,
    cost: Number,
  },
  { _id: false }
);

const voiceDropSchema = new Schema<IVoiceDrop>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Campaign
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 500,
    },

    // Audio
    audioFileUrl: {
      type: String,
      required: true,
    },
    audioFileName: {
      type: String,
      required: true,
    },
    audioDuration: {
      type: Number,
      required: true,
      min: 1,
      max: 120, // Max 2 minutes
    },
    transcription: String,

    // Recipients
    recipients: [voiceDropRecipientSchema],
    totalRecipients: {
      type: Number,
      default: 0,
      min: 0,
    },
    delivered: {
      type: Number,
      default: 0,
      min: 0,
    },
    failed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["scheduled", "sending", "delivered", "failed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,

    // Settings
    sendingSpeed: {
      type: String,
      enum: ["slow", "medium", "fast"],
      default: "medium",
    },
    timeZoneRespect: {
      type: Boolean,
      default: true,
    },
    retryFailed: {
      type: Boolean,
      default: true,
    },
    maxRetries: {
      type: Number,
      default: 2,
      min: 0,
      max: 5,
    },

    // Analytics
    listenRate: Number,
    averageListenTime: Number,
    callbackRate: Number,
    callbackNumbers: [String],

    // Costs
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPerDrop: {
      type: Number,
      default: 5, // 5 cents per drop (typical)
      min: 0,
    },

    // Compliance
    optOutNumbers: [String],
    complianceNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
voiceDropSchema.index({ workspaceId: 1, status: 1 });
voiceDropSchema.index({ workspaceId: 1, createdAt: -1 });
voiceDropSchema.index({ scheduledAt: 1 });

// Calculate totals before save
voiceDropSchema.pre("save", function (next) {
  this.totalRecipients = this.recipients.length;
  this.delivered = this.recipients.filter((r) => r.status === "delivered").length;
  this.failed = this.recipients.filter((r) => r.status === "failed").length;
  this.estimatedCost = this.totalRecipients * this.costPerDrop;

  // Calculate actual cost
  this.actualCost = this.recipients.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Calculate listen rate
  const listened = this.recipients.filter((r) => r.duration && r.duration > 3).length;
  this.listenRate = this.delivered > 0 ? (listened / this.delivered) * 100 : 0;

  next();
});

const VoiceDrop = mongoose.model<IVoiceDrop>("VoiceDrop", voiceDropSchema);

export default VoiceDrop;
