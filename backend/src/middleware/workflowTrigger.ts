/**
 * Workflow Trigger Middleware
 * 
 * Middleware that automatically triggers workflow enrollment
 * when entities are created or updated.
 */

import { Request, Response, NextFunction } from "express";
import { workflowService } from "../services/workflow";

// ============================================
// EVENT TYPES
// ============================================

export type WorkflowEventType =
    | "contact:created"
    | "contact:updated"
    | "deal:created"
    | "deal:stage_changed"
    | "company:created"
    | "company:updated";

// ============================================
// TRIGGER HELPER
// ============================================

/**
 * Trigger workflow enrollment for an entity
 * Call this after creating or updating an entity
 */
export async function triggerWorkflow(
    eventType: WorkflowEventType,
    entity: any,
    workspaceId: string
): Promise<void> {
    try {
        // Don't block the response - run async
        setImmediate(async () => {
            try {
                await workflowService.checkAndEnroll(eventType, entity, workspaceId);
            } catch (error) {
                console.error(`[WorkflowTrigger] Error for ${eventType}:`, error);
            }
        });
    } catch (error) {
        console.error(`[WorkflowTrigger] Failed to trigger ${eventType}:`, error);
    }
}

// ============================================
// MIDDLEWARE FACTORIES
// ============================================

/**
 * Create middleware that triggers workflows after entity creation
 */
export function onEntityCreated(
    entityType: "contact" | "deal" | "company"
): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to intercept successful responses
        res.json = function (body: any) {
            // Only trigger on successful creation
            if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
                const entity = body.data?.contact || body.data?.deal || body.data?.opportunity || body.data?.company;
                const workspaceId = req.params.workspaceId || req.body.workspaceId;

                if (entity && workspaceId) {
                    const eventType = `${entityType}:created` as WorkflowEventType;
                    triggerWorkflow(eventType, entity, workspaceId);
                }
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Create middleware that triggers workflows after entity update
 */
export function onEntityUpdated(
    entityType: "contact" | "deal" | "company"
): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
                const entity = body.data?.contact || body.data?.deal || body.data?.opportunity || body.data?.company;
                const workspaceId = req.params.workspaceId || req.body.workspaceId;

                if (entity && workspaceId) {
                    const eventType = `${entityType}:updated` as WorkflowEventType;
                    triggerWorkflow(eventType, entity, workspaceId);
                }
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Create middleware that triggers workflows after deal stage change
 */
export function onDealStageChanged(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json.bind(res);
        const previousStage = req.body._previousStage; // Set this before updating

        res.json = function (body: any) {
            if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
                const deal = body.data?.deal || body.data?.opportunity;
                const workspaceId = req.params.workspaceId || req.body.workspaceId;

                if (deal && workspaceId && deal.stage !== previousStage) {
                    triggerWorkflow("deal:stage_changed", deal, workspaceId);
                }
            }

            return originalJson(body);
        };

        next();
    };
}

// ============================================
// SIMPLE TRIGGER FUNCTION
// ============================================

/**
 * Simple function to trigger workflows from anywhere in the code
 * Use this when you want more control over when triggers fire
 */
export async function emitWorkflowEvent(
    eventType: WorkflowEventType,
    entity: any,
    workspaceId: string
): Promise<void> {
    console.log(`📡 Emitting workflow event: ${eventType} for entity ${entity._id}`);
    await workflowService.checkAndEnroll(eventType, entity, workspaceId);
}
