// Story 1.2: Trigger configuration types
export interface IManualTriggerConfig {
  type: 'manual';
  config: {};
  enabled?: boolean;
  createdAt?: string;
}

export interface IScheduledTriggerConfig {
  type: 'scheduled';
  config: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    days?: number[]; // 0-6 for Sunday-Saturday (weekly only)
    date?: number; // 1-31 (monthly only)
  };
  enabled?: boolean;
  createdAt?: string;
}

export interface IEventTriggerConfig {
  type: 'event';
  config: {
    event: 'contact.created' | 'deal.stage_updated' | 'form.submitted';
    conditions?: {
      field: string;
      operator: '>' | '<' | '=' | '!=' | 'contains';
      value: any;
    }[];
  };
  enabled?: boolean;
  createdAt?: string;
}

export type ITriggerConfig = IManualTriggerConfig | IScheduledTriggerConfig | IEventTriggerConfig;

// Story 1.4: Restrictions configuration types
export interface IAgentRestrictions {
  maxExecutionsPerDay: number;
  maxEmailsPerDay: number;
  allowedIntegrations: string[];  // Empty array = all integrations allowed
  excludedContacts: string[];     // Array of contact IDs to exclude
  excludedDomains: string[];      // Array of company domains to exclude
  guardrails: string;             // Natural language guardrails/rules
}

// Story 1.4: Valid integration identifiers with display info
export const VALID_INTEGRATIONS = [
  { id: 'gmail', name: 'Gmail', icon: 'mail' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
  { id: 'slack', name: 'Slack', icon: 'slack' },
  { id: 'apollo', name: 'Apollo.io', icon: 'database' },
  { id: 'google-calendar', name: 'Google Calendar', icon: 'calendar' },
  { id: 'google-sheets', name: 'Google Sheets', icon: 'table' }
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

// Story 1.4: Restrictions limits for validation
export const RESTRICTIONS_LIMITS = {
  maxExecutionsPerDay: { min: 1, max: 1000 },
  maxEmailsPerDay: { min: 1, max: 500 }
};

// Story 1.4: Guardrails character limit
export const GUARDRAILS_MAX_LENGTH = 5000;

// Story 1.5: Memory variable configuration types
export interface IAgentMemoryVariable {
  name: string;           // Variable name (alphanumeric + underscore)
  type: 'string' | 'number' | 'date' | 'array';
  defaultValue?: string | number | Date | any[] | null;
}

// Story 1.5: Memory configuration types
export interface IAgentMemory {
  enabled: boolean;
  variables: IAgentMemoryVariable[];
  retentionDays: number;  // 0 = forever, 7, 30, 90
}

// Story 1.5: Memory variable types with display info
export const MEMORY_VARIABLE_TYPES = [
  { id: 'string', name: 'String', icon: 'text' },
  { id: 'number', name: 'Number', icon: 'hash' },
  { id: 'date', name: 'Date', icon: 'calendar' },
  { id: 'array', name: 'Array', icon: 'list' }
] as const;

// Story 1.5: Memory retention options with display labels
export const MEMORY_RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'Forever' }
] as const;

// Story 1.5: Memory default configuration
export const MEMORY_DEFAULTS: IAgentMemory = {
  enabled: false,
  variables: [],
  retentionDays: 30
};

// Story 1.5: Maximum memory variables per agent
export const MAX_MEMORY_VARIABLES = 20;

// Story 1.6: Approvable actions for approval configuration
export const APPROVABLE_ACTIONS = [
  { id: 'send_email', name: 'Send Email', icon: 'mail' },
  { id: 'linkedin_invite', name: 'LinkedIn Invitation', icon: 'linkedin' },
  { id: 'web_search', name: 'Web Search', icon: 'search' },
  { id: 'create_task', name: 'Create Task', icon: 'check-square' },
  { id: 'add_tag', name: 'Add Tag', icon: 'tag' },
  { id: 'remove_tag', name: 'Remove Tag', icon: 'x' },
  { id: 'update_field', name: 'Update Field', icon: 'edit' },
  { id: 'enrich_contact', name: 'Enrich Contact', icon: 'user-plus' },
  { id: 'update_deal_value', name: 'Update Deal Value', icon: 'dollar-sign' },
  { id: 'wait', name: 'Wait', icon: 'clock' }
] as const;

export type ApprovableAction = typeof APPROVABLE_ACTIONS[number]['id'];

// Story 1.6: Approval configuration interface
export interface IAgentApprovalConfig {
  enabled: boolean;
  requireForAllActions: boolean;
  requiredForActions: ApprovableAction[];
  approvers: string[];  // User IDs
}

// Story 1.6: Approval configuration defaults
export const APPROVAL_DEFAULTS: IAgentApprovalConfig = {
  enabled: false,
  requireForAllActions: false,
  requiredForActions: [],
  approvers: []
};

export interface IAgent {
  _id: string;
  workspace: string;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: string;
  // Story 1.7: Track who last modified the agent
  updatedBy?: string;
  createdAt: string; // ISO 8601 date string from API
  updatedAt: string; // ISO 8601 date string from API
  // Story 1.11: Track last execution time for display
  lastExecutedAt?: string | null;

  // Story 1.2: Triggers (properly typed)
  triggers?: ITriggerConfig[];

  // Future fields (optional, nullable for now)
  instructions?: string | null;
  parsedActions?: any[];
  // Story 1.4: Restrictions (typed configuration)
  restrictions?: IAgentRestrictions;
  // Story 1.5: Memory configuration (typed)
  memory?: IAgentMemory;
  // Story 1.6: Approval configuration (typed)
  approvalConfig?: IAgentApprovalConfig;
  approvalRequired?: boolean;
  editPermissions?: any[];
  integrationAccess?: any[];
  circuitBreaker?: any;
}

export interface CreateAgentInput {
  name: string;
  goal: string;
}

export interface UpdateAgentInput {
  name?: string;
  goal?: string;
  triggers?: ITriggerConfig[];
  // Story 1.3: Instructions field
  instructions?: string;
  // Story 1.4: Restrictions configuration
  restrictions?: Partial<IAgentRestrictions>;
  // Story 1.5: Memory configuration
  memory?: Partial<IAgentMemory>;
  // Story 1.6: Approval configuration
  approvalConfig?: Partial<IAgentApprovalConfig>;
  // Story 1.7: Optimistic locking - expected updatedAt timestamp (ISO string)
  expectedUpdatedAt?: string;
}

export interface UpdateAgentResponse {
  success: boolean;
  agent: IAgent;
}

export interface CreateAgentResponse {
  success: boolean;
  agent: IAgent;
}

export interface GetAgentResponse {
  success: boolean;
  agent: IAgent;
}

// Story 1.11: Enhanced list response with meta and status counts
export interface ListAgentsResponse {
  success: boolean;
  agents: IAgent[];
  meta: {
    total: number;           // Total count of agents matching filters
    limit: number;           // Current pagination limit
    offset: number;          // Current pagination offset
    statusCounts: {          // Counts for filter UI (AC4)
      all: number;
      draft: number;
      live: number;
      paused: number;
    };
  };
}

// Story 1.11: List agents query parameters for filtering, sorting, search
export interface ListAgentsParams {
  status?: 'Draft' | 'Live' | 'Paused';  // Filter by status (AC4)
  sortBy?: 'name' | 'status' | 'createdAt' | 'lastExecutedAt';  // Sort field (AC3)
  sortOrder?: 'asc' | 'desc';  // Sort direction (default: desc for dates)
  search?: string;  // Search in name and goal (AC5)
  limit?: number;   // Pagination limit (default: 50)
  offset?: number;  // Pagination offset (default: 0)
}

// Story 1.7: Conflict response for optimistic locking
export interface ConflictResponse {
  success: false;
  error: string;
  conflict: {
    updatedBy: string;
    updatedAt: string;
  };
}

// Story 1.8: Duplicate agent types
export interface DuplicateAgentInput {
  name: string;
}

export interface DuplicateAgentResponse {
  success: boolean;
  agent: IAgent;
}

// Story 1.9: Agent status types
export type AgentStatus = 'Draft' | 'Live' | 'Paused';

// Story 1.9: Update agent status input
export interface UpdateAgentStatusInput {
  status: AgentStatus;
}

// Story 1.9: Update agent status response
export interface UpdateAgentStatusResponse {
  success: boolean;
  agent: IAgent;
}

// Story 1.9: Status validation error response
export interface StatusValidationErrorResponse {
  success: false;
  error: string;
  validationErrors: {
    field: string;
    message: string;
  }[];
}

// Story 1.10: Delete agent response
export interface DeleteAgentResponse {
  success: boolean;
  message: string;
}

// Story 2.1 & 2.3: Enhanced Test Mode types
export type TestStepStatus = 'success' | 'warning' | 'error' | 'skipped' | 'not_executed';

export type StepIcon =
  | 'search'
  | 'email'
  | 'wait'
  | 'conditional'
  | 'linkedin'
  | 'task'
  | 'tag'
  | 'update'
  | 'enrich'
  | 'handoff'
  | 'web_search';

// Story 2.3: Type-specific preview content
export interface SearchPreview {
  type: 'search';
  matchedCount: number;
  matches: Array<{
    id: string;
    name: string;
    subtitle: string;
    company?: string;
  }>;
  hasMore: boolean;
}

export interface EmailPreview {
  type: 'email';
  recipient: string;
  subject: string;
  bodyPreview: string;
  templateName?: string;
  variablesResolved: Record<string, string>;
  isDryRun: true;
}

export interface ConditionalPreview {
  type: 'conditional';
  condition: string;
  evaluatedTo: boolean;
  explanation: string;
  trueBranchSteps: number[];
  falseBranchSteps: number[];
}

export interface WaitPreview {
  type: 'wait';
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
  resumeNote: string;
}

export interface LinkedInPreview {
  type: 'linkedin';
  recipient: string;
  messagePreview?: string;
  connectionNote?: string;
  isDryRun: true;
}

export interface TaskPreview {
  type: 'task';
  taskTitle: string;
  assignee?: string;
  dueDate?: string;
}

export interface TagPreview {
  type: 'tag';
  tagName: string;
  operation: 'add' | 'remove';
  targetCount: number;
}

export interface UpdatePreview {
  type: 'update';
  fieldName: string;
  oldValue?: string;
  newValue: string;
  targetCount: number;
}

export interface EnrichPreview {
  type: 'enrich';
  source: string;
  fieldsToEnrich: string[];
  targetCount: number;
}

export interface WebSearchPreview {
  type: 'web_search';
  query: string;
  isDryRun: true;
}

export type StepPreview =
  | SearchPreview
  | EmailPreview
  | ConditionalPreview
  | WaitPreview
  | LinkedInPreview
  | TaskPreview
  | TagPreview
  | UpdatePreview
  | EnrichPreview
  | WebSearchPreview;

// Story 2.1 & 2.3: Enhanced test step result
export interface TestStepResult {
  stepNumber: number;
  action: string;
  actionLabel: string;
  icon: StepIcon;
  status: TestStepStatus;
  preview: {
    description: string;
    details?: Record<string, any>;
  };
  richPreview?: StepPreview;
  isExpandable: boolean;
  duration: number;
  estimatedCredits: number;
  note: string;
  conditionResult?: boolean;
  conditionExplanation?: string;
  skipReason?: string;
  suggestions?: string[];
  errorContext?: {
    lineNumber?: number;
    instructionText?: string;
  };
}

export interface TestRunResponse {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: Array<{
    step: number;
    severity: 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  error?: string;
  failedAtStep?: number;
  estimates?: ExecutionEstimate;  // Story 2.5: Enhanced execution estimates
}

// Story 1.9: Status display info
export const AGENT_STATUS_INFO = {
  Draft: {
    label: 'Draft',
    color: 'bg-zinc-500',
    description: 'Agent is in development. Only manual testing available.',
    icon: 'edit'
  },
  Live: {
    label: 'Live',
    color: 'bg-emerald-500',
    description: 'Agent is active and executing automatically.',
    icon: 'play'
  },
  Paused: {
    label: 'Paused',
    color: 'bg-amber-500',
    description: 'Agent is temporarily stopped. Resume to continue.',
    icon: 'pause'
  }
} as const;

// Story 2.2: Test Target types
export type TestTargetType = 'contact' | 'deal' | 'none';

export interface TestTarget {
  type: TestTargetType;
  id?: string;
  manualData?: Record<string, any>;
}

export interface TestAgentInput {
  testTarget?: TestTarget;
}

// Story 2.2: Test target search result
export interface TestTargetOption {
  id: string;
  name: string;
  subtitle: string;
  company?: string;
}

// Story 2.4: Validation types
export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  lineNumber?: number;
  column?: number;
  instructionText?: string;
  suggestion?: string;
  context?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    validatedAt: string;
  };
}

export interface ValidateAgentResponse {
  success: boolean;
  validation: ValidationResult;
  error?: string;
}

// Story 2.4: Validation codes
export const VALIDATION_CODES = {
  TEMPLATE_NOT_FOUND: 'template_not_found',
  TEMPLATE_INVALID: 'template_invalid',
  VARIABLE_UNDEFINED: 'variable_undefined',
  VARIABLE_INVALID_FORMAT: 'variable_invalid_format',
  VARIABLE_TYPE_MISMATCH: 'variable_type_mismatch',
  CONDITION_SYNTAX_ERROR: 'condition_syntax_error',
  ACTION_SYNTAX_ERROR: 'action_syntax_error',
  MISSING_REQUIRED_PARAM: 'missing_required_param',
  INTEGRATION_NOT_CONNECTED: 'integration_not_connected',
  INTEGRATION_EXPIRED: 'integration_expired',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  DAILY_LIMIT_RISK: 'daily_limit_risk',
  INSTRUCTION_EMPTY: 'instruction_empty',
  INSTRUCTION_TOO_LONG: 'instruction_too_long',
} as const;

// =============================================================================
// Story 2.5: Execution Estimates types
// =============================================================================

// AC6: Bulk action info for estimation display
export interface BulkActionInfo {
  actionType: string;
  count: number;
  perItemTimeMs: number;
  totalTimeMs: number;
  perItemCredits: number;
  totalCredits: number;
  display: string; // e.g., "50 emails × 0.5s per email"
}

export interface EstimateBreakdown {
  category: 'parsing' | 'email' | 'linkedin' | 'enrich' | 'web_search' | 'other';
  label: string;
  credits: number;
  duration: number;
}

export interface ExecutionEstimate {
  // Time estimates
  activeTimeMs: number;           // Actual execution time
  waitTimeMs: number;             // Wait/delay time (days → ms)
  totalTimeMs: number;            // activeTimeMs + waitTimeMs
  timeRangeMs?: {                 // For conditional branches
    min: number;
    max: number;
  };

  // Credit estimates
  totalCredits: number;
  creditBreakdown: EstimateBreakdown[];
  parsingCredits: number;         // Base 2 credits for AI parsing

  // Display helpers
  activeTimeDisplay: string;      // "12 seconds"
  waitTimeDisplay: string | null; // "5 days" or null
  creditsDisplay: string;         // "5 AI credits"

  // Scheduled projections (if agent has schedule)
  dailyProjection?: number;
  monthlyProjection?: number;

  // AC6: Bulk action info (if multiple identical actions detected)
  bulkActions?: BulkActionInfo[];
}

// Story 2.5: Previous test estimate for comparison (AC7)
export interface StoredEstimate {
  time: number;
  credits: number;
  timestamp: string;
}

// Story 2.5: Extended test run response with estimates
export interface TestRunResponseWithEstimates extends Omit<TestRunResponse, 'estimates'> {
  estimates?: ExecutionEstimate;
}

