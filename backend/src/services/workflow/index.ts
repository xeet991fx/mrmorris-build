/**
 * Workflow Service
 * 
 * Main entry point for the workflow automation system.
 * Acts as a facade for the modular components.
 */

import { Types } from "mongoose";
import Workflow, { IWorkflow } from "../../models/Workflow";
import { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";

// Import modular components
import {
    checkAndEnroll,
    enrollEntity,
    completeEnrollment,
    findReadyEnrollments,
    isEnrolled,
} from "./enrollmentManager";
import {
    executeNextStep,
    processReadyEnrollments
} from "./stepExecutor";
import {
    evaluateCondition,
    evaluateConditions
} from "./conditionEvaluator";
import {
    replacePlaceholders,
    getEntity,
    getEntityModel,
    calculateDelayMs,
    EntityType,
} from "./utils";

// ============================================
// WORKFLOW SERVICE CLASS
// ============================================

/**
 * WorkflowService provides a unified interface for:
 * - Automatic & manual enrollment
 * - Step execution and scheduling
 * - Workflow processing
 */
class WorkflowService {
    // ==========================================
    // ENROLLMENT
    // ==========================================

    /**
     * Check if an entity should be enrolled in active workflows
     * Called when entities are created or updated
     */
    async checkAndEnroll(
        eventType: string,
        entity: any,
        workspaceId: string
    ): Promise<void> {
        return checkAndEnroll(eventType, entity, workspaceId);
    }

    /**
     * Manually enroll an entity in a workflow
     */
    async enrollEntity(
        workflow: IWorkflow,
        entityId: Types.ObjectId | string,
        entityType: EntityType,
        workspaceId: string,
        enrolledBy?: Types.ObjectId | string,
        source: "automatic" | "manual" | "api" = "automatic"
    ): Promise<IWorkflowEnrollment> {
        return enrollEntity(workflow, entityId, entityType, workspaceId, enrolledBy, source);
    }

    /**
     * Check if an entity is enrolled in a workflow
     */
    async isEnrolled(
        workflowId: Types.ObjectId | string,
        entityId: Types.ObjectId | string
    ): Promise<boolean> {
        return isEnrolled(workflowId, entityId);
    }

    // ==========================================
    // EXECUTION
    // ==========================================

    /**
     * Execute the next step for an enrollment
     */
    async executeNextStep(enrollment: IWorkflowEnrollment): Promise<void> {
        return executeNextStep(enrollment);
    }

    /**
     * Process all enrollments ready for execution
     * Called by the scheduler or cron job
     */
    async processReadyEnrollments(): Promise<void> {
        await processReadyEnrollments();
    }

    // ==========================================
    // COMPLETION
    // ==========================================

    /**
     * Complete an enrollment
     */
    async completeEnrollment(
        enrollment: IWorkflowEnrollment,
        status: "completed" | "goal_met" | "failed"
    ): Promise<void> {
        return completeEnrollment(enrollment, status);
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    /**
     * Get an entity by type and ID
     */
    async getEntity(
        entityType: EntityType,
        entityId: Types.ObjectId | string
    ): Promise<any> {
        return getEntity(entityType, entityId);
    }

    /**
     * Get the model for an entity type
     */
    getEntityModel(entityType: EntityType): any {
        return getEntityModel(entityType);
    }

    /**
     * Replace placeholders in text with entity values
     */
    replacePlaceholders(text: string, entity: any): string {
        return replacePlaceholders(text, entity);
    }

    /**
     * Calculate delay in milliseconds
     */
    calculateDelayMs(delayValue: number, delayUnit: string): number {
        return calculateDelayMs(delayValue, delayUnit);
    }

    /**
     * Evaluate conditions against an entity
     */
    evaluateConditions(
        entity: any,
        conditions: any[],
        matchAll: boolean
    ): boolean {
        return evaluateConditions(entity, conditions, matchAll);
    }
}

// ============================================
// EXPORTS
// ============================================

// Export singleton instance
export const workflowService = new WorkflowService();
export default workflowService;

// Re-export modules for direct access
export {
    checkAndEnroll,
    enrollEntity,
    completeEnrollment,
    findReadyEnrollments
} from "./enrollmentManager";
export { executeNextStep, processReadyEnrollments } from "./stepExecutor";
export { evaluateCondition, evaluateConditions } from "./conditionEvaluator";
export {
    replacePlaceholders,
    getEntity,
    getEntityModel,
    calculateDelayMs,
    type EntityType
} from "./utils";
export { executeAction } from "./actions";
