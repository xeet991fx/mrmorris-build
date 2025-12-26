import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVisitor extends Document {
  workspaceId: Types.ObjectId;
  visitorId: string; // Anonymous UUID
  contactId?: Types.ObjectId; // Set when identified via form submission

  // Session tracking
  firstSeen: Date;
  lastSeen: Date;

  // Attribution
  firstSource?: string;
  lastSource?: string;
  firstUtmCampaign?: string;
  firstUtmSource?: string;
  firstUtmMedium?: string;
  lastUtmCampaign?: string;
  lastUtmSource?: string;
  lastUtmMedium?: string;

  // Activity metrics
  sessionCount: number;
  pageViewCount: number;
  eventCount: number;

  // Device fingerprinting
  devices: Array<{
    userAgent: string;
    ip: string;
    screen?: string;
    language?: string;
    lastSeen: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const VisitorSchema: Schema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    firstSeen: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      required: true,
      default: Date.now,
    },
    firstSource: String,
    lastSource: String,
    firstUtmCampaign: String,
    firstUtmSource: String,
    firstUtmMedium: String,
    lastUtmCampaign: String,
    lastUtmSource: String,
    lastUtmMedium: String,
    sessionCount: {
      type: Number,
      default: 1,
    },
    pageViewCount: {
      type: Number,
      default: 0,
    },
    eventCount: {
      type: Number,
      default: 0,
    },
    devices: [
      {
        userAgent: String,
        ip: String,
        screen: String,
        language: String,
        lastSeen: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
VisitorSchema.index({ workspaceId: 1, visitorId: 1 });
VisitorSchema.index({ workspaceId: 1, contactId: 1 });
VisitorSchema.index({ workspaceId: 1, lastSeen: -1 });
VisitorSchema.index({ workspaceId: 1, sessionCount: -1 });

export default mongoose.model<IVisitor>('Visitor', VisitorSchema);
