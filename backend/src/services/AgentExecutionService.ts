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
import ConditionEvaluator, { ConditionResult } from '../utils/ConditionEvaluator';
import {
  emitExecutionStarted,
  emitExecutionProgress,
  emitExecutionCompleted,
  emitExecutionFailed
} from '../socket/agentExecutionSocket';
import { redactSensitiveData } from '../utils/redactSensitiveData';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';

/**
 * Story 3.5: Enhanced ExecutionContext with step outputs and memory
 * Supports sequential multi-step workflows with data flow between steps
 */
export interface ExecutionContext {
  workspaceId: string;
  agentId: string;
  executionId: string;
  contact?: Record<string, any>;
  deal?: Record<string, any>;
  memory: Map<string, any>;  // Story 3.5: Changed from optional Record to Map
  variables: Record<string, any>;
  userId?: string;
  // Story 3.5: Multi-step execution tracking
  triggerType: 'manual' | 'scheduled' | 'event';
  triggerData?: Record<string, any>;
  stepOutputs: Record<string, {  // Story 3.5: Step outputs for dependency resolution
    action: string;
    result: any;
    timestamp: Date;
  }>;
  currentStep: number;
  totalSteps: number;
}

/**
 * Story 3.5: Result from step execution
 */
export interface StepExecutionResult {
  success: boolean;
  data?: any;
  itemsProcessed?: number;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Story 3.5: Result from multi-step workflow execution
 */
export interface MultiStepExecutionResult {
  status: 'completed' | 'failed' | 'waiting' | 'cancelled';
  completedSteps: number;
  failedStep?: number;
  error?: any;
  resumeAt?: Date;
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

  // Replace @memory.* variables - Story 3.5: Updated to use Map.get()
  if (context.memory) {
    resolved = resolved.replace(/@memory\.(\w+)/g, (_, field) => {
      const value = context.memory instanceof Map
        ? context.memory.get(field)
        : (context.memory as Record<string, any>)?.[field];
      return value ?? `[${field}]`;
    });
  }

  // Story 3.5: Replace @step*.* variables (step outputs)
  if (context.stepOutputs) {
    resolved = resolved.replace(/@step(\d+)\.(\w+)/g, (_, stepNum, field) => {
      const stepKey = `step${stepNum}`;
      const stepOutput = context.stepOutputs?.[stepKey];
      if (stepOutput?.result && typeof stepOutput.result === 'object') {
        return stepOutput.result[field] ?? `[step${stepNum}.${field}]`;
      }
      return `[step${stepNum}.${field}]`;
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
 * Story 3.6: Evaluate a condition against the execution context using ConditionEvaluator.
 * Returns { result: boolean, explanation: string, warnings?: string[], fieldValues?: Record<string, any> }
 *
 * Task 1.1: Refactored to use ConditionEvaluator class
 * AC1-AC7: Full conditional logic support including AND/OR/NOT, exists, and missing field handling
 */
export function evaluateCondition(
  condition: string,
  context: ExecutionContext
): { result: boolean; explanation: string; warnings?: string[]; fieldValues?: Record<string, any> } {
  // Delegate to ConditionEvaluator for full feature support
  const evalResult = ConditionEvaluator.evaluate(condition, context);

  return {
    result: evalResult.result,
    explanation: evalResult.explanation,
    warnings: evalResult.warnings.length > 0 ? evalResult.warnings : undefined,
    fieldValues: Object.keys(evalResult.fieldValues).length > 0 ? evalResult.fieldValues : undefined,
  };
}

/**
 * Get credit cost for an action type
 */
function getCreditCost(actionType: string): number {
  return CREDIT_COSTS[actionType.toLowerCase()] || 0;
}

/**
 * Story 3.13 AC2: Generate human-readable summary from step results
 * Examples: "Processed 5 contacts, sent 5 emails", "Updated 3 deals"
 */
function generateExecutionSummary(steps: IAgentExecutionStep[]): string {
  const summaryParts: string[] = [];

  // Count action types
  const actionCounts: Record<string, number> = {};
  const recipientCounts: Record<string, number> = {};

  for (const step of steps) {
    if (!step.result.success) continue;

    const actionType = step.action;
    actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;

    // Track recipients for email/linkedin actions
    if (step.result.recipients && step.result.recipients.length > 0) {
      recipientCounts[actionType] = (recipientCounts[actionType] || 0) + step.result.recipients.length;
    } else if (step.result.itemsProcessed) {
      recipientCounts[actionType] = (recipientCounts[actionType] || 0) + step.result.itemsProcessed;
    }
  }

  // Build summary string
  if (recipientCounts['send_email'] || recipientCounts['email']) {
    const count = (recipientCounts['send_email'] || 0) + (recipientCounts['email'] || 0);
    summaryParts.push(`sent ${count} email${count !== 1 ? 's' : ''}`);
  }

  if (recipientCounts['linkedin_invite'] || recipientCounts['linkedin']) {
    const count = (recipientCounts['linkedin_invite'] || 0) + (recipientCounts['linkedin'] || 0);
    summaryParts.push(`sent ${count} LinkedIn invitation${count !== 1 ? 's' : ''}`);
  }

  if (actionCounts['update_field'] || actionCounts['update']) {
    const count = (actionCounts['update_field'] || 0) + (actionCounts['update'] || 0);
    summaryParts.push(`updated ${count} field${count !== 1 ? 's' : ''}`);
  }

  if (actionCounts['add_tag']) {
    summaryParts.push(`added ${actionCounts['add_tag']} tag${actionCounts['add_tag'] !== 1 ? 's' : ''}`);
  }

  if (actionCounts['create_task'] || actionCounts['task']) {
    const count = (actionCounts['create_task'] || 0) + (actionCounts['task'] || 0);
    summaryParts.push(`created ${count} task${count !== 1 ? 's' : ''}`);
  }

  if (actionCounts['web_search']) {
    summaryParts.push(`performed ${actionCounts['web_search']} web search${actionCounts['web_search'] !== 1 ? 'es' : ''}`);
  }

  if (actionCounts['enrich_contact'] || actionCounts['enrich']) {
    const count = (actionCounts['enrich_contact'] || 0) + (actionCounts['enrich'] || 0);
    summaryParts.push(`enriched ${count} contact${count !== 1 ? 's' : ''}`);
  }

  // Fallback for empty summary
  if (summaryParts.length === 0) {
    const successfulSteps = steps.filter(s => s.result.success).length;
    return `Completed ${successfulSteps} step${successfulSteps !== 1 ? 's' : ''}`;
  }

  // Join with commas and "and" for last item
  if (summaryParts.length === 1) {
    return summaryParts[0].charAt(0).toUpperCase() + summaryParts[0].slice(1);
  } else if (summaryParts.length === 2) {
    return summaryParts[0].charAt(0).toUpperCase() + summaryParts[0].slice(1) + ' and ' + summaryParts[1];
  } else {
    const last = summaryParts.pop();
    return summaryParts.join(', ').charAt(0).toUpperCase() + summaryParts.join(', ').slice(1) + ', and ' + last;
  }
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
    trigger: { type: 'manual' | 'scheduled' | 'event'; eventDetails?: Record<string, any>; userId?: string },
    target?: { type: 'contact' | 'deal'; id: string },
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = generateExecutionId();
    const steps: IAgentExecutionStep[] = [];
    let executionRecord: IAgentExecution | null = null;

    try {
      // 1. Create AgentExecution record (status: pending)
      // Story 3.13 AC1: Add triggeredBy for manual triggers
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
        // Story 3.13 AC1: Track who triggered the execution (for manual triggers)
        triggeredBy: trigger.userId ? new mongoose.Types.ObjectId(trigger.userId) : undefined,
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
      // Story 3.5: Enhanced execution context with multi-step support
      const context: ExecutionContext = {
        workspaceId,
        agentId,
        executionId,
        variables: {},
        memory: new Map(),  // Story 3.5: Use Map for memory
        triggerType: trigger.type,
        triggerData: trigger.eventDetails,
        stepOutputs: {},    // Story 3.5: Step outputs for dependency resolution
        currentStep: 0,
        totalSteps: 0,      // Will be set after parsing
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
          context.memory.set(v.name, v.defaultValue);  // Story 3.5: Use Map.set()
        });
      }

      // 4. Parse instructions or use cached parsedActions
      let parsedActions: ParsedAction[] = (agent.parsedActions as unknown as ParsedAction[]) || [];

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
          parsedActions: parsedActions as any,
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
        // Story 3.6: Enhanced conditional handling with nested support (Task 4) and logging (Task 7)
        if (action.type === 'conditional') {
          const conditionStartTime = Date.now();

          // Task 5.1: Use ConditionEvaluator for full feature support
          let conditionResult: ConditionResult;
          if (action.conditions && action.conditions.length > 0 && action.logicalOperator) {
            // Fix: Validate logicalOperator before using
            const validOperator = ['and', 'or'].includes(action.logicalOperator)
              ? (action.logicalOperator as 'and' | 'or')
              : 'and'; // Default to 'and' if invalid

            // Task 3: Compound condition (AC5, AC6)
            // Fix: Add null check for condition elements
            const conditionStrings = action.conditions
              .filter((c: any) => c && c.field && c.operator)
              .map((c: any) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`);

            if (conditionStrings.length > 0) {
              conditionResult = ConditionEvaluator.evaluateCompound(
                conditionStrings,
                validOperator,
                context
              );
            } else {
              // No valid conditions - default to simple condition evaluation
              conditionResult = ConditionEvaluator.evaluate(action.condition || '', context);
            }
          } else {
            // Simple condition (AC1, AC2, AC3)
            conditionResult = ConditionEvaluator.evaluate(action.condition || '', context);
          }

          const conditionDurationMs = Date.now() - conditionStartTime;

          // Task 7: Build condition log for debugging
          // Fix: Add null check for conditions array when mapping values
          const conditionLog = {
            condition: action.condition || JSON.stringify(action.conditions),
            resolvedValues: conditionResult.fieldValues,
            operator: action.logicalOperator || 'single',
            expectedValue: action.conditions?.filter((c: any) => c)?.map((c: any) => c?.value) ?? null,
            result: conditionResult.result,
            warnings: conditionResult.warnings,
            nestingLevel: 0, // Top level
          };

          // Task 5.2: Add enhanced result with warnings and field values
          steps.push({
            stepNumber,
            action: action.type,
            result: {
              conditionResult: conditionResult.result,
              description: conditionResult.explanation,
              success: true,
              warnings: conditionResult.warnings.length > 0 ? conditionResult.warnings : undefined,
              fieldValues: conditionResult.fieldValues,
            },
            conditionLog,
            executedAt: new Date(),
            durationMs: conditionDurationMs,
            creditsUsed: 0,
          });

          // Task 5.5: Emit Socket.io event with condition evaluation details
          emitExecutionProgress(workspaceId, agentId, {
            executionId,
            step: stepNumber,
            total: parsedActions.length,
            action: action.type,
            status: 'success',
            message: `Condition evaluated: ${conditionResult.result ? 'TRUE' : 'FALSE'}`,
            conditionResult: conditionResult.result,
            explanation: conditionResult.explanation,
          });

          // Execute appropriate branch
          const activeBranch = conditionResult.result ? action.trueBranch : action.falseBranch;
          if (activeBranch?.length) {
            // Task 4: Execute branch with nested condition support
            for (const branchAction of activeBranch) {
              stepNumber++;

              // Task 4.1, 4.3: Handle nested conditionals recursively
              if (branchAction.type === 'conditional' || branchAction.type === 'if') {
                const nestedResult = await this.executeNestedConditional(
                  branchAction,
                  context,
                  workspaceId,
                  agentId,
                  executionId,
                  stepNumber,
                  parsedActions.length,
                  1 // Nesting level 1
                );
                steps.push(...nestedResult.steps);
                totalCreditsUsed += nestedResult.creditsUsed;

                if (nestedResult.hasError) {
                  hasError = true;
                  failedAtStep = stepNumber;
                  break;
                }
                stepNumber = nestedResult.lastStepNumber;
              } else {
                // Execute regular action
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
          }

          stepNumber++;
          continue;
        }

        // Story 3.5: Handle wait action - save state and schedule resume job
        if (action.type === 'wait') {
          const waitDuration = this.parseWaitDuration(
            action.params?.duration || action.params?.delay || action.duration || '1d'
          );

          // For short waits (< 5 minutes), execute synchronously
          const SYNC_WAIT_THRESHOLD = 5 * 60 * 1000; // 5 minutes
          if (waitDuration < SYNC_WAIT_THRESHOLD) {
            // Short wait - just log it and continue (actual delay handled by ActionExecutorService)
            const actionStartTime = Date.now();
            const actionResult = await this.executeAction(action, context);
            const durationMs = Date.now() - actionStartTime;

            steps.push({
              stepNumber,
              action: action.type,
              result: actionResult,
              executedAt: new Date(),
              durationMs,
              creditsUsed: 0,
            });

            emitExecutionProgress(workspaceId, agentId, {
              executionId,
              step: stepNumber,
              total: parsedActions.length,
              action: action.type,
              status: 'success',
              message: `Wait completed (${waitDuration}ms)`,
            });

            stepNumber++;
            continue;
          }

          // Long wait - save state and schedule resume job
          const resumeAt = new Date(Date.now() + waitDuration);
          const resumeFromStep = stepNumber; // 1-based, next step to execute

          // Serialize context for storage
          const serializedContext = {
            ...context,
            memory: undefined,
          };
          const serializedMemory = Object.fromEntries(context.memory);

          // Update execution record with wait state
          executionRecord.status = 'waiting';
          executionRecord.savedContext = serializedContext;
          executionRecord.savedMemory = serializedMemory;
          executionRecord.resumeFromStep = resumeFromStep;
          executionRecord.resumeAt = resumeAt;
          executionRecord.currentStep = stepNumber - 1;
          executionRecord.totalSteps = parsedActions.length;
          executionRecord.steps = steps;
          await executionRecord.save();

          // Log the wait step
          steps.push({
            stepNumber,
            action: action.type,
            result: {
              description: `Waiting until ${resumeAt.toISOString()}`,
              success: true,
            },
            executedAt: new Date(),
            durationMs: 0,
            creditsUsed: 0,
          });

          // Schedule resume job
          try {
            const { agentResumeExecutionQueue } = await import('../jobs/agentResumeExecutionJob');
            const job = await agentResumeExecutionQueue.add(
              `resume-${executionRecord._id}`,
              {
                executionId: executionRecord._id.toString(),
                agentId,
                workspaceId,
                resumeFromStep,
              },
              { delay: waitDuration }
            );

            executionRecord.resumeJobId = job.id;
            await executionRecord.save();
          } catch (jobError) {
            console.error('Failed to schedule resume job:', jobError);
          }

          // Emit waiting status
          emitExecutionProgress(workspaceId, agentId, {
            executionId,
            step: stepNumber,
            total: parsedActions.length,
            action: action.type,
            status: 'success',
            message: `Execution paused, will resume at ${resumeAt.toISOString()}`,
          });

          // Return with waiting status
          return {
            success: true,
            executionId,
            status: 'waiting',
            steps,
            summary: {
              totalSteps: parsedActions.length,
              successfulSteps: steps.filter(s => s.result.success).length,
              failedSteps: steps.filter(s => !s.result.success).length,
              totalCreditsUsed,
              totalDurationMs: Date.now() - startTime,
            },
          };
        }

        // Execute the action
        const actionStartTime = Date.now();
        const actionResult = await this.executeAction(action, context);
        const durationMs = Date.now() - actionStartTime;

        const creditCost = getCreditCost(action.type);
        totalCreditsUsed += creditCost;

        // Story 3.13 AC6: Redact sensitive data before logging
        const redactedResult = redactSensitiveData(actionResult);

        steps.push({
          stepNumber,
          action: action.type,
          result: redactedResult,
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

      // Story 3.13 AC2: Generate human-readable summary description
      const summaryDescription = generateExecutionSummary(steps);

      executionRecord.steps = steps;
      executionRecord.status = hasError ? 'failed' : 'completed';
      executionRecord.completedAt = new Date();
      executionRecord.summary = {
        totalSteps: steps.length,
        successfulSteps,
        failedSteps,
        totalCreditsUsed,
        totalDurationMs,
        description: summaryDescription, // Story 3.13 AC2
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
   * Story 3.6 Task 4: Execute nested conditional actions with depth limit
   * AC4: Nested conditions support
   * Task 4.2: Maximum nesting depth of 5 levels
   * Task 4.4: Preserve parent context
   * Task 4.5: Log nesting level in execution logs
   */
  private static async executeNestedConditional(
    action: ParsedAction,
    context: ExecutionContext,
    workspaceId: string,
    agentId: string,
    executionId: string,
    startStepNumber: number,
    totalSteps: number,
    nestingLevel: number
  ): Promise<{
    steps: IAgentExecutionStep[];
    creditsUsed: number;
    hasError: boolean;
    lastStepNumber: number;
  }> {
    // Task 4.2: Enforce maximum nesting depth
    const MAX_NESTING_DEPTH = 5;
    if (nestingLevel >= MAX_NESTING_DEPTH) {
      // Fix: Include condition info in error message for better debugging
      const conditionInfo = action.condition || JSON.stringify(action.conditions) || 'unknown';
      return {
        steps: [{
          stepNumber: startStepNumber,
          action: 'conditional',
          result: {
            success: false,
            description: `Maximum condition nesting depth (${MAX_NESTING_DEPTH}) exceeded at step ${startStepNumber}`,
            error: `Nesting level ${nestingLevel} exceeds maximum of ${MAX_NESTING_DEPTH}. Condition: ${conditionInfo.substring(0, 100)}`,
          },
          executedAt: new Date(),
          durationMs: 0,
          creditsUsed: 0,
        }],
        creditsUsed: 0,
        hasError: true,
        lastStepNumber: startStepNumber,
      };
    }

    const steps: IAgentExecutionStep[] = [];
    let totalCreditsUsed = 0;
    let hasError = false;
    let currentStepNumber = startStepNumber;
    const conditionStartTime = Date.now();

    // Evaluate condition using ConditionEvaluator
    let conditionResult: ConditionResult;
    if (action.conditions && action.conditions.length > 0 && action.logicalOperator) {
      // Fix: Validate logicalOperator before using
      const validOperator = ['and', 'or'].includes(action.logicalOperator)
        ? (action.logicalOperator as 'and' | 'or')
        : 'and'; // Default to 'and' if invalid

      // Fix: Add null check for condition elements
      const conditionStrings = action.conditions
        .filter((c: any) => c && c.field && c.operator)
        .map((c: any) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`);

      if (conditionStrings.length > 0) {
        conditionResult = ConditionEvaluator.evaluateCompound(
          conditionStrings,
          validOperator,
          context
        );
      } else {
        conditionResult = ConditionEvaluator.evaluate(action.condition || '', context);
      }
    } else {
      conditionResult = ConditionEvaluator.evaluate(action.condition || '', context);
    }

    const conditionDurationMs = Date.now() - conditionStartTime;

    // Task 4.5: Log nesting level
    // Fix: Add null check for conditions array when mapping values
    const conditionLog = {
      condition: action.condition || JSON.stringify(action.conditions),
      resolvedValues: conditionResult.fieldValues,
      operator: action.logicalOperator || 'single',
      expectedValue: action.conditions?.filter((c: any) => c)?.map((c: any) => c?.value) ?? null,
      result: conditionResult.result,
      warnings: conditionResult.warnings,
      nestingLevel,
    };

    steps.push({
      stepNumber: currentStepNumber,
      action: action.type,
      result: {
        conditionResult: conditionResult.result,
        description: `[Nested L${nestingLevel}] ${conditionResult.explanation}`,
        success: true,
        warnings: conditionResult.warnings.length > 0 ? conditionResult.warnings : undefined,
        fieldValues: conditionResult.fieldValues,
      },
      conditionLog,
      executedAt: new Date(),
      durationMs: conditionDurationMs,
      creditsUsed: 0,
    });

    // Emit progress event
    emitExecutionProgress(workspaceId, agentId, {
      executionId,
      step: currentStepNumber,
      total: totalSteps,
      action: action.type,
      status: 'success',
      message: `Nested condition (L${nestingLevel}): ${conditionResult.result ? 'TRUE' : 'FALSE'}`,
      conditionResult: conditionResult.result,
    });

    // Execute appropriate branch
    const activeBranch = conditionResult.result ? action.trueBranch : action.falseBranch;
    if (activeBranch?.length) {
      for (const branchAction of activeBranch) {
        currentStepNumber++;

        // Task 4.3: Recursive handling of nested conditionals
        if (branchAction.type === 'conditional' || branchAction.type === 'if') {
          const nestedResult = await this.executeNestedConditional(
            branchAction,
            context,
            workspaceId,
            agentId,
            executionId,
            currentStepNumber,
            totalSteps,
            nestingLevel + 1
          );
          steps.push(...nestedResult.steps);
          totalCreditsUsed += nestedResult.creditsUsed;

          if (nestedResult.hasError) {
            hasError = true;
            break;
          }
          currentStepNumber = nestedResult.lastStepNumber;
        } else {
          // Execute regular action
          const branchResult = await this.executeAction(branchAction, context);

          const creditCost = getCreditCost(branchAction.type);
          totalCreditsUsed += creditCost;

          steps.push({
            stepNumber: currentStepNumber,
            action: branchAction.type,
            result: branchResult,
            executedAt: new Date(),
            durationMs: branchResult.durationMs || 0,
            creditsUsed: creditCost,
          });

          if (!branchResult.success) {
            hasError = true;
            break;
          }
        }
      }
    }

    return {
      steps,
      creditsUsed: totalCreditsUsed,
      hasError,
      lastStepNumber: currentStepNumber,
    };
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
   * Story 3.13 AC4: Cancel an in-progress or waiting execution
   * Enhanced to track canceledBy user, cancel BullMQ jobs, and emit Socket.io events
   */
  static async cancelExecution(
    executionId: string,
    workspaceId: string,
    canceledBy?: string  // Story 3.13: User ID who cancelled the execution
  ): Promise<{ success: boolean; error?: string; execution?: IAgentExecution }> {
    const execution = await AgentExecution.findOne({
      executionId,
      workspace: new mongoose.Types.ObjectId(workspaceId),
      status: { $in: ['pending', 'running', 'waiting'] },  // Story 3.13: Include 'waiting' status
    });

    if (!execution) {
      // Check if execution exists but is in wrong status
      const existingExecution = await AgentExecution.findOne({
        executionId,
        workspace: new mongoose.Types.ObjectId(workspaceId),
      });

      if (!existingExecution) {
        return { success: false, error: 'Cannot cancel execution: Execution not found' };
      }

      if (existingExecution.status === 'cancelled') {
        return { success: false, error: 'Execution already cancelled' };
      }

      return { success: false, error: `Cannot cancel execution: Execution not in running or waiting state (current: ${existingExecution.status})` };
    }

    // Story 3.13: Cancel BullMQ resume job if execution is waiting
    if (execution.status === 'waiting' && execution.resumeJobId) {
      try {
        const { agentResumeExecutionQueue } = await import('../jobs/agentResumeExecutionJob');
        await agentResumeExecutionQueue.remove(execution.resumeJobId);
      } catch (jobError) {
        console.warn(`Failed to cancel resume job ${execution.resumeJobId}:`, jobError);
        // Continue with cancellation even if job removal fails
      }
    }

    // Story 3.13: Update execution with cancel tracking fields
    execution.status = 'cancelled';
    execution.canceledAt = new Date();
    if (canceledBy) {
      execution.canceledBy = new mongoose.Types.ObjectId(canceledBy);
    }
    execution.completedAt = new Date();
    await execution.save();

    // Story 3.13: Emit Socket.io event for real-time UI update
    try {
      const { emitExecutionCancelled } = await import('../socket/agentExecutionSocket');
      emitExecutionCancelled(workspaceId, execution.agent.toString(), {
        executionId,
        canceledAt: execution.canceledAt,
        canceledBy,
      });
    } catch (socketError) {
      console.warn('Failed to emit execution:cancelled event:', socketError);
    }

    return { success: true, execution };
  }

  // =============================================================================
  // STORY 3.5: MULTI-STEP EXECUTION METHODS
  // =============================================================================

  /**
   * Story 3.5 Task 1.3: Initialize execution context
   * Creates initial context with trigger data and empty step outputs
   */
  static initializeExecutionContext(
    workspaceId: string,
    agentId: string,
    executionId: string,
    trigger: { type: 'manual' | 'scheduled' | 'event'; eventDetails?: Record<string, any> },
    contact?: Record<string, any>,
    deal?: Record<string, any>
  ): ExecutionContext {
    return {
      workspaceId,
      agentId,
      executionId,
      contact,
      deal,
      memory: new Map(),
      variables: {},
      triggerType: trigger.type,
      triggerData: trigger.eventDetails,
      stepOutputs: {},
      currentStep: 0,
      totalSteps: 0,
    };
  }

  /**
   * Story 3.5 Task 1.4: Execute a single step
   * Executes one step and returns updated context with step output
   */
  static async executeSingleStep(
    step: ParsedAction,
    stepIndex: number,
    context: ExecutionContext
  ): Promise<{ result: StepExecutionResult; context: ExecutionContext }> {
    // Resolve variables in action
    const resolvedAction = this.resolveActionVariables(step, context);

    // Execute the action
    const actionResult = await ActionExecutorService.executeAction(resolvedAction, context);

    // Build step result
    const stepResult: StepExecutionResult = {
      success: actionResult.success,
      data: actionResult.data || actionResult,
      itemsProcessed: actionResult.recipients?.length || actionResult.targetCount,
    };

    if (!actionResult.success && actionResult.error) {
      stepResult.error = {
        message: actionResult.error,
      };
    }

    // Story 3.5: Store step output for subsequent steps
    const stepKey = `step${stepIndex + 1}`;
    context.stepOutputs[stepKey] = {
      action: step.type,
      result: stepResult.data,
      timestamp: new Date(),
    };

    // Update context step tracking
    context.currentStep = stepIndex + 1;

    return { result: stepResult, context };
  }

  /**
   * Story 3.5 Task 1.5: Execute steps sequentially
   * Main orchestration loop for multi-step execution with error handling and wait support
   *
   * AC1: Sequential execution 1 → 2 → 3 → 4 → 5
   * AC3: Error handling and partial completion
   * AC6: Wait action and resume capability
   */
  static async executeStepsSequentially(
    execution: IAgentExecution,
    steps: ParsedAction[],
    context: ExecutionContext,
    startFromStep: number = 0
  ): Promise<MultiStepExecutionResult> {
    context.totalSteps = steps.length;

    // Update execution with total steps
    await AgentExecution.findByIdAndUpdate(execution._id, {
      totalSteps: steps.length,
    });

    for (let i = startFromStep; i < steps.length; i++) {
      const step = steps[i];
      context.currentStep = i;

      // Update step status to 'running' and save to database (Task 2.3)
      await this.updateStepStatus(execution._id.toString(), i, 'running');

      // Emit step started event (Task 5.2)
      this.emitStepStartedEvent(execution, i, steps.length, step.type);

      try {
        // Story 3.5 Task 6.1: Check for Wait action
        if (step.type === 'wait') {
          const waitResult = await this.handleWaitAction(execution, step, context, i + 1);
          return waitResult;
        }

        // Execute the step
        const stepStartTime = Date.now();
        const { result: stepResult, context: updatedContext } = await this.executeSingleStep(
          step,
          i,
          context
        );
        const stepDuration = Date.now() - stepStartTime;
        context = updatedContext;

        // Update step status to 'completed' (Task 2.4)
        await this.updateStepStatus(
          execution._id.toString(),
          i,
          'completed',
          {
            result: stepResult,
            durationMs: stepDuration,
          }
        );

        // Emit step completed event (Task 5.1)
        this.emitStepCompletedEvent(execution, i, steps.length, stepResult);

        if (!stepResult.success) {
          // Task 4: Handle step failure - mark remaining as skipped
          await this.handleStepFailure(execution, i, steps.length, stepResult.error);
          return {
            status: 'failed',
            completedSteps: i,
            failedStep: i,
            error: stepResult.error,
          };
        }

      } catch (error: any) {
        // Unexpected error during step execution
        await this.handleStepFailure(execution, i, steps.length, {
          message: error.message,
          details: error,
        });
        return {
          status: 'failed',
          completedSteps: i,
          failedStep: i,
          error: { message: error.message },
        };
      }
    }

    // All steps completed successfully
    return {
      status: 'completed',
      completedSteps: steps.length,
    };
  }

  /**
   * Story 3.5 Task 2: Update step status in database
   */
  private static async updateStepStatus(
    executionId: string,
    stepIndex: number,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting',
    data?: {
      result?: any;
      durationMs?: number;
      error?: any;
      skippedReason?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      currentStep: stepIndex,
      [`steps.${stepIndex}.stepStatus`]: status,
    };

    if (status === 'running') {
      updateData[`steps.${stepIndex}.executedAt`] = new Date();
    }

    if (status === 'completed' && data) {
      updateData[`steps.${stepIndex}.completedAt`] = new Date();
      updateData[`steps.${stepIndex}.durationMs`] = data.durationMs || 0;
      if (data.result) {
        updateData[`steps.${stepIndex}.result`] = {
          success: data.result.success,
          description: data.result.data?.description || 'Completed',
          data: data.result.data,
          itemsProcessed: data.result.itemsProcessed,
        };
      }
    }

    if (status === 'failed' && data?.error) {
      updateData[`steps.${stepIndex}.result.error`] = data.error.message;
      updateData[`steps.${stepIndex}.result.success`] = false;
    }

    if (status === 'skipped' && data?.skippedReason) {
      updateData[`steps.${stepIndex}.skippedReason`] = data.skippedReason;
      updateData[`steps.${stepIndex}.result.success`] = false;
      updateData[`steps.${stepIndex}.result.description`] = 'Not executed';
    }

    await AgentExecution.findByIdAndUpdate(executionId, { $set: updateData });
  }

  /**
   * Story 3.5 Task 4: Handle step failure and mark remaining steps as skipped
   */
  private static async handleStepFailure(
    execution: IAgentExecution,
    failedStepIndex: number,
    totalSteps: number,
    error?: any
  ): Promise<void> {
    // Update failed step
    await this.updateStepStatus(
      execution._id.toString(),
      failedStepIndex,
      'failed',
      { error }
    );

    // Mark remaining steps as skipped (Task 4.3)
    for (let i = failedStepIndex + 1; i < totalSteps; i++) {
      await this.updateStepStatus(
        execution._id.toString(),
        i,
        'skipped',
        { skippedReason: 'Previous step failed' }
      );
    }

    // Update execution status to failed (Task 4.4)
    await AgentExecution.findByIdAndUpdate(execution._id, {
      status: 'failed',
      completedAt: new Date(),
    });

    // Emit execution failed event
    emitExecutionFailed(execution.workspace.toString(), execution.agent.toString(), {
      executionId: execution.executionId,
      success: false,
      error: error?.message || 'Step execution failed',
      failedAtStep: failedStepIndex + 1,
      completedAt: new Date(),
    });
  }

  /**
   * Story 3.5 Task 6: Handle wait action and schedule resume job
   */
  private static async handleWaitAction(
    execution: IAgentExecution,
    step: ParsedAction,
    context: ExecutionContext,
    resumeFromStep: number
  ): Promise<MultiStepExecutionResult> {
    // Parse wait duration from step params
    const waitDuration = this.parseWaitDuration(step.params?.duration || step.params?.delay || '1d');
    const resumeAt = new Date(Date.now() + waitDuration);

    // Serialize context for storage
    const serializedContext = {
      ...context,
      memory: undefined,  // Will be stored separately
    };
    const serializedMemory = Object.fromEntries(context.memory);

    // Update execution with wait state
    await AgentExecution.findByIdAndUpdate(execution._id, {
      status: 'waiting',
      savedContext: serializedContext,
      savedMemory: serializedMemory,
      resumeFromStep,
      resumeAt,
      [`steps.${context.currentStep}.stepStatus`]: 'waiting',
    });

    // Schedule resume job
    try {
      // Import dynamically to avoid circular dependencies
      const { agentResumeExecutionQueue } = await import('../jobs/agentResumeExecutionJob');
      const job = await agentResumeExecutionQueue.add(
        `resume-${execution._id}`,
        {
          executionId: execution._id.toString(),
          agentId: execution.agent.toString(),
          workspaceId: execution.workspace.toString(),
          resumeFromStep,
        },
        { delay: waitDuration }
      );

      // Store job ID for potential cancellation
      await AgentExecution.findByIdAndUpdate(execution._id, {
        resumeJobId: job.id,
      });
    } catch (error) {
      console.error('Failed to schedule resume job:', error);
      // Job scheduling failed - don't block the execution
    }

    return {
      status: 'waiting',
      completedSteps: context.currentStep,
      resumeAt,
    };
  }

  /**
   * Story 3.5: Parse wait duration string to milliseconds
   * Supports: 1d, 2h, 30m, 5s, "5 days", "2 hours"
   */
  private static parseWaitDuration(duration: string): number {
    if (typeof duration === 'number') return duration;

    const match = duration.match(/^(\d+)\s*(d|day|days|h|hour|hours|m|min|minute|minutes|s|sec|second|seconds)?$/i);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 1 day

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'd').toLowerCase();

    switch (unit[0]) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 's': return value * 1000;
      default: return value * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Story 3.5 Task 5.2: Emit step started event
   */
  private static emitStepStartedEvent(
    execution: IAgentExecution,
    stepIndex: number,
    totalSteps: number,
    action: string
  ): void {
    const progress = Math.round((stepIndex / totalSteps) * 100);

    emitExecutionProgress(
      execution.workspace.toString(),
      execution.agent.toString(),
      {
        executionId: execution.executionId,
        step: stepIndex + 1,
        total: totalSteps,
        action,
        status: 'started',
        message: `Starting step ${stepIndex + 1} of ${totalSteps}`,
        progress,
      }
    );
  }

  /**
   * Story 3.5 Task 5.1: Emit step completed event
   */
  private static emitStepCompletedEvent(
    execution: IAgentExecution,
    stepIndex: number,
    totalSteps: number,
    result: StepExecutionResult
  ): void {
    const completedSteps = stepIndex + 1;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    emitExecutionProgress(
      execution.workspace.toString(),
      execution.agent.toString(),
      {
        executionId: execution.executionId,
        step: completedSteps,
        total: totalSteps,
        action: 'step_completed',
        status: result.success ? 'success' : 'failed',
        message: `Step ${completedSteps} of ${totalSteps} completed (${progress}%)`,
        progress,
      }
    );
  }

  /**
   * Story 3.5: Restore execution context from saved state
   * Used when resuming execution after wait action
   */
  static restoreExecutionContext(
    savedContext: Record<string, any>,
    savedMemory: Record<string, any>
  ): ExecutionContext {
    return {
      workspaceId: savedContext.workspaceId,
      agentId: savedContext.agentId,
      executionId: savedContext.executionId,
      contact: savedContext.contact,
      deal: savedContext.deal,
      memory: new Map(Object.entries(savedMemory || {})),
      variables: savedContext.variables || {},
      triggerType: savedContext.triggerType,
      triggerData: savedContext.triggerData,
      stepOutputs: savedContext.stepOutputs || {},
      currentStep: savedContext.currentStep || 0,
      totalSteps: savedContext.totalSteps || 0,
    };
  }
}

export default AgentExecutionService;
