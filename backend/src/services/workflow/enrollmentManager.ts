/**
 * Enrollment Manager
 * 
 * Handles all workflow enrollment logic including:
 * - Checking if entities should be enrolled
 * - Creating new enrollments
 * - Managing enrollment lifecycle
 */

import { Types } from "mongoose";
import Workflow, { IWorkflow } from "../../models/Workflow";
import WorkflowEnrollment, { IWorkflowEnrollment } from "../../models/WorkflowEnrollment";
import { evaluateConditions } from "./conditionEvaluator";
import { mapEventToTrigger, getEntityTypeFromEvent, EntityType } from "./utils";

// ============================================
// AUTOMATIC ENROLLMENT
// ============================================

/**
 * Check if an entity should be enrolled in any active workflows
 * and create enrollments where appropriate.
 */
export async function checkAndEnroll(
    eventType: string,
    entity: any,
    workspaceId: string
): Promise<void> {
    try {
        // Map event to trigger type
        const triggerType = mapEventToTrigger(eventType);
        if (!triggerType) {
            return; // No matching trigger type
        }

        // Determine entity type
        const entityType = getEntityTypeFromEvent(eventType);

        // Find active workflows with matching trigger
        const workflows = await Workflow.find({
            workspaceId,
            status: "active",
            triggerEntityType: entityType,
            "steps.config.triggerType": triggerType,
        });

        console.log(
            `🔍 Found ${workflows.length} active workflows for ${eventType} in workspace ${workspaceId}`
        );

        // Check each workflow for enrollment
        for (const workflow of workflows) {
            try {
                await tryEnrollEntity(workflow, entity, entityType, workspaceId);
            } catch (error: any) {
                console.error(
                    `Failed to check enrollment for workflow "${workflow.name}":`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error("EnrollmentManager.checkAndEnroll error:", error);
    }
}

/**
 * Try to enroll an entity in a specific workflow
 */
async function tryEnrollEntity(
    workflow: IWorkflow,
    entity: any,
    entityType: EntityType,
    workspaceId: string
): Promise<boolean> {
    // Check enrollment criteria
    if (workflow.enrollmentCriteria?.conditions?.length) {
        const matches = evaluateConditions(
            entity,
            workflow.enrollmentCriteria.conditions,
            workflow.enrollmentCriteria.matchAll !== false
        );
        if (!matches) {
            console.log(
                `   ⏭️ Entity doesn't match enrollment criteria for "${workflow.name}"`
            );
            return false;
        }
    }

    // Check if already enrolled (if re-enrollment not allowed)
    if (!workflow.allowReenrollment) {
        const existing = await WorkflowEnrollment.findOne({
            workflowId: workflow._id,
            entityId: entity._id,
            status: { $in: ["active", "paused"] },
        });
        if (existing) {
            console.log(
                `   ⏭️ Entity already enrolled in "${workflow.name}"`
            );
            return false;
        }
    }

    // Enroll the entity
    await enrollEntity(workflow, entity._id, entityType, workspaceId, undefined, "automatic");
    return true;
}

// ============================================
// ENROLLMENT CREATION
// ============================================

/**
 * Create a new workflow enrollment
 */
export async function enrollEntity(
    workflow: IWorkflow,
    entityId: Types.ObjectId | string,
    entityType: EntityType,
    workspaceId: string,
    enrolledBy?: Types.ObjectId | string,
    source: "automatic" | "manual" | "api" = "automatic"
): Promise<IWorkflowEnrollment> {
    // Get trigger step and find first action step
    const triggerStep = workflow.steps.find((s) => s.type === "trigger");
    const firstStepId = triggerStep?.nextStepIds[0] || undefined;

    // Create enrollment record
    const enrollment = await WorkflowEnrollment.create({
        workflowId: workflow._id,
        workspaceId,
        entityType,
        entityId,
        status: "active",
        currentStepId: firstStepId,
        nextExecutionTime: new Date(), // Execute immediately
        enrolledBy: enrolledBy ? new Types.ObjectId(enrolledBy as string) : undefined,
        enrollmentSource: source,
        stepsExecuted: triggerStep
            ? [
                {
                    stepId: triggerStep.id,
                    stepName: triggerStep.name,
                    stepType: "trigger",
                    startedAt: new Date(),
                    completedAt: new Date(),
                    status: "completed",
                    result: { source },
                },
            ]
            : [],
    });

    // Update workflow stats
    await Workflow.findByIdAndUpdate(workflow._id, {
        $inc: {
            "stats.totalEnrolled": 1,
            "stats.currentlyActive": 1,
        },
    });

    console.log(
        `✅ Enrolled ${entityType} ${entityId} in workflow "${workflow.name}"`
    );

    return enrollment;
}

// ============================================
// ENROLLMENT COMPLETION
// ============================================

/**
 * Complete an enrollment with a final status
 */
export async function completeEnrollment(
    enrollment: IWorkflowEnrollment,
    status: "completed" | "goal_met" | "failed"
): Promise<void> {
    enrollment.status = status;
    enrollment.completedAt = new Date();
    enrollment.currentStepId = undefined;
    enrollment.nextExecutionTime = undefined;
    await enrollment.save();

    // Update workflow stats
    const statsUpdate: any = {
        $inc: { "stats.currentlyActive": -1 },
    };

    if (status === "completed") {
        statsUpdate.$inc["stats.completed"] = 1;
    } else if (status === "goal_met") {
        statsUpdate.$inc["stats.goalsMet"] = 1;
    } else if (status === "failed") {
        statsUpdate.$inc["stats.failed"] = 1;
    }

    await Workflow.findByIdAndUpdate(enrollment.workflowId, statsUpdate);

    console.log(
        `✅ Enrollment ${enrollment._id} completed with status: ${status}`
    );
}

// ============================================
// ENROLLMENT QUERIES
// ============================================

/**
 * Find all enrollments ready for execution
 */
export async function findReadyEnrollments(): Promise<IWorkflowEnrollment[]> {
    return WorkflowEnrollment.find({
        status: "active",
        nextExecutionTime: { $lte: new Date() },
    });
}

/**
 * Check if an entity is currently enrolled in a workflow
 */
export async function isEnrolled(
    workflowId: Types.ObjectId | string,
    entityId: Types.ObjectId | string
): Promise<boolean> {
    const count = await WorkflowEnrollment.countDocuments({
        workflowId,
        entityId,
        status: { $in: ["active", "paused"] },
    });
    return count > 0;
}
