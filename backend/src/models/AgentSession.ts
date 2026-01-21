import mongoose, { Document, Schema } from "mongoose";

export interface IAgentSession extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  context?: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agentSessionSchema = new Schema<IAgentSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    messages: [{
      role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      metadata: {
        type: Schema.Types.Mixed
      }
    }],
    context: {
      type: Schema.Types.Mixed
    },
    expiresAt: {
      type: Date,
      required: true,
      // Note: index: true removed - expiresAt has TTL index defined below with expireAfterSeconds
      default: () => new Date(Date.now() + 3600000) // 1 hour from now
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index for workspace + session
agentSessionSchema.index({ workspaceId: 1, sessionId: 1 }, { unique: true });

// TTL index to auto-delete expired sessions
agentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AgentSession = mongoose.model<IAgentSession>("AgentSession", agentSessionSchema);

export default AgentSession;
