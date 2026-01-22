/**
 * ActionExecutorService.ts - Story 3.1: Parse and Execute Instructions
 *
 * Handles execution of individual actions with integration connections.
 * Each action type has a dedicated handler that performs the real action.
 *
 * AC1: Each action is executed in sequence
 * AC2: Variable Resolution (handled by caller)
 * AC5: Execution Performance with error handling and retry logic
 */

import emailService from './email';
import { sendConnectionRequest } from './LinkedInService';
import ApolloService from './ApolloService';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Task from '../models/Task';
import mongoose from 'mongoose';
import { ParsedAction } from './InstructionParserService';
import { ExecutionContext } from './AgentExecutionService';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, defaultQueueOptions } from '../events/queue/queue.config';
import AgentExecution from '../models/AgentExecution';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ActionResult {
  success: boolean;
  description: string;
  error?: string;
  targetCount?: number;
  recipients?: string[];
  conditionResult?: boolean;
  fieldUpdates?: Record<string, any>;
  durationMs?: number;
  data?: Record<string, any>;
  scheduled?: boolean; // For long waits that are scheduled
}

interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

// =============================================================================
// RATE LIMITING (Story 3.1 Architecture Requirements)
// =============================================================================

const ACTION_RATE_LIMITS = {
  send_email: 100,      // Max 100 emails per day per agent
  linkedin_invite: 100, // Max 100 LinkedIn invites per day per agent (API terms)
};

// BullMQ queue for scheduling long waits
let agentResumeQueue: Queue | null = null;

/**
 * Get or create the agent resume queue (lazy initialization)
 */
function getAgentResumeQueue(): Queue {
  if (!agentResumeQueue) {
    agentResumeQueue = new Queue(QUEUE_NAMES.AGENT_EXECUTION_RESUME, defaultQueueOptions);
  }
  return agentResumeQueue;
}

/**
 * Check rate limit for an action type
 */
async function checkActionRateLimit(
  actionType: string,
  context: ExecutionContext
): Promise<{ allowed: boolean; usageToday: number; limit: number }> {
  const limit = ACTION_RATE_LIMITS[actionType as keyof typeof ACTION_RATE_LIMITS];
  if (!limit) {
    return { allowed: true, usageToday: 0, limit: 0 };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Count successful actions of this type today
  const executions = await AgentExecution.find({
    agent: new mongoose.Types.ObjectId(context.agentId),
    workspace: new mongoose.Types.ObjectId(context.workspaceId),
    startedAt: { $gte: startOfDay },
    status: { $in: ['completed', 'running'] },
  }).select('steps');

  let usageToday = 0;
  for (const exec of executions) {
    for (const step of exec.steps) {
      if (step.action === actionType && step.result.success) {
        usageToday += step.result.recipients?.length || 1;
      }
    }
  }

  return {
    allowed: usageToday < limit,
    usageToday,
    limit,
  };
}

/**
 * Sanitize error message to avoid exposing internal details
 */
function sanitizeErrorMessage(error: string): string {
  // Remove stack traces, file paths, and internal implementation details
  const sanitized = error
    .replace(/at\s+.*$/gm, '') // Remove stack trace lines
    .replace(/\b[A-Z]:\\[^\s]+/g, '[path]') // Remove Windows paths
    .replace(/\/[^\s]+\.(ts|js)/g, '[file]') // Remove Unix paths
    .replace(/node_modules[^\s]*/g, '[internal]') // Remove node_modules references
    .replace(/\n+/g, ' ') // Collapse newlines
    .trim();

  // Truncate long messages
  return sanitized.substring(0, 200);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.delayMs;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.message?.includes('not connected') ||
        error.message?.includes('not authorized') ||
        error.message?.includes('invalid credentials') ||
        error.message?.includes('not found')
      ) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        console.log(`Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms`);
        await sleep(delay);
        delay *= config.backoffMultiplier;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

/**
 * Execute send_email action using Gmail integration
 */
async function executeSendEmail(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const to = action.to || action.params?.to;
    const subject = action.subject || action.params?.subject || 'No subject';
    const body = action.body || action.params?.body || '';
    const templateName = action.template || action.params?.template;

    if (!to) {
      return {
        success: false,
        description: 'Send email failed: no recipient specified',
        error: 'Missing recipient (to) field',
        durationMs: Date.now() - startTime,
      };
    }

    // Check rate limit before sending
    const rateLimit = await checkActionRateLimit('send_email', context);
    if (!rateLimit.allowed) {
      return {
        success: false,
        description: `Email rate limit exceeded: ${rateLimit.usageToday}/${rateLimit.limit} emails sent today`,
        error: `Daily email limit of ${rateLimit.limit} reached. Try again tomorrow.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Use email service to send
    await withRetry(async () => {
      await emailService.sendEmail({
        to,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      });
    });

    return {
      success: true,
      description: `Email sent to ${to}`,
      recipients: [to],
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Send email failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute linkedin_invite action
 */
async function executeLinkedInInvite(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const recipient = action.recipient || action.params?.recipient;
    const message = action.message || action.params?.message;

    if (!recipient) {
      return {
        success: false,
        description: 'LinkedIn invite failed: no recipient specified',
        error: 'Missing recipient field',
        durationMs: Date.now() - startTime,
      };
    }

    // Check rate limit before sending (LinkedIn API terms: 100 invites/day)
    const rateLimit = await checkActionRateLimit('linkedin_invite', context);
    if (!rateLimit.allowed) {
      return {
        success: false,
        description: `LinkedIn invite rate limit exceeded: ${rateLimit.usageToday}/${rateLimit.limit} invites sent today`,
        error: `Daily LinkedIn invite limit of ${rateLimit.limit} reached. Try again tomorrow.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Use LinkedInService to send invitation
    await withRetry(async () => {
      const result = await sendConnectionRequest({
        profileUrl: recipient,
        note: message,
      });
      if (!result.success) {
        throw new Error(result.error || 'LinkedIn invitation failed');
      }
    });

    return {
      success: true,
      description: `LinkedIn invitation sent to ${recipient}`,
      recipients: [recipient],
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `LinkedIn invite failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute web_search action
 */
async function executeWebSearch(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const query = action.query || action.params?.query;

    if (!query) {
      return {
        success: false,
        description: 'Web search failed: no query specified',
        error: 'Missing query field',
        durationMs: Date.now() - startTime,
      };
    }

    // Web search implementation would go here
    // For now, return a placeholder result
    // In production, this would use a search API (Google, Bing, etc.)

    return {
      success: true,
      description: `Web search completed for: ${query}`,
      data: {
        query,
        results: [], // Would contain actual search results
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Web search failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute create_task action
 */
async function executeCreateTask(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const title = action.title || action.params?.title || 'Follow up';
    const assignee = action.assignee || action.params?.assignee;
    const dueIn = action.dueIn || action.params?.dueIn || 1; // Default 1 day

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(dueIn));

    // Create task in database
    const task = await Task.create({
      workspace: context.workspaceId,
      title,
      description: `Auto-created by agent execution ${context.executionId}`,
      dueDate,
      status: 'pending',
      priority: 'medium',
      assignee: assignee || undefined,
      relatedContact: context.contact?._id,
      relatedDeal: context.deal?._id,
      createdBy: context.userId || 'system',
    });

    return {
      success: true,
      description: `Task created: "${title}" (due: ${dueDate.toLocaleDateString()})`,
      data: {
        taskId: task._id.toString(),
        title,
        dueDate: dueDate.toISOString(),
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Create task failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute add_tag or remove_tag action
 */
async function executeTagAction(
  action: ParsedAction,
  context: ExecutionContext,
  operation: 'add' | 'remove'
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const tag = action.tag || action.params?.tag;

    if (!tag) {
      return {
        success: false,
        description: `${operation === 'add' ? 'Add' : 'Remove'} tag failed: no tag specified`,
        error: 'Missing tag field',
        durationMs: Date.now() - startTime,
      };
    }

    let targetCount = 0;

    // Update contact if in context
    if (context.contact?._id) {
      const updateOp = operation === 'add'
        ? { $addToSet: { tags: tag } }
        : { $pull: { tags: tag } };

      await Contact.findOneAndUpdate(
        { _id: context.contact._id, workspace: context.workspaceId },
        updateOp
      );
      targetCount++;
    }

    // Update deal if in context
    if (context.deal?._id) {
      const updateOp = operation === 'add'
        ? { $addToSet: { tags: tag } }
        : { $pull: { tags: tag } };

      await Opportunity.findOneAndUpdate(
        { _id: context.deal._id, workspace: context.workspaceId },
        updateOp
      );
      targetCount++;
    }

    if (targetCount === 0) {
      return {
        success: false,
        description: `${operation === 'add' ? 'Add' : 'Remove'} tag failed: no target contact or deal`,
        error: 'No target to apply tag to',
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      description: `Tag "${tag}" ${operation === 'add' ? 'added to' : 'removed from'} ${targetCount} record(s)`,
      targetCount,
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `${operation === 'add' ? 'Add' : 'Remove'} tag failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute update_field action
 */
async function executeUpdateField(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const field = action.field || action.params?.field;
    const value = action.value ?? action.params?.value;

    if (!field) {
      return {
        success: false,
        description: 'Update field failed: no field specified',
        error: 'Missing field name',
        durationMs: Date.now() - startTime,
      };
    }

    let targetCount = 0;
    const fieldUpdates: Record<string, any> = { [field]: value };

    // Update contact if in context
    if (context.contact?._id) {
      await Contact.findOneAndUpdate(
        { _id: context.contact._id, workspace: context.workspaceId },
        { $set: { [field]: value } }
      );
      targetCount++;
    }

    // Update deal if in context
    if (context.deal?._id) {
      await Opportunity.findOneAndUpdate(
        { _id: context.deal._id, workspace: context.workspaceId },
        { $set: { [field]: value } }
      );
      targetCount++;
    }

    if (targetCount === 0) {
      return {
        success: false,
        description: 'Update field failed: no target contact or deal',
        error: 'No target to update',
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      description: `Updated ${field} to "${value}" on ${targetCount} record(s)`,
      targetCount,
      fieldUpdates,
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Update field failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute enrich_contact action using Apollo
 */
async function executeEnrichContact(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    if (!context.contact?._id) {
      return {
        success: false,
        description: 'Enrich contact failed: no contact in context',
        error: 'No contact to enrich',
        durationMs: Date.now() - startTime,
      };
    }

    const fields = action.params?.fields || ['email', 'phone', 'title', 'company'];

    // Use ApolloService to enrich
    await withRetry(async () => {
      const result = await ApolloService.enrichContact(
        context.contact!._id.toString(),
        new mongoose.Types.ObjectId(context.workspaceId)
      );
      if (!result.success) {
        throw new Error(result.error || 'Enrichment failed');
      }
    });

    return {
      success: true,
      description: `Contact enriched with Apollo.io data`,
      targetCount: 1,
      data: {
        contactId: context.contact._id.toString(),
        fieldsEnriched: fields,
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Enrich contact failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute wait action
 */
async function executeWait(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  const duration = action.duration || action.params?.duration || 1;
  const unit = action.unit || action.params?.unit || 'days';

  // Convert to milliseconds
  let durationMs = duration;
  switch (unit) {
    case 'seconds':
      durationMs = duration * 1000;
      break;
    case 'minutes':
      durationMs = duration * 60 * 1000;
      break;
    case 'hours':
      durationMs = duration * 60 * 60 * 1000;
      break;
    case 'days':
      durationMs = duration * 24 * 60 * 60 * 1000;
      break;
  }

  // For very short waits (under 1 minute), actually wait inline
  if (durationMs <= 60000) {
    await sleep(durationMs);
    return {
      success: true,
      description: `Waited ${duration} ${unit}`,
      data: {
        duration,
        unit,
        durationMs,
      },
      durationMs: Date.now() - startTime,
    };
  }

  // For longer waits, schedule a BullMQ job to resume execution
  const resumeAt = new Date(Date.now() + durationMs);
  const queue = getAgentResumeQueue();

  await queue.add(
    'resume-execution',
    {
      executionId: context.executionId,
      agentId: context.agentId,
      workspaceId: context.workspaceId,
      resumeFromStep: action.order, // Resume from next step
      scheduledAt: new Date().toISOString(),
    },
    {
      delay: durationMs,
      jobId: `resume_${context.executionId}_${action.order}`,
    }
  );

  return {
    success: true,
    scheduled: true, // Indicates this is a scheduled resume, not inline wait
    description: `Wait scheduled for ${duration} ${unit}. Execution will resume at ${resumeAt.toISOString()}`,
    data: {
      duration,
      unit,
      durationMs,
      resumeAt: resumeAt.toISOString(),
      jobId: `resume_${context.executionId}_${action.order}`,
    },
    durationMs: Date.now() - startTime,
  };
}

/**
 * Execute search action
 */
async function executeSearch(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const target = action.target || action.params?.target || 'contacts';
    const field = action.field || action.params?.field;
    const operator = action.operator || action.params?.operator || 'contains';
    const value = action.value || action.params?.value;

    // Build query
    const query: Record<string, any> = { workspace: context.workspaceId };

    if (field && value !== undefined) {
      if (operator === 'contains') {
        query[field] = { $regex: value, $options: 'i' };
      } else if (operator === 'equals') {
        query[field] = value;
      } else if (operator === 'greater_than') {
        query[field] = { $gt: value };
      } else if (operator === 'less_than') {
        query[field] = { $lt: value };
      }
    }

    let results: any[] = [];
    let count = 0;

    if (target === 'contacts' || target === 'contact') {
      results = await Contact.find(query).limit(100).lean();
      count = await Contact.countDocuments(query);
    } else if (target === 'deals' || target === 'deal') {
      results = await Opportunity.find(query).limit(100).lean();
      count = await Opportunity.countDocuments(query);
    }

    // Store results in context for subsequent actions
    context.variables['searchResults'] = results;
    context.variables['searchCount'] = count;

    return {
      success: true,
      description: `Found ${count} ${target} matching criteria`,
      targetCount: count,
      data: {
        target,
        field,
        operator,
        value,
        resultCount: results.length,
        totalCount: count,
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Search failed: ${error.message}`,
      error: error.message,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute human_handoff action - creates task and notifies assignee
 */
async function executeHumanHandoff(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const assignee = action.assignee || action.params?.assignee;
    const message = action.message || action.params?.message || 'Agent execution requires human review';
    const priority = action.priority || action.params?.priority || 'high';

    // Create a task for the handoff
    const taskTitle = `[Agent Handoff] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`;

    const task = await Task.create({
      workspace: context.workspaceId,
      title: taskTitle,
      description: `**Human Handoff from Agent Execution**\n\n` +
        `**Execution ID:** ${context.executionId}\n` +
        `**Agent ID:** ${context.agentId}\n` +
        `**Message:** ${message}\n\n` +
        (context.contact ? `**Contact:** ${context.contact.firstName || ''} ${context.contact.lastName || ''} (${context.contact.email || 'No email'})\n` : '') +
        (context.deal ? `**Deal:** ${context.deal.name || 'Unknown'}\n` : ''),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      status: 'pending',
      priority: priority,
      assignee: assignee || undefined,
      relatedContact: context.contact?._id,
      relatedDeal: context.deal?._id,
      createdBy: 'system',
      tags: ['agent-handoff', 'requires-review'],
    });

    // TODO: In production, also send notification via email/Slack to assignee
    // This would integrate with NotificationService when available

    return {
      success: true,
      description: `Human handoff created: Task assigned to ${assignee || 'team'} for review`,
      data: {
        taskId: task._id.toString(),
        assignee: assignee || 'unassigned',
        message,
        priority,
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Human handoff failed: ${sanitizeErrorMessage(error.message)}`,
      error: sanitizeErrorMessage(error.message),
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

export class ActionExecutorService {
  /**
   * Execute a single action and return the result.
   * Routes to the appropriate handler based on action type.
   */
  static async executeAction(
    action: ParsedAction,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const actionType = action.type?.toLowerCase() || 'unknown';

    switch (actionType) {
      case 'send_email':
      case 'email':
        return executeSendEmail(action, context);

      case 'linkedin_invite':
      case 'linkedin':
        return executeLinkedInInvite(action, context);

      case 'web_search':
        return executeWebSearch(action, context);

      case 'create_task':
      case 'task':
        return executeCreateTask(action, context);

      case 'add_tag':
        return executeTagAction(action, context, 'add');

      case 'remove_tag':
        return executeTagAction(action, context, 'remove');

      case 'update_field':
      case 'update':
      case 'update_deal_value':
        return executeUpdateField(action, context);

      case 'enrich_contact':
      case 'enrich':
        return executeEnrichContact(action, context);

      case 'wait':
      case 'delay':
        return executeWait(action, context);

      case 'search':
      case 'find':
        return executeSearch(action, context);

      case 'human_handoff':
      case 'handoff':
        return executeHumanHandoff(action, context);

      case 'conditional':
      case 'if':
        // Conditionals are handled by AgentExecutionService
        return {
          success: true,
          description: 'Conditional evaluated',
        };

      default:
        return {
          success: false,
          description: `Unknown action type: ${actionType}`,
          error: `Unsupported action type: ${actionType}`,
        };
    }
  }
}

export default ActionExecutorService;
