import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrackingEvent extends Document {
  workspaceId: Types.ObjectId;
  visitorId: string; // Anonymous UUID from cookie
  contactId?: Types.ObjectId; // Linked after identification
  sessionId: string;

  eventType: 'page_view' | 'button_click' | 'form_view' | 'form_submit' | 'scroll_depth' | 'custom';
  eventName: string;

  // Page context
  url: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Event properties
  properties: Record<string, any>;

  // Additional fields for compatibility
  timestamp?: Date;
  source?: string;
  metadata?: Record<string, any>;

  // Device info
  device: {
    userAgent: string;
    ip: string;
    screen: string;
    language: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const TrackingEventSchema: Schema = new Schema(
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
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['page_view', 'button_click', 'form_view', 'form_submit', 'scroll_depth', 'custom'],
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    properties: {
      type: Schema.Types.Mixed,
      default: {},
    },
    device: {
      userAgent: String,
      ip: String,
      screen: String,
      language: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
TrackingEventSchema.index({ workspaceId: 1, visitorId: 1, createdAt: -1 });
TrackingEventSchema.index({ workspaceId: 1, contactId: 1, createdAt: -1 });
TrackingEventSchema.index({ workspaceId: 1, eventType: 1, createdAt: -1 });
TrackingEventSchema.index({ workspaceId: 1, sessionId: 1 });

export default mongoose.model<ITrackingEvent>('TrackingEvent', TrackingEventSchema);
