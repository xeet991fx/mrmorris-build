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
  restrictions?: string | null;
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
