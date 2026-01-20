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

// Story 1.5: Agent memory variable configuration
export interface IAgentMemoryVariable {
  name: string;           // Variable name (alphanumeric + underscore)
  type: 'string' | 'number' | 'date' | 'array';
  defaultValue: string | number | Date | any[] | null;
}

// Story 1.5: Agent memory configuration
export interface IAgentMemory {
  enabled: boolean;
  variables: IAgentMemoryVariable[];
  retentionDays: number;  // 0 = forever, 7, 30, 90
}

// Story 1.5: Memory configuration defaults
export const MEMORY_DEFAULTS: IAgentMemory = {
  enabled: false,
  variables: [],
  retentionDays: 30
};

// Story 1.5: Memory configuration limits
export const MEMORY_VARIABLE_TYPES = ['string', 'number', 'date', 'array'] as const;
export const MEMORY_RETENTION_OPTIONS = [0, 7, 30, 90] as const;
export const MAX_MEMORY_VARIABLES = 20;

// Story 1.6: Approvable action types for approval configuration
export const APPROVABLE_ACTIONS = [
  'send_email',
  'linkedin_invite',
  'web_search',
  'create_task',
  'add_tag',
  'remove_tag',
  'update_field',
  'enrich_contact',
  'update_deal_value',
  'wait'
] as const;

export type ApprovableAction = typeof APPROVABLE_ACTIONS[number];

// Story 1.6: Agent approval configuration
export interface IAgentApprovalConfig {
  enabled: boolean;
  requireForAllActions: boolean;
  requiredForActions: ApprovableAction[];
  approvers: mongoose.Types.ObjectId[];  // User IDs who can approve, empty = all owners/admins
}

// Story 1.6: Approval configuration defaults
export const APPROVAL_DEFAULTS: IAgentApprovalConfig = {
  enabled: false,
  requireForAllActions: false,
  requiredForActions: [],
  approvers: []
};

export interface IAgent extends Document {
  workspace: mongoose.Types.ObjectId;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: mongoose.Types.ObjectId;
  // Story 1.7: Track who last modified the agent
  updatedBy?: mongoose.Types.ObjectId;
  // Story 1.11: Track last execution time for sorting
  lastExecutedAt?: Date | null;

  // Story 1.2: Triggers (now properly typed)
  triggers?: ITriggerConfig[];

  // Future fields (nullable for now - will be populated in later stories)
  instructions?: string;
  parsedActions?: any[];
  // Story 1.4: Restrictions (typed configuration)
  restrictions?: IAgentRestrictions;
  // Story 1.5: Memory configuration (typed)
  memory?: IAgentMemory;
  // Story 1.6: Approval configuration (typed)
  approvalConfig?: IAgentApprovalConfig;
  approvalRequired?: boolean;  // Legacy field - kept for backward compatibility
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
      required: [true, 'Workspace is required']
      // Note: index: true removed - workspace is indexed via compound indexes below
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
    // Story 1.7: Track who last modified the agent
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    // Story 1.11: Track last execution time for sorting
    lastExecutedAt: {
      type: Date,
      default: null
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
    // Story 1.5: Memory configuration with typed schema
    memory: {
      enabled: {
        type: Boolean,
        default: false
      },
      variables: [{
        name: {
          type: String,
          required: true,
          validate: {
            validator: (v: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v),
            message: 'Variable name must be a valid identifier (alphanumeric + underscore, starting with letter or underscore)'
          }
        },
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'array'],
          required: true
        },
        defaultValue: {
          type: Schema.Types.Mixed,
          default: null
        }
      }],
      retentionDays: {
        type: Number,
        default: 30,
        enum: [0, 7, 30, 90]  // 0 = forever
      }
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    // Story 1.6: Approval configuration with typed schema
    approvalConfig: {
      enabled: {
        type: Boolean,
        default: false
      },
      requireForAllActions: {
        type: Boolean,
        default: false
      },
      requiredForActions: [{
        type: String,
        enum: APPROVABLE_ACTIONS
      }],
      approvers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }]
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
// Story 1.11: Sorting indexes for agents list
AgentSchema.index({ workspace: 1, name: 1 });
AgentSchema.index({ workspace: 1, lastExecutedAt: -1 });

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

// Story 1.7 Fix: Add missing middleware for update/delete operations
AgentSchema.pre('findOneAndUpdate', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent findOneAndUpdate queries');
  }
});

AgentSchema.pre('updateMany', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent updateMany queries');
  }
});

AgentSchema.pre('deleteOne', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent deleteOne queries');
  }
});

AgentSchema.pre('deleteMany', function () {
  if (!this.getQuery().workspace) {
    throw new Error('SECURITY: Workspace filter required for Agent deleteMany queries');
  }
});

const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent;
