import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ChatbotTrigger = 'page_load' | 'time_delay' | 'scroll_depth' | 'exit_intent' | 'manual';

export type ChatbotStepType = 'message' | 'question' | 'collect_info' | 'condition' | 'action' | 'handoff';

export type QuestionType = 'text' | 'email' | 'phone' | 'choice' | 'multi_choice' | 'rating' | 'date';

export type ActionType =
  | 'create_contact'
  | 'update_lead_score'
  | 'add_to_list'
  | 'send_notification'
  | 'trigger_workflow'
  | 'book_meeting'
  | 'send_email';

// ============================================
// SUB-DOCUMENT INTERFACES
// ============================================

export interface IChatbotCondition {
  field: string; // Which field to check (e.g., 'response', 'leadScore', 'company')
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface IChoiceOption {
  id: string;
  label: string;
  value: string;
  nextStepId?: string; // Which step to go to if this option is selected
  icon?: string; // Optional emoji or icon
}

export interface IChatbotStep {
  id: string;
  type: ChatbotStepType;
  name: string;

  // Message/Question content
  message?: string; // Bot message to display
  messageDelay?: number; // Delay in ms before showing message (simulate typing)

  // Question config
  questionType?: QuestionType;
  questionLabel?: string;
  questionPlaceholder?: string;
  questionRequired?: boolean;
  questionValidation?: {
    pattern?: string; // Regex pattern for validation
    minLength?: number;
    maxLength?: number;
    min?: number; // For numbers/ratings
    max?: number;
  };

  // Choice options (for choice/multi_choice questions)
  choices?: IChoiceOption[];

  // Info collection config
  collectField?: 'email' | 'name' | 'phone' | 'company' | 'custom'; // Which contact field to collect
  customFieldName?: string; // If collecting custom field

  // Condition config
  conditions?: IChatbotCondition[];
  conditionLogic?: 'AND' | 'OR';

  // Action config
  actionType?: ActionType;
  actionConfig?: {
    // Create contact
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;

    // Lead scoring
    scorePoints?: number;
    scoreReason?: string;

    // Add to list
    listId?: string;

    // Notification
    notificationMessage?: string;
    notifyUserId?: string;

    // Workflow
    workflowId?: string;

    // Meeting booking
    meetingDuration?: number;
    meetingType?: string;
    calendarUserId?: string;

    // Email
    emailTemplateId?: string;
    emailSubject?: string;
    emailBody?: string;

    [key: string]: any; // Allow flexible config
  };

  // Handoff config
  handoffMessage?: string;
  handoffToTeam?: boolean;
  handoffToUserId?: string;

  // Flow control
  nextStepId?: string; // Default next step (if not using branches)
  branches?: {
    yes?: string; // True branch (for conditions)
    no?: string; // False branch (for conditions)
    [key: string]: string | undefined; // Allow custom branches
  };

  // Position (for visual builder)
  position: {
    x: number;
    y: number;
  };
}

export interface IChatbotTriggerConfig {
  type: ChatbotTrigger;

  // Time delay config
  delaySeconds?: number;

  // Scroll depth config
  scrollPercentage?: number;

  // Page targeting
  urlMatch?: 'all' | 'specific' | 'contains' | 'regex';
  urlPattern?: string;

  // Frequency
  showOncePerVisitor?: boolean;
  showOncePerSession?: boolean;
}

export interface IChatbotSettings {
  // Appearance
  brandColor?: string;
  botName?: string;
  botAvatarUrl?: string;
  welcomeMessage?: string;

  // Behavior
  enableTypingIndicator?: boolean;
  typingSpeed?: number; // Words per minute
  enableSounds?: boolean;

  // Business hours
  enableBusinessHours?: boolean;
  businessHours?: {
    timezone?: string;
    schedule?: {
      [day: string]: { // 'monday', 'tuesday', etc.
        enabled: boolean;
        start?: string; // '09:00'
        end?: string; // '17:00'
      };
    };
  };
  offlineMessage?: string;

  // Lead qualification
  qualifyLeads?: boolean;
  qualificationCriteria?: IChatbotCondition[];
  highQualityLeadScore?: number; // Minimum score for high-quality lead
}

export interface IChatbotStats {
  totalConversations: number;
  completedConversations: number;
  leadsGenerated: number;
  avgCompletionRate: number;
  avgResponseTime: number;
  handoffRate: number;
}

// ============================================
// MAIN DOCUMENT INTERFACE
// ============================================

export interface IChatbot extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId; // Creator

  // Metadata
  name: string;
  description?: string;

  // Status
  status: 'draft' | 'active' | 'paused' | 'archived';

  // Configuration
  trigger: IChatbotTriggerConfig;
  steps: IChatbotStep[];
  settings: IChatbotSettings;

  // AI Integration (optional)
  useAI?: boolean;
  aiProvider?: 'openai' | 'anthropic';
  aiModel?: string;
  aiSystemPrompt?: string; // Custom instructions for AI
  aiFallbackToHuman?: boolean; // Hand off to human if AI can't help

  // Stats
  stats: IChatbotStats;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivatedAt?: Date;

  // Methods
  getStepById(stepId: string): IChatbotStep | undefined;
  getFirstStep(): IChatbotStep | undefined;
}

// ============================================
// SUB-DOCUMENT SCHEMAS
// ============================================

const chatbotConditionSchema = new Schema<IChatbotCondition>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
      required: true,
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const choiceOptionSchema = new Schema<IChoiceOption>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
    nextStepId: String,
    icon: String,
  },
  { _id: false }
);

const chatbotStepSchema = new Schema<IChatbotStep>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['message', 'question', 'collect_info', 'condition', 'action', 'handoff'],
      required: true,
    },
    name: { type: String, required: true },
    message: String,
    messageDelay: { type: Number, default: 1000 },
    questionType: {
      type: String,
      enum: ['text', 'email', 'phone', 'choice', 'multi_choice', 'rating', 'date'],
    },
    questionLabel: String,
    questionPlaceholder: String,
    questionRequired: { type: Boolean, default: false },
    questionValidation: {
      pattern: String,
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
    },
    choices: [choiceOptionSchema],
    collectField: {
      type: String,
      enum: ['email', 'name', 'phone', 'company', 'custom'],
    },
    customFieldName: String,
    conditions: [chatbotConditionSchema],
    conditionLogic: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },
    actionType: {
      type: String,
      enum: ['create_contact', 'update_lead_score', 'add_to_list', 'send_notification', 'trigger_workflow', 'book_meeting', 'send_email'],
    },
    actionConfig: { type: Schema.Types.Mixed },
    handoffMessage: String,
    handoffToTeam: { type: Boolean, default: true },
    handoffToUserId: Schema.Types.ObjectId,
    nextStepId: String,
    branches: { type: Schema.Types.Mixed },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  },
  { _id: false }
);

const chatbotTriggerConfigSchema = new Schema<IChatbotTriggerConfig>(
  {
    type: {
      type: String,
      enum: ['page_load', 'time_delay', 'scroll_depth', 'exit_intent', 'manual'],
      required: true,
    },
    delaySeconds: Number,
    scrollPercentage: Number,
    urlMatch: {
      type: String,
      enum: ['all', 'specific', 'contains', 'regex'],
      default: 'all',
    },
    urlPattern: String,
    showOncePerVisitor: { type: Boolean, default: false },
    showOncePerSession: { type: Boolean, default: false },
  },
  { _id: false }
);

const chatbotSettingsSchema = new Schema<IChatbotSettings>(
  {
    brandColor: { type: String, default: '#667eea' },
    botName: { type: String, default: 'Assistant' },
    botAvatarUrl: String,
    welcomeMessage: String,
    enableTypingIndicator: { type: Boolean, default: true },
    typingSpeed: { type: Number, default: 200 },
    enableSounds: { type: Boolean, default: false },
    enableBusinessHours: { type: Boolean, default: false },
    businessHours: {
      timezone: String,
      schedule: { type: Schema.Types.Mixed },
    },
    offlineMessage: String,
    qualifyLeads: { type: Boolean, default: true },
    qualificationCriteria: [chatbotConditionSchema],
    highQualityLeadScore: { type: Number, default: 70 },
  },
  { _id: false }
);

const chatbotStatsSchema = new Schema<IChatbotStats>(
  {
    totalConversations: { type: Number, default: 0 },
    completedConversations: { type: Number, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    avgCompletionRate: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    handoffRate: { type: Number, default: 0 },
  },
  { _id: false }
);

// ============================================
// MAIN SCHEMA
// ============================================

const chatbotSchema = new Schema<IChatbot>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },
    trigger: {
      type: chatbotTriggerConfigSchema,
      required: true,
    },
    steps: {
      type: [chatbotStepSchema],
      default: [],
    },
    settings: {
      type: chatbotSettingsSchema,
      default: () => ({}),
    },
    useAI: {
      type: Boolean,
      default: false,
    },
    aiProvider: {
      type: String,
      enum: ['openai', 'anthropic'],
    },
    aiModel: String,
    aiSystemPrompt: String,
    aiFallbackToHuman: {
      type: Boolean,
      default: true,
    },
    stats: {
      type: chatbotStatsSchema,
      default: () => ({}),
    },
    lastActivatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

chatbotSchema.index({ workspaceId: 1, status: 1 });
chatbotSchema.index({ workspaceId: 1, createdAt: -1 });
chatbotSchema.index({ name: 'text', description: 'text' });

// ============================================
// METHODS
// ============================================

chatbotSchema.methods.getStepById = function (stepId: string): IChatbotStep | undefined {
  return this.steps.find((step: IChatbotStep) => step.id === stepId);
};

chatbotSchema.methods.getFirstStep = function (): IChatbotStep | undefined {
  return this.steps.length > 0 ? this.steps[0] : undefined;
};

// ============================================
// EXPORT
// ============================================

const Chatbot = mongoose.model<IChatbot>('Chatbot', chatbotSchema);

export default Chatbot;
