import mongoose, { Schema, Document } from 'mongoose';

// Story 1.2: Trigger type definitions
export interface ITriggerConfig {
  type: 'manual' | 'scheduled' | 'event';
  config: any;
  enabled?: boolean;
  createdAt?: Date;
}

// Story 1.4: Agent restrictions configuration
export interface IAgentRestrictions {
  maxExecutionsPerDay: number;
  maxEmailsPerDay: number;
  allowedIntegrations: string[];  // Empty array = all integrations allowed
  excludedContacts: string[];     // Array of contact IDs to exclude
  excludedDomains: string[];      // Array of company domains to exclude (e.g., 'competitor.com')
  guardrails: string;             // Natural language guardrails/rules for agent behavior
}

// Story 1.4: Valid integration identifiers
export const VALID_INTEGRATIONS = [
  'gmail',
  'linkedin',
  'slack',
  'apollo',
  'google-calendar',
  'google-sheets'
] as const;

// Story 1.4: Default restrictions values
export const RESTRICTIONS_DEFAULTS: IAgentRestrictions = {
  maxExecutionsPerDay: 100,
  maxEmailsPerDay: 100,
  allowedIntegrations: [],
  excludedContacts: [],
  excludedDomains: [],
  guardrails: ''
};

// Story 1.4: Guardrails character limit
export const GUARDRAILS_MAX_LENGTH = 5000;

export interface IAgent extends Document {
  workspace: mongoose.Types.ObjectId;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: mongoose.Types.ObjectId;

  // Story 1.2: Triggers (now properly typed)
  triggers?: ITriggerConfig[];

  // Future fields (nullable for now - will be populated in later stories)
  instructions?: string;
  parsedActions?: any[];
  // Story 1.4: Restrictions (typed configuration)
  restrictions?: IAgentRestrictions;
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

    // Story 1.2: Triggers with proper schema
    triggers: [{
      type: {
        type: String,
        enum: ['manual', 'scheduled', 'event'],
        required: true
      },
      config: {
        type: Schema.Types.Mixed,
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Story 1.3: Instructions field with character limit
    instructions: {
      type: String,
      default: null,
      trim: true,
      maxlength: [10000, 'Instructions cannot exceed 10,000 characters']
    },
    parsedActions: [],
    // Story 1.4: Restrictions with typed schema
    restrictions: {
      type: {
        maxExecutionsPerDay: {
          type: Number,
          default: 100,
          min: [1, 'Max executions per day must be at least 1'],
          max: [1000, 'Max executions per day cannot exceed 1000']
        },
        maxEmailsPerDay: {
          type: Number,
          default: 100,
          min: [1, 'Max emails per day must be at least 1'],
          max: [500, 'Max emails per day cannot exceed 500']
        },
        allowedIntegrations: {
          type: [String],
          default: [],
          enum: ['gmail', 'linkedin', 'slack', 'apollo', 'google-calendar', 'google-sheets']
        },
        excludedContacts: {
          type: [String],
          default: []
        },
        excludedDomains: {
          type: [String],
          default: []
        },
        guardrails: {
          type: String,
          default: '',
          maxlength: [5000, 'Guardrails cannot exceed 5,000 characters']
        }
      },
      default: () => ({ ...RESTRICTIONS_DEFAULTS })
    },
    memory: {
      type: Schema.Types.Mixed,
      default: null
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    editPermissions: [],
    integrationAccess: [],
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
// Story 1.2: Trigger indexes
AgentSchema.index({ workspace: 1, 'triggers.type': 1 });
AgentSchema.index({ workspace: 1, 'triggers.enabled': 1 });

// CRITICAL: Workspace isolation middleware - prevents cross-workspace data leaks
AgentSchema.pre('find', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent find queries');
  }
});

AgentSchema.pre('findOne', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent findOne queries');
  }
});

const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent;
