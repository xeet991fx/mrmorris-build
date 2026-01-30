import mongoose, { Schema, Document, Types } from 'mongoose';

// Message interface for conversation messages
export interface IConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  creditsUsed: number;
}

// Main conversation interface
export interface IAgentCopilotConversation extends Document {
  workspace: Types.ObjectId;
  agent: Types.ObjectId;
  user: Types.ObjectId;
  messages: IConversationMessage[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Message sub-schema
const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
  },
  { _id: false } // Don't create _id for subdocuments
);

// Main conversation schema
const AgentCopilotConversationSchema = new Schema<IAgentCopilotConversation>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // Auto-manage createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
AgentCopilotConversationSchema.index({ workspace: 1, agent: 1, user: 1 }); // Conversation lookup
AgentCopilotConversationSchema.index({ workspace: 1, createdAt: -1 }); // Workspace-wide queries

// TTL index for automatic deletion after 7 days
AgentCopilotConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook: Auto-set expiresAt to 7 days from createdAt
AgentCopilotConversationSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + sevenDaysInMs);
  }
  next();
});

export default mongoose.model<IAgentCopilotConversation>(
  'AgentCopilotConversation',
  AgentCopilotConversationSchema
);
