/**
 * Action Factory
 * 
 * Central registry and factory for all workflow action executors.
 * Routes action types to their appropriate executors.
 */

import { ActionType } from "../../../models/Workflow";
import { ActionContext, ActionResult, ActionExecutor } from "./types";
import emailAction from "./emailAction";
import updateFieldAction from "./updateFieldAction";
import taskAction from "./taskAction";
import { addTagAction, removeTagAction } from "./tagAction";
import notificationAction from "./notificationAction";
import assignOwnerAction from "./assignOwnerAction";
import enrollWorkflowAction from "./enrollWorkflowAction";
import leadScoreAction from "./leadScoreAction";
import webhookAction from "./webhookAction";
import apolloEnrichAction from "./apolloEnrichAction";
import { executeSmsAction } from "./smsAction";
import { HttpActionExecutor } from "./httpAction";
import { SetNodeExecutor, MapNodeExecutor, FilterNodeExecutor } from "./transformAction";
import { LoopActionExecutor } from "./loopAction";
import { AIAgentActionExecutor } from "./aiAgentAction";
import { SlackNodeExecutor } from "./slackNodeAction";

// ============================================
// ACTION REGISTRY
// ============================================

const actionRegistry: Record<string, ActionExecutor> = {
    send_email: emailAction,
    update_field: updateFieldAction,
    create_task: taskAction,
    add_tag: addTagAction,
    remove_tag: removeTagAction,
    send_notification: notificationAction,
    assign_owner: assignOwnerAction,
    enroll_workflow: enrollWorkflowAction,
    update_lead_score: leadScoreAction,
    send_webhook: webhookAction,
    apollo_enrich: apolloEnrichAction,
    send_sms: { execute: executeSmsAction },

    // NEW N8N-STYLE ACTIONS
    http_request: new HttpActionExecutor(),
    transform_set: new SetNodeExecutor(),
    transform_map: new MapNodeExecutor(),
    transform_filter: new FilterNodeExecutor(),
    loop: new LoopActionExecutor(),
    ai_agent: new AIAgentActionExecutor(),

    // INTEGRATION NODES
    integration_slack: new SlackNodeExecutor(),
};

// ============================================
// ACTION FACTORY
// ============================================

/**
 * Execute an action by type
 */
export async function executeAction(
    actionType: ActionType | string,
    context: ActionContext
): Promise<ActionResult> {
    const executor = actionRegistry[actionType];

    if (!executor) {
        console.warn(`⚠️ Unknown action type: ${actionType}`);
        return {
            success: true,
            skipped: true,
            reason: `Unknown action type: ${actionType}`,
        };
    }

    try {
        return await executor.execute(context);
    } catch (error: any) {
        console.error(`❌ Action ${actionType} failed:`, error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Get list of available action types
 */
export function getAvailableActionTypes(): string[] {
    return Object.keys(actionRegistry);
}

/**
 * Check if an action type is registered
 */
export function hasAction(actionType: string): boolean {
    return actionType in actionRegistry;
}

/**
 * Register a custom action executor
 */
export function registerAction(
    actionType: string,
    executor: ActionExecutor
): void {
    actionRegistry[actionType] = executor;
}

// Re-export types
export * from "./types";
