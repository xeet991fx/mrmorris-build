/**
 * TestModeService - Story 2.1: Enable Test Mode
 *
 * CRITICAL: 0% false positives - NEVER execute real actions
 * This service simulates agent execution without performing any actual actions.
 * All actions are dry-run simulated and return preview results.
 */
import mongoose from 'mongoose';
import Agent, { IAgent } from '../models/Agent';

// Story 2.1: Test step result structure
export interface TestStepResult {
  stepNumber: number;
  action: string;
  status: 'simulated' | 'skipped' | 'error';
  preview: {
    description: string;
    details?: Record<string, any>;
  };
  duration: number;
  estimatedCredits: number;
  note: string; // "DRY RUN - [action] not performed"
}

// Story 2.1: Test run result structure
export interface TestRunResult {
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
}

// Credit costs per action type (from architecture.md)
const CREDIT_COSTS: Record<string, number> = {
  send_email: 2,
  linkedin_invite: 2,
  web_search: 1,
  create_task: 0,
  add_tag: 0,
  remove_tag: 0,
  update_field: 0,
  enrich_contact: 3,
  wait: 0,
  update_deal_value: 0,
};

/**
 * Get credit cost for an action type
 */
function getCreditCost(actionType: string): number {
  return CREDIT_COSTS[actionType] ?? 0;
}

/**
 * Simulate a single action and return the step result
 * CRITICAL: Never execute real actions - only generate preview
 */
async function simulateAction(
  action: any,
  index: number,
  workspaceId: string
): Promise<TestStepResult> {
  const startTime = Date.now();
  const actionType = action.type || action.action || 'unknown';

  try {
    // Generate preview based on action type
    const preview = generateActionPreview(action, actionType);

    return {
      stepNumber: index + 1,
      action: actionType,
      status: 'simulated',
      preview,
      duration: Date.now() - startTime,
      estimatedCredits: getCreditCost(actionType),
      note: `DRY RUN - ${getActionDescription(actionType)} not performed`,
    };
  } catch (error: any) {
    return {
      stepNumber: index + 1,
      action: actionType,
      status: 'error',
      preview: {
        description: `Error simulating ${actionType}`,
        details: { error: error.message },
      },
      duration: Date.now() - startTime,
      estimatedCredits: 0,
      note: `Error: ${error.message}`,
    };
  }
}

/**
 * Generate a preview for an action based on its type
 */
function generateActionPreview(
  action: any,
  actionType: string
): { description: string; details?: Record<string, any> } {
  switch (actionType) {
    case 'send_email':
      return {
        description: `Would send email to ${action.to || action.recipient || '[contact]'}`,
        details: {
          to: action.to || action.recipient || '[contact email]',
          subject: action.subject || '[email subject]',
          body: action.body || action.content || '[email body]',
        },
      };

    case 'linkedin_invite':
      return {
        description: `Would send LinkedIn invitation to ${action.recipient || '[contact]'}`,
        details: {
          recipient: action.recipient || '[contact name]',
          message: action.message || '[invitation message]',
        },
      };

    case 'web_search':
      // Web search is safe (read-only) but still simulated for consistency
      return {
        description: `Would search web for "${action.query || '[search query]'}"`,
        details: {
          query: action.query || '[search query]',
          note: 'Web search is read-only and safe to execute',
        },
      };

    case 'create_task':
      return {
        description: `Would create task: "${action.title || action.name || '[task title]'}"`,
        details: {
          title: action.title || action.name || '[task title]',
          assignee: action.assignee || '[assignee]',
          dueDate: action.dueDate || '[due date]',
        },
      };

    case 'add_tag':
      return {
        description: `Would add tag "${action.tag || action.tagName || '[tag]'}" to contact`,
        details: {
          tag: action.tag || action.tagName || '[tag]',
          target: action.target || 'contact',
        },
      };

    case 'remove_tag':
      return {
        description: `Would remove tag "${action.tag || action.tagName || '[tag]'}" from contact`,
        details: {
          tag: action.tag || action.tagName || '[tag]',
          target: action.target || 'contact',
        },
      };

    case 'update_field':
      return {
        description: `Would update ${action.field || '[field]'} to "${action.value || '[value]'}"`,
        details: {
          field: action.field || '[field name]',
          newValue: action.value || '[new value]',
          previousValue: action.previousValue || '[current value]',
        },
      };

    case 'update_deal_value':
      return {
        description: `Would update deal value to $${action.value || action.amount || '[amount]'}`,
        details: {
          newValue: action.value || action.amount || '[amount]',
          previousValue: action.previousValue || '[current value]',
        },
      };

    case 'enrich_contact':
      return {
        description: `Would enrich contact with external data`,
        details: {
          provider: action.provider || 'Apollo',
          fields: action.fields || ['company', 'title', 'email', 'phone'],
          note: 'Sample enrichment data would be returned',
        },
      };

    case 'wait':
      return {
        description: `Would wait for ${action.duration || action.delay || '[duration]'}`,
        details: {
          duration: action.duration || action.delay || '[duration]',
          unit: action.unit || 'minutes',
        },
      };

    default:
      return {
        description: `Would execute ${actionType} action`,
        details: action,
      };
  }
}

/**
 * Get human-readable description for action type
 */
function getActionDescription(actionType: string): string {
  const descriptions: Record<string, string> = {
    send_email: 'Email',
    linkedin_invite: 'LinkedIn invitation',
    web_search: 'Web search',
    create_task: 'Task creation',
    add_tag: 'Tag addition',
    remove_tag: 'Tag removal',
    update_field: 'Field update',
    update_deal_value: 'Deal value update',
    enrich_contact: 'Contact enrichment',
    wait: 'Wait action',
  };
  return descriptions[actionType] || actionType;
}

/**
 * TestModeService - Main service for dry-run agent execution
 */
export class TestModeService {
  /**
   * Simulate agent execution without performing real actions
   * Story 2.1: AC2, AC3, AC4, AC5
   *
   * @param agentId - The agent ID to test
   * @param workspaceId - The workspace ID (for isolation)
   * @returns TestRunResult with step-by-step simulation results
   */
  static async simulateExecution(
    agentId: string,
    workspaceId: string
  ): Promise<TestRunResult> {
    const startTime = Date.now();
    const steps: TestStepResult[] = [];
    const warnings: TestRunResult['warnings'] = [];

    try {
      // Fetch agent with workspace isolation (CRITICAL for security)
      const agent = await Agent.findOne({
        _id: agentId,
        workspace: workspaceId,
      });

      if (!agent) {
        return {
          success: false,
          steps: [],
          totalEstimatedCredits: 0,
          totalEstimatedDuration: 0,
          warnings: [],
          error: 'Agent not found',
        };
      }

      // Get parsed actions from agent (use stored parsedActions)
      // Story 2.1 Dev Notes: Use existing agent.parsedActions - DO NOT reimplement parsing
      const parsedActions = agent.parsedActions || [];

      if (parsedActions.length === 0) {
        // Check if agent has instructions but no parsed actions
        if (agent.instructions && agent.instructions.trim()) {
          warnings.push({
            step: 0,
            severity: 'warning',
            message: 'Agent has instructions but no parsed actions. Instructions may need to be re-saved.',
            suggestion: 'Edit and save the agent instructions to generate parsed actions.',
          });
        }

        return {
          success: true,
          steps: [],
          totalEstimatedCredits: 0,
          totalEstimatedDuration: Date.now() - startTime,
          warnings,
        };
      }

      // Simulate each action step-by-step
      for (let i = 0; i < parsedActions.length; i++) {
        const action = parsedActions[i];

        // Handle conditional actions (Story 2.1 Dev Notes: evaluate conditions)
        if (action.condition) {
          // For test mode, we simulate the condition as true by default
          // In production, this would evaluate actual contact/deal data
          const conditionMet = true; // Simulate condition met for dry run

          if (!conditionMet) {
            steps.push({
              stepNumber: i + 1,
              action: action.type || action.action || 'unknown',
              status: 'skipped',
              preview: {
                description: `Condition not met: ${action.condition}`,
                details: { condition: action.condition },
              },
              duration: 0,
              estimatedCredits: 0,
              note: 'Step skipped - condition not met',
            });
            continue;
          }
        }

        // Simulate the action
        const result = await simulateAction(action, i, workspaceId);
        steps.push(result);

        // If action resulted in error, record it and stop (AC5)
        if (result.status === 'error') {
          return {
            success: false,
            steps,
            totalEstimatedCredits: steps.reduce((sum, s) => sum + s.estimatedCredits, 0),
            totalEstimatedDuration: Date.now() - startTime,
            warnings,
            error: `Error at Step ${result.stepNumber}: ${result.note}`,
            failedAtStep: result.stepNumber,
          };
        }
      }

      // Calculate totals
      const totalEstimatedCredits = steps.reduce(
        (sum, step) => sum + step.estimatedCredits,
        0
      );

      return {
        success: true,
        steps,
        totalEstimatedCredits,
        totalEstimatedDuration: Date.now() - startTime,
        warnings,
      };
    } catch (error: any) {
      console.error('TestModeService.simulateExecution error:', error);
      return {
        success: false,
        steps,
        totalEstimatedCredits: steps.reduce((sum, s) => sum + s.estimatedCredits, 0),
        totalEstimatedDuration: Date.now() - startTime,
        warnings,
        error: error.message || 'Failed to execute test',
        failedAtStep: steps.length + 1,
      };
    }
  }
}

export default TestModeService;
