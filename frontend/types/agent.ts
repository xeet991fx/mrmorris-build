export interface IAgent {
  _id: string;
  workspace: string;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: string;
  createdAt: string; // ISO 8601 date string from API
  updatedAt: string; // ISO 8601 date string from API

  // Future fields (optional, nullable for now)
  triggers?: any[];
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
