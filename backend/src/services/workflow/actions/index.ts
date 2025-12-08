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
