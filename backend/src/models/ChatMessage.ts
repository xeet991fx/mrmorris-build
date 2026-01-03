import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  conversationId: Types.ObjectId;
  workspaceId: Types.ObjectId;

  // Message content
  message: string;
  messageType: 'text' | 'file' | 'system' | 'bot';

  // Sender info
  senderType: 'visitor' | 'agent' | 'system' | 'bot';
  senderId?: Types.ObjectId; // User ID if sent by agent
  senderName?: string; // Display name

  // File attachment (if messageType = 'file')
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;

  // Message status
  isRead: boolean;
  readAt?: Date;

  // Metadata
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'file', 'system', 'bot'],
      default: 'text',
    },
    senderType: {
      type: String,
      enum: ['visitor', 'agent', 'system', 'bot'],
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    senderName: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileMimeType: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ workspaceId: 1, createdAt: -1 });
ChatMessageSchema.index({ workspaceId: 1, isRead: 1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
