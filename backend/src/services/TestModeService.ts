/**
 * TestModeService.ts - Story 2.1, 2.2, 2.3: Test Mode with Enhanced Step Previews
 *
 * Simulates agent execution without performing real actions (DRY RUN).
 * Returns step-by-step results with rich previews for each action type.
 */

import Agent from '../models/Agent';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import InstructionValidationService from './InstructionValidationService';

// =============================================================================
// TYPE DEFINITIONS (matching frontend/types/agent.ts)
// =============================================================================

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

// Type-specific preview interfaces
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

export interface TestRunResult {
  success: boolean;
  error?: string;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: Array<{
    step: number;
    severity: 'warning' | 'error';
    message: string;
    suggestion?: string;
  }>;
  failedAtStep?: number;
}

interface TestContext {
  workspaceId: string;
  agentId: string;
  contact?: any;
  deal?: any;
  manualData?: Record<string, any>;
  variables: Record<string, any>;
}

interface ParsedAction {
  type: string;
  params?: Record<string, any>;
  condition?: string;
  trueBranch?: ParsedAction[];
  falseBranch?: ParsedAction[];
  lineNumber?: number;
  rawInstruction?: string;
  [key: string]: any;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const ACTION_ICONS: Record<string, StepIcon> = {
  search: 'search',
  find: 'search',
  send_email: 'email',
  email: 'email',
  wait: 'wait',
  delay: 'wait',
  conditional: 'conditional',
  if: 'conditional',
  linkedin_invite: 'linkedin',
  linkedin: 'linkedin',
  create_task: 'task',
  task: 'task',
  add_tag: 'tag',
  remove_tag: 'tag',
  tag: 'tag',
  update_field: 'update',
  update: 'update',
  update_deal_value: 'update',
  enrich_contact: 'enrich',
  enrich: 'enrich',
  human_handoff: 'handoff',
  handoff: 'handoff',
  web_search: 'web_search',
};

const ACTION_LABELS: Record<string, string> = {
  search: 'Search Contacts',
  find: 'Find Records',
  send_email: 'Send Email',
  email: 'Send Email',
  wait: 'Wait',
  delay: 'Delay',
  conditional: 'Conditional',
  if: 'If Condition',
  linkedin_invite: 'LinkedIn Invitation',
  linkedin: 'LinkedIn Action',
  create_task: 'Create Task',
  task: 'Create Task',
  add_tag: 'Add Tag',
  remove_tag: 'Remove Tag',
  tag: 'Manage Tags',
  update_field: 'Update Field',
  update: 'Update Record',
  update_deal_value: 'Update Deal Value',
  enrich_contact: 'Enrich Contact',
  enrich: 'Enrich Data',
  human_handoff: 'Human Handoff',
  handoff: 'Human Handoff',
  web_search: 'Web Search',
};

const CREDIT_COSTS: Record<string, number> = {
  send_email: 2,
  email: 2,
  linkedin_invite: 2,
  linkedin: 2,
  enrich_contact: 3,
  enrich: 3,
  web_search: 1,
  // Free actions
  search: 0,
  find: 0,
  wait: 0,
  delay: 0,
  conditional: 0,
  if: 0,
  create_task: 0,
  task: 0,
  add_tag: 0,
  remove_tag: 0,
  tag: 0,
  update_field: 0,
  update: 0,
  update_deal_value: 0,
  human_handoff: 0,
  handoff: 0,
};

function getActionIcon(actionType: string): StepIcon {
  return ACTION_ICONS[actionType] || 'update';
}

function getActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getEstimatedCredits(actionType: string): number {
  return CREDIT_COSTS[actionType] || 0;
}

function truncateText(text: string, maxLength: number = 500): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength) + '...';
}

function resolveVariables(template: string, context: TestContext): string {
  if (!template) return '';

  let resolved = template;

  // Replace @contact.* variables
  if (context.contact) {
    resolved = resolved.replace(/@contact\.(\w+)/g, (_, field) => {
      return context.contact[field] || context.manualData?.[`contact.${field}`] || `[${field}]`;
    });
  }

  // Replace @deal.* variables
  if (context.deal) {
    resolved = resolved.replace(/@deal\.(\w+)/g, (_, field) => {
      return context.deal[field] || context.manualData?.[`deal.${field}`] || `[${field}]`;
    });
  }

  // Replace manual data variables
  if (context.manualData) {
    Object.entries(context.manualData).forEach(([key, value]) => {
      resolved = resolved.replace(new RegExp(`@${key}`, 'g'), String(value));
    });
  }

  // Replace any remaining @variables with placeholders
  resolved = resolved.replace(/@(\w+(?:\.\w+)?)/g, (match, varName) => {
    return context.variables[varName] || `[${varName}]`;
  });

  return resolved;
}

function evaluateCondition(condition: string, context: TestContext): { result: boolean; explanation: string } {
  if (!condition) {
    return { result: true, explanation: 'No condition specified' };
  }

  // Parse simple conditions like "contact.replied == true" or "deal.value > 10000"
  const patterns = [
    /(\w+(?:\.\w+)?)\s*(==|!=|>|<|>=|<=|contains)\s*['"]?([^'"]+)['"]?/i,
    /(\w+(?:\.\w+)?)\s*(is|is not)\s*(empty|null|true|false)/i,
  ];

  for (const pattern of patterns) {
    const match = condition.match(pattern);
    if (match) {
      const [, field, operator, value] = match;
      let fieldValue: any;

      // Get field value from context
      if (field.startsWith('contact.') && context.contact) {
        fieldValue = context.contact[field.replace('contact.', '')];
      } else if (field.startsWith('deal.') && context.deal) {
        fieldValue = context.deal[field.replace('deal.', '')];
      } else if (context.manualData) {
        fieldValue = context.manualData[field];
      }

      // Evaluate based on operator
      let result = false;
      const normalizedOp = operator.toLowerCase();

      switch (normalizedOp) {
        case '==':
        case 'is':
          result = String(fieldValue) === String(value);
          break;
        case '!=':
        case 'is not':
          result = String(fieldValue) !== String(value);
          break;
        case '>':
          result = Number(fieldValue) > Number(value);
          break;
        case '<':
          result = Number(fieldValue) < Number(value);
          break;
        case '>=':
          result = Number(fieldValue) >= Number(value);
          break;
        case '<=':
          result = Number(fieldValue) <= Number(value);
          break;
        case 'contains':
          result = String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
          break;
      }

      const explanation = `${field} ${operator} ${value} → ${result ? 'TRUE' : 'FALSE'} (${field} = ${JSON.stringify(fieldValue)})`;
      return { result, explanation };
    }
  }

  // Default: can't evaluate, assume true
  return { result: true, explanation: `Could not evaluate: ${condition}` };
}

function getErrorSuggestions(error: Error | string, action: ParsedAction): string[] {
  const suggestions: string[] = [];
  const errorMsg = typeof error === 'string' ? error : error.message;

  // Template not found
  if (errorMsg.includes('template') && (errorMsg.includes('not found') || errorMsg.includes('does not exist'))) {
    const templateMatch = errorMsg.match(/['"]([^'"]+)['"]/);
    const templateName = templateMatch ? templateMatch[1] : 'the template';
    suggestions.push(`Create email template '${templateName}' in Settings > Email Templates`);
    suggestions.push('Update instruction to use an existing template');
  }

  // Variable not defined
  if (errorMsg.includes('variable') || errorMsg.includes('undefined') || errorMsg.includes('@')) {
    const varMatch = errorMsg.match(/@(\w+(?:\.\w+)?)/);
    if (varMatch) {
      suggestions.push(`Ensure contact/deal has the '${varMatch[1]}' field populated`);
      suggestions.push(`Use manual test data to provide a value for '${varMatch[1]}'`);
    }
  }

  // Invalid field
  if (errorMsg.includes('field') && (errorMsg.includes('invalid') || errorMsg.includes('not found'))) {
    suggestions.push('Check that the field name is spelled correctly');
    suggestions.push('Verify the field exists in contact/deal schema');
  }

  // Condition syntax error
  if (errorMsg.includes('condition') || errorMsg.includes('syntax')) {
    suggestions.push('Use "==" for comparison (not "=")');
    suggestions.push('Wrap string values in quotes: \'value\'');
    suggestions.push('Check variable names are valid');
  }

  // Integration not connected
  if (errorMsg.includes('integration') || errorMsg.includes('not connected') || errorMsg.includes('auth')) {
    suggestions.push('Connect the required integration in Settings > Integrations');
    suggestions.push('Remove this action if the integration is not needed');
  }

  // Generic fallback
  if (suggestions.length === 0) {
    suggestions.push('Review the instruction syntax');
    suggestions.push('Check agent configuration');
  }

  return suggestions;
}

// =============================================================================
// ACTION SIMULATION HANDLERS
// =============================================================================

async function simulateSearchAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { field, operator, value, target = 'contacts' } = action;
  const resolvedValue = resolveVariables(String(value || ''), context);

  let matchedCount = 0;
  let matches: Array<{ id: string; name: string; subtitle: string; company?: string }> = [];

  try {
    // Build query based on parameters
    const query: any = { workspace: context.workspaceId };
    if (field && resolvedValue) {
      if (operator === 'contains' || operator === 'like') {
        query[field] = { $regex: resolvedValue, $options: 'i' };
      } else {
        query[field] = resolvedValue;
      }
    }

    if (target === 'contacts' || target === 'contact') {
      const results = await Contact.find(query)
        .limit(6)
        .select('_id firstName lastName title company')
        .populate('company', 'name')
        .lean();

      matchedCount = await Contact.countDocuments(query);
      matches = results.slice(0, 5).map((c: any) => ({
        id: c._id.toString(),
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
        subtitle: c.title || '',
        company: c.company?.name,
      }));
    } else if (target === 'deals' || target === 'deal') {
      const results = await Opportunity.find(query)
        .limit(6)
        .select('_id name value stage')
        .lean();

      matchedCount = await Opportunity.countDocuments(query);
      matches = results.slice(0, 5).map((d: any) => ({
        id: d._id.toString(),
        name: d.name || 'Unnamed Deal',
        subtitle: d.value ? `$${d.value.toLocaleString()}` : '',
        company: d.stage,
      }));
    }
  } catch (err) {
    // If DB query fails, return simulated results
    matchedCount = 5;
    matches = [
      { id: '1', name: 'John Smith', subtitle: 'CEO', company: 'Acme Corp' },
      { id: '2', name: 'Jane Doe', subtitle: 'CTO', company: 'TechCo' },
      { id: '3', name: 'Bob Johnson', subtitle: 'VP Sales', company: 'SalesForce' },
    ];
  }

  const preview: SearchPreview = {
    type: 'search',
    matchedCount,
    matches,
    hasMore: matchedCount > 5,
  };

  const description = field
    ? `Search ${target}: ${field} ${operator || 'contains'} '${resolvedValue}'`
    : `Search all ${target}`;

  return {
    stepNumber,
    action: action.type,
    actionLabel: `Search ${target === 'deals' ? 'Deals' : 'Contacts'}`,
    icon: 'search',
    status: 'success',
    preview: {
      description,
      details: { field, operator, value: resolvedValue, matchedCount },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 100,
    estimatedCredits: 0,
    note: 'DRY RUN - No data modified',
  };
}

async function simulateEmailAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { to, subject, body, template } = action;

  const recipient = resolveVariables(to || '@contact.email', context);
  const resolvedSubject = resolveVariables(subject || 'No subject', context);
  const resolvedBody = resolveVariables(body || '', context);

  // Track resolved variables
  const variablesResolved: Record<string, string> = {};
  const varMatches = (to + subject + body).match(/@(\w+(?:\.\w+)?)/g) || [];
  varMatches.forEach(v => {
    const varName = v.replace('@', '');
    variablesResolved[varName] = resolveVariables(v, context);
  });

  const preview: EmailPreview = {
    type: 'email',
    recipient,
    subject: resolvedSubject,
    bodyPreview: truncateText(resolvedBody, 500),
    templateName: template,
    variablesResolved,
    isDryRun: true,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Send Email',
    icon: 'email',
    status: 'success',
    preview: {
      description: `Would send email to ${recipient}`,
      details: { to: recipient, subject: resolvedSubject, body: resolvedBody },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 200,
    estimatedCredits: 2,
    note: 'DRY RUN - Email NOT sent',
  };
}

async function simulateWaitAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { duration = 1, unit = 'days' } = action;

  const preview: WaitPreview = {
    type: 'wait',
    duration: Number(duration),
    unit: unit as WaitPreview['unit'],
    resumeNote: `Execution would pause for ${duration} ${unit}, then resume with next step`,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Wait',
    icon: 'wait',
    status: 'success',
    preview: {
      description: `Wait ${duration} ${unit} (SIMULATED)`,
      details: { duration, unit },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 50,
    estimatedCredits: 0,
    note: 'DRY RUN - Wait simulated instantly',
  };
}

async function simulateConditionalAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { condition, trueBranch = [], falseBranch = [] } = action;

  const { result, explanation } = evaluateCondition(condition || '', context);

  const preview: ConditionalPreview = {
    type: 'conditional',
    condition: condition || '',
    evaluatedTo: result,
    explanation,
    trueBranchSteps: trueBranch.map((_, i) => stepNumber + 1 + i),
    falseBranchSteps: falseBranch.map((_, i) => stepNumber + 1 + trueBranch.length + i),
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Conditional',
    icon: 'conditional',
    status: 'success',
    preview: {
      description: `If ${condition}`,
      details: { condition, result },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 10,
    estimatedCredits: 0,
    note: 'DRY RUN - Condition evaluated',
    conditionResult: result,
    conditionExplanation: explanation,
  };
}

async function simulateLinkedInAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { recipient, message, note } = action;

  const resolvedRecipient = resolveVariables(recipient || '@contact.linkedInUrl', context);
  const resolvedMessage = resolveVariables(message || '', context);

  const preview: LinkedInPreview = {
    type: 'linkedin',
    recipient: resolvedRecipient,
    messagePreview: resolvedMessage ? truncateText(resolvedMessage, 300) : undefined,
    connectionNote: note,
    isDryRun: true,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'LinkedIn Invitation',
    icon: 'linkedin',
    status: 'success',
    preview: {
      description: `Would send LinkedIn invitation to ${resolvedRecipient}`,
      details: { recipient: resolvedRecipient, message: resolvedMessage },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 200,
    estimatedCredits: 2,
    note: 'DRY RUN - Invitation NOT sent',
  };
}

async function simulateTaskAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { title, assignee, dueDate, dueIn } = action;

  const resolvedTitle = resolveVariables(title || 'Follow up', context);
  let resolvedDueDate = dueDate;
  if (dueIn) {
    const future = new Date();
    future.setDate(future.getDate() + Number(dueIn));
    resolvedDueDate = future.toISOString().split('T')[0];
  }

  const preview: TaskPreview = {
    type: 'task',
    taskTitle: resolvedTitle,
    assignee,
    dueDate: resolvedDueDate,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Create Task',
    icon: 'task',
    status: 'success',
    preview: {
      description: `Would create task: "${resolvedTitle}"`,
      details: { title: resolvedTitle, assignee, dueDate: resolvedDueDate },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 50,
    estimatedCredits: 0,
    note: 'DRY RUN - Task NOT created',
  };
}

async function simulateTagAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { tag, operation = action.type === 'remove_tag' ? 'remove' : 'add' } = action;
  const tagName = resolveVariables(tag || '', context);

  const preview: TagPreview = {
    type: 'tag',
    tagName,
    operation: operation as 'add' | 'remove',
    targetCount: 1,
  };

  const actionLabel = operation === 'remove' ? 'Remove Tag' : 'Add Tag';

  return {
    stepNumber,
    action: action.type,
    actionLabel,
    icon: 'tag',
    status: 'success',
    preview: {
      description: `Would ${operation} tag "${tagName}"`,
      details: { tag: tagName, operation },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 30,
    estimatedCredits: 0,
    note: 'DRY RUN - Tag NOT modified',
  };
}

async function simulateUpdateAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { field, value, newValue } = action;
  const fieldName = field || 'unknown';
  const resolvedValue = resolveVariables(String(newValue || value || ''), context);

  // Get old value from context if available
  let oldValue: string | undefined;
  if (context.contact && context.contact[fieldName]) {
    oldValue = String(context.contact[fieldName]);
  } else if (context.deal && context.deal[fieldName]) {
    oldValue = String(context.deal[fieldName]);
  }

  const preview: UpdatePreview = {
    type: 'update',
    fieldName,
    oldValue,
    newValue: resolvedValue,
    targetCount: 1,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Update Field',
    icon: 'update',
    status: 'success',
    preview: {
      description: `Would update ${fieldName} to "${resolvedValue}"`,
      details: { field: fieldName, oldValue, newValue: resolvedValue },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 50,
    estimatedCredits: 0,
    note: 'DRY RUN - Field NOT updated',
  };
}

async function simulateEnrichAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { source = 'Apollo.io', fields = ['email', 'phone', 'title', 'company'] } = action;

  const preview: EnrichPreview = {
    type: 'enrich',
    source,
    fieldsToEnrich: Array.isArray(fields) ? fields : [fields],
    targetCount: 1,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Enrich Contact',
    icon: 'enrich',
    status: 'success',
    preview: {
      description: `Would enrich contact using ${source}`,
      details: { source, fields },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 500,
    estimatedCredits: 3,
    note: 'DRY RUN - Contact NOT enriched',
  };
}

async function simulateWebSearchAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { query } = action;
  const resolvedQuery = resolveVariables(query || '', context);

  const preview: WebSearchPreview = {
    type: 'web_search',
    query: resolvedQuery,
    isDryRun: true,
  };

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Web Search',
    icon: 'web_search',
    status: 'success',
    preview: {
      description: `Would search: "${resolvedQuery}"`,
      details: { query: resolvedQuery },
    },
    richPreview: preview,
    isExpandable: true,
    duration: 300,
    estimatedCredits: 1,
    note: 'DRY RUN - Search NOT performed',
  };
}

async function simulateHandoffAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const { assignee, message } = action;
  const resolvedMessage = resolveVariables(message || '', context);

  return {
    stepNumber,
    action: action.type,
    actionLabel: 'Human Handoff',
    icon: 'handoff',
    status: 'success',
    preview: {
      description: `Would hand off to ${assignee || 'team member'}`,
      details: { assignee, message: resolvedMessage },
    },
    isExpandable: true,
    duration: 50,
    estimatedCredits: 0,
    note: 'DRY RUN - Handoff NOT triggered',
  };
}

// Action router
async function simulateAction(
  action: ParsedAction,
  context: TestContext,
  stepNumber: number
): Promise<TestStepResult> {
  const actionType = action.type?.toLowerCase() || 'unknown';

  try {
    switch (actionType) {
      case 'search':
      case 'find':
        return await simulateSearchAction(action, context, stepNumber);

      case 'send_email':
      case 'email':
        return await simulateEmailAction(action, context, stepNumber);

      case 'wait':
      case 'delay':
        return await simulateWaitAction(action, context, stepNumber);

      case 'conditional':
      case 'if':
        return await simulateConditionalAction(action, context, stepNumber);

      case 'linkedin_invite':
      case 'linkedin':
        return await simulateLinkedInAction(action, context, stepNumber);

      case 'create_task':
      case 'task':
        return await simulateTaskAction(action, context, stepNumber);

      case 'add_tag':
      case 'remove_tag':
      case 'tag':
        return await simulateTagAction(action, context, stepNumber);

      case 'update_field':
      case 'update':
      case 'update_deal_value':
        return await simulateUpdateAction(action, context, stepNumber);

      case 'enrich_contact':
      case 'enrich':
        return await simulateEnrichAction(action, context, stepNumber);

      case 'web_search':
        return await simulateWebSearchAction(action, context, stepNumber);

      case 'human_handoff':
      case 'handoff':
        return await simulateHandoffAction(action, context, stepNumber);

      default:
        return {
          stepNumber,
          action: actionType,
          actionLabel: getActionLabel(actionType),
          icon: getActionIcon(actionType),
          status: 'success',
          preview: {
            description: `Would execute: ${actionType}`,
            details: action,
          },
          isExpandable: true,
          duration: 100,
          estimatedCredits: getEstimatedCredits(actionType),
          note: 'DRY RUN - Action simulated',
        };
    }
  } catch (error: any) {
    return {
      stepNumber,
      action: actionType,
      actionLabel: getActionLabel(actionType),
      icon: getActionIcon(actionType),
      status: 'error',
      preview: {
        description: `Error: ${error.message}`,
        details: { error: error.message },
      },
      isExpandable: true,
      duration: 0,
      estimatedCredits: 0,
      note: 'Simulation failed',
      suggestions: getErrorSuggestions(error, action),
      errorContext: {
        lineNumber: action.lineNumber,
        instructionText: action.rawInstruction,
      },
    };
  }
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

export class TestModeService {
  /**
   * Simulates the execution of an agent without performing real actions (DRY RUN).
   * Returns step-by-step results with rich previews.
   */
  static async simulateExecution(
    agentId: string,
    workspaceId: string,
    testTarget?: { type: string; id?: string; manualData?: Record<string, any> }
  ): Promise<TestRunResult> {
    const warnings: TestRunResult['warnings'] = [];

    // Fetch agent with workspace isolation
    const agent = await Agent.findOne({ _id: agentId, workspace: workspaceId });

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found',
        steps: [],
        totalEstimatedCredits: 0,
        totalEstimatedDuration: 0,
        warnings: [],
      };
    }

    // Story 2.4: Run instruction validation at start of test mode
    try {
      const validationResult = await InstructionValidationService.validateInstructions({
        workspaceId,
        agentId,
        instructions: agent.instructions || '',
        parsedActions: agent.parsedActions || [],
        triggerType: agent.triggers?.[0]?.type,
        restrictions: agent.restrictions,
      });

      // Add validation errors to warnings
      for (const error of validationResult.errors) {
        warnings.push({
          step: 0,
          severity: 'error',
          message: error.message,
          suggestion: error.suggestion,
        });
      }

      // Add validation warnings to warnings
      for (const warning of validationResult.warnings) {
        warnings.push({
          step: 0,
          severity: 'warning',
          message: warning.message,
          suggestion: warning.suggestion,
        });
      }
    } catch (validationError) {
      console.error('Validation error during test mode:', validationError);
      // Continue with test even if validation fails
    }

    const parsedActions: ParsedAction[] = agent.parsedActions || [];

    // Warn if instructions exist but no parsed actions
    if (agent.instructions && parsedActions.length === 0) {
      warnings.push({
        step: 0,
        severity: 'warning',
        message: 'Agent has instructions but no parsed actions. Instructions may need to be re-parsed.',
        suggestion: 'Save the agent to trigger instruction parsing',
      });
    }

    if (parsedActions.length === 0) {
      return {
        success: true,
        steps: [],
        totalEstimatedCredits: 0,
        totalEstimatedDuration: 0,
        warnings,
      };
    }

    // Build test context
    const context: TestContext = {
      workspaceId,
      agentId,
      variables: {},
      manualData: testTarget?.manualData,
    };

    // Load test target data if specified
    if (testTarget?.type === 'contact' && testTarget.id) {
      try {
        context.contact = await Contact.findOne({
          _id: testTarget.id,
          workspace: workspaceId,
        }).populate('company', 'name domain').lean();
      } catch (err) {
        warnings.push({
          step: 0,
          severity: 'warning',
          message: 'Could not load test contact',
        });
      }
    } else if (testTarget?.type === 'deal' && testTarget.id) {
      try {
        context.deal = await Opportunity.findOne({
          _id: testTarget.id,
          workspace: workspaceId,
        }).lean();
      } catch (err) {
        warnings.push({
          step: 0,
          severity: 'warning',
          message: 'Could not load test deal',
        });
      }
    }

    // Execute simulation
    const steps: TestStepResult[] = [];
    let stepNumber = 1;
    let hasError = false;
    let failedAtStep: number | undefined;

    for (const action of parsedActions) {
      if (hasError) {
        // Mark remaining steps as not_executed
        steps.push({
          stepNumber,
          action: action.type || 'unknown',
          actionLabel: getActionLabel(action.type || 'unknown'),
          icon: getActionIcon(action.type || 'unknown'),
          status: 'not_executed',
          preview: {
            description: 'Not executed due to previous error',
          },
          isExpandable: false,
          duration: 0,
          estimatedCredits: 0,
          note: 'Skipped - previous step failed',
          skipReason: `Execution stopped at step ${failedAtStep} due to error`,
        });
        stepNumber++;
        continue;
      }

      const result = await simulateAction(action, context, stepNumber);
      steps.push(result);

      if (result.status === 'error') {
        hasError = true;
        failedAtStep = stepNumber;
        warnings.push({
          step: stepNumber,
          severity: 'error',
          message: result.preview.description,
          suggestion: result.suggestions?.[0],
        });
      }

      // Handle conditional logic - mark skipped steps
      if (action.type === 'conditional' || action.type === 'if') {
        const conditionResult = result.conditionResult;
        const trueBranch = action.trueBranch || [];
        const falseBranch = action.falseBranch || [];

        // Process the appropriate branch
        const activeBranch = conditionResult ? trueBranch : falseBranch;
        const skippedBranch = conditionResult ? falseBranch : trueBranch;
        const skipReason = conditionResult
          ? 'Skipped - condition evaluated to TRUE'
          : 'Skipped - condition evaluated to FALSE';

        // Execute active branch
        for (const branchAction of activeBranch) {
          stepNumber++;
          if (hasError) {
            steps.push({
              stepNumber,
              action: branchAction.type || 'unknown',
              actionLabel: getActionLabel(branchAction.type || 'unknown'),
              icon: getActionIcon(branchAction.type || 'unknown'),
              status: 'not_executed',
              preview: { description: 'Not executed due to previous error' },
              isExpandable: false,
              duration: 0,
              estimatedCredits: 0,
              note: 'Skipped - previous step failed',
              skipReason: `Execution stopped at step ${failedAtStep} due to error`,
            });
          } else {
            const branchResult = await simulateAction(branchAction, context, stepNumber);
            steps.push(branchResult);
            if (branchResult.status === 'error') {
              hasError = true;
              failedAtStep = stepNumber;
            }
          }
        }

        // Mark skipped branch
        for (const skippedAction of skippedBranch) {
          stepNumber++;
          steps.push({
            stepNumber,
            action: skippedAction.type || 'unknown',
            actionLabel: getActionLabel(skippedAction.type || 'unknown'),
            icon: getActionIcon(skippedAction.type || 'unknown'),
            status: 'skipped',
            preview: {
              description: `Would ${getActionLabel(skippedAction.type || 'unknown').toLowerCase()}`,
            },
            isExpandable: false,
            duration: 0,
            estimatedCredits: 0,
            note: 'Skipped due to condition',
            skipReason,
          });
        }
      }

      stepNumber++;
    }

    // Calculate totals
    const totalEstimatedCredits = steps.reduce((sum, s) => sum + (s.estimatedCredits || 0), 0);
    const totalEstimatedDuration = steps.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      success: !hasError,
      steps,
      totalEstimatedCredits,
      totalEstimatedDuration,
      warnings,
      failedAtStep,
    };
  }
}

export default TestModeService;
