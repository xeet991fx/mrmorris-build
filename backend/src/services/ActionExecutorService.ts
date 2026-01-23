/**
 * ActionExecutorService.ts - Story 3.1: Parse and Execute Instructions
 * Updated Story 3.7: Send Email Action via Gmail API
 *
 * Handles execution of individual actions with integration connections.
 * Each action type has a dedicated handler that performs the real action.
 *
 * AC1: Each action is executed in sequence
 * AC2: Variable Resolution (handled by caller)
 * AC5: Execution Performance with error handling and retry logic
 *
 * Story 3.7 Additions:
 * - Gmail API integration for email sending
 * - Email template loading and variable resolution
 * - Activity logging for sent emails
 * - Auto-pause on rate limit exceeded
 */

import LinkedInService from '../utils/LinkedInService';
import WebSearchService from '../utils/WebSearchService';
import ApolloService from './ApolloService';
import GmailService from '../utils/GmailService';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Task from '../models/Task';
import Activity from '../models/Activity';
import EmailTemplate from '../models/EmailTemplate';
import Agent from '../models/Agent';
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
 * Resolve email template variables in content
 * Supports @contact.*, @company.*, @deal.*, @search.results[N].field, and {{variable}} formats
 * Story 3.7 AC2: Variable Resolution
 * Story 3.9 AC2: Search results variable resolution
 */
function resolveEmailVariables(
  content: string,
  context: ExecutionContext
): string {
  // Replace @contact.* variables
  content = content.replace(/@contact\.(\w+)/g, (match, field) => {
    const value = context.contact?.[field];
    return value !== undefined && value !== null ? String(value) : match;
  });

  // Replace @company.* variables (from contact.company)
  content = content.replace(/@company\.(\w+)/g, (match, field) => {
    const company = context.contact?.company;
    if (typeof company === 'object' && company !== null) {
      const value = company[field];
      return value !== undefined && value !== null ? String(value) : match;
    }
    return match;
  });

  // Replace @deal.* variables
  content = content.replace(/@deal\.(\w+)/g, (match, field) => {
    const value = context.deal?.[field];
    return value !== undefined && value !== null ? String(value) : match;
  });

  // Story 3.9 AC2: Replace @search.results[N].field patterns
  // Supports: @search.results[0].title, @search.results[0].snippet, @search.results[0].url
  content = content.replace(/@search\.results\[(\d+)\]\.(\w+)/g, (match, index, field) => {
    const results = context.variables?.search?.results;
    if (!Array.isArray(results)) return match;

    const idx = parseInt(index, 10);
    // AC2: Out of bounds returns empty string (graceful handling)
    if (idx >= results.length) return '';

    const value = results[idx]?.[field];
    return value !== undefined && value !== null ? String(value) : match;
  });

  // Story 3.9 AC2: Replace @search.results.length for conditional logic
  content = content.replace(/@search\.results\.length/g, () => {
    const results = context.variables?.search?.results;
    return Array.isArray(results) ? String(results.length) : '0';
  });

  // Story 3.9: Replace @search.count (alias for results.length)
  content = content.replace(/@search\.count/g, () => {
    const count = context.variables?.search?.count;
    return count !== undefined ? String(count) : '0';
  });

  // Story 3.9: Replace @search.query (the resolved search query)
  content = content.replace(/@search\.query/g, () => {
    const query = context.variables?.search?.query;
    return query !== undefined ? String(query) : '';
  });

  // Also support {{variable}} format from templates
  content = content.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    // Check contact first, then deal, then variables
    const value = context.contact?.[field]
      ?? context.deal?.[field]
      ?? context.variables?.[field];
    return value !== undefined && value !== null ? String(value) : match;
  });

  return content;
}

/**
 * Load email template by name from workspace
 * Story 3.7 AC1: Template Loading
 */
async function loadEmailTemplate(
  templateName: string,
  workspaceId: string
): Promise<{ subject: string; body: string } | null> {
  const template = await EmailTemplate.findOne({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    name: templateName,
  });

  if (!template) {
    return null;
  }

  const subject = template.subject || '';
  const body = template.htmlContent || template.body || '';

  // Warn if template has empty body
  if (!body.trim()) {
    console.warn(`Warning: Email template '${templateName}' has empty body content`);
  }

  return { subject, body };
}

/**
 * Update email template usage stats
 * Story 3.7 AC3: Template Usage Tracking
 */
async function updateTemplateUsage(
  templateName: string,
  workspaceId: string
): Promise<void> {
  await EmailTemplate.findOneAndUpdate(
    {
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      name: templateName,
    },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    }
  );
}

/**
 * Create activity for email sent
 * Story 3.7 AC3: Activity Logging
 */
async function createEmailActivity(
  workspaceId: string,
  context: ExecutionContext,
  to: string,
  subject: string,
  messageId?: string
): Promise<void> {
  const contactName = context.contact?.firstName
    ? `${context.contact.firstName} ${context.contact.lastName || ''}`.trim()
    : to;

  await Activity.create({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    type: 'email',
    title: `Email sent to ${contactName}`,
    direction: 'outbound',
    emailSubject: subject,
    automated: true,
    entityType: context.contact?._id ? 'contact' : undefined,
    entityId: context.contact?._id ? new mongoose.Types.ObjectId(context.contact._id) : undefined,
    metadata: {
      agentId: context.agentId,
      executionId: context.executionId,
      messageId,
      recipient: to,
    },
  });
}

/**
 * Create activity for LinkedIn invitation sent
 * Story 3.8 AC7: Activity Logging - type='linkedin_invitation'
 */
async function createLinkedInActivity(
  workspaceId: string,
  context: ExecutionContext,
  profileUrl: string,
  note?: string,
  invitationId?: string
): Promise<void> {
  const contactName = context.contact?.firstName
    ? `${context.contact.firstName} ${context.contact.lastName || ''}`.trim()
    : profileUrl;

  await Activity.create({
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    type: 'linkedin_invitation',  // AC7: Correct activity type
    title: `LinkedIn invitation sent to ${contactName}`,
    direction: 'outbound',
    automated: true,
    entityType: context.contact?._id ? 'contact' : undefined,
    entityId: context.contact?._id ? new mongoose.Types.ObjectId(context.contact._id) : undefined,
    description: note ? `Note: ${note.substring(0, 200)}${note.length > 200 ? '...' : ''}` : undefined,
    metadata: {
      agentId: context.agentId,
      executionId: context.executionId,
      invitationId,
      profileUrl,
    },
  });
}

/**
 * Auto-pause agent when rate limit exceeded
 * Story 3.7 AC5: Email Limit and Auto-Pause
 */
async function autoPauseAgent(
  agentId: string,
  workspaceId: string,
  reason: string
): Promise<void> {
  await Agent.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(agentId),
      workspace: new mongoose.Types.ObjectId(workspaceId),
    },
    {
      $set: {
        status: 'Paused',
        pauseReason: reason,
      },
    }
  );

  // Emit notification event for workspace owners/admins
  // Using the existing event emitter pattern from queue system
  try {
    const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS || 'notifications', defaultQueueOptions);
    await notificationQueue.add('agent-paused', {
      type: 'agent_paused',
      workspaceId,
      agentId,
      reason,
      timestamp: new Date().toISOString(),
    });
    await notificationQueue.close();
  } catch (error) {
    // Log but don't fail the operation if notification fails
    console.error('Failed to send agent pause notification:', error);
  }

  console.log(`Agent ${agentId} auto-paused: ${reason}`);
}

/**
 * Execute send_email action using Gmail integration
 * Story 3.7: Complete Gmail API implementation
 */
async function executeSendEmail(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    let to = action.to || action.params?.to;
    let subject = action.subject || action.params?.subject || 'No subject';
    let body = action.body || action.params?.body || '';
    const templateName = action.template || action.params?.template;

    // If recipient not specified, try to get from context contact
    if (!to && context.contact?.email) {
      to = context.contact.email;
    }

    if (!to) {
      return {
        success: false,
        description: 'Send email failed: no recipient specified',
        error: 'Missing recipient (to) field',
        durationMs: Date.now() - startTime,
      };
    }

    // Check rate limit before sending (AC5)
    const rateLimit = await checkActionRateLimit('send_email', context);
    if (!rateLimit.allowed) {
      // Auto-pause the agent
      await autoPauseAgent(
        context.agentId,
        context.workspaceId,
        'Email limit reached (100/day)'
      );

      return {
        success: false,
        description: `Email rate limit exceeded: ${rateLimit.usageToday}/${rateLimit.limit} emails sent today`,
        error: 'Email limit reached (100/day). Agent auto-paused. Limit resets at midnight.',
        durationMs: Date.now() - startTime,
      };
    }

    // Load template if specified (AC1, Task 2)
    if (templateName) {
      const template = await loadEmailTemplate(templateName, context.workspaceId);
      if (!template) {
        return {
          success: false,
          description: `Send email failed: template not found`,
          error: `Email template '${templateName}' not found in workspace.`,
          durationMs: Date.now() - startTime,
        };
      }
      subject = template.subject;
      body = template.body;
    }

    // Resolve variables in subject and body (AC2)
    subject = resolveEmailVariables(subject, context);
    body = resolveEmailVariables(body, context);

    // Send via Gmail API (AC1, AC4, AC6)
    const result = await GmailService.sendEmailWithWorkspaceAccount(
      context.workspaceId,
      to,
      subject,
      body
    );

    if (!result.success) {
      return {
        success: false,
        description: `Send email failed: ${result.error}`,
        error: result.error,
        durationMs: Date.now() - startTime,
        data: {
          retryAttempts: result.retryAttempts,
        },
      };
    }

    // Create CRM activity (AC3, Task 3)
    await createEmailActivity(
      context.workspaceId,
      context,
      to,
      subject,
      result.messageId
    );

    // Update template usage if used (Task 3.4)
    if (templateName) {
      await updateTemplateUsage(templateName, context.workspaceId);
    }

    return {
      success: true,
      description: `Email sent to ${to}`,
      recipients: [to],
      durationMs: Date.now() - startTime,
      data: {
        messageId: result.messageId,
        subject,
        recipient: to,
        templateName: templateName || undefined,
        retryAttempts: result.retryAttempts,
      },
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Send email failed: ${sanitizeErrorMessage(error.message)}`,
      error: sanitizeErrorMessage(error.message),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute linkedin_invitation action
 * Story 3.8: LinkedIn Invitation Action via LinkedIn API
 *
 * AC1: Send invitation with custom note (variable resolution)
 * AC2: Use contact LinkedIn URL
 * AC3: Handle missing LinkedIn URL (skip, don't fail)
 * AC4: Rate limiting (100/day)
 * AC5: Auto-pause on limit exceeded
 * AC6: Handle expired credentials
 * AC7: Activity logging
 */
async function executeLinkedInInvite(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    // Get recipient - from action params or contact context
    let profileUrl = action.recipient || action.params?.recipient || action.params?.profileUrl;
    let note = action.message || action.note || action.params?.note || action.params?.message;

    // AC2: If recipient not specified, try to get from context contact
    if (!profileUrl && context.contact?.linkedinUrl) {
      profileUrl = context.contact.linkedinUrl;
    }

    // Get contact name for error messages and activity logging
    const contactName = context.contact?.firstName
      ? `${context.contact.firstName} ${context.contact.lastName || ''}`.trim()
      : undefined;

    // AC3: Handle missing LinkedIn URL
    if (!profileUrl) {
      const name = contactName || 'Unknown contact';
      console.log(`Skipping LinkedIn invitation: Contact '${name}' does not have LinkedIn URL`);
      return {
        success: false,
        description: `Contact '${name}' does not have LinkedIn URL. Skipping.`,
        error: `Contact '${name}' does not have LinkedIn URL. Skipping.`,
        durationMs: Date.now() - startTime,
        data: {
          skipped: true,
          reason: 'missing_linkedin_url',
        },
      };
    }

    // AC4: Check rate limit before sending
    const rateLimit = await LinkedInService.checkDailyLimit(context.workspaceId);
    if (!rateLimit.allowed) {
      // AC5: Auto-pause the agent
      await autoPauseAgent(
        context.agentId,
        context.workspaceId,
        'LinkedIn daily limit reached (100/day)'
      );

      return {
        success: false,
        description: `LinkedIn rate limit exceeded: ${rateLimit.usageToday}/${rateLimit.limit} invitations sent today`,
        error: 'LinkedIn daily limit reached (100 invitations/day). Agent auto-paused. Limit resets tomorrow.',
        durationMs: Date.now() - startTime,
      };
    }

    // AC1: Resolve variables in note (reuse email variable resolution pattern)
    if (note) {
      note = resolveEmailVariables(note, context);
    }

    // Send via LinkedIn API (AC1, AC2, AC6)
    const result = await LinkedInService.sendInvitationWithWorkspaceAccount(
      context.workspaceId,
      profileUrl,
      note,
      contactName
    );

    // Handle skipped contacts (missing LinkedIn URL from service)
    if (result.skipped) {
      return {
        success: false,
        description: result.error || 'Contact skipped (no LinkedIn URL)',
        error: result.error,
        durationMs: Date.now() - startTime,
        data: {
          skipped: true,
          reason: 'missing_linkedin_url',
        },
      };
    }

    if (!result.success) {
      // Check if this is a rate limit error that should trigger auto-pause
      if (result.error?.includes('daily limit')) {
        await autoPauseAgent(
          context.agentId,
          context.workspaceId,
          'LinkedIn daily limit reached (100/day)'
        );
      }

      return {
        success: false,
        description: `LinkedIn invitation failed: ${result.error}`,
        error: result.error,
        durationMs: Date.now() - startTime,
        data: {
          retryAttempts: result.retryAttempts,
        },
      };
    }

    // AC7: Create CRM activity on success
    await createLinkedInActivity(
      context.workspaceId,
      context,
      profileUrl,
      note,
      result.invitationId
    );

    return {
      success: true,
      description: `LinkedIn invitation sent to ${contactName || profileUrl}`,
      recipients: [profileUrl],
      durationMs: Date.now() - startTime,
      data: {
        invitationId: result.invitationId,
        profileUrl,
        note: note || undefined,
        retryAttempts: result.retryAttempts,
      },
    };

  } catch (error: any) {
    return {
      success: false,
      description: `LinkedIn invitation failed: ${sanitizeErrorMessage(error.message)}`,
      error: sanitizeErrorMessage(error.message),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute web_search action using Google Custom Search API
 * Story 3.9: Web Search Action
 *
 * AC1: Variable resolution in search query (uses resolveEmailVariables)
 * AC2: Store results in execution context for subsequent steps
 * AC3: Handle complex search queries
 * AC4: Handle empty results gracefully
 * AC5: Retry with exponential backoff (handled by WebSearchService)
 * AC6: 10-second timeout (handled by WebSearchService)
 * AC7: Query sanitization (handled by WebSearchService)
 */
async function executeWebSearch(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    // AC1, AC3: Extract and resolve query variables
    let query = action.query || action.params?.query;

    if (!query) {
      return {
        success: false,
        description: 'Web search failed: no query specified',
        error: 'Missing query field',
        durationMs: Date.now() - startTime,
      };
    }

    // AC1: Apply variable resolution (e.g., @company.name -> "Acme Corp")
    query = resolveEmailVariables(query, context);

    // Execute search via WebSearchService (AC5, AC6, AC7 handled inside)
    const searchResult = await WebSearchService.search(query);

    if (!searchResult.success) {
      return {
        success: false,
        description: `Web search failed: ${searchResult.error}`,
        error: searchResult.error,
        durationMs: Date.now() - startTime,
        data: {
          query,
          retryAttempts: searchResult.retryAttempts,
        },
      };
    }

    // AC2: Store results in execution context for subsequent steps
    // This allows: @search.results[0].title in later actions
    context.variables['search'] = {
      results: searchResult.results,
      query,
      count: searchResult.results.length,
    };

    // AC4: Empty results handled gracefully - success with empty array
    const resultCount = searchResult.results.length;
    const description = resultCount > 0
      ? `Found ${resultCount} result${resultCount === 1 ? '' : 's'} for: ${query}`
      : `No results found for: ${query}`;

    return {
      success: true,
      description,
      data: {
        query,
        results: searchResult.results,
        count: resultCount,
        retryAttempts: searchResult.retryAttempts,
      },
      durationMs: Date.now() - startTime,
    };

  } catch (error: any) {
    return {
      success: false,
      description: `Web search failed: ${sanitizeErrorMessage(error.message)}`,
      error: sanitizeErrorMessage(error.message),
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
      case 'linkedin_invitation':
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
