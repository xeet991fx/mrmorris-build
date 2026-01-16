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

export interface IAgent {
  _id: string;
  workspace: string;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: string;
  createdAt: string; // ISO 8601 date string from API
  updatedAt: string; // ISO 8601 date string from API

  // Story 1.2: Triggers (properly typed)
  triggers?: ITriggerConfig[];

  // Future fields (optional, nullable for now)
  instructions?: string | null;
  parsedActions?: any[];
  // Story 1.4: Restrictions (typed configuration)
  restrictions?: IAgentRestrictions;
  memory?: any;
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

export interface ListAgentsResponse {
  success: boolean;
  agents: IAgent[];
}

