import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  workspaceId: Types.ObjectId;
  visitorId: string; // Anonymous visitor ID
  contactId?: Types.ObjectId; // Linked contact (if identified)

  // Conversation metadata
  status: 'open' | 'closed' | 'assigned' | 'waiting';
  assignedTo?: Types.ObjectId; // Team member assigned to this chat

  // Visitor info
  visitorName?: string; // Name provided in chat
  visitorEmail?: string; // Email provided in chat
  visitorPhone?: string;

  // Context
  currentUrl?: string; // Page where chat was initiated
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;

  // Company identification (from IP lookup)
  companyName?: string;
  companyDomain?: string;
  companyIndustry?: string;
  companySize?: string;
  companyLocation?: string;

  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  // Metadata
  tags?: string[];
  rating?: number; // Visitor can rate conversation (1-5)
  notes?: string; // Internal notes from team

  // Timing
  firstMessageAt?: Date;
  lastMessageAt?: Date;
  closedAt?: Date;
  responseTime?: number; // Average response time in seconds

  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
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
    status: {
      type: String,
      enum: ['open', 'closed', 'assigned', 'waiting'],
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    visitorName: String,
    visitorEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    visitorPhone: String,
    currentUrl: String,
    referrer: String,
    userAgent: String,
    ipAddress: String,
    companyName: String,
    companyDomain: String,
    companyIndustry: String,
    companySize: String,
    companyLocation: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    tags: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: String,
    firstMessageAt: Date,
    lastMessageAt: Date,
    closedAt: Date,
    responseTime: Number,
  },
  {
    timestamps: true,
  }
);

// Indexes
ConversationSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
ConversationSchema.index({ workspaceId: 1, visitorId: 1 });
ConversationSchema.index({ workspaceId: 1, contactId: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
