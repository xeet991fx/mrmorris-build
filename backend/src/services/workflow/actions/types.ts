/**
 * Action Executor Types
 * 
 * Common types and interfaces for action executors.
 */

import { Types } from "mongoose";
import { IWorkflowStep } from "../../../models/Workflow";
import { IWorkflowEnrollment } from "../../../models/WorkflowEnrollment";

// ============================================
// TYPES
// ============================================

export interface ActionContext {
    step: IWorkflowStep;
    entity: any;
    enrollment: IWorkflowEnrollment;
    workspaceId: Types.ObjectId | string;
}

export interface ActionResult {
    success: boolean;
    skipped?: boolean;
    reason?: string;
    data?: Record<string, any>;
    error?: string;
}

export interface ActionExecutor {
    execute(context: ActionContext): Promise<ActionResult>;
}

// ============================================
// BASE ACTION EXECUTOR
// ============================================

export abstract class BaseActionExecutor implements ActionExecutor {
    abstract execute(context: ActionContext): Promise<ActionResult>;

    /**
     * Log the action execution
     */
    protected log(message: string): void {
        console.log(message);
    }

    /**
     * Create a skipped result
     */
    protected skipped(reason: string): ActionResult {
        return { success: true, skipped: true, reason };
    }

    /**
     * Create a success result
     */
    protected success(data?: Record<string, any>): ActionResult {
        return { success: true, data };
    }

    /**
     * Create an error result
     */
    protected error(error: string): ActionResult {
        return { success: false, error };
    }
}
