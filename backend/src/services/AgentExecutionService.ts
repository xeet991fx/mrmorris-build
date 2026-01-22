/**
 * AgentExecutionService.ts - Story 3.1: Parse and Execute Instructions
 *
 * Orchestrates live agent execution by parsing instructions, executing actions,
 * and logging results. This is the LIVE execution counterpart to TestModeService.
 *
 * Key responsibilities:
 * - Parse instructions using InstructionParserService
 * - Execute actions in sequence using ActionExecutorService
 * - Resolve variables (@contact.*, @deal.*, @memory.*)
 * - Track execution status and emit Socket.io progress events
 * - Log results to AgentExecution model
 */

import mongoose from 'mongoose';
import Agent from '../models/Agent';
import AgentExecution, { IAgentExecution, IAgentExecutionStep } from '../models/AgentExecution';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import InstructionParserService, { ParsedAction } from './InstructionParserService';
import ActionExecutorService, { ActionResult } from './ActionExecutorService';
import InstructionValidationService from './InstructionValidationService';
import {
  emitExecutionStarted,
  emitExecutionProgress,
  emitExecutionCompleted,
  emitExecutionFailed
} from '../socket/agentExecutionSocket';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionContext {
  workspaceId: string;
  agentId: string;
  executionId: string;
  contact?: Record<string, any>;
  deal?: Record<string, any>;
  memory?: Record<string, any>;
  variables: Record<string, any>;
  userId?: string;
}

export interface ExecutionOptions {
  testRunId?: string;  // Link to test run for comparison
  skipValidation?: boolean;
  signal?: AbortSignal;  // For cancellation
  onProgress?: (step: number, total: number, action: string) => void;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  status: ExecutionStatus;
  steps: IAgentExecutionStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalCreditsUsed: number;
    totalDurationMs: number;
  };
  error?: string;
  failedAtStep?: number;
}

// Credit costs per action type (from architecture)
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

// =============================================================================
// PRE-EXECUTION VALIDATION (Story 3.1 Architecture Requirements)
// =============================================================================

const RATE_LIMITS = {
  maxExecutionsPerDay: 100,    // Circuit breaker: max 100 executions/day per agent
  maxExecutionsPerMinute: 10,  // Rate limit: 10 executions/min per agent
  maxEmailsPerDay: 100,        // Email rate limit per agent
  maxLinkedInPerDay: 100,      // LinkedIn rate limit (API terms)
};

interface PreExecutionValidation {
  valid: boolean;
  error?: string;
  executionsToday: number;
  executionsThisMinute: number;
}

/**
 * Validate pre-execution requirements (circuit breaker, rate limiting)
 * Per Architecture: Check before every execution
 */
async function validatePreExecution(
  agentId: string,
  workspaceId: string
): Promise<PreExecutionValidation> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Count executions today (circuit breaker check)
  const executionsToday = await AgentExecution.countDocuments({
    agent: new mongoose.Types.ObjectId(agentId),
    workspace: new mongoose.Types.ObjectId(workspaceId),
    startedAt: { $gte: startOfDay },
  });

  if (executionsToday >= RATE_LIMITS.maxExecutionsPerDay) {
    return {
      valid: false,
      error: `Circuit breaker triggered: Agent has reached ${RATE_LIMITS.maxExecutionsPerDay} executions today. Try again tomorrow.`,
      executionsToday,
      executionsThisMinute: 0,
    };
  }

  // Count executions in last minute (rate limit check)
  const executionsThisMinute = await AgentExecution.countDocuments({
    agent: new mongoose.Types.ObjectId(agentId),
    workspace: new mongoose.Types.ObjectId(workspaceId),
    startedAt: { $gte: oneMinuteAgo },
  });

  if (executionsThisMinute >= RATE_LIMITS.maxExecutionsPerMinute) {
    return {
      valid: false,
      error: `Rate limit exceeded: Maximum ${RATE_LIMITS.maxExecutionsPerMinute} executions per minute. Please wait before retrying.`,
      executionsToday,
      executionsThisMinute,
    };
  }

  return {
    valid: true,
    executionsToday,
    executionsThisMinute,
  };
}

/**
 * Count action-specific usage for the day (emails, LinkedIn invites)
 */
async function getActionUsageToday(
  agentId: string,
  workspaceId: string,
  actionType: string
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const executions = await AgentExecution.find({
    agent: new mongoose.Types.ObjectId(agentId),
    workspace: new mongoose.Types.ObjectId(workspaceId),
    startedAt: { $gte: startOfDay },
    status: 'completed',
  }).select('steps');

  let count = 0;
  for (const exec of executions) {
    for (const step of exec.steps) {
      if (step.action === actionType && step.result.success) {
        count += step.result.recipients?.length || 1;
      }
    }
  }
  return count;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Resolve variables in a template string.
 * Supports: @contact.*, @deal.*, @memory.*, @workspace.*, @current.*
 */
export function resolveVariables(template: string, context: ExecutionContext): string {
  if (!template) return '';

  let resolved = template;

  // Replace @contact.* variables
  if (context.contact) {
    resolved = resolved.replace(/@contact\.(\w+)/g, (_, field) => {
      return context.contact?.[field] ?? `[${field}]`;
    });
  }

  // Replace @deal.* variables
  if (context.deal) {
    resolved = resolved.replace(/@deal\.(\w+)/g, (_, field) => {
      return context.deal?.[field] ?? `[${field}]`;
    });
  }

  // Replace @memory.* variables
  if (context.memory) {
    resolved = resolved.replace(/@memory\.(\w+)/g, (_, field) => {
      return context.memory?.[field] ?? `[${field}]`;
    });
  }

  // Replace @current.* variables (runtime context)
  resolved = resolved.replace(/@current\.(\w+)/g, (_, field) => {
    if (field === 'date') return new Date().toISOString().split('T')[0];
    if (field === 'time') return new Date().toISOString().split('T')[1].split('.')[0];
    if (field === 'datetime') return new Date().toISOString();
    if (field === 'timestamp') return Date.now().toString();
    return `[${field}]`;
  });

  // Replace any stored variables
  Object.entries(context.variables).forEach(([key, value]) => {
    resolved = resolved.replace(new RegExp(`@${key}`, 'g'), String(value));
  });

  // Replace any remaining @variables with placeholders
  resolved = resolved.replace(/@(\w+(?:\.\w+)?)/g, (match, varName) => {
    return `[${varName}]`;
  });

  return resolved;
}

/**
 * Evaluate a condition against the execution context.
 * Returns { result: boolean, explanation: string }
 */
export function evaluateCondition(
  condition: string,
  context: ExecutionContext
): { result: boolean; explanation: string } {
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
      } else if (field.startsWith('memory.') && context.memory) {
        fieldValue = context.memory[field.replace('memory.', '')];
      } else if (context.variables[field]) {
        fieldValue = context.variables[field];
      }

      // Evaluate based on operator
      let result = false;
      const normalizedOp = operator.toLowerCase();

      switch (normalizedOp) {
        case '==':
        case 'is':
          if (value === 'true') result = fieldValue === true;
          else if (value === 'false') result = fieldValue === false;
          else if (value === 'null' || value === 'empty') result = !fieldValue;
          else result = String(fieldValue) === String(value);
          break;
        case '!=':
        case 'is not':
          if (value === 'true') result = fieldValue !== true;
          else if (value === 'false') result = fieldValue !== false;
          else if (value === 'null' || value === 'empty') result = !!fieldValue;
          else result = String(fieldValue) !== String(value);
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

/**
 * Get credit cost for an action type
 */
function getCreditCost(actionType: string): number {
  return CREDIT_COSTS[actionType.toLowerCase()] || 0;
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

export class AgentExecutionService {
  /**
   * Execute an agent with the given trigger.
   *
   * AC1: Instruction Parsing with Structured Output
   * AC2: Variable Resolution
   * AC5: Execution Performance
   */
  static async executeAgent(
    agentId: string,
    workspaceId: string,
    trigger: { type: 'manual' | 'scheduled' | 'event'; eventDetails?: Record<string, any> },
    target?: { type: 'contact' | 'deal'; id: string },
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = generateExecutionId();
    const steps: IAgentExecutionStep[] = [];
    let executionRecord: IAgentExecution | null = null;

    try {
      // 1. Create AgentExecution record (status: pending)
      executionRecord = await AgentExecution.create({
        executionId,
        agent: new mongoose.Types.ObjectId(agentId),
        workspace: new mongoose.Types.ObjectId(workspaceId),
        linkedTestRunId: options.testRunId,
        status: 'pending',
        trigger: {
          type: trigger.type,
          eventDetails: trigger.eventDetails,
        },
        target: target ? {
          type: target.type,
          id: target.id,
        } : undefined,
        steps: [],
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          totalCreditsUsed: 0,
          totalDurationMs: 0,
        },
        startedAt: new Date(),
      });

      // 2. Load agent with workspace isolation
      const agent = await Agent.findOne({ _id: agentId, workspace: workspaceId });

      if (!agent) {
        throw new Error('Agent not found');
      }

      if (agent.status !== 'Live') {
        throw new Error(`Agent is not live. Current status: ${agent.status}`);
      }

      // 2.5 Pre-execution validation (circuit breaker, rate limiting)
      const preValidation = await validatePreExecution(agentId, workspaceId);
      if (!preValidation.valid) {
        throw new Error(preValidation.error || 'Pre-execution validation failed');
      }

      // Update status to running
      executionRecord.status = 'running';
      await executionRecord.save();

      // Story 3.2: Emit execution:started event via Socket.io
      emitExecutionStarted(workspaceId, agentId, {
        executionId,
        agentId,
        agentName: agent.name,
        startedAt: new Date(),
        triggerType: trigger.type,
      });

      // 3. Build execution context
      const context: ExecutionContext = {
        workspaceId,
        agentId,
        executionId,
        variables: {},
        memory: {},
      };

      // Load target data if specified
      if (target?.type === 'contact' && target.id) {
        const contact = await Contact.findOne({
          _id: target.id,
          workspace: workspaceId,
        }).populate('company', 'name domain').lean();

        if (contact) {
          context.contact = contact;
          executionRecord.target = {
            type: 'contact',
            id: target.id,
            currentData: contact,
          };
        }
      } else if (target?.type === 'deal' && target.id) {
        const deal = await Opportunity.findOne({
          _id: target.id,
          workspace: workspaceId,
        }).lean();

        if (deal) {
          context.deal = deal;
          executionRecord.target = {
            type: 'deal',
            id: target.id,
            currentData: deal,
          };
        }
      }

      // Load agent memory if enabled
      if (agent.memory?.enabled && agent.memory?.variables) {
        agent.memory.variables.forEach((v) => {
          context.memory![v.name] = v.defaultValue;
        });
      }

      // 4. Parse instructions or use cached parsedActions
      let parsedActions: ParsedAction[] = agent.parsedActions || [];

      if (!parsedActions.length && agent.instructions) {
        // Parse instructions using InstructionParserService
        const parseResult = await InstructionParserService.parseInstructions(
          agent.instructions,
          workspaceId
        );

        if (!parseResult.success || parseResult.error) {
          throw new Error(parseResult.error || 'Failed to parse instructions');
        }

        parsedActions = parseResult.actions;

        // Cache parsed actions on agent
        agent.parsedActions = parsedActions;
        await agent.save();
      }

      if (!parsedActions.length) {
        throw new Error('No actions to execute. Agent has no instructions or parsed actions.');
      }

      // 5. Validate instructions (optional)
      if (!options.skipValidation) {
        const validationResult = await InstructionValidationService.validateInstructions({
          workspaceId,
          agentId,
          instructions: agent.instructions || '',
          parsedActions,
          triggerType: trigger.type,
          restrictions: agent.restrictions,
        });

        if (!validationResult.valid) {
          const errorMessages = validationResult.errors.map(e => e.message).join('; ');
          throw new Error(`Validation failed: ${errorMessages}`);
        }
      }

      // 6. Execute actions in sequence
      let stepNumber = 1;
      let hasError = false;
      let failedAtStep: number | undefined;
      let totalCreditsUsed = 0;

      for (const action of parsedActions) {
        // Check for cancellation
        if (options.signal?.aborted) {
          executionRecord.status = 'cancelled';
          await executionRecord.save();
          return {
            success: false,
            executionId,
            status: 'cancelled',
            steps,
            summary: {
              totalSteps: parsedActions.length,
              successfulSteps: steps.filter(s => s.result.success).length,
              failedSteps: steps.filter(s => !s.result.success).length,
              totalCreditsUsed,
              totalDurationMs: Date.now() - startTime,
            },
            error: 'Execution cancelled',
          };
        }

        // Notify progress
        if (options.onProgress) {
          options.onProgress(stepNumber, parsedActions.length, action.type);
        }

        if (hasError) {
          // Log remaining steps as not executed
          steps.push({
            stepNumber,
            action: action.type,
            result: {
              description: 'Not executed due to previous error',
              success: false,
              error: `Execution stopped at step ${failedAtStep}`,
            },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          });
          stepNumber++;
          continue;
        }

        // Handle conditional logic
        if (action.type === 'conditional' || action.type === 'if') {
          const conditionResult = evaluateCondition(action.condition || '', context);

          steps.push({
            stepNumber,
            action: action.type,
            result: {
              conditionResult: conditionResult.result,
              description: conditionResult.explanation,
              success: true,
            },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          });

          // Execute appropriate branch
          const activeBranch = conditionResult.result ? action.trueBranch : action.falseBranch;
          if (activeBranch?.length) {
            // Recursively execute branch (simplified - in production this would be more robust)
            for (const branchAction of activeBranch) {
              stepNumber++;
              const branchResult = await this.executeAction(branchAction, context);

              const creditCost = getCreditCost(branchAction.type);
              totalCreditsUsed += creditCost;

              steps.push({
                stepNumber,
                action: branchAction.type,
                result: branchResult,
                executedAt: new Date(),
                durationMs: branchResult.durationMs || 0,
                creditsUsed: creditCost,
              });

              if (!branchResult.success) {
                hasError = true;
                failedAtStep = stepNumber;
                break;
              }
            }
          }

          stepNumber++;
          continue;
        }

        // Execute the action
        const actionStartTime = Date.now();
        const actionResult = await this.executeAction(action, context);
        const durationMs = Date.now() - actionStartTime;

        const creditCost = getCreditCost(action.type);
        totalCreditsUsed += creditCost;

        steps.push({
          stepNumber,
          action: action.type,
          result: actionResult,
          executedAt: new Date(),
          durationMs,
          creditsUsed: creditCost,
        });

        // Story 3.2: Emit execution:progress event via Socket.io
        emitExecutionProgress(workspaceId, agentId, {
          executionId,
          step: stepNumber,
          total: parsedActions.length,
          action: action.type,
          status: actionResult.success ? 'success' : 'failed',
          message: actionResult.description,
        });

        if (!actionResult.success) {
          hasError = true;
          failedAtStep = stepNumber;
        }

        stepNumber++;
      }

      // 7. Update execution record with results
      const totalDurationMs = Date.now() - startTime;
      const successfulSteps = steps.filter(s => s.result.success).length;
      const failedSteps = steps.filter(s => !s.result.success).length;

      executionRecord.steps = steps;
      executionRecord.status = hasError ? 'failed' : 'completed';
      executionRecord.completedAt = new Date();
      executionRecord.summary = {
        totalSteps: steps.length,
        successfulSteps,
        failedSteps,
        totalCreditsUsed,
        totalDurationMs,
      };

      await executionRecord.save();

      // 8. Update agent lastExecutedAt
      await Agent.findOneAndUpdate(
        { _id: agentId, workspace: workspaceId },
        { lastExecutedAt: new Date() }
      );

      // Story 3.2: Emit execution:completed or execution:failed event via Socket.io
      if (hasError) {
        emitExecutionFailed(workspaceId, agentId, {
          executionId,
          success: false,
          error: steps.find(s => !s.result.success)?.result.error || 'Execution failed',
          failedAtStep,
          completedAt: new Date(),
        });
      } else {
        emitExecutionCompleted(workspaceId, agentId, {
          executionId,
          success: true,
          processedCount: context.contact ? 1 : 0, // Number of contacts processed
          summary: {
            totalSteps: steps.length,
            successfulSteps,
            failedSteps,
            skippedSteps: 0,
            duration: totalDurationMs,
          },
          completedAt: new Date(),
        });
      }

      return {
        success: !hasError,
        executionId,
        status: hasError ? 'failed' : 'completed',
        steps,
        summary: {
          totalSteps: steps.length,
          successfulSteps,
          failedSteps,
          totalCreditsUsed,
          totalDurationMs,
        },
        failedAtStep,
      };

    } catch (error: any) {
      // Update execution record with error
      if (executionRecord) {
        executionRecord.status = 'failed';
        executionRecord.completedAt = new Date();
        executionRecord.summary = {
          totalSteps: steps.length,
          successfulSteps: steps.filter(s => s.result.success).length,
          failedSteps: steps.filter(s => !s.result.success).length + 1,
          totalCreditsUsed: steps.reduce((sum, s) => sum + s.creditsUsed, 0),
          totalDurationMs: Date.now() - startTime,
        };
        await executionRecord.save();
      }

      // Story 3.2: Emit execution:failed event via Socket.io
      emitExecutionFailed(workspaceId, agentId, {
        executionId,
        success: false,
        error: error.message,
        completedAt: new Date(),
      });

      return {
        success: false,
        executionId,
        status: 'failed',
        steps,
        summary: {
          totalSteps: steps.length,
          successfulSteps: steps.filter(s => s.result.success).length,
          failedSteps: steps.filter(s => !s.result.success).length + 1,
          totalCreditsUsed: steps.reduce((sum, s) => sum + s.creditsUsed, 0),
          totalDurationMs: Date.now() - startTime,
        },
        error: error.message,
      };
    }
  }

  /**
   * Execute a single action using ActionExecutorService.
   */
  private static async executeAction(
    action: ParsedAction,
    context: ExecutionContext
  ): Promise<ActionResult> {
    // Resolve variables in action parameters
    const resolvedAction = this.resolveActionVariables(action, context);

    // Execute using ActionExecutorService
    return ActionExecutorService.executeAction(resolvedAction, context);
  }

  /**
   * Resolve variables in action parameters.
   */
  private static resolveActionVariables(
    action: ParsedAction,
    context: ExecutionContext
  ): ParsedAction {
    const resolved: ParsedAction = { ...action };

    // Resolve string parameters
    if (action.params) {
      resolved.params = {};
      for (const [key, value] of Object.entries(action.params)) {
        if (typeof value === 'string') {
          resolved.params[key] = resolveVariables(value, context);
        } else {
          resolved.params[key] = value;
        }
      }
    }

    // Resolve common string fields
    const stringFields = ['to', 'subject', 'body', 'message', 'query', 'tag', 'field', 'value'];
    for (const field of stringFields) {
      if (typeof action[field] === 'string') {
        (resolved as any)[field] = resolveVariables(action[field], context);
      }
    }

    return resolved;
  }

  /**
   * Get execution by ID
   */
  static async getExecution(
    executionId: string,
    workspaceId: string
  ): Promise<IAgentExecution | null> {
    return AgentExecution.findOne({
      executionId,
      workspace: workspaceId,
    });
  }

  /**
   * List executions for an agent
   */
  static async listExecutions(
    agentId: string,
    workspaceId: string,
    options: { limit?: number; skip?: number; status?: ExecutionStatus } = {}
  ): Promise<IAgentExecution[]> {
    const query: any = {
      agent: new mongoose.Types.ObjectId(agentId),
      workspace: new mongoose.Types.ObjectId(workspaceId),
    };

    if (options.status) {
      query.status = options.status;
    }

    return AgentExecution.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 20)
      .skip(options.skip || 0);
  }

  /**
   * Cancel an in-progress execution
   */
  static async cancelExecution(
    executionId: string,
    workspaceId: string
  ): Promise<boolean> {
    const execution = await AgentExecution.findOne({
      executionId,
      workspace: workspaceId,
      status: { $in: ['pending', 'running'] },
    });

    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    await execution.save();

    return true;
  }
}

export default AgentExecutionService;
