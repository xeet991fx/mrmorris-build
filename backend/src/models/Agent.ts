import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  workspace: mongoose.Types.ObjectId;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: mongoose.Types.ObjectId;

  // Future fields (nullable for now - will be populated in later stories)
  triggers?: any[];
  instructions?: string;
  parsedActions?: any[];
  restrictions?: string;
  memory?: any;
  approvalRequired?: boolean;
  editPermissions?: any[];
  integrationAccess?: any[];
  circuitBreaker?: any;

  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Workspace is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: [100, 'Agent name cannot exceed 100 characters']
    },
    goal: {
      type: String,
      required: [true, 'Agent goal is required'],
      maxlength: [500, 'Agent goal cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['Draft', 'Live', 'Paused'],
      default: 'Draft',
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },

    // Future fields - optional for now
    triggers: {
      type: [Schema.Types.Mixed],
      default: []
    },
    instructions: {
      type: String,
      default: null
    },
    parsedActions: {
      type: [Schema.Types.Mixed],
      default: []
    },
    restrictions: {
      type: String,
      default: null
    },
    memory: {
      type: Schema.Types.Mixed,
      default: null
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    editPermissions: {
      type: [Schema.Types.Mixed],
      default: []
    },
    integrationAccess: {
      type: [Schema.Types.Mixed],
      default: []
    },
    circuitBreaker: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for performance
AgentSchema.index({ workspace: 1, status: 1 });
AgentSchema.index({ workspace: 1, createdBy: 1 });
AgentSchema.index({ workspace: 1, createdAt: -1 });

// CRITICAL: Workspace isolation middleware - prevents cross-workspace data leaks
AgentSchema.pre('find', function() {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent find queries');
  }
});

AgentSchema.pre('findOne', function() {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent findOne queries');
  }
});

const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent;
